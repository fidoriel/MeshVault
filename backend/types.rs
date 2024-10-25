use std::path::PathBuf;

use crate::schema::{files3d, models3d};
use crate::Config;
use anyhow::{Error, Result};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use stl_thumb::config::{self};
use str_slug::StrSlug;
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
    pub path: String,
    pub origin: Option<String>,
    pub date_added: Option<NaiveDateTime>,
    pub images: String,
}

impl Model3D {
    pub fn relative_image_paths(&self) -> Vec<PathBuf> {
        return comma_separated_to_pathbuf_vec(&self.images);
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
        let prefixed_images: Vec<String> = model
            .relative_image_paths()
            .iter()
            .map(|image| format!("{}{}", config.asset_prefix, image.display()))
            .collect();

        Ok(ModelResponse {
            id: model.id,
            title: model.title.clone(),
            name: model.name.clone(),
            license: model.license.clone(),
            author: model.author.clone(),
            origin: model.origin.clone(),
            images: prefixed_images,
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
            let model_response = ModelResponse::from_model_3d(&m, &config).unwrap();
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
    pub path: String,
    pub origin: Option<String>,
    pub images: String,
}

impl NewModel3D {
    pub fn from_model_pack_v0_1(
        pack: &ModelPackV0_1,
        path: &PathBuf,
        image_paths: Vec<PathBuf>,
    ) -> Result<NewModel3D, Error> {
        Ok(NewModel3D {
            title: pack.title.clone(),
            name: str_slug::slug(pack.title.clone()),
            license: Some(pack.license.clone()),
            author: Some(pack.author.clone()),
            path: path.clone().into_os_string().into_string().unwrap(),
            origin: Some(pack.origin.clone()),
            images: pathbuf_vec_to_comma_separated(image_paths),
        })
    }

    pub fn relative_image_paths(&self) -> Vec<PathBuf> {
        return comma_separated_to_pathbuf_vec(&self.images);
    }
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Queryable, Identifiable, Associations, Selectable)]
#[diesel(belongs_to(Model3D, foreign_key = model_id))]
#[diesel(table_name = files3d)]
pub struct File3D {
    pub id: i32,
    pub model_id: i32,
    pub path: String,
    pub preview_image: Option<String>,
    pub date_added: Option<NaiveDateTime>,
    pub file_hash: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Insertable)]
#[diesel(table_name = files3d)]
pub struct NewFile3D {
    pub model_id: i32,
    pub path: String,
    pub preview_image: Option<String>,
    pub file_hash: Option<String>,
}
