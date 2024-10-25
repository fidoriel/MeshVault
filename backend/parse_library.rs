use crate::schema::models3d;
use crate::schema::models3d::dsl::*;
use crate::types::ModelPackV0_1;
use crate::types::{Model3D, NewModel3D};
use crate::Config;
use chrono::Local;
use diesel::prelude::*;
use diesel::SqliteConnection;
use diesel_async::pooled_connection::bb8::Pool;
use diesel_async::sync_connection_wrapper::SyncConnectionWrapper;
use diesel_async::RunQueryDsl;
use std::collections::HashSet;
use std::path::PathBuf;
use tokio::fs;
use tracing::{debug, info};
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
            if pth.file_name() == Some("modelpack.json".as_ref()) {
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

    let possibly_old_models = models3d.load::<Model3D>(&mut connection).await.unwrap();

    for model in possibly_old_models {
        if !dirs_set.contains(&PathBuf::from(&model.path)) {
            diesel::delete(models3d.filter(id.eq(model.id)))
                .execute(&mut connection)
                .await
                .unwrap();

            debug!(
                "Deleted model from database: {:?} (id: {})",
                model.path, model.id
            );
        }
    }

    // add new or update models

    for dir in data_dirs {
        let model_pack_meta = get_modelpack_meta(&dir).await.unwrap();

        let relative_dir = pathdiff::diff_paths(&dir, &config.libraries_path).unwrap();

        let result: Option<Model3D> = models3d
            .filter(path.eq(relative_dir.to_str().unwrap()))
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
            diesel::update(models3d.find(existing_model.id))
                .set((
                    title.eq(&new_object.title),
                    name.eq(&new_object.name),
                    license.eq(&new_object.license),
                    author.eq(&new_object.author),
                    origin.eq(&new_object.origin),
                    images.eq(new_object.images),
                ))
                .execute(&mut connection)
                .await
                .unwrap();
            debug!("Updated {:?}", new_object.path)
        } else {
            diesel::insert_into(models3d::table)
                .values(&new_object)
                .execute(&mut connection)
                .await
                .unwrap();
            debug!("Created {:?}", new_object.path)
        }
    }

    // generate previews
    fs::create_dir_all(config.preview_cache_dir.clone()).await?;
    let models = models3d.load::<Model3D>(&mut connection).await.unwrap();

    for model in models {
        let mut pth = config.libraries_path.clone();
        pth.push(model.path);
        pth.push("files");

        debug!("starting search for {:?}", pth);
        for entry in walkdir::WalkDir::new(pth) {
            let mesh_files = ["stl", "3mf", "obj"];
            let entry = entry.unwrap();
            let file_path = entry.path();

            if file_path.is_dir() {
                continue;
            }

            if let Some(extension) = file_path.extension() {
                if !mesh_files.contains(&extension.to_str().unwrap()) {
                    continue;
                }
            }

            let mut img_path = config.preview_cache_dir.clone();
            img_path.push(format!("{}.png", Uuid::new_v4()));

            let mut render_config = stl_thumb::config::Config::default();
            render_config.stl_filename = file_path.to_str().unwrap().to_string();
            render_config.img_filename = img_path.to_str().unwrap().to_string();

            stl_thumb::render_to_file(&render_config).unwrap();
        }
    }

    info!(
        "Finished lib scan at {}",
        Local::now().format("%Y-%m-%d %H:%M:%S")
    );

    Ok(())
}
