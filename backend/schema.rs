// @generated automatically by Diesel CLI.

diesel::table! {
    collections (id) {
        id -> Integer,
        name -> Text,
        date_added -> Nullable<Timestamp>,
    }
}

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
    model_collections (id) {
        id -> Integer,
        model_id -> Integer,
        collection_id -> Integer,
        date_added -> Nullable<Timestamp>,
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
        favourite -> Bool,
    }
}

diesel::joinable!(files3d -> models3d (model_id));
diesel::joinable!(model_collections -> collections (collection_id));
diesel::joinable!(model_collections -> models3d (model_id));

diesel::allow_tables_to_appear_in_same_query!(collections, files3d, model_collections, models3d,);
