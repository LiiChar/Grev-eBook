use std::{collections::HashMap, path::Path};

use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;
use tokio::time::Instant;

use crate::{
    core::{
        book::cover::{self, bytes_to_data_url, save_cover},
        book::model::Book,
        formats::{get_book as gBook, get_books as gBooks},
        storage::{load_state, save_state, STORE_PATH},
    },
};

fn now_ts() -> i64 {
    match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(d) => d.as_millis() as i64,
        Err(_) => 0,
    }
}

fn merge_books(existing_books: &mut Vec<Book>, incoming_books: Vec<Book>) {
    let mut by_id: HashMap<String, Book> = existing_books
        .drain(..)
        .map(|b| (b.id.clone(), b))
        .collect();

    let mut by_path: HashMap<String, String> = by_id
        .values()
        .map(|b| (b.meta.path.clone(), b.id.clone()))
        .collect();

    let mut result = Vec::with_capacity(by_id.len() + incoming_books.len());

    for mut book in incoming_books {
        let id = by_path
            .get(&book.meta.path)
            .cloned()
            .or_else(|| by_id.contains_key(&book.id).then(|| book.id.clone()));

        if let Some(id) = id {
            if let Some(old) = by_id.remove(&id) {
                book.id = old.id;

                if book.chapters.as_ref().map(|c| c.is_empty()).unwrap_or(true) {
                    book.chapters = old.chapters;
                }
            }
        }

        by_path.insert(book.meta.path.clone(), book.id.clone());
        by_id.insert(book.id.clone(), book);
    }

    result.extend(by_id.into_values());
    *existing_books = result;
}
#[tauri::command]
pub async fn open_book(app: AppHandle, path: String) -> Result<Book, String> {
    let now = Instant::now();
    let path = Path::new(&path);

    let loaded_book = gBook(path, Some(true), Some(true)).map_err(|e| format!("Failed to load book from path: {}", e))?;

    log::log!(log::Level::Info, "Command - book: open_book {:?}", now.elapsed());
    Ok(loaded_book)
}


#[tauri::command]
pub async fn add_books(app: AppHandle, path: &Path) -> Result<Vec<Book>, String> {
    log::log!(log::Level::Info, "Command - book: add_books");
    let path = path.to_path_buf();
    let books =
        tauri::async_runtime::spawn_blocking(move || gBooks(&path).map_err(|e| e.to_string()))
            .await
            .map_err(|e| format!("Task panicked: {}", e))??;

    let store = app.store(STORE_PATH).map_err(|e| format!("Failed to open store: {}", e))?;
    let mut state = load_state(&store);
    merge_books(&mut state.book.books, books.clone());
    save_state(&store, &state).map_err(|e| e.to_string())?;
    let ver = now_ts();
    let _ = store.set("books_version", serde_json::to_value(ver).unwrap());
    let _ = store.save();
    let _ = app.emit("books:changed", Some(ver));

    Ok(books)
}

#[tauri::command]
pub async fn add_book(app: AppHandle, path: &Path) -> Result<Book, String> {
    log::log!(log::Level::Info, "Command - book: add_book");
    let path = path.to_path_buf();
    let book = tauri::async_runtime::spawn_blocking(move || {
        gBook(&path, Some(false), Some(true)).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))??;

    let store = app.store(STORE_PATH).map_err(|e| format!("Failed to open store: {}", e))?;
    let mut state = load_state(&store);
    let existing_index = state.book.books.iter().position(|b| {
        b.meta.path == book.meta.path || b.id == book.id
    });

    let result = if let Some(idx) = existing_index {
        let mut updated = book.clone();
        updated.id = state.book.books[idx].id.clone();
        state.book.books[idx] = updated.clone();
        updated
    } else {
        state.book.books.push(book.clone());
        book.clone()
    };

    save_state(&store, &state).map_err(|e| e.to_string())?;
    let ver = now_ts();
    let _ = store.set("books_version", serde_json::to_value(ver).unwrap());
    let _ = store.save();
    let _ = app.emit("books:changed", Some(ver));

    // Return the added or updated book (no reading position yet)
    Ok(result)
}

#[tauri::command]
pub async fn get_books(app: AppHandle) -> Result<Vec<Book>, String> {
    let now = Instant::now();

    let store = app.store(STORE_PATH).map_err(|e| format!("Failed to open store: {}", e))?;

    let state = load_state(&store);

    let session = state.reader.sessions;

    let books = state
        .book
        .books
        .iter()
        .map(|b| {
            let position = session.get(&b.meta.path);
            Book {
                id: b.id.clone(),
                meta: b.meta.clone(),
                chapters: None,
                position: match position {
                    Some(p) => Some(p.position.clone()),
                    None => None,
                },
            }
        })
        .collect();


    log::info!("Command - book: get_books - {:?}", now.elapsed());
    Ok(books)
}

#[tauri::command]
pub async fn get_books_version(app: AppHandle) -> Result<i64, String> {
    let store = app.store(STORE_PATH).map_err(|e| format!("Failed to open store: {}", e))?;
    match store.get("books_version") {
        Some(v) => match serde_json::from_value::<i64>(v) {
            Ok(n) => Ok(n),
            Err(_) => Ok(0),
        },
        None => Ok(0),
    }
}

#[tauri::command]
pub async fn get_book(app: AppHandle, path: String) -> Result<Book, String> {
    log::log!(log::Level::Info, "Command - book: get_book");

    let store = app.store(STORE_PATH).map_err(|e| format!("Failed to open store: {}", e))?;
    let state = load_state(&store);
    let book = state
        .book
        .books
        .iter()
        .find(|b| b.meta.path == path)
        .cloned();

    if let Some(book) = book {
        let position = state.reader.sessions.get(&path);
        Ok(Book {
            id: book.id.clone(),
            meta: book.meta.clone(),
            chapters: book.chapters.clone(),
            position: match position {
                Some(p) => Some(p.position.clone()),
                None => None,
            },
        })
    } else {
        gBook(Path::new(&path), Some(false), Some(true))
            .map_err(|e| e.to_string())
            .ok()
            .map(|book| {
                let position = state.reader.sessions.get(&path);
                Book {
                    id: book.id.clone(),
                    meta: book.meta.clone(),
                    chapters: book.chapters.clone(),
                    position: match position {
                        Some(p) => Some(p.position.clone()),
                        None => None,
                    },
                }
            })
            .ok_or_else(|| "Book not found".to_string())
    }
}

#[tauri::command]
pub async fn clear_store(app: tauri::AppHandle) -> Result<(), String> {
    log::log!(log::Level::Info, "Command - book: clear_store");

    let store = app.store(STORE_PATH).map_err(|e| format!("Failed to open store: {}", e))?;
    let mut state = load_state(&store);
    state.book.books.clear();
    state.bookmarks.items.clear();
    state.reader.sessions.clear();
    state.notes.items.clear();

    log::info!("Store and cache cleared");
    save_state(&store, &state).map_err(|e| e.to_string())?;
    let ver = now_ts();
    let _ = store.set("books_version", serde_json::to_value(ver).unwrap());
    let _ = store.save();
    let _ = app.emit("books:changed", Some(ver));
    Ok(())
}

/// Get cover image as base64 data URL for a given book.
/// Extracts cover from the book file and caches it.
#[tauri::command]
pub async fn get_cover_image(app: AppHandle, book_id: String, book_path: String) -> Result<String, String> {
    log::log!(log::Level::Info, "Command - book: get_cover_image");

    // First try to read from cache (covers directory)
    let covers_dir = cover::get_covers_dir(&app)?;
    let cache_prefix = covers_dir.join(&book_id);
    
    // Check for cached files
    for ext in &["jpg", "png", "webp", "gif"] {
        let cached_path = cache_prefix.with_extension(ext);
        if cached_path.exists() {
            let bytes = std::fs::read(&cached_path)
                .map_err(|e| format!("Failed to read cached cover: {}", e))?;
            return Ok(bytes_to_data_url(&bytes, ext));
        }
    }

    // Not cached - extract from book file
    let path = Path::new(&book_path);
    let ext_str = path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    let (bytes, ext) = match ext_str.as_str() {
        "fb2" | "zip" => {
            crate::core::formats::fb2::get_cover_bytes(&book_path)
                .ok_or_else(|| "No cover found in FB2".to_string())?
        }
        "cbz" => {
            crate::core::formats::cbz::get_cover_bytes(&book_path)
                .ok_or_else(|| "No cover found in EPUB".to_string())?
        }
        "epub" => {
            crate::core::formats::epub::get_cover_bytes(&book_path)
                .ok_or_else(|| "No cover found in EPUB".to_string())?
        }
        _ => {
            return Err("Cover extraction not supported for this format".to_string());
        }
    };
    // Cache the cover
    save_cover(&app, &book_id, &bytes, &ext)?;

    Ok(bytes_to_data_url(&bytes, &ext))
}
