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
    let mut lines: Vec<&str> = text
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

pub fn normalize_pdf_text(text: &str) -> String {
    if text.trim().is_empty() {
        return String::new();
    }

    let mut result = String::new();
    let mut last_char = None;
    let mut in_ligature = false;
    let mut bracket_depth = 0;

    for c in text.chars() {
        match c {
            // Удаляем управляющие символы
            c if c.is_control() && c != '\n' && c != '\t' => continue,

            // Обработка лигатур и специальных символов PDF
            '\u{fb00}' => {
                result.push_str("ff");
                last_char = Some('f');
                continue;
            } // ff ligature
            '\u{fb01}' => {
                result.push_str("fi");
                last_char = Some('i');
                continue;
            } // fi ligature
            '\u{fb02}' => {
                result.push_str("fl");
                last_char = Some('l');
                continue;
            } // fl ligature
            '\u{fb03}' => {
                result.push_str("ffi");
                last_char = Some('i');
                continue;
            } // ffi ligature
            '\u{fb04}' => {
                result.push_str("ffl");
                last_char = Some('l');
                continue;
            } // ffl ligature

            // Обработка тире и дефисов
            '\u{2010}' | '\u{2011}' | '\u{2012}' | '\u{2013}' | '\u{fe58}' | '\u{fe63}'
            | '\u{ff0d}' => {
                result.push('-');
                last_char = Some('-');
                continue;
            }

            // Длинное тире
            '\u{2014}' | '\u{2015}' | '\u{fe31}' | '\u{fe32}' => {
                if result.ends_with(char::is_alphanumeric) {
                    result.push_str(" — ");
                } else {
                    result.push('—');
                }
                last_char = Some('—');
                continue;
            }

            // Кавычки
            '\u{2018}' | '\u{2019}' | '\u{201a}' | '\u{201b}' => {
                result.push('\'');
                last_char = Some('\'');
                continue;
            }
            '\u{201c}' | '\u{201d}' | '\u{201e}' | '\u{201f}' => {
                result.push('"');
                last_char = Some('"');
                continue;
            }
            '\u{00ab}' | '\u{00bb}' => {
                // французские кавычки
                result.push('"');
                last_char = Some('"');
                continue;
            }

            // Многоточие
            '\u{2026}' => {
                result.push_str("...");
                last_char = Some('.');
                continue;
            }

            // Символы валют
            '\u{20ac}' => {
                result.push('€');
                last_char = Some('€');
                continue;
            }
            '\u{00a3}' => {
                result.push('£');
                last_char = Some('£');
                continue;
            }
            '\u{00a5}' => {
                result.push('¥');
                last_char = Some('¥');
                continue;
            }

            // Математические символы
            '\u{00d7}' => {
                result.push('×');
                last_char = Some('×');
                continue;
            }
            '\u{00f7}' => {
                result.push('÷');
                last_char = Some('÷');
                continue;
            }

            // Неразрывный пробел и другие пробелы
            '\u{00a0}' | '\u{2007}' | '\u{2008}' | '\u{2009}' | '\u{200a}' | '\u{202f}'
            | '\u{205f}' => {
                result.push(' ');
                last_char = Some(' ');
                continue;
            }

            // Скобки - отслеживаем вложенность
            '(' | '[' | '{' => {
                bracket_depth += 1;
                result.push(c);
                last_char = Some(c);
                continue;
            }

            ')' | ']' | '}' => {
                if bracket_depth > 0 {
                    bracket_depth -= 1;
                }
                result.push(c);
                last_char = Some(c);
                continue;
            }

            // Переносы строк - нормализуем
            '\r' | '\n' => {
                if !result.ends_with(' ') && !result.ends_with('\n') {
                    result.push(' ');
                }
                last_char = Some(' ');
                continue;
            }

            // Обычный пробел
            ' ' => {
                // Убираем повторяющиеся пробелы
                if last_char != Some(' ') && last_char != Some('\n') && last_char != Some('\t') {
                    result.push(' ');
                }
                last_char = Some(' ');
                continue;
            }

            // Обработка повторяющихся символов (частная проблема PDF)
            _ => {
                // Проверяем, не является ли это повторением предыдущего символа
                // (это частая проблема в PDF, когда символы дублируются)
                if let Some(last) = last_char {
                    if c == last && c.is_alphanumeric() {
                        // Пропускаем дублирование, но не для всех символов
                        // Например, "oo" в "book" - это нормально, а "tttt" - нет
                        let last_few = result.chars().rev().take(3).collect::<String>();
                        if last_few.chars().all(|ch| ch == c) {
                            continue; // Пропускаем 4+ повторения
                        }
                    }
                }

                // Добавляем обычный символ
                result.push(c);
                last_char = Some(c);
            }
        }
    }

    // Постобработка
    let processed = result
        // Убираем пробелы в начале и конце
        .trim()
        // Заменяем множественные пробелы на один
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        // Исправляем распространенные ошибки
        .replace(" ,", ",")
        .replace(" .", ".")
        .replace(" ;", ";")
        .replace(" :", ":")
        .replace(" !", "!")
        .replace(" ?", "?")
        .replace(" )", ")")
        .replace("( ", "(")
        .replace(" ]", "]")
        .replace("[ ", "[")
        .replace(" }", "}")
        .replace("{ ", "{")
        // Исправляем сбитые кавычки
        .replace(" \"", " \"")
        .replace("\" ", "\" ")
        .replace(" '", " '")
        .replace("' ", "' ")
        // Убираем пробелы вокруг дефисов (кроме случаев, когда это тире)
        .replace(" - ", "-")
        .replace("- ", "-")
        .replace(" -", "-");

    processed
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
