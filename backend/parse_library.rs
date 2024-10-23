use anyhow::Result;
use std::path::PathBuf;
use tokio::fs;

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
