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
    pub author: Option<String>,
    pub language: Option<String>,
    pub cover: Option<Vec<u8>>, // байтовый массив обложки
    pub path: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Chapter {
    pub id: String,
    pub title: Option<String>,
    pub html: String,
    pub order: usize,
}
