use crate::core::{
    book::model::{Book, BookMeta, Chapter},
    formats::loader::BookSource,
};
use anyhow::Result;
use base64::{engine::general_purpose, Engine};
#[cfg(not(target_os = "android"))]
use mupdf::{Document, FilePath, Page, TextPageFlags};
use std::path::Path;
use tauri::window;
use uuid::Uuid;

pub struct PdfLoader;

impl BookSource for PdfLoader {
    fn load(&self, path: &Path, _with_chapters: bool) -> Result<Book> {
        let path_str = path
            .to_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid file path"))?;

        let mut chapters = Vec::new();

        let mut title = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled")
            .to_string();

        let mut author = None;

        #[cfg(not(target_os = "android"))]
        {
            let doc = Document::open(path_str)?;

            let pages = doc
                .pages()
                .map_err(|e| anyhow::anyhow!("Failed get pages from pdf document by {}", e))?;

            title = match doc.metadata(mupdf::MetadataName::Title) {
                Ok(t) => t,
                Err(_) => title,
            };

            author = match doc.metadata(mupdf::MetadataName::Author) {
                Ok(a) => Some(a),
                Err(_) => None,
            };

            for (i, page) in pages.enumerate() {
                let html = page
                    .map_err(|e| anyhow::anyhow!("Failed get page from pdf document"))?
                    .to_text_page(TextPageFlags::all())
                    .map_err(|e| {
                        anyhow::anyhow!("Failed convert page from pdf document by {}", e)
                    })?;

                let text = html.to_html(0, true).map_err(|e| {
                    anyhow::anyhow!("Failed convert TextPage from pdf document by {}", e)
                })?;

                chapters.push(Chapter {
                    id: Uuid::new_v4().to_string(),
                    title: None,
                    html: text,
                    order: i.to_owned(),
                });
            }
        }
        Ok(Book {
            id: self.generate_id(title.clone()),
            meta: BookMeta {
                title: title,
                author: author,
                language: None,
                cover: None,
                path: path.to_string_lossy().to_string(),
            },
            position: None,
            chapters: Some(chapters),
        })
    }

    fn can_load(&self, path: &Path) -> bool {
        path.extension().map(|e| e == "pdf").unwrap_or(false)
    }

}
