pub mod books_cache;

use std::{
    collections::HashMap,
    fs::{self, File},
    io::Read,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::core::book::model::Book;

/// Disk cache for parsed book Books
pub struct BookCache {
    cache_dir: PathBuf,
    index: CacheIndex,
}

#[derive(Serialize, Deserialize, Default)]
pub struct CacheIndex {
    /// file_path -> (sha256_hash, last_accessed, Book_count)
    entries: HashMap<String, CacheEntry>,
}

#[derive(Serialize, Deserialize)]
pub struct CacheEntry {
    pub file_hash: String,
    pub last_modified: u64,
    pub last_accessed: u64,
    pub book_count: usize,
    pub cached_at: u64,
}

impl BookCache {
    pub fn new(cache_dir: PathBuf) -> Self {
        fs::create_dir_all(&cache_dir).ok();

        let index_path = cache_dir.join("cache_index.json");
        let index = if index_path.exists() {
            let content = fs::read_to_string(&index_path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            CacheIndex::default()
        };

        Self { cache_dir, index }
    }

    /// Compute SHA256 of file
    pub fn compute_hash(path: &std::path::Path) -> Option<String> {
        let mut file = File::open(path).ok()?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];
        loop {
            let n = file.read(&mut buffer).ok()?;
            if n == 0 {
                break;
            }
            hasher.update(&buffer[..n]);
        }
        Some(format!("{:x}", hasher.finalize()))
    }

    /// Check if cache is valid (file unchanged since cache)
    pub fn is_cache_valid(&self, file_path: &str) -> bool {
        self.index.entries.get(file_path).is_some()
    }

    /// Get cached Books
    pub fn get_books(&self, file_path: &str) -> Option<Vec<Book>> {
        let entry = self.index.entries.get(file_path)?;
        let books_path = self
            .cache_dir
            .join(format!("{}.Books.json", entry.file_hash));

        if books_path.exists() {
            let content = fs::read_to_string(&books_path).ok()?;
            let books: Vec<Book> = serde_json::from_str(&content).ok()?;

            // Update access time in index
            Some(books)
        } else {
            None
        }
    }

    /// Save Books to cache
    pub fn set_books(&mut self, file_path: &str, file_hash: &str, Books: &[Book]) {
        // Remove old entry if exists
        if let Some(old_entry) = self.index.entries.remove(file_path) {
            let old_path = self
                .cache_dir
                .join(format!("{}.Books.json", old_entry.file_hash));
            fs::remove_file(old_path).ok();
        }

        // Write new Books
        let books_path = self.cache_dir.join(format!("{}.Books.json", file_hash));
        if let Ok(json) = serde_json::to_string(Books) {
            let _ = fs::write(&books_path, json);
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        self.index.entries.insert(
            file_path.to_string(),
            CacheEntry {
                file_hash: file_hash.to_string(),
                last_modified: now,
                last_accessed: now,
                book_count: Books.len(),
                cached_at: now,
            },
        );

        self.save_index();
    }

    /// Clear all cache
    pub fn clear(&mut self) {
        for entry in self.index.entries.values() {
            let path = self
                .cache_dir
                .join(format!("{}.Books.json", entry.file_hash));
            fs::remove_file(path).ok();
        }
        self.index.entries.clear();
        self.save_index();
    }

    /// Get cache stats
    pub fn get_stats(&self) -> CacheStats {
        let total_size: u64 = self
            .index
            .entries
            .values()
            .map(|e| {
                let path = self.cache_dir.join(format!("{}.Books.json", e.file_hash));
                fs::metadata(path).map(|m| m.len()).unwrap_or(0)
            })
            .sum();

        CacheStats {
            cached_books: self.index.entries.len(),
            total_size_bytes: total_size,
        }
    }

    /// Remove expired entries (optional: based on max_age_seconds)
    pub fn prune(&mut self, max_age_seconds: u64) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let expired: Vec<String> = self
            .index
            .entries
            .iter()
            .filter(|(_, e)| now - e.cached_at > max_age_seconds)
            .map(|(k, _)| k.clone())
            .collect();

        for key in &expired {
            if let Some(entry) = self.index.entries.remove(key) {
                let path = self
                    .cache_dir
                    .join(format!("{}.Books.json", entry.file_hash));
                fs::remove_file(path).ok();
            }
        }

        if !expired.is_empty() {
            self.save_index();
        }
    }

    fn save_index(&self) {
        let index_path = self.cache_dir.join("cache_index.json");
        if let Ok(json) = serde_json::to_string(&self.index) {
            let _ = fs::write(&index_path, json);
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CacheStats {
    pub cached_books: usize,
    pub total_size_bytes: u64,
}
