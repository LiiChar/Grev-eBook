use std::{fs, path::Path};

use anyhow::Result;
use pulldown_cmark::{html, Options, Parser};
use uuid::Uuid;

use crate::core::{
    book::model::{Book, BookMeta, Chapter},
    formats::loader::BookSource,
    utils::normalize_text,
};

pub struct MarkdownLoader;

impl BookSource for MarkdownLoader {
    fn can_load(&self, path: &Path) -> bool {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| matches!(e.to_ascii_lowercase().as_str(), "md" | "markdown"))
            .unwrap_or(false)
    }

    fn load(&self, path: &Path, _with_chapters: bool) -> Result<Book> {
        let bytes = fs::read(path)?;
        let markdown = self.decode_text(&bytes)?;
        let html = markdown_to_html(&markdown);
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
                language: None,
                cover: None,
                path: path.to_string_lossy().to_string(),
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

fn markdown_to_html(markdown: &str) -> String {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_TASKLISTS);

    let parser = Parser::new_ext(markdown, options);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    html_output
}
