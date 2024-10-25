use crate::schema::{files3d, models3d};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use typeshare::typeshare;

#[typeshare]
#[derive(Serialize, Deserialize, Debug)]
pub struct ModelPackV0_1 {
    schema_version: u32,
    title: String,
    author: String,
    origin: String,
    license: String,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Queryable, Identifiable)]
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
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize, Queryable, Identifiable, Associations)]
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
