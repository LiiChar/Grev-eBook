use std::{fs, io::Read, path::Path};

use anyhow::{bail, Result};
use encoding_rs::Encoding;
use roxmltree::Document;
use uuid::Uuid;
use zip::ZipArchive;

use crate::core::{
    book::model::{Book, BookMeta},
    formats::loader::BookSource,
    utils::{make_chapter, normalize_text},
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

        let xml = self.decode_text(&bytes)?;
        let doc = Document::parse(&xml)?;

        let title = find_text(&doc, "book-title").unwrap_or_else(|| "Untitled".to_string());
        let author = build_author(&doc);
        let language = find_text(&doc, "lang");

        let chapters = if with_chapters {
            extract_sections(&doc)
        } else {
            None
        };

        Ok(Book {
            id: Uuid::new_v4().to_string(),
            meta: BookMeta {
                title,
                author,
                language,
                cover: None,
                path: path.to_string_lossy().to_string(),
            },
            chapters,
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

fn extract_sections(doc: &Document<'_>) -> Option<Vec<crate::core::book::model::Chapter>> {
    let body = doc
        .descendants()
        .find(|n| {
            n.is_element()
                && n.tag_name().name() == "body"
                && n.attribute("name").is_none()
        })?;

    let sections: Vec<_> = body
        .children()
        .filter(|n| n.is_element() && n.tag_name().name() == "section")
        .collect();

    // если секций нет — fallback: берём p напрямую из body
    if sections.is_empty() {
        let text = collect_body_paragraphs(body);
        let text = normalize_text(&text);
        return Some(vec![make_chapter(None, &text, 0)]);
    }

    let mut chapters = Vec::new();
    let mut order = 0;

    for section in sections {
        let title = extract_section_title(section)
            .map(|t| normalize_text(&t))
            .filter(|t| !t.is_empty());

        let text = normalize_text(&collect_section_paragraphs(section));

        if !text.is_empty() {
            chapters.push(make_chapter(title, &text, order));
            order += 1;
        }
    }

    Some(chapters)
}



fn collect_body_paragraphs(body: roxmltree::Node) -> String {
    let mut out = String::new();

    for p in body.descendants().filter(|n| {
        n.is_element() && n.tag_name().name() == "p"
    }) {
        if let Some(text) = p.text() {
            let t = text.trim();
            if !t.is_empty() {
                out.push_str(t);
                out.push('\n');
                out.push('\n');
            }
        }
    }

    out
}


fn extract_section_title(section: roxmltree::Node) -> Option<String> {
    let title = section
        .children()
        .find(|n| n.is_element() && n.tag_name().name() == "title")?;

    let mut parts = Vec::new();

    for p in title.children().filter(|n| n.is_element() && n.tag_name().name() == "p") {
        if let Some(text) = p.text() {
            let t = text.trim();
            if !t.is_empty() {
                parts.push(t);
            }
        }
    }

    if parts.is_empty() {
        None
    } else {
        Some(parts.join(" "))
    }
}


fn collect_section_paragraphs(section: roxmltree::Node) -> String {
    let mut out = String::new();

    for child in section.children() {
        if !child.is_element() {
            continue;
        }

        match child.tag_name().name() {
            // обычные абзацы
            "p" => {
                if let Some(text) = child.text() {
                    let t = text.trim();
                    if !t.is_empty() {
                        out.push_str(t);
                        out.push('\n');
                        out.push('\n');
                    }
                }
            }

            // вложенные секции — рекурсия
            "section" => {
                let nested = collect_section_paragraphs(child);
                if !nested.is_empty() {
                    out.push_str(&nested);
                }
            }

            // title намеренно пропускаем
            _ => {}
        }
    }

    out
}
