use serde::{Deserialize, Serialize};

use crate::core::reader::ReadingPosition;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Book {
    pub id: String,
    pub meta: BookMeta,
    pub chapters: Option<Vec<Chapter>>,
    pub position: Option<ReadingPosition>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BookMeta {
    pub title: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub language: Option<String>,
    pub cover: Option<String>,
    pub path: String,
    pub size: u64,
    pub last_read_at: u64,
    pub last_modified: u64,
    pub created_at: u64,
    pub progress_read: Option<f32>,
    pub chars_read: Option<u64>,
    pub genres: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Chapter {
    pub id: String,
    pub title: Option<String>,
    pub html: String,
    pub order: usize,
}
