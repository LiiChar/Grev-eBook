use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::core::reader::TextLocation;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct TextRange {
    pub start: TextLocation,
    pub end: TextLocation,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Note {
    pub id: String,
    pub preview: String,
    pub book_path: String,
    pub range: TextRange,
    pub text: String,
    pub highlight: bool,
    pub highlight_color: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Note {
    pub fn new(
        book_path: String,
        range: TextRange,
        text: String,
        preview: String,
        highlight: bool,
        highlight_color: Option<String>,
        created_at: i64,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            book_path,
            range,
            text,
            preview,
            highlight,
            highlight_color,
            created_at,
            updated_at: created_at,
        }
    }
}
