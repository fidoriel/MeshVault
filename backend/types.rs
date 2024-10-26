use std::fs::File;
use std::path::PathBuf;

use crate::schema::{files3d, models3d};
use crate::Config;
use anyhow::{Error, Result};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_async::{AsyncConnection, RunQueryDsl};
use serde::{Deserialize, Serialize};
use typeshare::typeshare;

fn comma_separated_to_pathbuf_vec(input: &str) -> Vec<PathBuf> {
    input.split(',').map(|s| PathBuf::from(s.trim())).collect()
}

fn pathbuf_vec_to_comma_separated(paths: Vec<PathBuf>) -> String {
    paths
        .iter()
        .map(|path| path.to_string_lossy().into_owned())
        .collect::<Vec<String>>()
        .join(",")
}

#[typeshare]
#[derive(Serialize, Deserialize, Debug)]
pub struct ModelPackV0_1 {
    version: String,
    title: String,
    author: String,
    origin: String,
    license: String,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Queryable, Identifiable, Selectable)]
#[diesel(table_name = models3d)]
pub struct Model3D {
    pub id: i32,
    pub title: String,
    pub name: String,
    pub license: Option<String>,
    pub author: Option<String>,
    pub folder_path: String,
    pub origin: Option<String>,
    pub date_added: Option<NaiveDateTime>,
    pub images: String,
}

impl Model3D {
    pub fn relative_image_paths(&self) -> Vec<PathBuf> {
        comma_separated_to_pathbuf_vec(&self.images)
    }
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize)]
pub struct ModelResponse {
    pub id: i32,
    pub title: String,
    pub name: String,
    pub license: Option<String>,
    pub author: Option<String>,
    pub origin: Option<String>,
    pub images: Vec<String>,
}

impl ModelResponse {
    pub fn from_model_3d(model: &Model3D, config: &Config) -> Result<ModelResponse, Error> {
        let images: Vec<String> = comma_separated_to_pathbuf_vec(&model.images)
            .iter()
            .map(|p| {
                format!(
                    "{}/{}/{}",
                    config.asset_prefix,
                    model.folder_path,
                    p.to_string_lossy()
                )
            })
            .collect();

        Ok(ModelResponse {
            id: model.id,
            title: model.title.clone(),
            name: model.name.clone(),
            license: model.license.clone(),
            author: model.author.clone(),
            origin: model.origin.clone(),
            images,
        })
    }
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize)]
pub struct ModelResponseList {
    pub models: Vec<ModelResponse>,
}

impl ModelResponseList {
    pub fn from_model_3d(model: Vec<Model3D>, config: &Config) -> Result<ModelResponseList, Error> {
        let mut models: Vec<ModelResponse> = Vec::new();

        for m in model {
            let model_response = ModelResponse::from_model_3d(&m, config).unwrap();
            models.push(model_response);
        }

        let response = ModelResponseList { models };
        Ok(response)
    }
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Insertable)]
#[diesel(table_name = models3d)]
pub struct NewModel3D {
    pub title: String,
    pub name: String,
    pub license: Option<String>,
    pub author: Option<String>,
    pub folder_path: String,
    pub origin: Option<String>,
    pub images: String,
}

impl NewModel3D {
    pub fn from_model_pack_v0_1(
        pack: &ModelPackV0_1,
        folder_path: &PathBuf,
        image_paths: Vec<PathBuf>,
    ) -> Result<Self, Error> {
        Ok(Self {
            title: pack.title.clone(),
            name: str_slug::slug(pack.title.clone()),
            license: Some(pack.license.clone()),
            author: Some(pack.author.clone()),
            folder_path: folder_path.clone().into_os_string().into_string().unwrap(),
            origin: Some(pack.origin.clone()),
            images: pathbuf_vec_to_comma_separated(image_paths),
        })
    }

    pub fn relative_image_paths(&self) -> Vec<PathBuf> {
        comma_separated_to_pathbuf_vec(&self.images)
    }
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Queryable, Identifiable, Associations, Selectable)]
#[diesel(belongs_to(Model3D, foreign_key = model_id))]
#[diesel(table_name = files3d)]
pub struct File3D {
    pub id: i32,
    pub model_id: i32,
    pub file_path: String,
    pub preview_image: Option<String>,
    pub date_added: Option<NaiveDateTime>,
    pub file_hash: Option<String>,
}

impl File3D {
    pub async fn get_model<Conn>(&self, connection: &mut Conn) -> Model3D
    where
        Conn: AsyncConnection<Backend = diesel::sqlite::Sqlite>,
    {
        models3d::table
            .filter(models3d::dsl::id.eq(self.model_id))
            .first::<Model3D>(connection)
            .await
            .unwrap()
    }

    pub async fn get_file_path<Conn>(&self, connection: &mut Conn, config: &Config) -> PathBuf
    where
        Conn: AsyncConnection<Backend = diesel::sqlite::Sqlite>,
    {
        let mut file_pth = config.libraries_path.clone();
        file_pth.push(self.get_model(connection).await.folder_path);
        file_pth.push(&self.file_path);

        file_pth
    }

    pub async fn get_url_file_path<Conn>(&self, connection: &mut Conn, config: &Config) -> String
    where
        Conn: AsyncConnection<Backend = diesel::sqlite::Sqlite>,
    {
        format!(
            "{}/{}/{}",
            config.asset_prefix,
            self.get_model(connection).await.folder_path,
            &self.file_path
        )
    }

    pub fn get_url_preview_path(&self, config: &Config) -> String {
        format!(
            "{}/{}",
            config.cache_prefix.clone(),
            &self.preview_image.clone().unwrap()
        )
    }
}

#[derive(Debug, Serialize, Deserialize, Insertable)]
#[diesel(table_name = files3d)]
pub struct NewFile3D {
    pub model_id: i32,
    pub file_path: String,
    pub preview_image: Option<String>,
    pub file_hash: Option<String>,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize)]
pub struct DetailedFileResponse {
    pub id: i32,
    pub model_id: i32,
    pub file_path: String,
    pub preview_image: Option<String>,
    pub date_added: Option<NaiveDateTime>,
    pub file_hash: Option<String>,
}

impl DetailedFileResponse {
    pub async fn from_file_3d<Conn>(file: &File3D, connection: &mut Conn, config: &Config) -> Self
    where
        Conn: AsyncConnection<Backend = diesel::sqlite::Sqlite>,
    {
        let url_file_path = file.get_url_file_path(connection, config).await;

        Self {
            id: file.id,
            model_id: file.model_id,
            file_path: url_file_path,
            preview_image: Some(file.get_url_preview_path(&config)),
            date_added: file.date_added,
            file_hash: file.file_hash.clone(),
        }
    }
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize)]
pub struct DetailedModelResponse {
    pub id: i32,
    pub title: String,
    pub name: String,
    pub license: Option<String>,
    pub author: Option<String>,
    pub origin: Option<String>,
    pub images: Vec<String>,
    pub files: Vec<DetailedFileResponse>,
}

impl DetailedModelResponse {
    pub async fn from_model_3d<Conn>(
        model: &Model3D,
        config: &Config,
        connection: &mut Conn,
    ) -> Result<Self, Error>
    where
        Conn: AsyncConnection<Backend = diesel::sqlite::Sqlite>,
    {
        let mut images: Vec<String> = comma_separated_to_pathbuf_vec(&model.images)
            .iter()
            .map(|p| {
                format!(
                    "{}/{}/{}",
                    config.asset_prefix,
                    model.folder_path,
                    p.to_string_lossy()
                )
            })
            .collect();

        let files = files3d::dsl::files3d
            .filter(files3d::dsl::model_id.eq(model.id))
            .load::<File3D>(connection)
            .await?;

        for file in &files {
            images.push(file.get_url_preview_path(config));
        }

        let mut detailed_files: Vec<DetailedFileResponse> = Vec::new();

        for file in &files {
            let detailed_file = DetailedFileResponse::from_file_3d(file, connection, &config).await;
            detailed_files.push(detailed_file);
        }

        Ok(Self {
            id: model.id,
            title: model.title.clone(),
            name: model.name.clone(),
            license: model.license.clone(),
            author: model.author.clone(),
            origin: model.origin.clone(),
            images: images,
            files: detailed_files,
        })
    }
}
