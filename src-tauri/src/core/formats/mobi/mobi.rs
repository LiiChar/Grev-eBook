use std::fs;
use std::path::Path;

use anyhow::{anyhow, Result};
use image::EncodableLayout;
use mobi_book::MobiBook;
use scraper::{ElementRef, Html, Selector};
use uuid::Uuid;
use encoding_rs::{UTF_8, WINDOWS_1251};

use crate::core::{
    book::model::{Book, BookMeta, Chapter},
    formats::loader::BookSource,
};

pub struct MobiLoader;

impl BookSource for MobiLoader {
    fn can_load(&self, path: &Path) -> bool {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| {
                matches!(
                    e.to_ascii_lowercase().as_str(),
                    "mobi" | "azw" | "azw3"
                )
            })
            .unwrap_or(false)
    }

    fn load(
        &self,
        path: &Path,
        load_chapters: bool,
        return_chapters: bool,
    ) -> Result<Book> {
        let bytes = fs::read(path)?;

        let book = MobiBook::new(&bytes).unwrap();

        let title = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled")
            .to_string();


        // Cover image
        if let Ok(Some(cover)) = book.cover() {
            println!("Cover: {} bytes, {}", cover.data.len(), cover.format.mime_type());
        }

        // Text content (decompressed lazily on first call)
        let chapters = match book.text_content() {
            Ok(text) => self.split_html_into_chapters(&text),
            Err(e) => {
                println!("Error decompressing MOBI: {:?}", e);
                vec![]
            }
        };


        Ok(Book {
            id: Uuid::new_v4().to_string(),
            meta: BookMeta {
                title: book.metadata().title.clone().unwrap_or(title),
                author: Some(book.metadata().authors.join(" ")),
                language: Some("en".into()),
                cover_path: None,
                path: path.to_string_lossy().to_string(),
                size: self.get_size(path)?,
                last_read_at: self.get_last_read_at(path)?,
                last_modified: self.get_last_modified(path)?,
                created_at: self.get_created_at(path)?,
                description: None,
                chars_read: Some(self.get_chars_read(&chapters)?),
                progress_read: None,
                genres: None,
                count_chapters: chapters.len() as i64,
            },
            chapters: if return_chapters {
                Some(chapters)
            } else {
                None
            },
            position: None,
        })
    } 
}

impl MobiLoader {

    fn split_html_into_chapters(&self, html: &str) -> Vec<Chapter> {
        let document = Html::parse_document(html);

        let pb_selector = Selector::parse("mbp\\:pagebreak").unwrap();

        let mut chapters: Vec<Chapter> = Vec::new();

        for (index, pb) in document.select(&pb_selector).enumerate() {

            // ищем span внутри pagebreak
            let span_selector = Selector::parse("span").unwrap();
            let span = pb.select(&span_selector).next();

            if let Some(span) = span {

                let title = self.extract_title(span)
                    .unwrap_or_else(|| format!("Chapter {}", index + 1));

                let html_content = span.html();

                chapters.push(Chapter {
                    id: Uuid::new_v4().to_string(),
                    title: Some(title),
                    html: html_content,
                    order: index,
                });
            }
        }

        if !chapters.is_empty() {
            return chapters;
        }

        vec![Chapter {
            id: Uuid::new_v4().to_string(),
            title: Some("Chapter 1".into()),
            html: html.to_string(),
            order: 0,
        }]
    }

    fn extract_title(&self, span: ElementRef) -> Option<String> {
        let bold_selector = Selector::parse("b").ok()?;

        let bold = span.select(&bold_selector).next()?;

        let mut parts: Vec<String> = Vec::new();

        // берём ВСЕ текстовые узлы внутри <b>
        for text in bold.text() {
            let t = text.trim();

            if t.is_empty() {
                continue;
            }

            // фильтр мусора
            if t == "\n" || t == "\t" {
                continue;
            }

            parts.push(t.to_string());
        }

        if parts.is_empty() {
            return None;
        }

        // нормализация
        let cleaned: Vec<String> = parts
            .into_iter()
            .map(|s| s.split_whitespace().collect::<Vec<_>>().join(" "))
            .collect();

        Some(if cleaned.len() == 1 {
            cleaned[0].clone()
        } else {
            format!("{} — {}", cleaned[0], cleaned[1..].join(" "))
        })
    }
}