use std::{
    path::Path,
    sync::{Arc, RwLock},
};

use tauri::{State};
use tauri_plugin_log::log;
use tauri_plugin_store::StoreExt;

use crate::{
    core::{
        book::model::Book,
        formats::{get_book as gBook, get_books as gBooks},
        storage::{save_state, STORE_PATH},
    },
    state::AppState,
};

#[tauri::command]
pub async fn open_book(
    app: tauri::AppHandle,
    state: State<'_, Arc<RwLock<AppState>>>,
    path: String,
) -> Result<Book, String> {
    let path = Path::new(&path);

    // --- Fast path: check if chapters already in memory ---
    {
        let state = state.read().map_err(|e| format!("Lock poisoned: {}", e))?;
        if let Some(existing) = state.book.books.iter().find(|b| b.meta.path == path.to_string_lossy()) {
            if existing.chapters.as_ref().map_or(false, |c| !c.is_empty()) {
                return Ok(existing.clone());
            }
        }
    }

    // --- Load book ---
    let loaded_book = gBook(path, Some(true))
        .map_err(|e| format!("Failed to load book from path: {}", e))?;

    // --- Update state ---
    {
        let mut state = state.write().map_err(|e| format!("Lock poisoned: {}", e))?;
        let book_index = state.book.books.iter()
            .position(|b| b.meta.path == loaded_book.meta.path);

        match book_index {
            Some(idx) => {
                let mut updated = loaded_book.clone();
                updated.id = state.book.books[idx].id.clone();
                state.book.books[idx] = updated;
            }
            None => {
                state.book.books.push(loaded_book.clone());
            }
        }
    }
    let state_clone = {
        let state = state.read().map_err(|e| format!("Lock poisoned: {}", e))?;
        state.clone()
    };

    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Ok(store) = app_clone.store(STORE_PATH) {
            let _ = save_state(&store, &state_clone);
        }
    });

    Ok(loaded_book)
}

#[tauri::command]
pub async fn add_books(
    app: tauri::AppHandle,
    state: State<'_, Arc<RwLock<AppState>>>,
    path: &Path,
) -> Result<Vec<Book>, String> {
    let path = path.to_path_buf();
    let books = tauri::async_runtime::spawn_blocking(move || {
        gBooks(&path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))??;

    let mut state = state.write().map_err(|e| format!("Lock poisoned: {}", e))?;
    state.book.books = books.clone();

    // Persist asynchronously
    let state_clone = state.clone();
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Ok(store) = app_clone.store(STORE_PATH) {
            let _ = save_state(&store, &state_clone);
        }
    });

    Ok(books)
}

#[tauri::command]
pub async fn add_book(
    app: tauri::AppHandle,
    state: State<'_, Arc<RwLock<AppState>>>,
    path: &Path,
) -> Result<Vec<Book>, String> {
    let path = path.to_path_buf();
    let book = tauri::async_runtime::spawn_blocking(move || {
        gBook(&path, Some(false)).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))??;

    let mut state = state.write().map_err(|e| format!("Lock poisoned: {}", e))?;
    state.book.books.push(book.clone());

    let state_clone = state.clone();
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Ok(store) = app_clone.store(STORE_PATH) {
            let _ = save_state(&store, &state_clone);
        }
    });

    Ok(state.book.books.clone())
}

#[tauri::command]
pub async fn get_books(
    state: State<'_, Arc<RwLock<AppState>>>,
) -> Result<Vec<Book>, String> {

    let state = state.read().map_err(|e| format!("Lock poisoned: {}", e))?;
    let books = state.book.books.clone();

    Ok(books)
}

#[tauri::command]
pub async fn get_book(
    state: State<'_, Arc<RwLock<AppState>>>,
    path: String,
) -> Result<Book, String> {
    let state = state.read().map_err(|e| format!("Lock poisoned: {}", e))?;
    state.book.books.iter()
        .find(|b| b.meta.path == path)
        .cloned()
        .or_else(|| {
            gBook(Path::new(&path), Some(false))
                .map_err(|e| e.to_string())
                .ok()
        })
        .ok_or_else(|| "Book not found".to_string())
}

#[tauri::command]
pub async fn clear_store(
    app: tauri::AppHandle,
    state: State<'_, Arc<RwLock<AppState>>>,
) -> Result<(), String> {
    {
        let mut state = state.write().map_err(|e| format!("Lock poisoned: {}", e))?;
        state.book.books.clear();
        state.bookmarks.items.clear();
        state.reader.sessions.clear();
        state.notes.items.clear();
    }

    log::info!("Store and cache cleared");
    let store = app.store(STORE_PATH).map_err(|e| format!("Failed to open store: {}", e))?;
    let state = state.read().map_err(|e| format!("Lock poisoned: {}", e))?;
    save_state(&store, &state).map_err(|e| e.to_string())?;
    Ok(())
}
