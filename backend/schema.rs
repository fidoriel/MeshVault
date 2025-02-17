// @generated automatically by Diesel CLI.

diesel::table! {
    files3d (id) {
        id -> Integer,
        model_id -> Integer,
        file_path -> Text,
        preview_image -> Nullable<Text>,
        date_added -> Nullable<Timestamp>,
        file_hash -> Nullable<Text>,
        file_size_bytes -> Integer,
    }
}

diesel::table! {
    models3d (id) {
        id -> Integer,
        title -> Text,
        name -> Text,
        license -> Nullable<Text>,
        author -> Nullable<Text>,
        folder_path -> Text,
        origin -> Nullable<Text>,
        date_added -> Nullable<Timestamp>,
        images -> Text,
        description -> Text,
    }
}

diesel::joinable!(files3d -> models3d (model_id));

diesel::allow_tables_to_appear_in_same_query!(files3d, models3d,);
