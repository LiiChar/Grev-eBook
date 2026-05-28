use crate::core::{
    book::model::{Book, Chapter},
    formats::{
        docx::DocxLoader, epub::EpubLoader, fb2::Fb2Loader, html::HtmlLoader,
        markdown::MarkdownLoader, pdf::PdfLoader, txt::TxtLoader,
    },
    utils::get_files_with_extension,
};

use rand::RngExt;
use regex::Regex;
use sha2::{Digest, Sha256};
use tauri_plugin_log::log;

use anyhow::{Error, Result};
use tokio::{time::Instant};
use whatlang::detect;
use std::{
    collections::HashSet, fs::{self, File}, path::{Path, PathBuf}, time::UNIX_EPOCH
};
use rayon::prelude::*;

pub trait BookSource {
    fn can_load(&self, path: &Path) -> bool;
    fn load(&self, path: &Path, chapters: bool) -> Result<Book>;
    fn decode_text(&self, _bytes: &[u8]) -> Result<String> {
        Err(anyhow::anyhow!(
            "Text decoding not supported for this format"
        ))
    }
    fn generate_id(&self, title: String) -> String {
        let mut hasher = Sha256::new();

        hasher.update(title.as_bytes());

        let result = hasher.finalize();

        format!("{:x}", result)
    }
    fn get_language(&self, chapters: &[Chapter]) -> Result<String> {
        if chapters.is_empty() {
            return Ok("en".to_string());
        }

        let mut rng = rand::rng();

        let start = rng.random_range(0..chapters.len());
        let end = rng.random_range(start + 1..=chapters.len());

        let text = chapters[start..end]
            .iter()
            .map(|chapter| html_to_text(&chapter.html))
            .collect::<Vec<_>>()
            .join(" ");

        let clean_text = text.trim();

        if clean_text.is_empty() {
            return Ok("en".to_string());
        }

        if clean_text.chars().count() < 20 {
            return Ok("en".to_string());
        }

        let lang = detect(clean_text)
            .map(|info| info.lang().code())
            .unwrap_or("en");

        Ok(lang.to_string())
    }

    fn get_size(&self, path: &Path) -> Result<u64> {
        let file = File::open(path)?;
        let metadata = file.metadata()?;
        Ok(metadata.len())
    }

    fn get_last_modified(&self, path: &Path) -> Result<u64> {
        let metadata = fs::metadata(path)?;
        Ok(metadata.modified()?.duration_since(UNIX_EPOCH)?.as_secs())
    }

    fn get_last_read_at(&self, path: &Path) -> Result<u64> {
        let metadata = fs::metadata(path)?;
        Ok(metadata.modified()?.duration_since(UNIX_EPOCH)?.as_secs())
    }

    fn get_created_at(&self, path: &Path) -> Result<u64> {
        let metadata = fs::metadata(path)?;
        Ok(metadata.created()?.duration_since(UNIX_EPOCH)?.as_secs())
    }

    fn get_chars_read(&self, chapters: &[Chapter]) -> Result<u64> {
        let count = chapters
            .iter()
            .map(|c| c.html.chars().count() as u64)
            .sum();
        println!("chars_read: {}", chapters.len());
        Ok(count)
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
        Box::new(PdfLoader),
    ]
}

pub fn get_books(path: &Path) -> Result<Vec<Book>, Error> {
    log::info!("Starting to collect book paths from {:?}", path);

    let books_paths = collect_book_paths(path);

    log::info!("Collected {} book paths", books_paths.len());

    let books: Vec<Book> = books_paths
        .par_iter()
        .filter_map(|path| {
            log::debug!("Loading book {:?}", path);

            match get_book(path, Some(false)) {
                Ok(book) => Some(book),
                Err(err) => {
                    log::warn!("Failed to load book {:?}: {}", path, err);
                    None
                }
            }
        })
        .collect();

    log::info!("Loaded {} books successfully", books.len());

    Ok(books)
}

pub fn get_book(path: &Path, load_chapters: Option<bool>) -> Result<Book, Error> {
    for loader in available_sources() {
        if loader.can_load(path) {
            let now = Instant::now();
            match loader.load(path, load_chapters.unwrap_or(false)) {
                Ok(mut book) => {
                    if book.meta.path.is_empty() {
                        book.meta.path = path.to_string_lossy().to_string();
                    }
                    log::info!("Load file by path {}: {:?}", &path.display(), now.elapsed());
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
        "txt", "epub", "fb2", "zip", "html", "htm", "md", "markdown", "docx", "pdf"
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



pub fn html_to_text(html: &str) -> String {
    let re: Regex = Regex::new(r"<[^>]*>").unwrap();
    re.replace_all(html, " ").to_string()
}