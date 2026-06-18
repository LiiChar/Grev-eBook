use std::{
    collections::{HashMap, HashSet},
    fs,
    io::Read,
    path::Path,
};

use anyhow::{bail, Result};
use base64::{engine::general_purpose, Engine};
use encoding_rs::Encoding;
use regex::Regex;
use roxmltree::{Document, Node};
use uuid::Uuid;
use zip::ZipArchive;

use crate::core::{
    book::model::{Book, BookMeta, Chapter},
    formats::loader::BookSource,
    utils::{escape_html, normalize_text},
};


const XLINK_NS: &str = "http://www.w3.org/1999/xlink";

pub struct Fb2Loader;

impl BookSource for Fb2Loader {
    fn can_load(&self, path: &Path) -> bool {
        path.starts_with("content://")
            || path
                .extension()
                .and_then(|e| e.to_str())
                .is_some_and(|e| matches!(e.to_ascii_lowercase().as_str(), "fb2" | "zip"))
    }

    fn load(&self, path: &Path, load_chapters: bool, return_chapters: bool) -> Result<Book> {
        let bytes = read_fb2_bytes(path)?;
        let xml = decode_xml(&bytes)?;
        let doc = Document::parse(&xml)?;

        let title = find_text(&doc, "book-title").unwrap_or_else(|| "Untitled".to_string());
        let author = build_author(&doc);
        let annotation = build_annotation(&doc);
        let genres = build_genres(&doc);

        let images = if load_chapters {
            extract_images(&doc)
        } else {
            HashMap::new()
        };

        let chapters = if load_chapters {
            extract_sections(&doc, &images)
        } else {
            None
        };

        let empty_chapters = [];
        let chapters_ref = chapters.as_deref().unwrap_or(&empty_chapters);

        let language = find_text(&doc, "lang")
            .or_else(|| self.get_language(chapters_ref).ok())
            .unwrap_or_else(|| "en".to_string());

        let chars_read = self.get_chars_read(chapters_ref)?;
        let count_chapters = chapters_ref.len() as i64;

        Ok(Book {
            id: self.generate_id(title.clone()),
            meta: BookMeta {
                title,
                author,
                language: Some(language),
                cover_path: None,
                path: path.to_string_lossy().into_owned(),
                size: self.get_size(path)?,
                last_read_at: self.get_last_read_at(path)?,
                last_modified: self.get_last_modified(path)?,
                created_at: self.get_created_at(path)?,
                description: annotation,
                chars_read: Some(chars_read),
                progress_read: None,
                genres,
                count_chapters,
            },
            chapters: return_chapters.then_some(chapters).flatten(),
            position: None,
        })
    }

    fn decode_text(&self, bytes: &[u8]) -> Result<String> {
        decode_xml(bytes)
    }
}

fn read_fb2_bytes(path: &Path) -> Result<Vec<u8>> {
    if is_zip(path) {
        read_fb2_from_zip(path)
    } else {
        Ok(fs::read(path)?)
    }
}

fn is_zip(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| e.eq_ignore_ascii_case("zip"))
}

fn read_fb2_from_zip(path: &Path) -> Result<Vec<u8>> {
    let file = fs::File::open(path)?;
    let mut zip = ZipArchive::new(file)?;

    for i in 0..zip.len() {
        let mut entry = zip.by_index(i)?;
        if entry.name().to_ascii_lowercase().ends_with(".fb2") {
            let mut bytes = Vec::with_capacity(entry.size() as usize);
            entry.read_to_end(&mut bytes)?;
            return Ok(bytes);
        }
    }

    bail!("FB2 file not found in zip archive")
}

fn find_text(doc: &Document<'_>, tag: &str) -> Option<String> {
    doc.descendants()
        .find(|n| n.has_tag_name(tag))
        .and_then(|n| n.text())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToOwned::to_owned)
}

fn build_genres(doc: &Document<'_>) -> Option<Vec<String>> {
    let mut seen = HashSet::new();
    let mut genres = Vec::new();

    for node in doc.descendants().filter(|n| n.has_tag_name("genre")) {
        let Some(text) = node.text().map(str::trim).filter(|s| !s.is_empty()) else {
            continue;
        };

        if seen.insert(text.to_string()) {
            genres.push(text.to_string());
        }
    }

    (!genres.is_empty()).then_some(genres)
}

fn build_annotation(doc: &Document<'_>) -> Option<String> {
    doc.descendants()
        .find(|n| n.has_tag_name("annotation"))?
        .descendants()
        .find(|n| n.has_tag_name("p"))
        .and_then(|n| n.text())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToOwned::to_owned)
}

fn build_author(doc: &Document<'_>) -> Option<String> {
    let author = doc.descendants().find(|n| n.has_tag_name("author"))?;

    let first = child_text(author, "first-name");
    let last = child_text(author, "last-name");
    let nick = child_text(author, "nickname");

    let full_name = [first.as_deref(), last.as_deref()]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>()
        .join(" ");

    if full_name.is_empty() {
        nick
    } else {
        Some(full_name)
    }
}

fn child_text(node: Node<'_, '_>, tag: &str) -> Option<String> {
    node.descendants()
        .find(|n| n.has_tag_name(tag))
        .and_then(|n| n.text())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToOwned::to_owned)
}

fn extract_images(doc: &Document<'_>) -> HashMap<String, String> {
    doc.descendants()
        .filter(|n| n.has_tag_name("binary"))
        .filter_map(|node| {
            let id = node.attribute("id")?;
            let content_type = node.attribute("content-type").unwrap_or("image/jpeg");

            let base64_data: String = node
                .children()
                .filter_map(|n| n.text())
                .flat_map(|text| text.chars())
                .filter(|ch| !ch.is_whitespace())
                .collect();

            if base64_data.is_empty() {
                None
            } else {
                Some((
                    id.to_string(),
                    format!("data:{content_type};base64,{base64_data}"),
                ))
            }
        })
        .collect()
}

fn href_attr<'a>(node: Node<'a, 'a>) -> Option<&'a str> {
    node.attribute((XLINK_NS, "href"))
        .or_else(|| node.attribute("href"))
        .or_else(|| node.attribute("l:href"))
}

fn extract_cover(doc: &Document<'_>, images: &HashMap<String, String>) -> Option<String> {
    let image_id = doc
        .descendants()
        .find(|n| n.has_tag_name("coverpage"))?
        .descendants()
        .find(|n| n.has_tag_name("image"))
        .and_then(href_attr)?
        .trim_start_matches('#');

    images.get(image_id).cloned()
}

pub fn get_cover_bytes(path: &str) -> Option<(Vec<u8>, String)> {
    let path = Path::new(path);
    let bytes = read_fb2_bytes(path).ok()?;
    let xml = decode_xml(&bytes).ok()?;
    let doc = Document::parse(&xml).ok()?;

    let image_id = doc
        .descendants()
        .find(|n| n.has_tag_name("coverpage"))?
        .descendants()
        .find(|n| n.has_tag_name("image"))
        .and_then(href_attr)?
        .trim_start_matches('#');

    let binary = doc.descendants().find(|n| {
        n.has_tag_name("binary") && n.attribute("id").is_some_and(|id| id == image_id)
    })?;

    let mime = binary.attribute("content-type").unwrap_or("image/jpeg");

    let base64_data: String = binary
        .text()?
        .chars()
        .filter(|ch| !ch.is_whitespace())
        .collect();

    let decoded = general_purpose::STANDARD.decode(base64_data).ok()?;

    let ext = match mime {
        "image/png" => "png",
        "image/jpeg" | "image/jpg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "jpg",
    };

    Some((decoded, ext.to_string()))
}

fn render_children(node: Node<'_, '_>, images: &HashMap<String, String>) -> String {
    node.children().map(|child| fb2_to_html(child, images)).collect()
}

fn wrap(tag: &str, content: String) -> String {
    format!("<{tag}>{content}</{tag}>")
}

fn wrap_class(tag: &str, class_name: &str, content: String) -> String {
    format!("<{tag} class=\"{class_name}\">{content}</{tag}>")
}

fn fb2_to_html(node: Node<'_, '_>, images: &HashMap<String, String>) -> String {
    if node.is_text() {
        return node.text().map(escape_html).unwrap_or_default();
    }

    if !node.is_element() {
        return String::new();
    }

    let tag = node.tag_name().name();

    match tag {
        "p" => wrap("p", render_children(node, images)),
        "title" => wrap("h2", render_children(node, images)),
        "subtitle" => wrap("h3", render_children(node, images)),
        "emphasis" => wrap("em", render_children(node, images)),
        "strong" => wrap("strong", render_children(node, images)),
        "strikethrough" => wrap("s", render_children(node, images)),
        "subscript" => wrap("sub", render_children(node, images)),
        "superscript" => wrap("sup", render_children(node, images)),
        "code" => wrap("code", render_children(node, images)),

        "empty-line" => "<br>".to_string(),

        "image" => href_attr(node)
            .and_then(|href| images.get(href.trim_start_matches('#')))
            .map(|data_uri| format!("<img src=\"{}\" alt=\"\" />", data_uri))
            .unwrap_or_default(),

        "epigraph" | "cite" => wrap("blockquote", render_children(node, images)),
        "poem" => wrap_class("div", "poem", render_children(node, images)),
        "stanza" => wrap_class("div", "stanza", render_children(node, images)),
        "v" => wrap_class("p", "verse", render_children(node, images)),
        "text-author" => wrap_class("p", "text-author", render_children(node, images)),
        "annotation" => wrap_class("div", "annotation", render_children(node, images)),

        "a" => {
            let href = href_attr(node).unwrap_or("#");
            let content = render_children(node, images);
            format!("<a href=\"{}\">{}</a>", escape_html(href), content)
        }

        "table" => wrap("table", render_children(node, images)),
        "tr" => wrap("tr", render_children(node, images)),
        "th" | "td" => wrap(tag, render_children(node, images)),

        "section" | "body" => render_children(node, images),

        _ => render_children(node, images),
    }
}

fn extract_sections(doc: &Document<'_>, images: &HashMap<String, String>) -> Option<Vec<Chapter>> {
    let body = doc
        .descendants()
        .find(|n| n.has_tag_name("body") && n.attribute("name").is_none())
        .or_else(|| doc.descendants().find(|n| n.has_tag_name("body")))?;

    let mut chapters = Vec::new();
    let mut order = 0;

    collect_sections_recursive(body, images, &mut chapters, &mut order);

    if chapters.is_empty() {
        chapters.push(Chapter {
            id: Uuid::new_v4().to_string(),
            title: None,
            html: collaps_style(&fb2_to_html(body, images)),
            order: 0,
        });
    }

    Some(chapters)
}

fn collaps_style(html: &str) -> String {
    let style_re = Regex::new(r"(?is)<style[^>]*>(.*?)</style>").unwrap();
    let rule_re = Regex::new(r"(?s)([^{}@]+?)\s*\{([^}]*)\}").unwrap();

    style_re
        .replace_all(html, |caps: &regex::Captures| {
            let css = &caps[1];

            let scoped = rule_re.replace_all(css, |rule: &regex::Captures| {
                let selectors = rule[1]
                    .split(',')
                    .map(|s| format!(".chapter {}", s.trim()))
                    .collect::<Vec<_>>()
                    .join(", ");

                format!("{} {{{}}}", selectors, &rule[2])
            });

            format!("<style>{}</style>", scoped)
        })
        .to_string()
}

fn collect_sections_recursive(
    node: Node<'_, '_>,
    images: &HashMap<String, String>,
    chapters: &mut Vec<Chapter>,
    order: &mut usize,
) {
    for child in node.children().filter(|n| n.has_tag_name("section")) {
        let has_nested_sections = child.children().any(|n| n.has_tag_name("section"));

        if has_nested_sections {
            collect_sections_recursive(child, images, chapters, order);
            continue;
        }

        let title = extract_section_title(child)
            .map(|title| normalize_text(&title))
            .filter(|title| !title.is_empty());

        chapters.push(Chapter {
            id: Uuid::new_v4().to_string(),
            title,
            html: fb2_to_html(child, images),
            order: *order,
        });

        *order += 1;
    }
}

fn extract_section_title(section: Node<'_, '_>) -> Option<String> {
    let title = section.children().find(|n| n.has_tag_name("title"))?;

    let text = title
        .descendants()
        .filter_map(|n| n.text())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join(" ");

    (!text.is_empty()).then_some(text)
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