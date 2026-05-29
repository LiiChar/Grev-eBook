use rayon::range;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::core::reader::{ReadingPosition, TextRange};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "lowercase")]
pub enum BookmarkKind {
    Regular,
    Custom,
}

impl Default for BookmarkKind {
    fn default() -> Self {
        Self::Regular
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Bookmark {
    pub id: String,
    pub book_path: String,
    pub position: ReadingPosition,
    pub preview: String,
    pub kind: BookmarkKind,
    pub created_at: i64,
    pub range: TextRange
}

impl Bookmark {
    pub fn new(
        book_path: String,
        position: ReadingPosition,
        preview: String,
        kind: BookmarkKind,
        created_at: i64,
        range: TextRange,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            book_path,
            position,
            preview,
            kind,
            created_at,
            range
        }
    }
}
