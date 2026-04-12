use serde::{Deserialize, Serialize};

use crate::core::reader::Bookmark;

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
pub struct BookmarkStore {
    pub items: Vec<Bookmark>,
}
