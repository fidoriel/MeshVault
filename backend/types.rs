use serde_derive::{Deserialize, Serialize};
use url::Url;

use ts_rs::TS;

#[derive(TS, Serialize, Deserialize, Debug)]
#[ts(export)]
pub struct ModelPackV0_1 {
    schema_version: u32,
    name: String,
    author: String,
    origin: String,
    license: u32,
}
