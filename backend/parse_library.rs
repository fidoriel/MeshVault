use anyhow::Result;
use diesel::SqliteConnection;
use std::path::PathBuf;
use tokio::fs;

use crate::types::ModelPackV0_1;

pub async fn find_modelpack_directories(start_path: PathBuf) -> Result<Vec<PathBuf>> {
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
            let path = entry.path();
            if path.file_name() == Some("modelpack.json".as_ref()) {
                has_modelpack = true;
            } else if path.is_dir() {
                subdirs.push(path);
            }
        }

        if has_modelpack {
            modelpack_dirs.push(current_dir);
        } else {
            dirs_to_check.extend(subdirs);
        }
    }

    Ok(modelpack_dirs)
}

pub async fn get_modpack_meta(
    mut path: PathBuf,
) -> Result<ModelPackV0_1, Box<dyn std::error::Error>> {
    path.push("modelpack.json");

    let data = fs::read_to_string(path).await?;
    let model_pack: ModelPackV0_1 = serde_json::from_str(&data)?;

    Ok(model_pack)
}

pub async fn refresh_library(connection: SqliteConnection) {
    let data_dirs = find_modelpack_directories(PathBuf::from("3dassets"))
        .await
        .unwrap();

    for dir in data_dirs {}
}
