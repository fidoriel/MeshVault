use axum::{
    http::StatusCode,
    response::Html,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use diesel::prelude::*;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use serde_derive::Deserialize;
use std::io::{self, Write};
use std::path::PathBuf;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};
use tracing::info;
use tracing_subscriber;
use tracing_subscriber::EnvFilter;

mod parse_library;
pub mod types;
use parse_library::find_modelpack_directories;

#[derive(Clone, Debug, Deserialize)]
struct Config {
    libraries_path: PathBuf,
    #[serde(default = "default_log_level")]
    log_level: String,
    data_dir: PathBuf,
    #[serde(default = "default_host")]
    host: String,
    #[serde(default = "default_port")]
    port: String,
    #[serde(skip)]
    database_url: PathBuf,
    #[serde(skip)]
    preview_cache_dir: PathBuf,
    #[serde(skip)]
    address: String,
}

fn default_host() -> String {
    "localhost".to_string()
}

fn default_port() -> String {
    "3000".to_string()
}

fn default_log_level() -> String {
    "info".to_string()
}

impl Config {
    fn initialize(&mut self) {
        self.database_url = self.data_dir.join("db.sqlite3");
        self.preview_cache_dir = self.data_dir.join("preview_cache");
        self.address = format!("{}:{}", self.host, self.port);
    }
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

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("./migrations");

async fn db_setup(database_url: PathBuf) -> SqliteConnection {
    let mut connection = SqliteConnection::establish(database_url.to_str().expect("Invalid Path"))
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url.display()));

    info!("DB connection established successfully");
    info!("Please wait while DB is migrating");

    connection
        .run_pending_migrations(MIGRATIONS)
        .unwrap_or_else(|e| panic!("Error running migrations: {}", e));

    info!("Migrations completed successfully");

    connection
}

async fn fallback_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, "404 Not Found")
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let mut init_config = match envy::from_env::<Config>() {
        Ok(config) => config,
        Err(error) => panic!("{:#?}", error),
    };
    init_config.initialize();
    let config = init_config;
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::new(config.log_level))
        .init();

    let connection: SqliteConnection = db_setup(config.database_url).await;

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
        .fallback_service(serve_dir)
        .fallback(fallback_404)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(config.address.to_string())
        .await
        .unwrap();

    info!("Server running on {}", config.address);

    axum::serve(listener, app).await.unwrap();
}
