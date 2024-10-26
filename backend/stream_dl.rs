use axum::{
    body::{Body, Bytes},
    http::{header, HeaderValue, Response},
    response::IntoResponse,
};
use std::{io::Write, path::PathBuf};
use tokio::fs::File as TokioFile;
use tokio::io::AsyncReadExt;
use tracing::{debug, error};
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

use crate::Config;

fn collect_files_to_compress(dir: &PathBuf) -> anyhow::Result<Vec<PathBuf>> {
    let mut files = Vec::new();
    for entry in walkdir::WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path().to_path_buf();
        if path.is_file() {
            files.push(path);
        }
    }
    Ok(files)
}

pub async fn zip_folder_stream(folder_path: PathBuf, config: &Config) -> impl IntoResponse {
    let files = match collect_files_to_compress(&folder_path) {
        Ok(files) => files,
        Err(err) => {
            return Response::builder()
                .status(500)
                .body(format!("Error: {}", err).into())
                .unwrap();
        }
    };

    let lib_dir = config.libraries_path.clone();

    let stream = async_stream::stream! {
        let mut buffer = Vec::new(); // use https://doc.rust-lang.org/std/io/struct.BorrowedBuf.html in the future
        let mut append_zip = ZipWriter::new(std::io::Cursor::new(&mut buffer));

        for file_path in files {
            debug!("{:?}", file_path.to_str().unwrap());


            if let Ok(mut file) = TokioFile::open(&file_path).await {
                let mut contents = Vec::new();
                if let Err(err) = file.read_to_end(&mut contents).await {
                    error!("Error reading file {}: {}", file_path.display(), err);
                    continue;
                }

                let zip_path = pathdiff::diff_paths(&file_path, &lib_dir).unwrap();

                let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);
                if let Err(err) = append_zip.start_file(zip_path.to_str().unwrap(), options) {
                    error!("Error adding file to zip {}: {}", file_path.display(), err);
                    continue;
                }

                if let Err(err) = append_zip.write_all(&contents) {
                    error!("Error writing file to zip {}: {}", file_path.display(), err);
                    continue;
                }
            }
        }

        if let Err(err) = append_zip.finish() {
            error!("Error finishing zip archive: {}", err);
        }

        yield Ok::<_, std::io::Error>(Bytes::from(buffer));
    };

    let stream_body = Body::from_stream(stream);
    Response::builder()
        .header(header::CONTENT_TYPE, "application/zip")
        .header(
            header::CONTENT_DISPOSITION,
            HeaderValue::from_str(&format!(
                "attachment; filename=\"{}.zip\"",
                folder_path.file_name().unwrap().to_string_lossy()
            ))
            .unwrap(),
        )
        .body(stream_body)
        .unwrap()
}
