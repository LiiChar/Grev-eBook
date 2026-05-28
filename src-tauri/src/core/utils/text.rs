use html_escape::decode_html_entities;
use regex::Regex;
use uuid::Uuid;

use crate::core::book::model::Chapter;

pub fn normalize_text(input: &str) -> String {
    input
        .replace("\r\n", "\n")
        .replace('\r', "\n")
        .replace("\u{00A0}", " ")
        .trim()
        .to_string()
}

pub fn normalize_epub_text(input: &str) -> String {
    // 1. Стандартные переводы строк и пробелы
    let mut text = input.replace("\r\n", "\n").replace('\r', "\n");
    text = text.replace("\u{00A0}", " "); // неразрывный пробел

    // 2. Декодирование HTML сущностей (&nbsp;, &amp; и т.д.)
    text = decode_html_entities(&text).to_string();

    // 3. Удаление лишних пробелов в начале и конце строк
    let lines: Vec<&str> = text
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect();

    // 4. Объединение строк внутри абзацев
    let mut merged_lines = Vec::new();
    let mut buffer = String::new();

    for line in lines {
        if line.ends_with('.') || line.ends_with('!') || line.ends_with('?') || line.ends_with('—')
        {
            if !buffer.is_empty() {
                buffer.push(' ');
            }
            buffer.push_str(line);
            merged_lines.push(buffer.clone());
            buffer.clear();
        } else {
            if !buffer.is_empty() {
                buffer.push(' ');
            }
            buffer.push_str(line);
        }
    }

    if !buffer.is_empty() {
        merged_lines.push(buffer);
    }

    text = merged_lines.join("\n");

    // 5. Убираем лишние пробелы внутри текста
    let re_spaces = Regex::new(r"[ ]{2,}").unwrap();
    text = re_spaces.replace_all(&text, " ").to_string();

    text.trim().to_string()
}

/// Split text into chapters based on chapter markers.
/// Returns a single chapter if no markers found.
pub fn split_into_chapters(text: &str) -> Vec<Chapter> {
    let mut chapters = Vec::new();
    let mut current_title: Option<String> = None;
    let mut current_text = String::new();
    let mut order = 0;
    let mut found_any_chapter = false;

    for line in text.lines() {
        if is_chapter_title(line) {
            found_any_chapter = true;
            if !current_text.trim().is_empty() || current_title.is_some() {
                chapters.push(make_chapter(current_title.take(), &current_text, order));
                order += 1;
                current_text.clear();
            }
            current_title = Some(line.trim().to_string());
        } else {
            current_text.push_str(line);
            current_text.push('\n');
        }
    }

    // Add the last chapter
    if !current_text.trim().is_empty() || current_title.is_some() {
        chapters.push(make_chapter(current_title, &current_text, order));
    }

    // If no chapter markers found, return the whole text as one chapter
    if chapters.is_empty() || !found_any_chapter {
        chapters.clear();
        chapters.push(make_chapter(None, text, 0));
    }

    chapters
}

/// Check if line looks like a chapter title
pub fn is_chapter_title(line: &str) -> bool {
    let l = line.trim();

    // Too long or too short
    if l.len() > 60 || l.len() < 3 {
        return false;
    }

    // Must be on its own line (surrounded by blank lines ideally, but we check content)
    let lower = l.to_lowercase();

    // Common chapter markers
    let chapter_patterns = [
        r"^глава\s+\d+",
        r"^глава\s+[ivxlcdm]+",
        r"^chapter\s+\d+",
        r"^chapter\s+[ivxlcdm]+",
        r"^часть\s+\d+",
        r"^часть\s+[ivxlcdm]+",
        r"^part\s+\d+",
        r"^раздел\s+\d+",
        r"^книга\s+\d+",
        r"^\d+\.\s+\w+", // "1. Title"
    ];

    for pattern in chapter_patterns {
        if let Ok(re) = Regex::new(&format!("(?i){}", pattern)) {
            if re.is_match(&lower) {
                return true;
            }
        }
    }

    // Exact matches for simple chapter markers
    if lower == "пролог"
        || lower == "эпилог"
        || lower == "введение"
        || lower == "заключение"
        || lower == "prologue"
        || lower == "epilogue"
        || lower == "introduction"
        || lower == "conclusion"
    {
        return true;
    }

    false
}

/// Convert plain text to HTML with proper paragraph tags
pub fn make_chapter(title: Option<String>, text: &str, order: usize) -> Chapter {
    let paragraphs: Vec<&str> = text
        .split("\n\n")
        .map(|p| p.trim())
        .filter(|p| !p.is_empty())
        .collect();

    let html = if paragraphs.is_empty() {
        String::new()
    } else {
        paragraphs
            .iter()
            .map(|p| {
                // Preserve line breaks within paragraphs
                let content = p
                    .lines()
                    .map(|l| escape_html(l.trim()))
                    .collect::<Vec<_>>()
                    .join("<br>");
                format!("<p>{}</p>", content)
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    Chapter {
        id: Uuid::new_v4().to_string(),
        title,
        html,
        order,
    }
}

pub fn escape_html(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}
