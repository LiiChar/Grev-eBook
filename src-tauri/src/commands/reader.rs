use std::sync::{Arc, RwLock};

use tauri::{AppHandle, State};
use tauri_plugin_store::StoreExt;

use crate::{
    core::{
        reader::{
            Bookmark, BookmarkKind, Note, ReaderMode, ReadingPosition, ReadingSession, TextRange,
        },
        storage::{save_state, STORE_PATH},
    },
    state::{AppState, ReaderState, SettingStore},
};

/// ---------- reader ----------

#[tauri::command]
pub async fn get_reader_state(
    state: State<'_, Arc<RwLock<AppState>>>,
) -> Result<ReaderState, String> {
    log::log!(log::Level::Info, "Command - reader: get_reader_state");

    let state = state.read().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(state.reader.clone())
}

#[tauri::command]
pub async fn set_current_book(
    app: AppHandle,
    state: State<'_, Arc<RwLock<AppState>>>,
    book_path: String,
) -> Result<ReaderState, String> {
    log::log!(log::Level::Info, "Command - reader: get_current_book");
    let now = now_ts();
    let cloned_state = {
        let mut state_guard = state.write().map_err(|e| format!("Lock poisoned: {}", e))?;

        state_guard.reader.current_book_path = Some(book_path.clone());
        state_guard.reader.last_session_book_path = Some(book_path.clone());

        state_guard
            .reader
            .sessions
            .entry(book_path.clone())
            .and_modify(|s| s.last_opened_at = now)
            .or_insert_with(|| {
                ReadingSession::new(
                    book_path,
                    ReadingPosition::default(),
                    ReaderMode::default(),
                    now,
                )
            });

        state_guard.clone()
    };
    persist(&app, &cloned_state).await?;
    Ok(cloned_state.reader)
}

#[tauri::command]
pub async fn save_reading_position(
    app: AppHandle,
    state: State<'_, Arc<RwLock<AppState>>>,
    book_path: String,
    position: ReadingPosition,
    mode: ReaderMode,
) -> Result<ReaderState, String> {
    log::log!(log::Level::Info, "Command - reader: save_reading_position");
    let now = now_ts();

    let reader_state = {
        let mut state = state.write().map_err(|e| format!("Lock poisoned: {}", e))?;

        state
            .reader
            .sessions
            .entry(book_path.clone())
            .and_modify(|s| {
                s.position = position.clone();
                s.mode = mode.clone();
                s.last_read_at = now;
            })
            .or_insert_with(|| ReadingSession::new(book_path, position, mode, now));

        state.clone()
    }; 

    persist(&app, &reader_state).await?;
    Ok(reader_state.reader)
}

#[tauri::command]
pub async fn get_reading_position(
    state: State<'_, Arc<RwLock<AppState>>>,
    book_path: String,
) -> Result<ReadingPosition, String> {
    log::log!(log::Level::Info, "Command - reader: get_reading_position");
    let state = state.read().map_err(|e| format!("Lock poisoned: {}", e))?;

    let reader_position = state
        .reader
        .sessions
        .get(&book_path);

    match reader_position {
        Some(position) => Ok(position.position.clone()),
        None => Ok(ReadingPosition::default()),
    }
}

/// ---------- bookmarks ----------

#[tauri::command]
pub async fn add_bookmark(
    app: AppHandle,
    state: State<'_, Arc<RwLock<AppState>>>,
    book_path: String,
    position: ReadingPosition,
    preview: String,
    kind: BookmarkKind,
) -> Result<Bookmark, String> {
    log::log!(log::Level::Info, "Command - reader: add_bookmark");
    let now = now_ts();
    let (bookmark, cloned_state) = {
        let mut state_guard = state.write().map_err(|e| format!("Lock poisoned: {}", e))?;

        let bookmark = Bookmark::new(book_path, position, preview, kind, now);
        state_guard.bookmarks.items.push(bookmark.clone());

        (bookmark, state_guard.clone())
    };
    persist(&app, &cloned_state).await?;
    Ok(bookmark)
}

#[tauri::command]
pub async fn get_bookmarks(
    state: State<'_, Arc<RwLock<AppState>>>,
    book_path: Option<String>,
) -> Result<Vec<Bookmark>, String> {
    let state = state.read().map_err(|e| format!("Lock poisoned: {}", e))?;

    Ok(state
        .bookmarks
        .items
        .iter()
        .filter(|b| match &book_path {
            Some(path) => b.book_path == *path,
            None => true,
        })
        .cloned()
        .collect())
}

#[tauri::command]
pub async fn get_bookmark(
    state: State<'_, Arc<RwLock<AppState>>>,
    bookmark_id: Option<String>,
) -> Result<Option<Bookmark>, String> {
    let state = state.read().map_err(|e| format!("Lock poisoned: {}", e))?;

    Ok(state
        .bookmarks
        .items
        .iter()
        .find(|b| match &bookmark_id {
            Some(id) => b.id == *id,
            None => true,
        }).cloned())
}

#[tauri::command]
pub async fn delete_bookmark(
    app: AppHandle,
    state: State<'_, Arc<RwLock<AppState>>>,
    bookmark_id: String,
) -> Result<(), String> {
    let cloned_state = {
        let mut state_guard = state.write().map_err(|e| format!("Lock poisoned: {}", e))?;

        state_guard.bookmarks.items.retain(|b| b.id != bookmark_id);
        state_guard.clone()
    };
    persist(&app, &cloned_state).await?;
    Ok(())
}

/// ---------- notes ----------

#[tauri::command]
pub async fn add_note(
    app: AppHandle,
    state: State<'_, Arc<RwLock<AppState>>>,
    book_path: String,
    range: TextRange,
    text: String,
    preview: String,
    highlight: bool,
    highlight_color: Option<String>,
) -> Result<Note, String> {
    let now = now_ts();
    let (note, cloned_state) = {
        let mut state_guard = state.write().map_err(|e| format!("Lock poisoned: {}", e))?;

        let note = Note::new(book_path, range, text, preview, highlight, highlight_color, now);
        state_guard.notes.items.push(note.clone());

        (note, state_guard.clone())
    };
    persist(&app, &cloned_state).await?;
    Ok(note)
}

#[tauri::command]
pub async fn update_note(
    app: AppHandle,
    state: State<'_, Arc<RwLock<AppState>>>,
    note_id: String,
    range: TextRange,
    text: String,
    highlight: bool,
    highlight_color: Option<String>,
) -> Result<Note, String> {
    let now = now_ts();
    let (updated, cloned_state) = {
        let mut state_guard = state.write().map_err(|e| format!("Lock poisoned: {}", e))?;

        let note = state_guard
            .notes
            .items
            .iter_mut()
            .find(|n| n.id == note_id)
            .ok_or("Note not found")?;

        note.range = range;
        note.text = text;
        note.highlight = highlight;
        note.highlight_color = highlight_color;
        note.updated_at = now;

        let updated = note.clone();
        (updated, state_guard.clone())
    };
    persist(&app, &cloned_state).await?;
    Ok(updated)
}

#[tauri::command]
pub async fn delete_note(
    app: AppHandle,
    state: State<'_, Arc<RwLock<AppState>>>,
    note_id: String,
) -> Result<(), String> {
    let cloned_state = {
        let mut state_guard = state.write().map_err(|e| format!("Lock poisoned: {}", e))?;
        state_guard.notes.items.retain(|n| n.id != note_id);
        state_guard.clone()
    };
    persist(&app, &cloned_state).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_notes(
    state: State<'_, Arc<RwLock<AppState>>>,
    book_path: Option<String>,
) -> Result<Vec<Note>, String> {
    let state = state.read().map_err(|e| format!("Lock poisoned: {}", e))?;

    Ok(state
        .notes
        .items
        .iter()
        .filter(|n| match &book_path {
            Some(path) => n.book_path == *path,
            None => true,
        })
        .cloned()
        .collect())
}

/// ---------- settings ----------

#[tauri::command]
pub async fn get_settings(state: State<'_, Arc<RwLock<AppState>>>) -> Result<SettingStore, String> {
    let state = state.read().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(state.setting.clone())
}

#[tauri::command]
pub async fn update_settings(
    app: AppHandle,
    state: State<'_, Arc<RwLock<AppState>>>,
    settings: SettingStore,
) -> Result<SettingStore, String> {
    let cloned_state = {
        let mut state_guard = state.write().map_err(|e| format!("Lock poisoned: {}", e))?;
        state_guard.setting = settings;
        state_guard.clone()
    };
    persist(&app, &cloned_state).await?;
    Ok(cloned_state.setting)
}

/// ---------- helpers ----------

async fn persist(app: &AppHandle, state: &AppState) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    save_state(&store, state)
}

fn now_ts() -> i64 {
    match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(d) => d.as_millis() as i64,
        Err(e) => {
            eprintln!("System time error: {}", e);
            0
        }
    }
}

