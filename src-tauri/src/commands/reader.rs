use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::{
    core::{
        reader::{
            Bookmark, BookmarkKind, Note, ReaderMode, ReadingPosition, ReadingSession, TextRange,
        },
        storage::{load_state, save_state, STORE_PATH},
    },
    state::{ReaderState, SettingStore},
};

/// ---------- reader ----------

#[tauri::command]
pub async fn get_reader_state(app: AppHandle) -> Result<ReaderState, String> {
    log::log!(log::Level::Info, "Command - reader: get_reader_state");
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let state = load_state(&store);
    Ok(state.reader.clone())
}

#[tauri::command]
pub async fn set_current_book(
    app: AppHandle,
    book_path: String,
) -> Result<ReaderState, String> {
    log::log!(log::Level::Info, "Command - reader: set_current_book");
    let now = now_ts();
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let mut state = load_state(&store);

    state.reader.current_book_path = Some(book_path.clone());
    state.reader.last_session_book_path = Some(book_path.clone());

    state
        .reader
        .sessions
        .entry(book_path.clone())
        .and_modify(|s| s.last_opened_at = now)
        .or_insert_with(|| ReadingSession::new(book_path, ReadingPosition::default(), ReaderMode::default(), now));

    save_state(&store, &state).map_err(|e| e.to_string())?;
    Ok(state.reader)
}

#[tauri::command]
pub async fn save_reading_position(
    app: AppHandle,
    book_path: String,
    position: ReadingPosition,
    mode: ReaderMode,
) -> Result<ReaderState, String> {
    log::log!(log::Level::Info, "Command - reader: save_reading_position");
    let now = now_ts();
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let mut state = load_state(&store);

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

    save_state(&store, &state).map_err(|e| e.to_string())?;
    Ok(state.reader)
}

#[tauri::command]
pub async fn get_reading_position(app: AppHandle, book_path: String) -> Result<ReadingPosition, String> {
    log::log!(log::Level::Info, "Command - reader: get_reading_position");
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let state = load_state(&store);

    let reader_position = state.reader.sessions.get(&book_path);

    match reader_position {
        Some(position) => Ok(position.position.clone()),
        None => Ok(ReadingPosition::default()),
    }
}

/// ---------- bookmarks ----------

#[tauri::command]
pub async fn add_bookmark(
    app: AppHandle,
    book_path: String,
    position: ReadingPosition,
    preview: String,
    kind: BookmarkKind,
) -> Result<Bookmark, String> {
    log::log!(log::Level::Info, "Command - reader: add_bookmark");
    let now = now_ts();
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let mut state = load_state(&store);

    let bookmark = Bookmark::new(book_path, position, preview, kind, now);
    state.bookmarks.items.push(bookmark.clone());
    save_state(&store, &state).map_err(|e| e.to_string())?;
    Ok(bookmark)
}

#[tauri::command]
pub async fn get_bookmarks(app: AppHandle, book_path: Option<String>) -> Result<Vec<Bookmark>, String> {
    log::log!(log::Level::Info, "Command - reader: get_bookmarks");
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let state = load_state(&store);

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
pub async fn get_bookmark(app: AppHandle, bookmark_id: Option<String>) -> Result<Option<Bookmark>, String> {
    log::log!(log::Level::Info, "Command - reader: get_bookmark");
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let state = load_state(&store);

    Ok(state
        .bookmarks
        .items
        .iter()
        .find(|b| match &bookmark_id {
            Some(id) => b.id == *id,
            None => true,
        })
        .cloned())
}

#[tauri::command]
pub async fn delete_bookmark(app: AppHandle, bookmark_id: String) -> Result<(), String> {
    log::log!(log::Level::Info, "Command - reader: delete_bookmark");
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let mut state = load_state(&store);

    state.bookmarks.items.retain(|b| b.id != bookmark_id);
    save_state(&store, &state).map_err(|e| e.to_string())?;
    Ok(())
}

/// ---------- notes ----------

#[tauri::command]
pub async fn add_note(
    app: AppHandle,
    book_path: String,
    range: TextRange,
    text: String,
    preview: String,
    highlight: bool,
    highlight_color: Option<String>,
) -> Result<Note, String> {
    log::log!(log::Level::Info, "Command - reader: add_note");
    let now = now_ts();
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let mut state = load_state(&store);

    let note = Note::new(book_path, range, text, preview, highlight, highlight_color, now);
    state.notes.items.push(note.clone());
    save_state(&store, &state).map_err(|e| e.to_string())?;
    Ok(note)
}

#[tauri::command]
pub async fn update_note(
    app: AppHandle,
    note_id: String,
    range: TextRange,
    text: String,
    highlight: bool,
    highlight_color: Option<String>,
) -> Result<Note, String> {
    log::log!(log::Level::Info, "Command - reader: update_note");
    let now = now_ts();
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let mut state = load_state(&store);

    let note = state
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
    save_state(&store, &state).map_err(|e| e.to_string())?;
    Ok(updated)
}

#[tauri::command]
pub async fn delete_note(app: AppHandle, note_id: String) -> Result<(), String> {
    log::log!(log::Level::Info, "Command - reader: delete_note");
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let mut state = load_state(&store);
    state.notes.items.retain(|n| n.id != note_id);
    save_state(&store, &state).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_notes(app: AppHandle, book_path: Option<String>) -> Result<Vec<Note>, String> {
    log::log!(log::Level::Info, "Command - reader: get_notes");
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let state = load_state(&store);

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
pub async fn get_settings(app: AppHandle) -> Result<SettingStore, String> {
    log::log!(log::Level::Info, "Command - reader: get_settings");
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let state = load_state(&store);
    Ok(state.setting.clone())
}

#[tauri::command]
pub async fn update_settings(app: AppHandle, settings: SettingStore) -> Result<SettingStore, String> {
    log::log!(log::Level::Info, "Command - reader: update_settings");
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    let mut state = load_state(&store);
    state.setting = settings;
    save_state(&store, &state).map_err(|e| e.to_string())?;
    Ok(state.setting)
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
