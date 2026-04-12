use std::fs;
use std::path::{Path, PathBuf};

pub fn get_files_with_extension(dir: &Path, extension: &str) -> Vec<PathBuf> {
    let mut result = Vec::new();

    if dir.is_dir() {
        for entry in fs::read_dir(dir).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path();

            if path.is_dir() {
                // рекурсивно обходим подпапку
                result.extend(get_files_with_extension(&path, extension));
            } else if path
                .extension()
                .and_then(|ext| ext.to_str())
                .map_or(false, |ext| ext.eq_ignore_ascii_case(extension))
            {
                result.push(path);
            }
        }
    }

    result
}
