use crate::core::{
    book::model::{Book, BookMeta, Chapter},
    formats::loader::BookSource,
};
use anyhow::Result;
#[cfg(not(target_os = "android"))]
use mupdf::{Document, TextPageFlags};
use std::path::Path;
use uuid::Uuid;
use regex::Regex;


pub struct PdfLoader;

impl BookSource for PdfLoader {
    fn load(&self, path: &Path, load_chapters: bool, return_chapters: bool) -> Result<Book> {
        let path_str = path
            .to_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid file path"))?;

        let mut chapters = Vec::new();

        let mut title = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled")
            .to_string();
        
        let mut author: Option<String> = None;

        #[cfg(not(target_os = "android"))]
        {
            let doc = Document::open(path_str)?;

            let pages = doc
                .pages()
                .map_err(|e| anyhow::anyhow!("Failed get pages from pdf document by {}", e))?;

            title = match doc.metadata(mupdf::MetadataName::Title) {
                Ok(t) => {
                    if t.is_empty() {
                        title
                    } else {
                        t
                    }
                },
                Err(_) => {
                    title
                },
            };

            author = match doc.metadata(mupdf::MetadataName::Author) {
                Ok(a) => Some(a),
                Err(_) => None,
            };

            for (i, page) in pages.enumerate() {
                let html = page
                    .map_err(|e| anyhow::anyhow!("Failed get page from pdf document by {}", e))?
                    .to_text_page(TextPageFlags::all())
                    .map_err(|e| {
                        anyhow::anyhow!("Failed convert page from pdf document by {}", e)
                    })?;

                let text = html.to_html(0, true).map_err(|e| {
                    anyhow::anyhow!("Failed convert TextPage from pdf document by {}", e)
                })?;

                let text = normalize_pdf_html(&text);

                chapters.push(Chapter {
                    id: Uuid::new_v4().to_string(),
                    title: None,
                    html: text,
                    order: i,
                });
            }
        }
        Ok(Book {
            id: self.generate_id(title.clone()),
            meta: BookMeta {
                title: title,
                author: author,
                language: Some(self.get_language(&chapters).unwrap_or("en".into())),
                cover_path: None,
                path: path.to_string_lossy().to_string(),
                size: self.get_size(&path)?,
                last_read_at: self.get_last_read_at(&path)?,
                last_modified: self.get_last_modified(&path)?,
                created_at: self.get_created_at(&path)?,
                description: None,
                chars_read: Some(self.get_chars_read(&chapters.clone())?),
                progress_read: None,
                genres: None,
                count_chapters: chapters.len() as i64,
            },
            position: None,
            chapters: match return_chapters {
                true => Some(chapters),
                false => None,
            },
        })
    }

    fn can_load(&self, path: &Path) -> bool {
        path.extension().map(|e| e == "pdf").unwrap_or(false)
    }

}


fn normalize_pdf_html(html: &str) -> String {
    let mut html = html.to_string();

    // pt -> px
    let pt_re = Regex::new(r"([0-9]+(?:\.[0-9]+)?)pt").unwrap();
    html = pt_re.replace_all(&html, |caps: &regex::Captures| {
        let px = (caps[1].parse::<f64>().unwrap_or(0.0) * 96.0 / 72.0).round();
        format!("{px}px")
    }).to_string();

    // page0 + class
    let page_re = Regex::new(r#"<div id="page0" style="width:([0-9.]+)px;height:([0-9.]+)px""#).unwrap();
    html = page_re.replace(&html, |caps: &regex::Captures| {
        format!(r#"<div id="page0" pdf-width="{}" pdf-height="{}" style="width:100%;aspect-ratio:{} / {};height:auto;overflow:hidden""#, 
            &caps[1], &caps[2], &caps[1], &caps[2])
    }).to_string();

    // Scope all styles with .chapter
    let style_re = Regex::new(r"(?is)<style>(.*?)</style>").unwrap();

    html = style_re.replace_all(&html, |caps: &regex::Captures| {
        let css = &caps[1];

        let scoped = css
            .lines()
            .map(|line| {
                let line = line.trim();

                if line.is_empty() {
                    return String::new();
                }

                // не трогаем @rules
                if line.starts_with("@") {
                    return line.to_string();
                }

                // очень грубый, но рабочий prefix
                if let Some(pos) = line.find('{') {
                    let (sel, rest) = line.split_at(pos);
                    let scoped_sel = sel
                        .split(',')
                        .map(|s| format!(".chapter {}", s.trim()))
                        .collect::<Vec<_>>()
                        .join(", ");

                    return format!("{}{}", scoped_sel, rest);
                }

                line.to_string()
            })
            .collect::<Vec<_>>()
            .join("\n");

        format!("<style>{}</style>", scoped)
    }).to_string();

    html
}