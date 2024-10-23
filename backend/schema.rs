// @generated automatically by Diesel CLI.

diesel::table! {
    posts (id) {
        id -> Integer,
        title -> Text,
        name -> Text,
        license -> Nullable<Text>,
        author -> Nullable<Text>,
        path -> Nullable<Text>,
        origin -> Nullable<Text>,
    }
}
