use crate::schema::{files3d, models3d};
use crate::types::ModelPackV0_1;
use crate::types::{File3D, Model3D, NewFile3D, NewModel3D};
use crate::Config;
use chrono::Local;
use diesel::prelude::*;
use diesel::SqliteConnection;
use diesel_async::pooled_connection::bb8::Pool;
use diesel_async::sync_connection_wrapper::SyncConnectionWrapper;
use diesel_async::RunQueryDsl;
use std::collections::HashSet;
use std::panic;
use std::path::{Path, PathBuf};
use tokio::fs;
use tracing::{debug, error, info};
use uuid::Uuid;

pub async fn find_modelpack_directories(start_path: PathBuf) -> anyhow::Result<Vec<PathBuf>> {
    let mut modelpack_dirs = Vec::new();
    let mut dirs_to_check = vec![start_path];

    while let Some(current_dir) = dirs_to_check.pop() {
        let mut dir_entries = match fs::read_dir(&current_dir).await {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        let mut has_modelpack = false;
        let mut subdirs = Vec::new();

        while let Ok(Some(entry)) = dir_entries.next_entry().await {
            let pth = entry.path();
            if pth.file_name() == Some("modelpack.json".as_ref()) && {
                let parent_dir = pth.parent().unwrap_or_else(|| Path::new(""));
                parent_dir.join("files").is_dir()
            } {
                has_modelpack = true;
            } else if pth.is_dir() {
                subdirs.push(pth);
            }
        }

        if has_modelpack {
            debug!("Found ModelPack at: {:?}", current_dir);
            modelpack_dirs.push(current_dir);
        } else {
            dirs_to_check.extend(subdirs);
        }
    }

    Ok(modelpack_dirs)
}

pub async fn get_modelpack_meta(pth: &PathBuf) -> anyhow::Result<ModelPackV0_1, anyhow::Error> {
    let mut json_pth = pth.clone();
    json_pth.push("modelpack.json");

    let data = fs::read_to_string(json_pth).await?;
    let model_pack: ModelPackV0_1 = serde_json::from_str(&data)?;

    Ok(model_pack)
}

async fn get_all_image_files(
    image_dir: &PathBuf,
    base_dir: &PathBuf,
) -> anyhow::Result<Vec<PathBuf>> {
    let supported_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"];
    let mut image_files = Vec::new();

    let mut dir_entries = fs::read_dir(&image_dir).await.unwrap();

    while let Some(entry) = dir_entries.next_entry().await? {
        let pth = entry.path();

        if pth.is_file() {
            if let Some(extension) = pth.extension() {
                if supported_extensions.contains(
                    &extension
                        .to_str()
                        .unwrap_or("")
                        .to_ascii_lowercase()
                        .as_str(),
                ) {
                    if let Some(relative_path) = pathdiff::diff_paths(pth, base_dir) {
                        image_files.push(relative_path);
                    }
                }
            }
        }
    }

    Ok(image_files)
}

pub async fn refresh_library(
    pool: Pool<SyncConnectionWrapper<SqliteConnection>>,
    config: Config,
) -> anyhow::Result<()> {
    info!(
        "Started lib scan at {}",
        Local::now().format("%Y-%m-%d %H:%M:%S")
    );

    let data_dirs = find_modelpack_directories(config.libraries_path.clone())
        .await
        .unwrap();
    let mut connection = pool.get().await.unwrap();

    // delete models from db which do not exist anymore in the fs
    let dirs_set: HashSet<PathBuf> = data_dirs
        .iter()
        .filter_map(|dir| pathdiff::diff_paths(dir, &config.libraries_path))
        .collect();

    let possibly_old_models = models3d::dsl::models3d
        .load::<Model3D>(&mut connection)
        .await
        .unwrap();

    for model in possibly_old_models {
        if !dirs_set.contains(&PathBuf::from(&model.folder_path)) {
            diesel::delete(models3d::dsl::models3d.filter(models3d::dsl::id.eq(model.id)))
                .execute(&mut connection)
                .await
                .unwrap();

            debug!(
                "Deleted model from database: {:?} (id: {})",
                model.folder_path, model.id
            );
        }
    }

    // add new or update models

    for dir in data_dirs {
        let model_pack_meta = get_modelpack_meta(&dir).await.unwrap();

        let relative_dir = pathdiff::diff_paths(&dir, &config.libraries_path).unwrap();

        let result: Option<Model3D> = models3d::dsl::models3d
            .filter(models3d::dsl::folder_path.eq(relative_dir.to_str().unwrap()))
            .first::<Model3D>(&mut connection)
            .await
            .ok();

        let mut image_dir = dir.clone();
        image_dir.push("images");

        let new_object = NewModel3D::from_model_pack_v0_1(
            &model_pack_meta,
            &relative_dir,
            get_all_image_files(&image_dir, &dir).await.unwrap(),
        )
        .unwrap();

        if let Some(existing_model) = result {
            diesel::update(models3d::dsl::models3d.find(existing_model.id))
                .set((
                    models3d::dsl::title.eq(&new_object.title),
                    models3d::dsl::name.eq(&new_object.name),
                    models3d::dsl::license.eq(&new_object.license),
                    models3d::dsl::author.eq(&new_object.author),
                    models3d::dsl::origin.eq(&new_object.origin),
                    models3d::dsl::images.eq(new_object.images),
                ))
                .execute(&mut connection)
                .await
                .unwrap();
            debug!("Updated {:?}", new_object.folder_path)
        } else {
            diesel::insert_into(models3d::table)
                .values(&new_object)
                .execute(&mut connection)
                .await
                .unwrap();
            debug!("Created Model {:?}", new_object.folder_path)
        }
    }

    // generate file3d entrys
    fs::create_dir_all(config.preview_cache_dir.clone()).await?;

    let files = files3d::dsl::files3d
        .load::<File3D>(&mut connection)
        .await
        .unwrap();

    // delete file references deleted in fs
    for file in files {
        let file_pth = file.get_file_path(&mut connection, &config).await.clone();

        if fs::metadata(&file_pth).await.is_ok() {
            let current_sha = sha256::try_async_digest(file_pth.clone())
                .await
                .unwrap()
                .to_string();
            let saved_sha = file.file_hash.unwrap_or("".to_string());
            if current_sha == saved_sha {
                continue;
            }
        }
        diesel::delete(files3d::dsl::files3d.filter(files3d::dsl::id.eq(file.id)))
            .execute(&mut connection)
            .await
            .unwrap();
        debug!("Deleted File Reference from DB {:?}", file.file_path)
    }

    let models = models3d::dsl::models3d
        .load::<Model3D>(&mut connection)
        .await
        .unwrap();

    // add refresh files in model folders
    for model in models {
        let mut model_base_path = config.libraries_path.clone();
        model_base_path.push(model.folder_path);

        let mut model_file_base_path = model_base_path.clone();
        model_file_base_path.push("files");

        debug!("starting search for {:?}", model_file_base_path);
        for entry in walkdir::WalkDir::new(model_file_base_path) {
            let mesh_files = ["stl", "3mf", "obj"];
            let entry: walkdir::DirEntry = entry.unwrap();
            let file_pth = entry.path();

            if file_pth.is_dir() {
                continue;
            }

            if let Some(extension) = file_pth.extension() {
                if !mesh_files.contains(&extension.to_str().unwrap()) {
                    continue;
                }
            }

            let result: Option<File3D> = files3d::dsl::files3d
                .filter(
                    files3d::dsl::file_path.eq(pathdiff::diff_paths(file_pth, &model_base_path)
                        .unwrap()
                        .to_str()
                        .unwrap()),
                )
                .first::<File3D>(&mut connection)
                .await
                .ok();

            // entry exist and everything is fine
            if result.is_some() {
                continue;
            }

            let mut img_path = config.preview_cache_dir.clone();
            let file_name = format!("{}.png", Uuid::new_v4());
            img_path.push(file_name.clone());

            let mut render_config = stl_thumb::config::Config::default();
            render_config.model_filename = file_pth.to_str().unwrap().to_string();
            render_config.img_filename = img_path.to_str().unwrap().to_string();

            let preview_image = if let Err(err) = panic::catch_unwind(|| {
                stl_thumb::render_to_file(&render_config).unwrap();
            }) {
                error!(
                    "Unable to render preview: {:?} Error: {:?}",
                    file_pth.to_str(),
                    err
                );
                None
            } else {
                Some(file_name)
            };

            let new_file = NewFile3D {
                model_id: model.id,
                file_path: pathdiff::diff_paths(file_pth, &model_base_path)
                    .unwrap()
                    .to_str()
                    .unwrap()
                    .to_string(),
                preview_image,
                file_hash: Some(
                    sha256::try_async_digest(file_pth)
                        .await
                        .unwrap()
                        .to_string(),
                ),
            };
            diesel::insert_into(files3d::table)
                .values(&new_file)
                .execute(&mut connection)
                .await
                .unwrap();
            debug!("Created File {:?}", new_file.file_path)
        }
    }

    // delete old cache images
    let mut preview_cache_dir = fs::read_dir(&config.preview_cache_dir).await.unwrap();

    while let Some(entry) = preview_cache_dir.next_entry().await? {
        let pth = entry.path();

        if !pth.is_file() {
            continue;
        }

        let file_name = pth.file_name().unwrap().to_str().unwrap().to_string();

        let exists = files3d::dsl::files3d
            .filter(files3d::dsl::preview_image.eq(&file_name))
            .first::<File3D>(&mut connection)
            .await
            .is_ok();

        if !exists {
            match fs::remove_file(&pth).await {
                Ok(()) => debug!("File deleted successfully: {}", pth.display()),
                Err(e) => eprintln!("Failed to delete file: {}. Error: {}", pth.display(), e),
            }
        }
    }

    info!(
        "Finished lib scan at {}",
        Local::now().format("%Y-%m-%d %H:%M:%S")
    );

    Ok(())
}
