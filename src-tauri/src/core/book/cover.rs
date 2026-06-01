use std::fs;
use std::path::PathBuf;

use base64::{engine::general_purpose, Engine as _};
use tauri::AppHandle;
use tauri::Manager;

/// Get the covers directory path, creating it if needed
pub fn get_covers_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let covers_dir = app_dir.join("covers");
    fs::create_dir_all(&covers_dir).map_err(|e| format!("Failed to create covers dir: {}", e))?;

    Ok(covers_dir)
}

/// Save cover bytes to the covers directory and return the filename
pub fn save_cover(app: &AppHandle, book_id: &str, bytes: &[u8], ext: &str) -> Result<String, String> {
    let covers_dir = get_covers_dir(app)?;
    let filename = format!("{}.{}", book_id, ext);
    let filepath = covers_dir.join(&filename);
    println!("Save cover to {}, book_id: {}, ext {}", filepath.display(), book_id, ext);

    fs::write(&filepath, bytes).map_err(|e| format!("Failed to write cover file: {}", e))?;

    Ok(filename)
}

/// Read cover bytes from the covers directory by filename
pub fn read_cover(app: &AppHandle, filename: &str) -> Result<Vec<u8>, String> {
    let covers_dir = get_covers_dir(app)?;
    let filepath = covers_dir.join(filename);

    if !filepath.exists() {
        return Err(format!("Cover file not found: {}", filename));
    }

    fs::read(&filepath).map_err(|e| format!("Failed to read cover file: {}", e))
}

/// Convert image bytes to a data URL string
pub fn bytes_to_data_url(bytes: &[u8], ext: &str) -> String {
    let mime = match ext {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "image/jpeg",
    };

    let encoded = general_purpose::STANDARD.encode(bytes);
    format!("data:{};base64,{}", mime, encoded)
}

/// Detect image format from bytes (magic bytes) or fallback to extension
pub fn detect_image_ext(bytes: &[u8]) -> &'static str {
    if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        "png"
    } else if bytes.starts_with(&[0xFF, 0xD8]) {
        "jpg"
    } else if bytes.starts_with(&[0x52, 0x49, 0x46, 0x46]) {
        "webp"
    } else if bytes.starts_with(&[0x47, 0x49, 0x46]) {
        "gif"
    } else {
        "jpg"
    }
}