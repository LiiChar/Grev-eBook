use std::fs;
use std::path::Path;

use anyhow::Result;
use encoding_rs::{UTF_8, WINDOWS_1251};
use uuid::Uuid;

use crate::core::{
    book::model::{Book, BookMeta},
    formats::loader::BookSource,
    utils::{normalize_text, split_into_chapters},
};

pub struct TxtLoader;

impl BookSource for TxtLoader {
    fn can_load(&self, path: &Path) -> bool {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("txt"))
            .unwrap_or(false)
    }

    fn load(&self, path: &Path, chapters: bool) -> Result<Book> {
        let bytes = fs::read(path)?;
        let text = self.decode_text(&bytes)?;

        let title = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled")
            .to_string();

        let chapters = match chapters {
            true => Some(split_into_chapters(&text)),
            false => None,
        };

        Ok(Book {
            id: Uuid::new_v4().to_string(),
            meta: BookMeta {
                title,
                author: None,
                language: None,
                cover: None,
                path: path.to_string_lossy().to_string(),
            },
            chapters,
            position: None,
        })
    }

    fn decode_text(&self, bytes: &[u8]) -> Result<String> {
        // пробуем UTF-8
        if let Ok(text) = std::str::from_utf8(bytes) {
            return Ok(normalize_text(text));
        }

        // пробуем Windows-1251 (99% русских txt)
        let (cow, _, had_errors) = WINDOWS_1251.decode(bytes);
        if !had_errors {
            return Ok(normalize_text(&cow));
        }

        // fallback
        let (cow, _, _) = UTF_8.decode(bytes);
        Ok(normalize_text(&cow))
    }
}
