use std::sync::RwLock;

use crate::core::book::model::Book;

/// In-memory cache for the full books list.
/// Avoids repeated serialization of potentially large book data
/// (chapters content, metadata, etc.) on every `get_books` call.
pub struct BooksListCache {
    inner: RwLock<Option<Vec<Book>>>,
}

impl BooksListCache {
    pub fn new() -> Self {
        Self {
            inner: RwLock::new(None),
        }
    }

    /// Get cached books list, if available.
    pub fn get(&self) -> Option<Vec<Book>> {
        self.inner.read().ok().and_then(|cache| cache.clone())
    }

    /// Update the cache with a fresh books list.
    pub fn set(&self, books: Vec<Book>) {
        if let Ok(mut cache) = self.inner.write() {
            *cache = Some(books);
        }
    }

    /// Invalidate the cache (e.g. after adding/removing books).
    pub fn invalidate(&self) {
        if let Ok(mut cache) = self.inner.write() {
            *cache = None;
        }
    }
}

impl Default for BooksListCache {
    fn default() -> Self {
        Self::new()
    }
}
