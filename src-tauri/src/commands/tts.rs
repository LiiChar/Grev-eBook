use tauri::Emitter;

use crate::core::tts::{generate_wav, hash_text};

#[tauri::command]
pub fn generate_tts_chunks(app: tauri::AppHandle, text: String) -> Vec<String> {
    let chunks = split_text(&text);
    let mut paths = vec![];

    let base_dir = PathBuf::from("E:/code/pet-project/Uni/src-tauri/resources/tts_cache");
    fs::create_dir_all(&base_dir).unwrap();

    for chunk in chunks {
        let hash = hash_text(&chunk);
        let file_path = base_dir.join(format!("{}.wav", hash));

        if !file_path.exists() {
            generate_wav(&chunk, &file_path);
        }

        app.emit("tts_chunk_generated", file_path.to_string_lossy().to_string());
    }

    paths
}