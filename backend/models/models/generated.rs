/* @generated and managed by dsync */

#[allow(unused)]
use crate::diesel::*;
use crate::schema::*;

pub type ConnectionType = diesel::sqlite::SqliteConnection;

/// Struct representing a row in table `models`
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, diesel::Queryable, diesel::Selectable, diesel::QueryableByName, diesel::Identifiable)]
#[diesel(table_name=models, primary_key(id))]
pub struct Models {
    /// Field representing column `id`
    pub id: i32,
    /// Field representing column `title`
    pub title: String,
    /// Field representing column `name`
    pub name: String,
    /// Field representing column `license`
    pub license: Option<String>,
    /// Field representing column `author`
    pub author: Option<String>,
    /// Field representing column `path`
    pub path: String,
    /// Field representing column `origin`
    pub origin: Option<String>,
    /// Field representing column `date_added`
    pub date_added: Option<chrono::NaiveDateTime>,
}

/// Create Struct for a row in table `models` for [`Models`]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, diesel::Insertable)]
#[diesel(table_name=models)]
pub struct CreateModels {
    /// Field representing column `id`
    pub id: i32,
    /// Field representing column `title`
    pub title: String,
    /// Field representing column `name`
    pub name: String,
    /// Field representing column `license`
    pub license: Option<String>,
    /// Field representing column `author`
    pub author: Option<String>,
    /// Field representing column `path`
    pub path: String,
    /// Field representing column `origin`
    pub origin: Option<String>,
    /// Field representing column `date_added`
    pub date_added: Option<chrono::NaiveDateTime>,
}

/// Update Struct for a row in table `models` for [`Models`]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, diesel::AsChangeset, PartialEq, Default)]
#[diesel(table_name=models)]
pub struct UpdateModels {
    /// Field representing column `title`
    pub title: Option<String>,
    /// Field representing column `name`
    pub name: Option<String>,
    /// Field representing column `license`
    pub license: Option<Option<String>>,
    /// Field representing column `author`
    pub author: Option<Option<String>>,
    /// Field representing column `path`
    pub path: Option<String>,
    /// Field representing column `origin`
    pub origin: Option<Option<String>>,
    /// Field representing column `date_added`
    pub date_added: Option<Option<chrono::NaiveDateTime>>,
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

impl Models {
    /// Insert a new row into `models` with a given [`CreateModels`]
    pub fn create(db: &mut ConnectionType, item: &CreateModels) -> diesel::QueryResult<Self> {
        use crate::schema::models::dsl::*;

        diesel::insert_into(models).values(item).get_result::<Self>(db)
    }

    /// Get a row from `models`, identified by the primary key
    pub fn read(db: &mut ConnectionType, param_id: i32) -> diesel::QueryResult<Self> {
        use crate::schema::models::dsl::*;

        models.filter(id.eq(param_id)).first::<Self>(db)
    }

    /// Update a row in `models`, identified by the primary key with [`UpdateModels`]
    pub fn update(db: &mut ConnectionType, param_id: i32, item: &UpdateModels) -> diesel::QueryResult<Self> {
        use crate::schema::models::dsl::*;

        diesel::update(models.filter(id.eq(param_id))).set(item).get_result(db)
    }

    /// Delete a row in `models`, identified by the primary key
    pub fn delete(db: &mut ConnectionType, param_id: i32) -> diesel::QueryResult<usize> {
        use crate::schema::models::dsl::*;

        diesel::delete(models.filter(id.eq(param_id))).execute(db)
    }
}
