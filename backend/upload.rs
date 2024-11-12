use anyhow::{Context, Ok as anyOk, Result};
use axum::{extract::Multipart, extract::State, http::StatusCode, Json};
use diesel_async::{AsyncConnection, RunQueryDsl};
use serde_json::{json, Value};
use std::collections::VecDeque;
use std::path::{Path, PathBuf};
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;
use tracing::{debug, error, info};
use uuid::Uuid;

use diesel::prelude::*;

use crate::parse_library::{self, add_or_update_model};
use crate::schema::models3d;
use crate::types::Model3D;

use crate::Config;

fn cleanup_temp_dir(temp_dir: &PathBuf) {
    debug!("cleaned {}", temp_dir.display());
    fs_extra::remove_items(&[temp_dir.clone()])
        .unwrap_or_else(|e| debug!("Failed to remove temp dir: {}", e));
}

const MESH_FILE_FORMATS: &[&str] = &["obj", "stl", "3mf"];
const CAD_FILE_FORMATS: &[&str] = &["step", "stp", "f3d", "scad", "igs", "iges"];
const IMAGE_FILE_FORMATS: &[&str] = &["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"];

fn categorize_file(file_name: &PathBuf) -> &str {
    if let Some(ext) = file_name.extension().and_then(|s| s.to_str()) {
        let ext = ext.to_ascii_lowercase();
        if MESH_FILE_FORMATS.contains(&ext.as_str()) {
            "mesh"
        } else if CAD_FILE_FORMATS.contains(&ext.as_str()) {
            "cad"
        } else if IMAGE_FILE_FORMATS.contains(&ext.as_str()) {
            "image"
        } else {
            "unknown"
        }
    } else {
        "unknown"
    }
}

async fn merge_directories(src: &Path, dest: &Path, overwrite: bool) -> Result<()> {
    if !src.is_dir() || !dest.is_dir() {
        anyhow::bail!("Both paths must be directories");
    }

    if !dest.exists() {
        std::fs::create_dir_all(dest)?;
    }

    let mut queue = VecDeque::new();
    queue.push_back((src.to_path_buf(), dest.to_path_buf()));

    while let Some((current_src, current_dest)) = queue.pop_front() {
        let mut entries = fs::read_dir(&current_src)
            .await
            .with_context(|| format!("Failed to read directory: {:?}", current_src))?;

        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            let dest_path = current_dest.join(entry.file_name());

            if path.is_dir() {
                fs::create_dir_all(&dest_path)
                    .await
                    .with_context(|| format!("Failed to create directory: {:?}", dest_path))?;
                queue.push_back((path, dest_path));
            } else if path.is_file() && (overwrite || !fs::try_exists(&dest_path).await?) {
                fs::copy(&path, &dest_path).await.with_context(|| {
                    format!("Failed to copy file from {:?} to {:?}", path, dest_path)
                })?;
            }
        }
    }

    anyOk(())
}

pub async fn handle_upload(
    State(state): State<crate::AppState>,
    multipart: Multipart,
) -> Result<Json<Value>, StatusCode> {
    let mut connection = state.pool.get().await.unwrap();
    Ok(
        handle_upload_internally(&mut connection, &state.config.clone(), multipart, None)
            .await
            .unwrap(),
    )
}

pub async fn handle_upload_update(
    State(state): State<crate::AppState>,
    axum::extract::Path(slug): axum::extract::Path<String>,
    multipart: Multipart,
) -> Result<Json<Value>, StatusCode> {
    let mut connection = state.pool.get().await.unwrap();

    let result = models3d::dsl::models3d
        .filter(models3d::dsl::name.eq(slug))
        .first::<Model3D>(&mut connection)
        .await
        .unwrap();

    Ok(handle_upload_internally(
        &mut connection,
        &state.config.clone(),
        multipart,
        Some(result),
    )
    .await
    .unwrap())
}

pub async fn handle_upload_internally<Conn>(
    mut connection: &mut Conn,
    config: &Config,
    mut multipart: Multipart,
    existing_model: Option<Model3D>,
) -> Result<Json<Value>, StatusCode>
where
    Conn: AsyncConnection<Backend = diesel::sqlite::Sqlite>,
{
    let mut temp_dir = config.upload_cache.clone();
    temp_dir.push(Uuid::new_v4().to_string());

    if !Path::new(&temp_dir).exists() {
        fs::create_dir_all(&temp_dir).await.map_err(|_| {
            cleanup_temp_dir(&temp_dir);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    }

    let mut mesh_files = Vec::new();
    let mut cad_files = Vec::new();
    let mut image_files = Vec::new();
    let mut uploaded_files = Vec::new();

    while let Some(field) = multipart.next_field().await.map_err(|_| {
        cleanup_temp_dir(&temp_dir);
        StatusCode::BAD_REQUEST
    })? {
        let file_name = field
            .file_name()
            .map(|f| f.to_string())
            .unwrap_or_else(|| "unknown".to_string());

        let data = field.bytes().await.map_err(|_| {
            cleanup_temp_dir(&temp_dir);
            StatusCode::BAD_REQUEST
        })?;

        let file_path = temp_dir
            .clone()
            .join(sanitize_filename::sanitize(&file_name));

        let mut file = File::create(&file_path).await.map_err(|_| {
            cleanup_temp_dir(&temp_dir);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        file.write_all(&data).await.map_err(|_| {
            cleanup_temp_dir(&temp_dir);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        match categorize_file(&file_path) {
            "mesh" => mesh_files.push(file_path.clone()),
            "cad" => cad_files.push(file_path.clone()),
            "image" => image_files.push(file_path.clone()),
            _ => {
                info!("File {} is ignored", file_path.display());
                uploaded_files.push(file_path.clone())
            }
        }
    }

    // Parse modelpack.json
    let modelpack_meta = parse_library::get_modelpack_meta(&temp_dir)
        .await
        .map_err(|_| {
            cleanup_temp_dir(&temp_dir);
            StatusCode::BAD_REQUEST
        })?;

    let final_folder_name = sanitize_filename::sanitize(modelpack_meta.title);

    let tmp_final_structure = temp_dir.clone().join(&final_folder_name);
    debug!(
        "Creating temporary ModelPack structure at  {}",
        tmp_final_structure.display()
    );
    fs::create_dir_all(&tmp_final_structure)
        .await
        .map_err(|_| {
            cleanup_temp_dir(&temp_dir);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // Move modelpack.json into the final structure
    let modelpack_json_path = temp_dir.join("modelpack.json");
    let new_modelpack_json_path = tmp_final_structure.join("modelpack.json");
    fs::copy(&modelpack_json_path, &new_modelpack_json_path)
        .await
        .map_err(|_| {
            cleanup_temp_dir(&temp_dir);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // copy readme if exists
    let readme_path = temp_dir.join("README.md");
    let new_readme_path = tmp_final_structure.join("README.md");

    if readme_path.exists() {
        fs::copy(&readme_path, &new_readme_path)
            .await
            .map_err(|_| {
                cleanup_temp_dir(&temp_dir);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
    }

    // create final structure within tmp dir
    let images_dir = tmp_final_structure.join("images");
    let files_dir = tmp_final_structure.join("files");
    fs::create_dir_all(&images_dir).await.map_err(|_| {
        cleanup_temp_dir(&temp_dir);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    fs::create_dir_all(&files_dir).await.map_err(|_| {
        cleanup_temp_dir(&temp_dir);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut all_files = Vec::new();
    all_files.extend(image_files.iter().map(|file| (file, images_dir.clone())));
    all_files.extend(mesh_files.iter().map(|file| (file, files_dir.clone())));
    all_files.extend(cad_files.iter().map(|file| (file, files_dir.clone())));

    // Move files
    for (src, dest) in all_files {
        fs_extra::move_items(&[src], dest, &fs_extra::dir::CopyOptions::new()).map_err(|_| {
            cleanup_temp_dir(&temp_dir);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    }

    let libraries_path = config.libraries_path.clone();
    let final_path = libraries_path.join(&final_folder_name);

    let mut merge = false;

    // rename existing model folder
    if let Some(model_to_move) = existing_model {
        merge = true;
        let old_absolute_path = model_to_move.absolute_path(config);
        if old_absolute_path != final_path {
            debug!(
                "Going to move {} to {}",
                old_absolute_path.display(),
                final_path.display()
            );
            tokio::fs::rename(old_absolute_path, &final_path)
                .await
                .map_err(|e| {
                    error!("Rename operation failed: {:?}", e);
                    cleanup_temp_dir(&temp_dir);
                    StatusCode::INTERNAL_SERVER_ERROR
                });

            model_to_move.delete(config, &mut connection).await;
        } else {
            debug!("No Model rename detected");
        }
    }

    fs_extra::move_items(
        &[tmp_final_structure],
        libraries_path.clone(),
        &fs_extra::dir::CopyOptions {
            overwrite: merge,
            copy_inside: merge,
            ..fs_extra::dir::CopyOptions::new()
        },
    )
    .map_err(|e| {
        error!("Final move operation failed: {:?}, merge: {}", e, merge);
        cleanup_temp_dir(&temp_dir);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    cleanup_temp_dir(&temp_dir);

    let model = add_or_update_model(config, &mut connection, &final_path)
        .await
        .unwrap();
    model.scan(config, &mut connection).await;
    debug!("Indexed {}", final_folder_name);

    let response = crate::types::UploadResponse {
        success: true,
        slug: model.name,
        message: format!(
            "Successfully uploaded {} files",
            image_files.len() + mesh_files.len() + cad_files.len()
        ),
    };

    Ok(Json(json!(response)))
}
