use axum::{
    extract::Multipart,
    extract::State,
    http::{header, StatusCode},
    routing::post,
    Json, Router,
};
use sanitize_filename::sanitize;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;
use tower_http::cors::CorsLayer;
use tracing::{debug, error, info};
use uuid::Uuid;

use crate::parse_library;

fn cleanup_temp_dir(temp_dir: &PathBuf) {
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

pub async fn handle_upload(
    State(state): State<crate::AppState>,
    mut multipart: Multipart,
) -> Result<Json<Value>, StatusCode> {
    let mut temp_dir = state.config.upload_cache.clone();
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

    fs_extra::move_items(
        &[tmp_final_structure],
        state.config.libraries_path,
        &fs_extra::dir::CopyOptions::new(),
    )
    .map_err(|_| {
        cleanup_temp_dir(&temp_dir);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    cleanup_temp_dir(&temp_dir);

    let response = crate::types::UploadResponse {
        success: true,
        message: format!(
            "Successfully uploaded {} files",
            image_files.len() + mesh_files.len() + cad_files.len()
        ),
    };

    Ok(Json(json!(response)))
}
