/* @generated and managed by dsync */

#[allow(unused)]
use crate::diesel::*;
use crate::models::models::Models;
use crate::schema::*;

pub type ConnectionType = diesel::sqlite::SqliteConnection;

/// Struct representing a row in table `files`
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, diesel::Queryable, diesel::Selectable, diesel::QueryableByName, diesel::Associations, diesel::Identifiable)]
#[diesel(table_name=files, primary_key(id), belongs_to(Models, foreign_key=model_id))]
pub struct Files {
    /// Field representing column `id`
    pub id: i32,
    /// Field representing column `model_id`
    pub model_id: i32,
    /// Field representing column `path`
    pub path: String,
    /// Field representing column `preview_image`
    pub preview_image: Option<String>,
    /// Field representing column `date_added`
    pub date_added: Option<chrono::NaiveDateTime>,
    /// Field representing column `file_hash`
    pub file_hash: Option<String>,
}

/// Create Struct for a row in table `files` for [`Files`]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, diesel::Insertable)]
#[diesel(table_name=files)]
pub struct CreateFiles {
    /// Field representing column `id`
    pub id: i32,
    /// Field representing column `model_id`
    pub model_id: i32,
    /// Field representing column `path`
    pub path: String,
    /// Field representing column `preview_image`
    pub preview_image: Option<String>,
    /// Field representing column `date_added`
    pub date_added: Option<chrono::NaiveDateTime>,
    /// Field representing column `file_hash`
    pub file_hash: Option<String>,
}

/// Update Struct for a row in table `files` for [`Files`]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, diesel::AsChangeset, PartialEq, Default)]
#[diesel(table_name=files)]
pub struct UpdateFiles {
    /// Field representing column `model_id`
    pub model_id: Option<i32>,
    /// Field representing column `path`
    pub path: Option<String>,
    /// Field representing column `preview_image`
    pub preview_image: Option<Option<String>>,
    /// Field representing column `date_added`
    pub date_added: Option<Option<chrono::NaiveDateTime>>,
    /// Field representing column `file_hash`
    pub file_hash: Option<Option<String>>,
}

/// Result of a `.paginate` function
#[derive(Debug, serde::Serialize)]
pub struct PaginationResult<T> {
    /// Resulting items that are from the current page
    pub items: Vec<T>,
    /// The count of total items there are
    pub total_items: i64,
    /// Current page, 0-based index
    pub page: i64,
    /// Size of a page
    pub page_size: i64,
    /// Number of total possible pages, given the `page_size` and `total_items`
    pub num_pages: i64,
}

impl Files {
    /// Insert a new row into `files` with a given [`CreateFiles`]
    pub fn create(db: &mut ConnectionType, item: &CreateFiles) -> diesel::QueryResult<Self> {
        use crate::schema::files::dsl::*;

        diesel::insert_into(files).values(item).get_result::<Self>(db)
    }

    /// Get a row from `files`, identified by the primary key
    pub fn read(db: &mut ConnectionType, param_id: i32) -> diesel::QueryResult<Self> {
        use crate::schema::files::dsl::*;

        files.filter(id.eq(param_id)).first::<Self>(db)
    }

    /// Update a row in `files`, identified by the primary key with [`UpdateFiles`]
    pub fn update(db: &mut ConnectionType, param_id: i32, item: &UpdateFiles) -> diesel::QueryResult<Self> {
        use crate::schema::files::dsl::*;

        diesel::update(files.filter(id.eq(param_id))).set(item).get_result(db)
    }

    /// Delete a row in `files`, identified by the primary key
    pub fn delete(db: &mut ConnectionType, param_id: i32) -> diesel::QueryResult<usize> {
        use crate::schema::files::dsl::*;

        diesel::delete(files.filter(id.eq(param_id))).execute(db)
    }
}
