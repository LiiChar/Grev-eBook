use crate::core::{
    book::model::Book,
    formats::{
        docx::DocxLoader, epub::EpubLoader, fb2::Fb2Loader, html::HtmlLoader,
        markdown::MarkdownLoader, txt::TxtLoader,
    },
    utils::get_files_with_extension,
};

use tauri_plugin_log::log;

use anyhow::Error;
use std::{
    collections::HashSet,
    path::{Path, PathBuf},
};

pub trait BookSource {
    fn can_load(&self, path: &Path) -> bool;
    fn load(&self, path: &Path, chapters: bool) -> Result<Book, Error>;
    fn decode_text(&self, _bytes: &[u8]) -> Result<String, Error> {
        Err(anyhow::anyhow!(
            "Text decoding not supported for this format"
        ))
    }
}

fn available_sources() -> Vec<Box<dyn BookSource>> {
    vec![
        Box::new(TxtLoader),
        Box::new(EpubLoader),
        Box::new(Fb2Loader),
        Box::new(HtmlLoader),
        Box::new(MarkdownLoader),
        Box::new(DocxLoader),
    ]
}

pub fn get_books(path: &Path) -> Result<Vec<Book>, Error> {
    log::info!("Starting to collect book paths from {:?}", path);
    let books_paths = collect_book_paths(path);
    log::info!("Collected {} book paths", books_paths.len());
    let mut books = Vec::new();

    for (i, path) in books_paths.iter().enumerate() {
        log::debug!("Loading book {}: {:?}", i + 1, path);
        match get_book(&path, Some(false)) {
            Ok(book) => books.push(book),
            Err(err) => {
                log::warn!("Failed to load book {:?}: {}", path, err);
            }
        }
    }

    log::info!("Loaded {} books successfully", books.len());
    Ok(books)
}

pub fn get_book(path: &Path, load_chapters: Option<bool>) -> Result<Book, Error> {
    for loader in available_sources() {
        if loader.can_load(path) {
            log::info!("Load file by path {}", &path.display());
            match loader.load(path, load_chapters.unwrap_or(false)) {
                Ok(mut book) => {
                    if book.meta.path.is_empty() {
                        book.meta.path = path.to_string_lossy().to_string();
                    }
                    return Ok(book);
                }
                Err(err) => return Err(err),
            }
        }
    }

    log::warn!("Failed parse file by path {}", &path.display());
    Err(anyhow::anyhow!("Unsupported format"))
}

fn collect_book_paths(path: &Path) -> Vec<PathBuf> {
    if !path.exists() {
        log::warn!("Book path does not exist: {:?}", path);
        return Vec::new();
    }
    log::debug!("Collecting book paths from {:?}", path);
    let extensions = [
        "txt", "epub", "fb2", "zip", "html", "htm", "md", "markdown", "docx",
    ];
    let mut unique = HashSet::new();
    let mut result = Vec::new();

    for ext in extensions {
        let files = get_files_with_extension(path, ext);
        log::debug!("Found {} files with extension {}", files.len(), ext);
        for path in files {
            if unique.insert(path.clone()) {
                result.push(path);
            }
        }
    }

    log::debug!("Total unique book paths: {}", result.len());
    result
}
