use std::fs::File;
use std::path::Path;

use anyhow::Result;
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use natord::compare;
use uuid::Uuid;
use zip::ZipArchive;

use crate::core::{
    book::model::{Book, BookMeta, Chapter},
    formats::loader::BookSource,
};

pub struct CbzLoader;

impl BookSource for CbzLoader {
    fn can_load(&self, path: &Path) -> bool {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("cbz"))
            .unwrap_or(false)
    }

    fn load(
        &self,
        path: &Path,
        load_chapters: bool,
        return_chapters: bool,
    ) -> Result<Book> {
        let chapters = if load_chapters {
            Some(self.extract_pages_base64(path)?)
        } else {
            None
        };

        let title = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled")
            .to_string();

        Ok(Book {
            id: Uuid::new_v4().to_string(),
            meta: BookMeta {
                title,
                author: None,
                language: None,
                cover_path: None,
                path: path.to_string_lossy().to_string(),
                size: self.get_size(path)?,
                last_read_at: self.get_last_read_at(path)?,
                last_modified: self.get_last_modified(path)?,
                created_at: self.get_created_at(path)?,
                description: None,
                chars_read: Some(self.get_chars_read(&chapters.clone().unwrap_or(vec![]))?),
                progress_read: None,
                genres: None,
                count_chapters: chapters.as_ref().map(|c| c.len()).unwrap_or(0) as i64,
            },
            chapters: if return_chapters { chapters } else { None },
            position: None,
        })
    }
}

impl CbzLoader {
    fn extract_pages_base64(&self, path: &Path) -> Result<Vec<Chapter>> {
        let file = File::open(path)?;
        let mut archive = ZipArchive::new(file)?;

        let mut images = vec![];

        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            let name = file.name().to_string();

            if Self::is_image(&name) {
                let mut buf = Vec::new();
                std::io::copy(&mut file, &mut buf)?;
                images.push((name, buf));
            }
        }

        images.sort_by(|a, b| compare(&a.0, &b.0));

        let chapters: Vec<Chapter> = images
            .into_iter()
            .enumerate()
            .map(|(index, (_name, data))| {
                let mime = Self::guess_mime(&_name);
                let base64 = STANDARD.encode(&data);

                let html = format!(
                    r#"<img src="data:{};base64,{}" style="width:100%;height:auto;display:block;" />"#,
                    mime,
                    base64
                );

                Chapter {
                    id: Uuid::new_v4().to_string(),
                    title: Some(format!("Page {}", index + 1)),
                    html,
                    order: index,
                }
            })
            .collect();

        Ok(chapters)
    }

    fn is_image(name: &str) -> bool {
        let n = name.to_ascii_lowercase();
        n.ends_with(".jpg")
            || n.ends_with(".jpeg")
            || n.ends_with(".png")
            || n.ends_with(".webp")
            || n.ends_with(".gif")
    }

    fn guess_mime(name: &str) -> &'static str {
        let n = name.to_ascii_lowercase();

        if n.ends_with(".png") {
            "image/png"
        } else if n.ends_with(".webp") {
            "image/webp"
        } else if n.ends_with(".gif") {
            "image/gif"
        } else {
            "image/jpeg"
        }
    }
}

fn guess_mime(name: &str) -> &'static str {
        let n = name.to_ascii_lowercase();

        if n.ends_with(".png") {
            "image/png"
        } else if n.ends_with(".webp") {
            "image/webp"
        } else if n.ends_with(".gif") {
            "image/gif"
        } else {
            "image/jpeg"
        }
    }

    fn is_image(name: &str) -> bool {
        let n = name.to_ascii_lowercase();
        n.ends_with(".jpg")
            || n.ends_with(".jpeg")
            || n.ends_with(".png")
            || n.ends_with(".webp")
            || n.ends_with(".gif")
    }

pub fn get_cover_bytes(path: &str) -> Option<(Vec<u8>, String)> {
    let file = File::open(path).ok()?;
    let mut archive = ZipArchive::new(file).ok()?;

    let mut images = vec![];

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).ok()?;
        let name = file.name().to_string();

        if is_image(&name) {
            let mut buf = Vec::new();
            std::io::copy(&mut file, &mut buf).ok()?;
            images.push((name, buf));
        }
    }

    // сортируем как и раньше
    images.sort_by(|a, b| compare(&a.0, &b.0));

    // 👉 ВАЖНО: первая страница = первая картинка после сортировки
    let (name, data) = images.into_iter().next()?;

    let mime = guess_mime(&name);

    let ext = match mime {
        "image/png" => "png",
        "image/jpeg" => "jpg",
        "image/jpg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "jpg",
    };

    Some((data, ext.to_owned()))
}