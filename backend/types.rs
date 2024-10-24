use serde_derive::{Deserialize, Serialize};
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
