use serde::de::DeserializeOwned;
use tauri::Wry;
use tauri_plugin_store::Store;

use crate::state::{AppState, BookmarkStore, NoteStore, ReaderState};

pub const STORE_PATH: &str = "store.json";
pub const SCHEMA_VERSION: u32 = 1;

const KEY_SCHEMA_VERSION: &str = "schema_version";
const KEY_BOOKS: &str = "books";
const KEY_SETTINGS: &str = "settings";
const KEY_READER: &str = "reader_state";
const KEY_BOOKMARKS: &str = "bookmarks";
const KEY_NOTES: &str = "notes";

pub fn migrate_if_needed(store: &Store<Wry>) {
    let version = store
        .get(KEY_SCHEMA_VERSION)
        .and_then(|value| serde_json::from_value::<u32>(value).ok())
        .unwrap_or(0);

    if version >= SCHEMA_VERSION {
        return;
    }

    // v0 -> v1: normalize keys and initialize new collections.
    if version == 0 {
        if store.get(KEY_BOOKS).is_none() {
            if let Some(value) = store.get("book") {
                store.set(KEY_BOOKS, value);
            }
        }
        if store.get(KEY_SETTINGS).is_none() {
            if let Some(value) = store.get("setting") {
                store.set(KEY_SETTINGS, value);
            }
        }
        if store.get(KEY_READER).is_none() {
            store.set(
                KEY_READER,
                serde_json::to_value(ReaderState::default()).unwrap(),
            );
        }
        if store.get(KEY_BOOKMARKS).is_none() {
            store.set(
                KEY_BOOKMARKS,
                serde_json::to_value(BookmarkStore::default()).unwrap(),
            );
        }
        if store.get(KEY_NOTES).is_none() {
            store.set(
                KEY_NOTES,
                serde_json::to_value(NoteStore::default()).unwrap(),
            );
        }
    }

    store.set(
        KEY_SCHEMA_VERSION,
        serde_json::to_value(SCHEMA_VERSION).unwrap(),
    );
    if let Err(err) = store.save() {
        eprintln!("Failed to save migrated store: {}", err);
    }
}

pub fn load_state(store: &Store<Wry>) -> AppState {
    AppState {
        book: read_value(store, KEY_BOOKS),
        setting: read_value(store, KEY_SETTINGS),
        reader: read_value(store, KEY_READER),
        bookmarks: read_value(store, KEY_BOOKMARKS),
        notes: read_value(store, KEY_NOTES),
    }
}

pub fn save_state(store: &Store<Wry>, state: &AppState) -> Result<(), String> {
    store.set(
        KEY_BOOKS,
        serde_json::to_value(&state.book).map_err(to_string)?,
    );
    store.set(
        KEY_SETTINGS,
        serde_json::to_value(&state.setting).map_err(to_string)?,
    );
    store.set(
        KEY_READER,
        serde_json::to_value(&state.reader).map_err(to_string)?,
    );
    store.set(
        KEY_BOOKMARKS,
        serde_json::to_value(&state.bookmarks).map_err(to_string)?,
    );
    store.set(
        KEY_NOTES,
        serde_json::to_value(&state.notes).map_err(to_string)?,
    );
    store.set(
        KEY_SCHEMA_VERSION,
        serde_json::to_value(SCHEMA_VERSION).map_err(to_string)?,
    );
    store.save().map_err(to_string)?;
    Ok(())
}

fn read_value<T: DeserializeOwned + Default>(store: &Store<Wry>, key: &str) -> T {
    match store.get(key) {
        Some(value) => match serde_json::from_value(value) {
            Ok(data) => data,
            Err(err) => {
                eprintln!("Failed to parse store key {}: {}", key, err);
                T::default()
            }
        },
        None => T::default(),
    }
}

fn to_string(err: impl std::fmt::Display) -> String {
    err.to_string()
}
