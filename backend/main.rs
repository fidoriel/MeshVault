use axum::extract::State;
use axum::{response::Html, routing::get, Router};
use serde_derive::Deserialize;
use std::path::PathBuf;
use std::sync::Arc;
use url::Url;

mod types;
use types::ModelPackV0_1;

mod parse_library;
use parse_library::find_modelpack_directories;

#[derive(Clone, Debug, Deserialize)]
struct Config {
    libraries_path: PathBuf,
}

#[derive(Clone)]
struct AppState {
    config: Config,
}

async fn paths() -> Html<String> {
    let start_dir = PathBuf::from("./3dassets");
    let modelpack_directories = find_modelpack_directories(start_dir).await.unwrap();
    let mut paths_string = String::new();
    for dir in modelpack_directories {
        paths_string.push_str(&format!("{}\n", dir.display()));
    }

    Html(paths_string)
}

async fn hello_world() -> Html<&'static str> {
    Html("<h1>Hello, World!</h1>")
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let config = match envy::from_env::<Config>() {
        Ok(config) => config,
        Err(error) => panic!("{:#?}", error),
    };

    let api = Router::new()
        .route("/lib/", get(paths))
        .route("/", get(hello_world));

    let app = Router::new()
        .route("/", get(hello_world))
        .nest("/api/", api);

    let listener = tokio::net::TcpListener::bind("localhost:3000")
        .await
        .unwrap();

    axum::serve(listener, app).await.unwrap();
}
