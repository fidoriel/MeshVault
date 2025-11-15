use axum::http::StatusCode;
use axum::response::Response;
use axum::{
    body::Body,
    extract::Path,
    extract::{DefaultBodyLimit, Query, State},
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use axum::{http, Json};
use diesel::prelude::*;
use diesel::query_builder::AsQuery;
use diesel::sqlite::SqliteConnection;
use diesel_async::pooled_connection::bb8::Pool;
use diesel_async::pooled_connection::AsyncDieselConnectionManager;
use diesel_async::pooled_connection::ManagerConfig;
use diesel_async::sync_connection_wrapper::SyncConnectionWrapper;
use diesel_async::{AsyncConnection, RunQueryDsl};
use diesel_migrations::MigrationHarness;
use diesel_migrations::{embed_migrations, EmbeddedMigrations};
use http::header::{self};
use schema::files3d::{self};
use serde_derive::{Deserialize, Serialize};
use std::path::PathBuf;
use std::str::FromStr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};
use tracing::{debug, error, info};
use tracing_subscriber::EnvFilter;
use types::{DetailedModelResponse, FileType, ModelResponseList};

pub mod convert;
pub mod parse_library;
pub mod schema;
pub mod stream_dl;
pub mod types;
pub mod upload;
use crate::schema::models3d;
use crate::types::File3D;
use crate::types::ListModelParams;
use crate::types::Model3D;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Config {
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
    #[serde(default = "default_cache_prefix")]
    cache_prefix: String,
    #[serde(skip_deserializing)]
    database_url: PathBuf,
    #[serde(skip_deserializing)]
    upload_cache: PathBuf,
    #[serde(skip_deserializing)]
    preview_cache_dir: PathBuf,
    #[serde(skip_deserializing)]
    address: String,
}

fn default_host() -> String {
    "localhost".to_string()
}

fn default_port() -> String {
    "51100".to_string()
}

fn default_log_level() -> String {
    "info".to_string()
}

fn default_asset_prefix() -> String {
    "/3d".to_string()
}

fn default_cache_prefix() -> String {
    "/cache".to_string()
}

impl Config {
    fn initialize(&mut self) {
        self.database_url = self.data_dir.join("db.sqlite3");
        self.preview_cache_dir = self.data_dir.join("preview_cache");
        self.address = format!("{}:{}", self.host, self.port);
        self.upload_cache = self.data_dir.join("upload_cache");
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
pub struct AppState {
    config: Config,
    pool: Pool<SyncConnectionWrapper<SqliteConnection>>,
}

async fn healthz() -> impl IntoResponse {
    (StatusCode::OK, "Done".to_string())
}

async fn get_model_by_slug(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    let mut connection = state.pool.get().await.unwrap();

    let result = models3d::dsl::models3d
        .filter(models3d::dsl::name.eq(slug))
        .first::<Model3D>(&mut connection)
        .await
        .unwrap();
    let response = DetailedModelResponse::from_model_3d(&result, &state.config, &mut connection)
        .await
        .unwrap();
    (StatusCode::OK, Json(response))
}

async fn refresh_model(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    let mut connection = state.pool.get().await.unwrap();

    let result = models3d::dsl::models3d
        .filter(models3d::dsl::name.eq(slug.clone()))
        .first::<Model3D>(&mut connection)
        .await
        .unwrap();
    result.scan(&state.config, &mut connection).await;

    let reloaded_result = models3d::dsl::models3d
        .filter(models3d::dsl::name.eq(slug))
        .first::<Model3D>(&mut connection)
        .await
        .unwrap();
    let response =
        DetailedModelResponse::from_model_3d(&reloaded_result, &state.config, &mut connection)
            .await
            .unwrap();
    (StatusCode::OK, Json(response))
}

async fn delete_model(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    let mut connection = state.pool.get().await.unwrap();

    let result = models3d::dsl::models3d
        .filter(models3d::dsl::name.eq(slug))
        .first::<Model3D>(&mut connection)
        .await
        .unwrap();
    match result.delete(&state.config, &mut connection).await {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

async fn delete_file(State(state): State<AppState>, Path(pk): Path<i32>) -> impl IntoResponse {
    let mut connection = state.pool.get().await.unwrap();

    let result = files3d::dsl::files3d
        .filter(files3d::dsl::id.eq(pk))
        .first::<File3D>(&mut connection)
        .await
        .unwrap();
    match result.delete(&state.config, &mut connection).await {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

async fn toggle_like(State(state): State<AppState>, Path(slug): Path<String>) -> impl IntoResponse {
    let mut connection = state.pool.get().await.unwrap();

    let model = models3d::dsl::models3d
        .filter(models3d::dsl::name.eq(slug))
        .first::<Model3D>(&mut connection)
        .await
        .unwrap();

    let new_favourite = !model.favourite;
    diesel::update(models3d::dsl::models3d.filter(models3d::dsl::id.eq(model.id)))
        .set(models3d::dsl::favourite.eq(new_favourite))
        .execute(&mut connection)
        .await
        .unwrap();

    (
        StatusCode::OK,
        Json(serde_json::json!({"favourite": new_favourite})),
    )
}

async fn convert_file(
    State(state): State<AppState>,
    Path((pk, target_type)): Path<(i32, String)>,
) -> impl IntoResponse {
    let mut connection = state.pool.get().await.unwrap();

    let result = files3d::dsl::files3d
        .filter(files3d::dsl::id.eq(pk))
        .first::<File3D>(&mut connection)
        .await
        .unwrap();

    let mut file_ending = "";
    let buffer = match FileType::from_str(&target_type) {
        Ok(FileType::STL) => match result.to_stl(&mut connection, &state.config).await {
            Ok(buffer) => {
                file_ending = "stl";
                buffer
            }
            Err(e) => {
                debug!("Error converting file: {}", e);
                return Err(StatusCode::UNPROCESSABLE_ENTITY);
            }
        },
        Ok(FileType::THREEMF) => match result.to_threemf(&mut connection, &state.config).await {
            Ok(buffer) => {
                file_ending = "3mf";
                buffer
            }
            Err(e) => {
                debug!("Error converting file: {}", e);
                return Err(StatusCode::UNPROCESSABLE_ENTITY);
            }
        },
        Ok(FileType::IGES) => match result.to_iges(&mut connection, &state.config).await {
            Ok(buffer) => {
                file_ending = "iges";
                buffer
            }
            Err(e) => {
                debug!("Error converting file: {}", e);
                return Err(StatusCode::UNPROCESSABLE_ENTITY);
            }
        },
        Ok(FileType::STEP) => match result.to_step(&mut connection, &state.config).await {
            Ok(buffer) => {
                file_ending = "step";
                buffer
            }
            Err(e) => {
                debug!("Error converting file: {}", e);
                return Err(StatusCode::UNPROCESSABLE_ENTITY);
            }
        },
        _ => return Err(StatusCode::UNPROCESSABLE_ENTITY),
    };
    let body = Body::from(buffer);

    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/octet-stream")
        .header(
            header::CONTENT_DISPOSITION,
            format!(
                "attachment; filename=\"{}.{}\"",
                result.get_file_name().await.unwrap(),
                file_ending
            )
            .as_str(),
        )
        .body(body)
        .unwrap();

    Ok(response)
}

async fn handle_refresh(State(state): State<AppState>) -> impl IntoResponse {
    parse_library::refresh_library(state.pool, state.config.clone())
        .await
        .unwrap();

    (StatusCode::OK, "Done".to_string())
}

async fn list_models(
    State(state): State<AppState>,
    Query(params): Query<ListModelParams>,
) -> impl IntoResponse {
    let mut connection = state.pool.get().await.unwrap();

    let mut models = models3d::dsl::models3d.into_boxed();

    if let Some(ref q) = params.q {
        let pattern = format!("%{}%", q);
        models = models.filter(
            models3d::dsl::name
                .like(pattern.clone())
                .or(models3d::dsl::title.like(pattern.clone()))
                .or(models3d::dsl::description.like(pattern.clone()))
                .or(models3d::dsl::author.like(pattern.clone())),
        );
    }

    if let Some(ref author) = params.author {
        let pattern = format!("%{}%", author);
        models = models.filter(models3d::dsl::author.like(pattern));
    }

    if let Some(licenses) = params.licenses {
        let split_licenses: Vec<Option<String>> = licenses
            .clone()
            .split(',')
            .map(|s| Some(s.to_string()))
            .collect();
        for (i, license) in split_licenses.iter().enumerate() {
            debug!("Filtering models with license: {:?}", license.clone());
            if i == 0 {
                models = models.filter(models3d::dsl::license.eq(license.clone()));
            } else {
                models = models.or_filter(models3d::dsl::license.eq(license.clone()));
            }
        }
    }

    if let Some(favourite) = params.favourite {
        models = models.filter(models3d::dsl::favourite.eq(favourite));
    }

    let licenses_to_select: Vec<String> = models3d::dsl::models3d
        .select(models3d::dsl::license)
        .distinct()
        .filter(models3d::dsl::license.ne(""))
        .load::<Option<String>>(&mut connection)
        .await
        .unwrap()
        .into_iter()
        .filter_map(|license| license)
        .collect();

    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(100);
    let offset = (page - 1) * page_size;

    models = models.limit(page_size).offset(offset);

    let response = ModelResponseList::from_model_3d(
        models.load::<Model3D>(&mut connection).await.unwrap(),
        licenses_to_select,
        &state.config,
        &mut connection,
    )
    .await
    .unwrap();

    (StatusCode::OK, Json(response))
}

async fn handle_zip_download(
    State(state): State<AppState>,
    Path(folder_path): Path<String>,
) -> impl IntoResponse {
    let mut path = state.config.libraries_path.clone();
    path.push(folder_path);
    stream_dl::zip_folder_stream(path, &state.config).await
}

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("./migrations");

async fn create_connection_pool(config: &Config) -> Pool<SyncConnectionWrapper<SqliteConnection>> {
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

    match serde_json::to_string(&config) {
        Ok(json) => debug!("Config: {}", json),
        Err(e) => error!("Failed to serialize config: {}", e),
    }

    migrate(&config);

    let pool = create_connection_pool(&config).await;

    let app_state = AppState {
        config: config.clone(),
        pool,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api = Router::new()
        .route("/refresh", post(handle_refresh))
        .route("/models/list", get(list_models))
        .route("/model/:slug", get(get_model_by_slug))
        .route("/model/:slug/refresh", get(refresh_model))
        .route("/model/:slug/update", post(upload::handle_upload_update))
        .route("/model/:slug/delete", post(delete_model))
        .route("/model/:slug/like", post(toggle_like))
        .route("/file/:id/delete", post(delete_file))
        .route("/file/:id/convert/:target_type", get(convert_file))
        .route("/download/:folder", get(handle_zip_download))
        .route("/upload", post(upload::handle_upload))
        .layer(DefaultBodyLimit::disable())
        .with_state(app_state);

    let app = Router::new()
        .route("/healthz", get(healthz))
        .nest("/api/", api)
        .nest_service(
            &config.asset_prefix.to_string(),
            ServeDir::new(config.libraries_path),
        )
        .nest_service(
            &config.cache_prefix.to_string(),
            ServeDir::new(config.preview_cache_dir),
        )
        .nest_service(
            "/",
            ServeDir::new("dist").fallback(ServeFile::new("dist/index.html")),
        )
        .fallback(fallback_404)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(&config.address.to_string())
        .await
        .unwrap();

    info!("Server running on {}", config.address);

    axum::serve(listener, app).await.unwrap();
}
