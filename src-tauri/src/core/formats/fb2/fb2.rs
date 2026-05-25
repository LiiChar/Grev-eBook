use std::{collections::HashMap, fs, io::Read, path::Path};

use anyhow::{bail, Result};
use base64::{engine::general_purpose, Engine as _};
use encoding_rs::Encoding;
use roxmltree::Document;
use uuid::Uuid;
use zip::ZipArchive;

use crate::core::{
    book::model::{Book, BookMeta, Chapter},
    formats::loader::BookSource,
    utils::{escape_html, normalize_text},
};

pub struct Fb2Loader;

impl BookSource for Fb2Loader {
    fn can_load(&self, path: &Path) -> bool {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| matches!(e.to_ascii_lowercase().as_str(), "fb2" | "zip"))
            .unwrap_or(false)
    }

    fn load(&self, path: &Path, with_chapters: bool) -> Result<Book> {
        let bytes = if path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("zip"))
            .unwrap_or(false)
        {
            read_fb2_from_zip(path)?
        } else {
            fs::read(path)?
        };

        let xml = decode_xml(&bytes)?;
        let doc = Document::parse(&xml)?;

        let title = find_text(&doc, "book-title").unwrap_or_else(|| "Untitled".to_string());
        let author = build_author(&doc);
        
        // Собираем все изображения из <binary> элементов
        let images = extract_images(&doc);
        
        // Находим обложку
        let cover = extract_cover(&doc, &images);
        
        let chapters = if with_chapters {
            extract_sections(&doc, &images)
        } else {
            None
        };

        let language = find_text(&doc, "lang").unwrap_or(self.get_language(&chapters.clone().unwrap_or(vec![])).unwrap_or("en".into()));

        Ok(Book {
            id: self.generate_id(title.clone(), path),
            meta: BookMeta {
                title,
                author,
                language: Some(language),
                cover,
                path: path.to_string_lossy().to_string(),
            },
            chapters,
            position: None,
        })
    }

    fn decode_text(&self, bytes: &[u8]) -> Result<String> {
        decode_xml(bytes)
    }
}

fn read_fb2_from_zip(path: &Path) -> Result<Vec<u8>> {
    let file = fs::File::open(path)?;
    let mut zip = ZipArchive::new(file)?;

    for i in 0..zip.len() {
        let mut entry = zip.by_index(i)?;
        let name = entry.name().to_ascii_lowercase();
        if name.ends_with(".fb2") {
            let mut bytes = Vec::new();
            entry.read_to_end(&mut bytes)?;
            return Ok(bytes);
        }
    }

    bail!("FB2 file not found in zip archive")
}

fn decode_xml(bytes: &[u8]) -> Result<String> {
    let sniff = std::str::from_utf8(&bytes[..bytes.len().min(200)]).unwrap_or("");
    let encoding = sniff.split("encoding").skip(1).find_map(|chunk| {
        let quote = chunk.find('"').or_else(|| chunk.find('\''))?;
        let rest = &chunk[quote + 1..];
        let end = rest.find('"').or_else(|| rest.find('\''))?;
        Some(rest[..end].trim().to_string())
    });

    if let Some(enc) = encoding {
        if let Some(encoding) = Encoding::for_label(enc.as_bytes()) {
            let (cow, _, _) = encoding.decode(bytes);
            return Ok(cow.to_string());
        }
    }

    Ok(String::from_utf8_lossy(bytes).to_string())
}

fn find_text(doc: &Document<'_>, tag: &str) -> Option<String> {
    doc.descendants()
        .find(|n| n.is_element() && n.tag_name().name() == tag)
        .and_then(|n| n.text())
        .map(|text| text.trim().to_string())
}

fn build_author(doc: &Document<'_>) -> Option<String> {
    let author = doc
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "author")?;
    let first = author
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "first-name")
        .and_then(|n| n.text())
        .map(|s| s.trim());
    let last = author
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "last-name")
        .and_then(|n| n.text())
        .map(|s| s.trim());
    let nick = author
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "nickname")
        .and_then(|n| n.text())
        .map(|s| s.trim());

    let mut parts = Vec::new();
    if let Some(first) = first {
        parts.push(first);
    }
    if let Some(last) = last {
        parts.push(last);
    }
    if parts.is_empty() {
        nick.map(|n| n.to_string())
    } else {
        Some(parts.join(" "))
    }
}

/// Извлекает все изображения из <binary> элементов в HashMap<id, base64_data>
fn extract_images(doc: &Document<'_>) -> HashMap<String, String> {
    let mut images = HashMap::new();

    for node in doc
        .descendants()
        .filter(|n| n.is_element() && n.tag_name().name() == "binary")
    {
        if let Some(id) = node.attribute("id") {
            let content_type = node.attribute("content-type").unwrap_or("image/jpeg");

            // Собираем весь текст внутри binary элемента
            let base64_data: String = node
                .children()
                .filter(|n| n.is_text())
                .filter_map(|n| n.text())
                .map(|t| t.trim())
                .filter(|t| !t.is_empty())
                .collect();

            if !base64_data.is_empty() {
                // Сохраняем с MIME типом для data URI
                images.insert(
                    id.to_string(),
                    format!("data:{};base64,{}", content_type, base64_data),
                );
            }
        }
    }

    images
}

/// Извлекает обложку из <coverpage><image l:href="#..."/></coverpage>
fn extract_cover(doc: &Document<'_>, images: &HashMap<String, String>) -> Option<Vec<u8>> {
    // Ищем <coverpage>
    let coverpage = doc
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "coverpage")?;

    // Ищем <image> внутри coverpage
    let image = coverpage
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "image")?;

    // Получаем ссылку l:href="#cover.jpg"
    let href = image
        .attribute("href")
        .or_else(|| image.attribute("l:href"))?;

    // Убираем символ # в начале
    let image_id = href.trim_start_matches('#');

    // Находим изображение в HashMap и декодируем base64
    images.get(image_id).and_then(|data_uri| {
        // data_uri имеет формат "data:image/jpeg;base64,<base64_data>"
        if let Some(comma_pos) = data_uri.find(',') {
            let base64_part = &data_uri[comma_pos + 1..];
            general_purpose::STANDARD.decode(base64_part).ok()
        } else {
            None
        }
    })
}

/// Преобразует FB2 элемент в HTML
fn fb2_to_html(node: roxmltree::Node, images: &HashMap<String, String>) -> String {
    if !node.is_element() {
        if let Some(text) = node.text() {
            return escape_html(text);
        }
        return String::new();
    }

    let tag = node.tag_name().name();

    match tag {
        "p" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<p>{}</p>", content)
        }

        "title" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<h2>{}</h2>", content)
        }

        "subtitle" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<h3>{}</h3>", content)
        }

        "emphasis" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<em>{}</em>", content)
        }

        "strong" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<strong>{}</strong>", content)
        }

        "strikethrough" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<s>{}</s>", content)
        }

        "subscript" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<sub>{}</sub>", content)
        }

        "superscript" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<sup>{}</sup>", content)
        }

        "code" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<code>{}</code>", content)
        }

        "empty-line" => "<br>".to_string(),

        "image" => {
            let href = node
                .attribute("href")
                .or_else(|| node.attribute("l:href"))
                .unwrap_or("");
            let image_id = href.trim_start_matches('#');

            if let Some(data_uri) = images.get(image_id) {
                format!("<img src=\"{}\" alt=\"\" />", data_uri)
            } else {
                String::new()
            }
        }

        "epigraph" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<blockquote>{}</blockquote>", content)
        }

        "cite" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<blockquote>{}</blockquote>", content)
        }

        "poem" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<div class=\"poem\">{}</div>", content)
        }

        "stanza" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<div class=\"stanza\">{}</div>", content)
        }

        "v" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<p class=\"verse\">{}</p>", content)
        }

        "text-author" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<p class=\"text-author\">{}</p>", content)
        }

        "annotation" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<div class=\"annotation\">{}</div>", content)
        }

        "a" => {
            let href = node
                .attribute("href")
                .or_else(|| node.attribute("l:href"))
                .unwrap_or("#");
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<a href=\"{}\">{}</a>", href, content)
        }

        "table" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<table>{}</table>", content)
        }

        "tr" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<tr>{}</tr>", content)
        }

        "th" | "td" => {
            let content: String = node.children().map(|c| fb2_to_html(c, images)).collect();
            format!("<{}>{}</{}>", tag, content, tag)
        }

        "section" => node.children().map(|c| fb2_to_html(c, images)).collect(),

        "body" => node.children().map(|c| fb2_to_html(c, images)).collect(),

        _ => node.children().map(|c| fb2_to_html(c, images)).collect(),
    }
}

fn extract_sections(doc: &Document<'_>, images: &HashMap<String, String>) -> Option<Vec<Chapter>> {
    let body = doc.descendants().find(|n| {
        n.is_element() && n.tag_name().name() == "body" && n.attribute("name").is_none()
    })?;

    let sections: Vec<_> = body
        .children()
        .filter(|n| n.is_element() && n.tag_name().name() == "section")
        .collect();

    // если секций нет — fallback: конвертируем весь body в HTML
    if sections.is_empty() {
        let html = fb2_to_html(body, images);
        return Some(vec![Chapter {
            id: Uuid::new_v4().to_string(),
            title: None,
            html,
            order: 0,
        }]);
    }

    let mut chapters = Vec::new();
    let mut order = 0;

    for section in sections {
        let title = extract_section_title(section)
            .map(|t| normalize_text(&t))
            .filter(|t| !t.is_empty());

        // Конвертируем содержимое секции в HTML
        let html = fb2_to_html(section, images);

        chapters.push(Chapter {
            id: Uuid::new_v4().to_string(),
            title,
            html,
            order,
        });
        order += 1;
    }

    // Если не удалось извлечь секции, пробуем конвертировать весь body
    if chapters.is_empty() {
        let html = fb2_to_html(body, images);
        chapters.push(Chapter {
            id: Uuid::new_v4().to_string(),
            title: None,
            html,
            order: 0,
        });
    }

    Some(chapters)
}

fn extract_section_title(section: roxmltree::Node) -> Option<String> {
    let title = section
        .children()
        .find(|n| n.is_element() && n.tag_name().name() == "title")?;

    let mut parts = Vec::new();

    // Рекурсивно собираем весь текст из title (включая вложенные элементы)
    fn collect_text(node: roxmltree::Node, parts: &mut Vec<String>) {
        if node.is_text() {
            if let Some(text) = node.text() {
                let t = text.trim();
                if !t.is_empty() {
                    parts.push(t.to_string());
                }
            }
        } else {
            for child in node.children() {
                collect_text(child, parts);
            }
        }
    }

    collect_text(title, &mut parts);

    if parts.is_empty() {
        None
    } else {
        Some(parts.join(" "))
    }
}
