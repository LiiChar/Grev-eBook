use std::collections::HashSet;
use std::fs::File;
use std::io::{BufReader, Read, Seek};
use std::path::Path;
use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use docx_rust::document::{
    BodyContent, Drawing, Paragraph, ParagraphContent, Run, RunContent, Table, TableCellContent,
    TableRowContent,
};
use docx_rust::formatting::NumberingProperty;
use uuid::Uuid;
use zip::ZipArchive;
use xmltree::Element; // Оставляем для meta и rels, если нужно
use docx_rust::DocxFile;
use docx_rust::Docx;

use crate::core::{
    book::model::{Book, BookMeta, Chapter},
    formats::loader::BookSource,
    utils::{is_chapter_title, normalize_text},
};

pub struct DocxLoader;

impl BookSource for DocxLoader {
    fn can_load(&self, path: &Path) -> bool {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("docx"))
            .unwrap_or(false)
    }

    fn load(&self, path: &Path, with_chapters: bool) -> Result<Book> {
        // Парсинг с docx-rust
        let docx_file = DocxFile::from_file(path)?;
        let docx = docx_file.parse()?;

        // ZIP для изображений и meta
        let file = File::open(path)?;
        let mut archive = ZipArchive::new(BufReader::new(file))?;

        // Мета
        let meta = read_core_properties(&mut archive).unwrap_or_else(|_| BookMeta {
            title: path.file_stem().and_then(|s| s.to_str()).unwrap_or("Untitled").to_string(),
            author: None,
            language: None,
            cover: None,
            path: path.to_string_lossy().into_owned(),
        });

        let chapters = if with_chapters {
            Some(convert_document_to_chapters(&docx, &mut archive)?)
        } else {
            None
        };

        Ok(Book {
            id: Uuid::new_v4().to_string(),
            meta,
            chapters,
            position: None
        })
    }
}

// Конвертация в HTML
fn convert_document_to_chapters(
    docx: &Docx,
    archive: &mut ZipArchive<impl Read + Seek>,
) -> Result<Vec<Chapter>> {
    let file_names: HashSet<String> = archive.file_names().map(|n| n.to_string()).collect();
    let mut chapters: Vec<Chapter> = Vec::new();
    let mut current_html = String::with_capacity(32_000);
    let mut current_title: Option<String> = None;
    let mut order = 0;

    let mut in_list = false;
    let mut list_level = 0;
    let mut list_type = "ul";

    let mut close_list = |html: &mut String, in_list: &mut bool, list_type: &str| {
        if *in_list {
            html.push_str(&format!("</{}>\n", list_type));
            *in_list = false;
        }
    };

    let mut push_chapter = |chapters: &mut Vec<Chapter>,
                            title: &mut Option<String>,
                            html: &mut String,
                            order: &mut usize| {
        if html.trim().is_empty() && title.is_none() {
            return;
        }
        chapters.push(Chapter {
            id: Uuid::new_v4().to_string(),
            title: title.take(),
            html: std::mem::take(html),
            order: *order,
        });
        *order += 1;
    };

    for child in &docx.document.body.content {
        match child {
            BodyContent::Paragraph(para) => {
                let (p_html, is_heading, new_list_info, plain_text) =
                    process_paragraph(para, archive, &docx, &file_names)?;

                let heading_level = is_heading.unwrap_or(0);
                let is_chapter = (heading_level == 1 || heading_level == 2)
                    || (!plain_text.is_empty() && is_chapter_title(&plain_text));

                if is_chapter {
                    close_list(&mut current_html, &mut in_list, list_type);
                    push_chapter(&mut chapters, &mut current_title, &mut current_html, &mut order);
                    if !plain_text.is_empty() {
                        current_title = Some(plain_text);
                    }
                    continue;
                }

                if let Some((level, kind)) = new_list_info {
                    if !in_list || level != list_level || kind != list_type {
                        close_list(&mut current_html, &mut in_list, list_type);
                        list_type = if kind == "decimal" { "ol" } else { "ul" };
                        list_level = level;
                        in_list = true;
                        current_html.push_str(&format!("<{}>\n", list_type));
                    }
                    if !p_html.trim().is_empty() {
                        current_html.push_str(&format!("<li>{}</li>\n", p_html));
                    }
                } else {
                    close_list(&mut current_html, &mut in_list, list_type);
                    if p_html.trim().is_empty() {
                        continue;
                    }
                    let tag = match heading_level {
                        3 => "h3",
                        4 => "h4",
                        5 => "h5",
                        _ => "p",
                    };
                    current_html.push_str(&format!("<{}>{}</{}>\n", tag, p_html, tag));
                }
            }
            BodyContent::Table(table) => {
                close_list(&mut current_html, &mut in_list, list_type);
                current_html.push_str(&process_table(table, archive, &docx, &file_names)?);
            }
            _ => {}
        }
    }

    close_list(&mut current_html, &mut in_list, list_type);
    push_chapter(&mut chapters, &mut current_title, &mut current_html, &mut order);

    if chapters.is_empty() {
        chapters.push(Chapter {
            id: Uuid::new_v4().to_string(),
            title: None,
            html: String::new(),
            order: 0,
        });
    }

    Ok(chapters)
}

// Обработка параграфа
fn process_paragraph(
    p: &Paragraph,
    archive: &mut ZipArchive<impl Read + Seek>,
    docx: &Docx,
    file_names: &HashSet<String>,
) -> Result<(String, Option<u8>, Option<(u8, String)>, String)> {
    let mut buf = String::new();
    let mut is_heading = None;
    let mut list_info = None;

    if let Some(ppr) = &p.property {
        if let Some(style_id) = &ppr.style_id {
            if style_id.value.starts_with("Heading") {
                if let Ok(lvl) = style_id.value["Heading".len()..].parse::<u8>() {
                    is_heading = Some(lvl);
                }
            }
        }

        if let Some(num_pr) = &ppr.numbering {
            if let Some(level) = &num_pr.level {
                let kind = get_list_kind(docx, num_pr);
                let lvl = if level.value < 0 { 0 } else { level.value as u8 };
                list_info = Some((lvl, kind));
            }
        }
    }

    for child in &p.content {
        match child {
            ParagraphContent::Run(r) => {
                buf.push_str(&process_run(r, archive, docx, file_names)?);
            }
            ParagraphContent::Link(link) => {
                buf.push_str(&process_hyperlink(link, archive, docx, file_names)?);
            }
            _ => {}
        }
    }

    if buf.trim().is_empty() {
        buf.clear();
    }
    let plain_text = normalize_text(&p.text());
    Ok((buf, is_heading, list_info, plain_text))
}

// Функция для типа списка (из numberings)
fn get_list_kind(docx: &Docx, num_pr: &NumberingProperty) -> String {
    let num_id = match num_pr.id.as_ref() {
        Some(id) => id.value,
        None => return "bullet".to_string(),
    };
    let level = num_pr.level.as_ref().map(|l| l.value).unwrap_or(0);

    let numbering = match docx.numbering.as_ref() {
        Some(n) => n,
        None => return "bullet".to_string(),
    };

    let details = match numbering.numbering_details(num_id) {
        Some(d) => d,
        None => return "bullet".to_string(),
    };

    let num_fmt = details
        .levels
        .iter()
        .find(|l| l.i_level == Some(level))
        .and_then(|l| l.number_format.as_ref())
        .map(|f| f.value.as_ref());

    match num_fmt {
        Some("decimal") | Some("decimalZero") => "decimal".to_string(),
        _ => "bullet".to_string(),
    }
}

// Обработка run
fn process_run(
    r: &Run,
    archive: &mut ZipArchive<impl Read + Seek>,
    docx: &Docx,
    file_names: &HashSet<String>,
) -> Result<String> {
    let mut text = String::new();
    let (bold, italic, underline) = match r.property.as_ref() {
        Some(property) => (
            property.bold.is_some(),
            property.italics.is_some(),
            property.underline.is_some(),
        ),
        None => (false, false, false),
    };

    for child in &r.content {
        match child {
            RunContent::Text(t) => text.push_str(&normalize_text(&t.text)),
            RunContent::Break(_) => text.push_str("<br/>"),
            RunContent::Drawing(d) => {
                if let Some(img_html) = try_extract_image(d, archive, docx, file_names)? {
                    text.push_str(&img_html);
                }
            }
            _ => {},
        }
    }

    if text.is_empty() {
        return Ok(String::new());
    }
    let mut wrapped = text;
    if underline {
        wrapped = format!("<u>{}</u>", wrapped);
    }
    if italic {
        wrapped = format!("<em>{}</em>", wrapped);
    }
    if bold {
        wrapped = format!("<strong>{}</strong>", wrapped);
    }
    Ok(wrapped)
}

// Извлечение изображения
fn try_extract_image(
    d: &Drawing,
    archive: &mut ZipArchive<impl Read + Seek>,
    docx: &Docx,
    file_names: &HashSet<String>,
) -> Result<Option<String>> {
    let graphic = d
        .inline
        .as_ref()
        .and_then(|i| i.graphic.as_ref())
        .or_else(|| d.anchor.as_ref().and_then(|a| a.graphic.as_ref()));

    let embed = graphic
        .and_then(|g| g.data.children.get(0))
        .map(|pic| pic.fill.blip.embed.as_ref());

    let embed = match embed {
        Some(id) if !id.is_empty() => id,
        _ => return Ok(None),
    };

    let target = match docx.document_rels.as_ref().and_then(|r| r.get_target(embed)) {
        Some(t) => t,
        None => return Ok(None),
    };

    let img_data = read_image(archive, target, file_names)?;
    Ok(Some(img_data))
}

// Обработка таблицы
fn process_table(
    table: &Table,
    archive: &mut ZipArchive<impl Read + Seek>,
    docx: &Docx,
    file_names: &HashSet<String>,
) -> Result<String> {
    let mut html = String::from("<table>\n");
    for row in &table.rows {
        html.push_str("<tr>\n");
        for cell in &row.cells {
            match cell {
                TableRowContent::TableCell(c) => {
                    for content in &c.content {
                        match content {
                            TableCellContent::Paragraph(p) => {
                                html.push_str("<td>");
                                let (p_html, _, _, _) =
                                    process_paragraph(p, archive, docx, file_names)?;
                                if !p_html.trim().is_empty() {
                                    html.push_str(&p_html);
                                }
                                html.push_str("</td>\n");
                            }
                            _ => {},
                        }
                    }
                }
                _ => {},
            }
        }
        html.push_str("</tr>\n");
    }
    html.push_str("</table>\n");
    Ok(html)
}

fn process_hyperlink(
    link: &docx_rust::document::Hyperlink,
    archive: &mut ZipArchive<impl Read + Seek>,
    docx: &Docx,
    file_names: &HashSet<String>,
) -> Result<String> {
    let mut inner = String::new();
    if let Some(run) = &link.content {
        inner.push_str(&process_run(run, archive, docx, file_names)?);
    } else {
        let text = normalize_text(&link.text());
        if !text.is_empty() {
            inner.push_str(&text);
        }
    }

    if inner.trim().is_empty() {
        return Ok(String::new());
    }

    let href = if let Some(id) = &link.id {
        docx.document_rels
            .as_ref()
            .and_then(|r| r.get_target(id.as_ref()))
            .map(|t| t.to_string())
    } else if let Some(anchor) = &link.anchor {
        Some(format!("#{}", anchor))
    } else {
        None
    };

    match href {
        Some(h) => Ok(format!(r#"<a href="{}">{}</a>"#, escape_attr(&h), inner)),
        None => Ok(inner),
    }
}

fn escape_attr(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

// Вспомогательные (без изменений)
fn read_image(
    archive: &mut ZipArchive<impl Read + Seek>,
    path: &str,
    file_names: &HashSet<String>,
) -> Result<String> {
    let normalized = if path.starts_with("word/") {
        path.to_string()
    } else {
        format!("word/{}", path)
    };
    let has_normalized = file_names.contains(&normalized);
    let mut file = if has_normalized {
        archive.by_name(&normalized)?
    } else {
        archive.by_name(path)?
    };
    let mut buf = Vec::new();
    file.read_to_end(&mut buf)?;
    let mime = guess_mime_from_extension(path);
    let b64 = BASE64.encode(&buf);
    Ok(format!(
        r#"<img src="data:{};base64,{}" alt=""/>"#,
        mime, b64
    ))
}

fn guess_mime_from_extension(path: &str) -> &'static str {
    if path.ends_with(".png") {
        "image/png"
    } else if path.ends_with(".jpg") || path.ends_with(".jpeg") {
        "image/jpeg"
    } else if path.ends_with(".gif") {
        "image/gif"
    } else if path.ends_with(".bmp") {
        "image/bmp"
    } else {
        "application/octet-stream"
    }
}

// Ваш оригинальный read_core_properties (вставьте)
fn read_core_properties(archive: &mut ZipArchive<impl Read + Seek>) -> Result<BookMeta> {
    // Реализация из вашего исходного кода
    let doc = read_xml(archive, "docProps/core.xml")?;
    let title = doc.get_child("title").and_then(|e| e.get_text()).map(String::from);
    let author = doc.get_child("creator").and_then(|e| e.get_text()).map(String::from);
    Ok(BookMeta {
        title: title.unwrap_or_default(),
        author,
        language: None,
        cover: None,
        path: String::new(),
    })
}

// Если нужно read_xml (из оригинала)
fn read_xml<R: Read + Seek>(archive: &mut ZipArchive<R>, path: &str) -> Result<Element> {
    let mut file = archive.by_name(path)?;
    let mut xml = String::new();
    file.read_to_string(&mut xml)?;
    Element::parse(xml.as_bytes()).context(format!("Failed to parse {}", path))
}
