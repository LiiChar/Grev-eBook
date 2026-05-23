use std::path::{Path, PathBuf};

pub fn get_files_with_extension(
    dir: &Path,
    extension: &str,
) -> Vec<PathBuf> {
    let mut result = Vec::new();

    visit_dirs(dir, extension, &mut result);

    result
}

fn visit_dirs(
    dir: &Path,
    extension: &str,
    result: &mut Vec<PathBuf>,
) {
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_dir() {
            visit_dirs(&path, extension, result);
        } else if path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.eq_ignore_ascii_case(extension))
            .unwrap_or(false)
        {
            result.push(path);
        }
    }
}