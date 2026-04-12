use std::{
    path::Path,
    sync::{Arc, Mutex},
};

use anyhow::Result;
use tauri::State;
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
pub async fn add_books(
    app: tauri::AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
    path: &Path,
) -> Result<Vec<Book>, String> {
    let books = gBooks(&path)
        .map_err(|e| e.to_string())
        .expect("Failed load books by path");
    let mut state = state.lock().unwrap();
    state.book.books = books.clone();
    let store = app.store(STORE_PATH).expect("Failed to open store");
    save_state(&store, &state).map_err(|e| e.to_string())?;
    Ok(books)
}

#[tauri::command]
pub async fn add_book(
    app: tauri::AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
    path: &Path,
) -> Result<Vec<Book>, String> {
    let book = gBook(&path, Some(false))
        .map_err(|e| e.to_string())
        .expect("Failed load books by path");

    let mut state = state.lock().unwrap();
    let mut books = state.book.books.clone();
    books.push(book);
    state.book.books = books.clone();
    let store = app.store(STORE_PATH).expect("Failed to open store");
    save_state(&store, &state).map_err(|e| e.to_string())?;
    Ok(books)
}

#[tauri::command]
pub async fn open_book(
    app: tauri::AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
    path: &Path
) -> Result<Book, String> {
    let mut state = state.lock().unwrap();
    
    // Находим индекс книги в списке
    let book_index = state.book.books.iter()
        .position(|b| *b.meta.path == *path);
    
    let mut book = match book_index {
        // Книга уже есть в библиотеке
        Some(idx) => {
            let existing_book = &state.book.books[idx];
            
            // Если у книги уже есть главы, возвращаем ее
            if existing_book.chapters.as_ref().map_or(false, |c| !c.is_empty()) {
                existing_book.clone()
            } else {
                // Иначе загружаем книгу заново
                let mut loaded_book = gBook(path, Some(true))
                    .map_err(|e| format!("Failed to load book from path: {}", e))?;
                
                // Сохраняем ID существующей книги
                loaded_book.id = existing_book.id.clone();
                loaded_book
            }
        }
        // Новая книга
        None => {
            gBook(path, Some(true))
                .map_err(|e| format!("Failed to load book from path: {}", e))?
        }
    };
    
    // Обновляем или добавляем книгу в список
    match book_index {
        Some(idx) => {
            // Обновляем существующую книгу
            state.book.books[idx] = book.clone();
        }
        None => {
            // Добавляем новую книгу
            state.book.books.push(book.clone());
        }
    }
    
    // Сохраняем состояние
    let store = app.store(STORE_PATH)
        .map_err(|e| format!("Failed to open store: {}", e))?;
    save_state(&store, &state)
        .map_err(|e| format!("Failed to save state: {}", e))?;
    
    Ok(book)
}

#[tauri::command]
pub async fn get_books(state: State<'_, Arc<Mutex<AppState>>>) -> Result<Vec<Book>, String> {
    let books = state.lock().unwrap().book.books.clone();
    Ok(books)
}

#[tauri::command]
pub async fn get_book(
    state: State<'_, Arc<Mutex<AppState>>>,
    path: String,
) -> Result<Book, String> {
    let books = state.lock().unwrap().book.books.clone();
    let book = books.into_iter().find(|b| b.meta.path == path);
    let find_book = match book {
        Some(old_book) => old_book,
        None => gBook(&Path::new(&path), Some(false))
            .map_err(|e| e.to_string())
            .expect("Failed load books by path"),
    };

    Ok(find_book)
}

#[tauri::command]
pub async fn clear_store(
    app: tauri::AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), String> {
    let mut state = state.lock().unwrap();
    state.book.books.clear();
    state.bookmarks.items.clear();
    state.reader.sessions.clear();
    state.notes.items.clear();
    log::info!("Store cleared");
    let store = app.store(STORE_PATH).expect("Failed to open store");
    save_state(&store, &state).map_err(|e| e.to_string())?;
    Ok(())
}

// #[tauri::command]
// fn get_chapter(book_id: String, chapter_id: String) ->

// #[tauri::command]
// fn save_position(book_id: String, pos: ReadingPosition)

// #[tauri::command]
// fn add_bookmark(book_id: String, bookmark: Bookmark)
