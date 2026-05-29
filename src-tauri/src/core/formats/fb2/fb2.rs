use std::{collections::HashMap, fs, io::Read, path::Path};

use anyhow::{bail, Result};
use base64::{Engine, engine::general_purpose};
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

    fn load(&self, path: &Path, load_chapters: bool, return_chapters: bool) -> Result<Book> {
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

        let annotation = build_annotation(&doc);
        let genres = build_genres(&doc);
        
        // Собираем все изображения из <binary> элементов
        let images = extract_images(&doc);
        
        // Находим обложку (for chapter images only, not stored in meta)
        let _cover = extract_cover(&doc, &images);
        
        let chapters = if load_chapters {
            extract_sections(&doc, &images)
        } else {
            None
        };

        let language = find_text(&doc, "lang").unwrap_or(self.get_language(&chapters.clone().unwrap_or(vec![])).unwrap_or("en".into()));

        println!("Count chapters: {}", chapters.clone().unwrap_or(vec![]).len());

        Ok(Book {
            id: self.generate_id(title.clone()),
            meta: BookMeta {
                title,
                author,
                language: Some(language),
                cover_path: None,
                path: path.to_string_lossy().to_string(),
                size: self.get_size(&path)?,
                last_read_at: self.get_last_read_at(&path)?,
                last_modified: self.get_last_modified(&path)?,
                created_at: self.get_created_at(&path)?,
                description: annotation,
                chars_read: Some(self.get_chars_read(&chapters.clone().unwrap_or(vec![]))?),
                progress_read: None,
                genres: genres,
                count_chapters: chapters.clone().unwrap_or(vec![]).len() as i64,
            },
            chapters: match return_chapters {
                true => chapters,
                false => None,
            },
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

fn build_genres(doc: &Document<'_>) -> Option<Vec<String>> {
    let node_genres = doc
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "genre")?;
    let mut genres = Vec::new();
    for genre in node_genres.descendants() {
        if let Some(text) = genre.text() {
            if genres.contains(&text.to_string()) {
                continue;
            }
            genres.push(text.trim().to_string());
        }
    }
    Some(genres)
}

fn build_annotation(doc: &Document<'_>) -> Option<String> {
    let annotation = doc
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "annotation")?;
    let content = annotation
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "p")
        .and_then(|n| n.text())
        .map(|s| s.trim().to_string());

    content
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
fn extract_cover(doc: &Document<'_>, images: &HashMap<String, String>) -> Option<String> {
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

    images.get(image_id).cloned()
}

const XLINK_NS: &str = "http://www.w3.org/1999/xlink";

/// Get cover raw bytes from FB2 (data: URI -> raw bytes)
pub fn get_cover_bytes(path: &str) -> Option<(Vec<u8>, String)> {
    let path = Path::new(path);

    let bytes = if path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("zip"))
        .unwrap_or(false)
    {
        read_fb2_from_zip(path).ok()?
    } else {
        fs::read(path).ok()?
    };

    let xml = decode_xml(&bytes).ok()?;
    let doc = Document::parse(&xml).ok()?;

    let coverpage = doc
        .descendants()
        .find(|n| n.has_tag_name("coverpage"))?;

    let image = coverpage
        .descendants()
        .find(|n| n.has_tag_name("image"))?;

    // xlink:href="#image.jpg"
    let href = image
        .attribute((XLINK_NS, "href"))
        .or_else(|| image.attribute("href"))
        .or_else(|| image.attribute("l:href"))?
        .trim_start_matches('#');

    let binary = doc
        .descendants()
        .find(|n| {
            n.has_tag_name("binary")
                && n.attribute("id")
                    .map(|id| id == href)
                    .unwrap_or(false)
        })?;

    let mime = binary
        .attribute("content-type")
        .unwrap_or("image/jpeg");

    let base64_data = binary
        .text()?
        .replace('\n', "")
        .replace('\r', "")
        .replace(' ', "");

    let decoded = general_purpose::STANDARD
        .decode(base64_data.as_bytes())
        .ok()?;

    let ext = match mime {
        "image/png" => "png",
        "image/jpeg" => "jpg",
        "image/jpg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "jpg",
    };

    Some((decoded, ext.to_string()))
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
    let body = doc
        .descendants()
        .find(|n| {
            n.is_element()
                && n.tag_name().name() == "body"
                && n.attribute("name").is_none()
        })
        .or_else(|| {
            doc.descendants()
                .find(|n| n.is_element() && n.tag_name().name() == "body")
        })?;

    let mut chapters = Vec::new();
    let mut order = 0;

    collect_sections_recursive(body, images, &mut chapters, &mut order);

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

fn collect_sections_recursive(
    node: roxmltree::Node,
    images: &HashMap<String, String>,
    chapters: &mut Vec<Chapter>,
    order: &mut usize,
) {
    for child in node.children().filter(|n| {
        n.is_element() && n.tag_name().name() == "section"
    }) {
        let nested_sections: Vec<_> = child
            .children()
            .filter(|n| n.is_element() && n.tag_name().name() == "section")
            .collect();

        // если есть вложенные section — идём глубже
        if !nested_sections.is_empty() {
            collect_sections_recursive(child, images, chapters, order);
        } else {
            // лист дерева = полноценная глава
            let title = extract_section_title(child)
                .map(|t| normalize_text(&t))
                .filter(|t| !t.is_empty());

            let html = fb2_to_html(child, images);

            chapters.push(Chapter {
                id: Uuid::new_v4().to_string(),
                title,
                html,
                order: *order,
            });

            *order += 1;
        }
    }
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
