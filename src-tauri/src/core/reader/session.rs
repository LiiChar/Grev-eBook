use serde::{Deserialize, Serialize};

use crate::core::reader::ReadingPosition;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum ReaderMode {
    Scroll,
    Chapters,
}

impl Default for ReaderMode {
    fn default() -> Self {
        Self::Chapters
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ReadingSession {
    pub book_path: String,
    pub position: ReadingPosition,
    pub mode: ReaderMode,
    pub last_opened_at: i64,
    pub last_read_at: i64,
}

impl ReadingSession {
    pub fn new(book_path: String, position: ReadingPosition, mode: ReaderMode, now: i64) -> Self {
        Self {
            book_path,
            position,
            mode,
            last_opened_at: now,
            last_read_at: now,
        }
    }
}
