mod commands;
mod core;
mod state;

use std::sync::Arc;
use std::sync::Mutex;
use tauri::Manager;

use commands::{
    add_book, add_bookmark, add_books, add_note, clear_store, delete_bookmark, delete_note,
    get_book, get_bookmarks, get_books, get_notes, get_reader_state, get_settings, open_book,
    save_reading_position, get_reading_position, set_current_book, update_note, update_settings, get_bookmark
};
use state::AppState;
use tauri_plugin_store::StoreExt;

use core::storage::{load_state, migrate_if_needed, STORE_PATH};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let store = app.store(STORE_PATH)?;
            migrate_if_needed(&store);
            let state = load_state(&store);

            app.manage(Arc::new(Mutex::new(state)));

            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_book,
            get_books,
            get_book,
            add_books,
            add_book,
            clear_store,
            get_reader_state,
            set_current_book,
            save_reading_position,
            get_reading_position,
            add_bookmark,
            get_bookmarks,
            get_bookmark,
            delete_bookmark,
            add_note,
            update_note,
            delete_note,
            get_notes,
            get_settings,
            update_settings
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| match event {
            tauri::RunEvent::ExitRequested { api: _, .. } => {
                // Сохраняем состояние при выходе
                // let store = app.store(STORE_PATH).expect("Failed to open store");
                // let state: tauri::State<'_, Mutex<AppState>> = app.state::<Mutex<AppState>>();
                // let state = state.lock().unwrap();
                // if let Err(err) = save_state(&store, &state) {
                //     eprintln!("Failed to save store: {}", err);
                // }
            }
            _ => {}
        });
}
