use anyhow::Ok;
use axum::Json;
use axum::{
    extract::Path,
    extract::State,
    http::StatusCode,
    response::{Html, IntoResponse},
    routing::{get, post},
    Router,
};
use diesel::sqlite::SqliteConnection;
use diesel::{connection, prelude::*};
use diesel_async::async_connection_wrapper::AsyncConnectionWrapper;
use diesel_async::pooled_connection::bb8::{Pool, PooledConnection};
use diesel_async::pooled_connection::AsyncDieselConnectionManager;
use diesel_async::pooled_connection::ManagerConfig;
use diesel_async::sync_connection_wrapper::SyncConnectionWrapper;
use diesel_async::{AsyncConnection, RunQueryDsl};
use diesel_migrations::MigrationHarness;
use diesel_migrations::{embed_migrations, EmbeddedMigrations};
use serde_derive::Deserialize;
use std::{os::linux::raw::stat, path::PathBuf};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};
use tracing::{debug, info};
use tracing_subscriber::EnvFilter;
use types::ModelResponseList;

mod parse_library;
pub mod schema;
pub mod types;
use crate::schema::models3d;
use crate::schema::models3d::dsl::*;
use crate::types::{File3D, Model3D, NewModel3D};

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
    #[serde(default = "default_asset_prefix")]
    asset_prefix: String,
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

fn default_asset_prefix() -> String {
    "/3d".to_string()
}

impl Config {
    fn initialize(&mut self) {
        self.database_url = self.data_dir.join("db.sqlite3");
        self.preview_cache_dir = self.data_dir.join("preview_cache");
        self.address = format!("{}:{}", self.host, self.port);
    }
}

fn parse_config() -> Config {
    let mut init_config = match envy::from_env::<Config>() {
        Result::Ok(config) => config,
        Err(error) => panic!("{:#?}", error),
    };
    init_config.initialize();
    init_config
}

#[derive(Clone)]
struct AppState {
    config: Config,
    pool: Pool<SyncConnectionWrapper<SqliteConnection>>,
}

async fn healthz() -> impl IntoResponse {
    (StatusCode::OK, format!("Done"))
}

async fn get_model_by_slug(Path(slug): Path<String>) -> impl IntoResponse {
    (StatusCode::OK, format!("Model slug: {}", slug))
}

async fn handle_refresh(State(state): State<AppState>) -> impl IntoResponse {
    parse_library::refresh_library(state.pool, state.config.clone())
        .await
        .unwrap();

    (StatusCode::OK, format!("Done"))
}

async fn list_models(State(state): State<AppState>) -> impl IntoResponse {
    let mut connection = state.pool.get().await.unwrap();

    let all_models = models3d.load::<Model3D>(&mut connection).await.unwrap();
    let response = ModelResponseList::from_model_3d(all_models, &state.config).unwrap();

    (StatusCode::OK, Json(response))
}

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("./migrations");

async fn get_connection_pool(config: &Config) -> Pool<SyncConnectionWrapper<SqliteConnection>> {
    let mut db_config = ManagerConfig::default();
    db_config.custom_setup =
        Box::new(|url| SyncConnectionWrapper::<SqliteConnection>::establish(url));
    let mgr =
        AsyncDieselConnectionManager::<SyncConnectionWrapper<SqliteConnection>>::new_with_config(
            config.database_url.to_str().unwrap(),
            db_config,
        );

    Pool::builder().max_size(10).build(mgr).await.unwrap()
}

fn migrate(config: &Config) {
    let mut connection =
        SqliteConnection::establish(config.database_url.to_str().expect("Invalid Path"))
            .unwrap_or_else(|_| panic!("Error connecting to {}", config.database_url.display()));

    info!("DB connection established successfully");
    info!("Please wait while DB is migrating");

    connection
        .run_pending_migrations(MIGRATIONS)
        .unwrap_or_else(|e| panic!("Error running migrations: {}", e));

    info!("Migrations completed successfully");
}

async fn fallback_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, "404 Not Found")
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let config = parse_config();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::new(config.log_level.clone()))
        .init();

    debug!("Debug logs enabled");

    migrate(&config);

    let pool = get_connection_pool(&config).await;

    let app_state = AppState {
        config: config.clone(),
        pool: pool,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api = Router::new()
        .route("/refresh", post(handle_refresh))
        .route("/models/list", get(list_models))
        .route("/models/:slug", get(get_model_by_slug))
        .with_state(app_state);

    let serve_dir = ServeDir::new("dist");

    let app = Router::new()
        .route("/healthz", get(healthz))
        .nest("/api/", api)
        .nest_service(
            &config.asset_prefix.to_string(),
            ServeDir::new(config.libraries_path),
        )
        .route_service("/", ServeFile::new("dist/index.html"))
        .fallback_service(serve_dir)
        .fallback(fallback_404)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(&config.address.to_string())
        .await
        .unwrap();

    info!("Server running on {}", config.address);

    axum::serve(listener, app).await.unwrap();
}
