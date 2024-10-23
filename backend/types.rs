use serde_derive::{Deserialize, Serialize};
use typeshare::typeshare;
use url::Url;

#[typeshare]
#[derive(Serialize, Deserialize, Debug)]
pub struct ModelPackV0_1 {
    schema_version: u32,
    name: String,
    author: String,
    origin: String,
    license: u32,
}
