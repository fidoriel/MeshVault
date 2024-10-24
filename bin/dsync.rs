use dsync::{GenerationConfig, TableOptions};
use std::{collections::HashMap, path::PathBuf};

pub fn main() {
    let dir = env!("CARGO_MANIFEST_DIR");

    dsync::generate_files(
        PathBuf::from_iter([dir, "backend/schema.rs"]).as_path(),
        PathBuf::from_iter([dir, "backend/models"]).as_path(),
        GenerationConfig {
            connection_type: "diesel::sqlite::SqliteConnection".to_string(),
            options: Default::default(),
        },
    );
}
