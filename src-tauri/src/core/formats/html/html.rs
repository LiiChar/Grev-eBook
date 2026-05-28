use std::{fs, path::Path};

use anyhow::Result;
use uuid::Uuid;

use crate::core::{
    book::model::{Book, BookMeta, Chapter},
    formats::loader::BookSource,
    utils::normalize_text,
};

pub struct HtmlLoader;

impl BookSource for HtmlLoader {
    fn can_load(&self, path: &Path) -> bool {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| matches!(e.to_ascii_lowercase().as_str(), "html" | "htm"))
            .unwrap_or(false)
    }

    fn load(&self, path: &Path, _with_chapters: bool) -> Result<Book> {
        let bytes = fs::read(path)?;
        let html = self.decode_text(&bytes)?;
        let title = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled")
            .to_string();

        let chapter = Chapter {
            id: Uuid::new_v4().to_string(),
            title: Some(title.clone()),
            html,
            order: 0,
        };

        Ok(Book {
            id: self.generate_id(title.clone()),
            meta: BookMeta {
                title,
                author: None,
                language: Some(self.get_language(&vec![chapter.clone()]).unwrap_or("en".into())),
                cover: None,
                path: path.to_string_lossy().to_string(),
                size: self.get_size(&path)?,
                last_read_at: self.get_last_read_at(&path)?,
                last_modified: self.get_last_modified(&path)?,
                created_at: self.get_created_at(&path)?,
                description: None,
                chars_read: Some(self.get_chars_read(&vec![chapter.clone()])?),
                progress_read: None,
                genres: None,
            },
            chapters: Some(vec![chapter]),
            position: None,
        })
    }

    fn decode_text(&self, bytes: &[u8]) -> Result<String> {
        if let Ok(text) = std::str::from_utf8(bytes) {
            return Ok(normalize_text(text));
        }

        let (cow, _, _) = encoding_rs::WINDOWS_1251.decode(bytes);
        Ok(normalize_text(&cow))
    }
}
