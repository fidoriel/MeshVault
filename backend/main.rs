use axum::extract::State;
use axum::{http::StatusCode, response::Html, routing::get, Router};
use serde_derive::Deserialize;
use std::io::{self, Write};
use std::path::PathBuf;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};
use url::Url;

mod types;
use types::ModelPackV0_1;

mod parse_library;
use parse_library::find_modelpack_directories;

#[derive(Clone, Debug, Deserialize)]
struct Config {
    libraries_path: PathBuf,
    host: String,
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

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api = Router::new()
        .route("/lib/", get(paths))
        .route("/", get(hello_world));

    let serve_dir = ServeDir::new("dist");

    let app = Router::new()
        .nest("/api/", api)
        .nest_service("/3d", ServeDir::new("3dassets"))
        .route_service("/", ServeFile::new("dist/index.html"))
        .fallback_service(serve_dir);

    let listener = tokio::net::TcpListener::bind(config.host.to_string())
        .await
        .unwrap();

    println!("Server running on {}", config.host);
    io::stdout().flush().unwrap(); // Flush the output immediately

    axum::serve(listener, app).await.unwrap();
}
