// @generated automatically by Diesel CLI.

diesel::table! {
    files (id) {
        id -> Integer,
        model_id -> Integer,
        path -> Text,
        preview_image -> Nullable<Text>,
        date_added -> Nullable<Timestamp>,
        file_hash -> Nullable<Text>,
    }
}

diesel::table! {
    models (id) {
        id -> Integer,
        title -> Text,
        name -> Text,
        license -> Nullable<Text>,
        author -> Nullable<Text>,
        path -> Text,
        origin -> Nullable<Text>,
        date_added -> Nullable<Timestamp>,
    }
}

diesel::joinable!(files -> models (model_id));

diesel::allow_tables_to_appear_in_same_query!(
    files,
    models,
);
