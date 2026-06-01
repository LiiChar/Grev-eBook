// rtf_loader.rs

use std::error::Error;
use std::fs;
use std::io::Read;
use std::path::Path;
use std::time::UNIX_EPOCH;

use anyhow::Result;
use encoding_rs::{UTF_8, WINDOWS_1251};
use rtf_parser::document::RtfDocument;
use rtf_parser::header::{RtfHeader, FontTable};
use rtf_parser::parser::{Painter, StyleBlock};
use uuid::Uuid;

use crate::core::book::model::{Book, BookMeta, Chapter};
use crate::core::formats::loader::BookSource;
use crate::core::utils::normalize_text;

/// Ошибки, специфичные для RTF‑загрузчика
#[derive(Debug)]
pub enum RtfLoaderError {
    Io(std::io::Error),
    RtfParse(Box<dyn Error>),
    Other(String),
}

impl std::fmt::Display for RtfLoaderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(e) => write!(f, "IO error: {}", e),
            Self::RtfParse(e) => write!(f, "RTF parse error: {}", e),
            Self::Other(s) => write!(f, "{}", s),
        }
    }
}

impl std::error::Error for RtfLoaderError {}

impl From<std::io::Error> for RtfLoaderError {
    fn from(e: std::io::Error) -> Self {
        Self::Io(e)
    }
}

pub struct RtfLoader;

impl BookSource for RtfLoader {
    fn can_load(&self, path: &Path) -> bool {
        path.extension().map(|e| e == "rtf").unwrap_or(false)
    }

    fn load(&self, path: &Path, load_chapters: bool, return_chapters: bool) -> Result<Book> {
        let book = parse_rtf(path.to_str().unwrap()).map_err(|e| anyhow::anyhow!("Failed parse RTF file by {}", e))?;
        Ok(book)
    }
}

/// Основная функция: читает файл, парсит RTF, собирает Book
fn parse_rtf(path: &str) -> Result<Book> {
    let file_path = Path::new(path);
    let metadata = fs::metadata(file_path)?;

    // Чтение всего содержимого
    let bytes = fs::read(path)?;
    let text = decode_text(&bytes)?;

    // Парсинг RTF (использует реализацию TryFrom<String>)
    let rtf_doc = RtfDocument::try_from(text)
        .map_err(|e| anyhow::anyhow!("Failed parse RTF file by {}", e))?;

    // Метаданные – из имени файла и системных атрибутов
    let title = file_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string();

    let size = metadata.len();
    let last_modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let created = metadata
        .created()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(last_modified);

    let meta = BookMeta {
        title,
        description: None,
        author: None,
        language: None,
        cover_path: None,
        path: path.to_string(),
        size,
        last_read_at: 0,
        last_modified,
        created_at: created,
        progress_read: None,
        chars_read: None,
        genres: None,
        count_chapters: 1, // будет одна глава
    };

    // Генерируем HTML‑представление из стилевых блоков
    let body_html = style_blocks_to_html(&rtf_doc.body, &rtf_doc.header);

    let chapter = Chapter {
        id: "chapter_1".to_string(),
        title: None,
        html: body_html,
        order: 0,
    };

    let book = Book {
        id: Uuid::new_v4().to_string(),
        meta,
        chapters: Some(vec![chapter]),
        position: None,
    };

    Ok(book)
}

/// Преобразует последовательность стилевых блоков в HTML.
/// Учитывает базовое форматирование (bold, italic, underline, strike, super/sub script)
/// и разбивает текст на абзацы по блокам‑разделителям.
fn style_blocks_to_html(body: &[StyleBlock], header: &RtfHeader) -> String {
    let mut html = String::new();
    let mut current_paragraph = String::new();

    for block in body {
        let text = &block.text;

        // Блок, содержащий только перевод строки – разделитель абзацев
        if text == "\n" || text == "\r\n" {
            if !current_paragraph.trim().is_empty() {
                html.push_str(&format!("<p>{}</p>", current_paragraph.trim()));
                current_paragraph.clear();
            }
            continue;
        }

        // Формируем HTML‑фрагмент с инлайн‑стилями
        let formatted_fragment = format_text_fragment(text, &block.painter, header);
        current_paragraph.push_str(&formatted_fragment);
    }

    // Последний абзац
    if !current_paragraph.trim().is_empty() {
        html.push_str(&format!("<p>{}</p>", current_paragraph.trim()));
    }

    if html.is_empty() {
        html.push_str("<p></p>");
    }

    html
}

/// Оборачивает текстовый фрагмент в теги форматирования в зависимости от Painter
fn format_text_fragment(text: &str, painter: &Painter, header: &RtfHeader) -> String {
    let mut result = String::new();

    // Заменяем внутренние переводы строк на <br> (на случай, если в блоке несколько строк)
    let escaped = text
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('\n', "<br>");

    // Открываем теги в порядке, удобном для HTML
    if painter.bold {
        result.push_str("<b>");
    }
    if painter.italic {
        result.push_str("<i>");
    }
    if painter.underline {
        result.push_str("<u>");
    }
    if painter.strike {
        result.push_str("<s>");
    }
    if painter.superscript {
        result.push_str("<sup>");
    }
    if painter.subscript {
        result.push_str("<sub>");
    }

    // Цвет: если не ссылается на нулевой цвет (обычно 0 – авто), добавляем span
    if painter.color_ref != 0 {
        if let Some(color) = header.color_table.get(&painter.color_ref) {
            result.push_str(&format!(
                "<span style=\"color:rgb({},{},{})\">",
                color.red, color.green, color.blue
            ));
        }
    }

    result.push_str(&escaped);

    // Закрываем теги в обратном порядке
    if painter.color_ref != 0 && header.color_table.contains_key(&painter.color_ref) {
        result.push_str("</span>");
    }
    if painter.subscript {
        result.push_str("</sub>");
    }
    if painter.superscript {
        result.push_str("</sup>");
    }
    if painter.strike {
        result.push_str("</s>");
    }
    if painter.underline {
        result.push_str("</u>");
    }
    if painter.italic {
        result.push_str("</i>");
    }
    if painter.bold {
        result.push_str("</b>");
    }

    result
}

    fn decode_text(bytes: &[u8]) -> Result<String> {
        // пробуем UTF-8
        if let Ok(text) = std::str::from_utf8(bytes) {
            return Ok(normalize_text(text));
        }

        // пробуем Windows-1251 (99% русских txt)
        let (cow, _, had_errors) = WINDOWS_1251.decode(bytes);
        if !had_errors {
            return Ok(normalize_text(&cow));
        }

        // fallback
        let (cow, _, _) = UTF_8.decode(bytes);
        Ok(normalize_text(&cow))
    }