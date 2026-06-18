use std::{collections::HashMap, fs::File, io::Read, path::Path};

use anyhow::{bail, Result};
use base64::{engine::general_purpose, Engine as _};
use encoding_rs::Encoding;
use log;
use regex::Regex;
use roxmltree::Document;
use uuid::Uuid;
use zip::ZipArchive;

use crate::core::{
    book::model::{Book, BookMeta, Chapter},
    formats::loader::BookSource,
    utils::normalize_epub_text,
};

pub struct EpubLoader;

impl BookSource for EpubLoader {
    fn can_load(&self, path: &Path) -> bool {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("epub"))
            .unwrap_or(false)
    }

    fn load(&self, path: &Path, with_chapters: bool, return_chapters: bool) -> Result<Book> {
        let file = File::open(path)?;
        let mut zip = ZipArchive::new(file)?;

        let container_xml = read_zip_file(&mut zip, "META-INF/container.xml")?;
        let opf_path = find_opf_path(&container_xml)?;
        let opf_xml = read_zip_file(&mut zip, &opf_path)?;

        let (meta, spine, cover_href, css_files) = parse_opf(&opf_xml, path)?;
        let base_dir = base_dir_from_opf(&opf_path);

        let chapters = if with_chapters {
            Some(load_chapters(&mut zip, &base_dir, &spine, &css_files)?)
        } else {
            None
        };

        let _cover_href = cover_href;

        let language = meta.language.clone().unwrap_or(self.get_language(&chapters.clone().unwrap_or(vec![])).unwrap_or("en".into()));

        Ok(Book {
            id: self.generate_id(meta.title.clone()),
            meta: BookMeta { cover_path: None, language: Some(language),             
                size: self.get_size(&path)?,
                last_read_at: self.get_last_read_at(&path)?,
                last_modified: self.get_last_modified(&path)?,
                created_at: self.get_created_at(&path)?,
                description: None,
                chars_read: Some(self.get_chars_read(&chapters.clone().unwrap_or(vec![]))?),
                progress_read: None,
                count_chapters: chapters.clone().unwrap_or(vec![]).len() as i64,
                ..meta
            },
            chapters: match return_chapters {
                true => chapters,
                false => None,
            },
            position: None,
        })
    }
}

fn read_zip_file(zip: &mut ZipArchive<File>, path: &str) -> Result<String> {
    let bytes = read_zip_bytes(zip, path)?;
    Ok(bytes_to_string(&bytes))
}

/// Конвертирует байты в строку с автоматическим определением кодировки
fn bytes_to_string(bytes: &[u8]) -> String {
    // Сначала пробуем UTF-8
    if let Ok(s) = String::from_utf8(bytes.to_vec()) {
        return s;
    }

    // Ищем XML declaration с encoding
    let text_start = String::from_utf8_lossy(&bytes[..bytes.len().min(200)]);

    // Проверяем есть ли charset в XML declaration или meta теге
    let charset_re = Regex::new(r#"charset=["']?([^"'\s>]+)"#).unwrap();
    if let Some(captures) = charset_re.captures(&text_start) {
        if let Some(encoding_name) = captures.get(1) {
            let enc_name = encoding_name.as_str().to_uppercase();
            // Пробуем сконвертировать через encoding_rs
            if let Some(encoding) = Encoding::for_label(enc_name.as_bytes()) {
                let (cow, _, _) = encoding.decode(bytes);
                return cow.to_string();
            }
        }
    }

    // Fallback на UTF-8 с заменой
    String::from_utf8_lossy(bytes).to_string()
}

fn read_zip_bytes(zip: &mut ZipArchive<File>, path: &str) -> Result<Vec<u8>> {
    let mut file = zip.by_name(path)?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)?;
    Ok(bytes)
}

fn bytes_to_data_url(bytes: &[u8], path: &str) -> String {
    let mime = Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .as_deref()
        .map(|ext| match ext {
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "webp" => "image/webp",
            "gif" => "image/gif",
            _ => "application/octet-stream",
        })
        .unwrap_or("application/octet-stream");

    let encoded = general_purpose::STANDARD.encode(bytes);
    format!("data:{};base64,{}", mime, encoded)
}

fn find_opf_path(container_xml: &str) -> Result<String> {
    let doc = Document::parse(container_xml)?;
    let rootfile = doc
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "rootfile")
        .and_then(|n| n.attribute("full-path"))
        .map(|s| s.to_string());

    rootfile.ok_or_else(|| anyhow::anyhow!("OPF path not found in container.xml"))
}

fn base_dir_from_opf(opf_path: &str) -> String {
    let path = Path::new(opf_path);
    path.parent()
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .filter(|p| !p.is_empty())
        .unwrap_or_default()
}
fn parse_opf(
    opf_xml: &str,
    path: &Path,
) -> Result<(BookMeta, Vec<String>, Option<String>, Vec<String>)> {
    let doc = Document::parse(opf_xml)?;

    let title = find_text(&doc, "title")
        .unwrap_or_else(|| "Untitled".to_string());

    let author = find_text(&doc, "creator");
    let language = find_text(&doc, "language");

    // Описание книги
    let description = find_text(&doc, "description");

    // Жанры
    let genres = {
        let items = doc
            .descendants()
            .filter(|n| {
                n.is_element()
                    && n.tag_name().name() == "subject"
            })
            .filter_map(|n| n.text())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(String::from)
            .collect::<Vec<_>>();

        if items.is_empty() {
            None
        } else {
            Some(items)
        }
    };

    // Серия книги (например calibre)
    let series = doc
        .descendants()
        .find(|n| {
            n.is_element()
                && n.tag_name().name() == "meta"
                && matches!(
                    n.attribute("property"),
                    Some("calibre:series") | Some("belongs-to-collection")
                )
        })
        .and_then(|n| n.text())
        .map(|s| s.trim().to_string());

    let description = match (description, series) {
        (Some(desc), Some(series)) => {
            Some(format!("{}\n\nСерия: {}", desc, series))
        }
        (Some(desc), None) => Some(desc),
        (None, Some(series)) => Some(format!("Серия: {}", series)),
        _ => None,
    };

    let mut manifest = HashMap::new();
    let mut cover_id = None;
    let mut cover_href = None;
    let mut css_files = Vec::new();

    for item in doc
        .descendants()
        .filter(|n| n.is_element() && n.tag_name().name() == "item")
    {
        let id = item.attribute("id").unwrap_or_default();
        let href = item.attribute("href").unwrap_or_default();
        let mime_type = item.attribute("media-type").unwrap_or_default();
        let properties = item.attribute("properties").unwrap_or_default();

        if !id.is_empty() && !href.is_empty() {
            manifest.insert(
                id.to_string(),
                href.to_string(),
            );
        }

        if properties.contains("cover-image") {
            cover_href = Some(href.to_string());
        }

        if mime_type == "text/css"
            || href
                .to_lowercase()
                .ends_with(".css")
        {
            css_files.push(href.to_string());
        }
    }

    for meta in doc
        .descendants()
        .filter(|n| n.is_element() && n.tag_name().name() == "meta")
    {
        if meta.attribute("name") == Some("cover") {
            cover_id = meta
                .attribute("content")
                .map(|s| s.to_string());
        }
    }

    // cover через meta name="cover"
    if cover_href.is_none() {
        if let Some(id) = cover_id {
            cover_href = manifest.get(&id).cloned();
        }
    }

    // cover по имени файла
    if cover_href.is_none() {
        for href in manifest.values() {
            let lower = href.to_lowercase();

            if lower.contains("cover")
                && matches!(
                    Path::new(&lower)
                        .extension()
                        .and_then(|e| e.to_str()),
                    Some("jpg" | "jpeg" | "png" | "webp")
                )
            {
                cover_href = Some(href.clone());
                break;
            }
        }
    }

    // fallback — первое изображение
    if cover_href.is_none() {
        for href in manifest.values() {
            let lower = href.to_lowercase();

            if matches!(
                Path::new(&lower)
                    .extension()
                    .and_then(|e| e.to_str()),
                Some("jpg" | "jpeg" | "png" | "webp")
            ) {
                cover_href = Some(href.clone());
                break;
            }
        }
    }

    let mut spine = Vec::new();

    for itemref in doc
        .descendants()
        .filter(|n| {
            n.is_element()
                && n.tag_name().name() == "itemref"
        })
    {
        if let Some(idref) = itemref.attribute("idref") {
            if let Some(href) = manifest.get(idref) {
                spine.push(href.clone());
            }
        }
    }

    Ok((
        BookMeta {
            title,
            author,
            language,
            cover_path: None,
            path: path.to_string_lossy().to_string(),

            description,
            genres,

            created_at: 0,
            last_modified: 0,
            last_read_at: 0,
            size: 0,
            chars_read: Some(0),
            progress_read: None,
            count_chapters: 0
        },
        spine,
        cover_href,
        css_files,
    ))
}

fn find_text(doc: &Document<'_>, tag: &str) -> Option<String> {
    doc.descendants()
        .find(|n| n.is_element() && n.tag_name().name() == tag)
        .and_then(|n| n.text())
        .map(|text| text.trim().to_string())
}

fn load_chapters(
    zip: &mut ZipArchive<File>,
    base_dir: &str,
    spine: &[String],
    css_files: &[String],
) -> Result<Vec<Chapter>> {
    if spine.is_empty() {
        bail!("EPUB spine is empty");
    }

    // Загружаем все CSS файлы и очищаем от page-break свойств
    let mut all_css = String::new();
    for css_href in css_files {
        let zip_path = join_zip_path(base_dir, css_href);
        match read_zip_file(zip, &zip_path) {
            Ok(css_content) => {
                // Удаляем page-break-before и page-break-after свойства
                let cleaned_css = remove_page_break_properties(&css_content);
                all_css.push_str(&cleaned_css);
                all_css.push_str("\n\n");
            }
            Err(e) => {
                log::warn!("Failed to load CSS file '{}': {}", zip_path, e);
            }
        }
    }

    let mut chapters = Vec::new();
    for (idx, href) in spine.iter().enumerate() {
        let zip_path = join_zip_path(base_dir, href);
        let html = read_zip_file(zip, &zip_path)?;

        // Сначала извлекаем заголовок из оригинального HTML
        let title = extract_html_title(&html);

        let html = normalize_epub_text(&html);
        let html = embed_images_base64(zip, base_dir, &html)?;

        // Встраиваем CSS стили в HTML
        let html = if !all_css.is_empty() {
            embed_css_into_html(&html, &all_css)
        } else {
            html
        };

        chapters.push(Chapter {
            id: Uuid::new_v4().to_string(),
            title,
            html: collaps_style(&html),
            order: idx,
        });
    }

    Ok(chapters)
}

// fn normalize_html(html: String) -> String {
//     let mut output = Vec::new();
//     let rewriter = HtmlRewriter::new(
//         RewriteStrSettings {
//             element_content_handlers: vec![
//                 element!("blockquote div br", |el| {
//                     el.before("<div></div>", lol_html::html_content::ContentType::Html);
//                     el.remove();
//                     Ok(())
//                 }),
//                 element!("blockquote div", |el| {
//                     let text = el.text_contents();
//                     if text.trim().is_empty() {
//                         el.remove();
//                     }
//                         Ok(())
//                     }),
//             ],
//             ..RewriteStrSettings::new()
//         }.into(),
//         &mut output,
//     );
//     rewriter.write(html.as_bytes()).unwrap();
//     rewriter.end().unwrap();
//     String::from_utf8(output).unwrap()
// }

fn join_zip_path(base_dir: &str, href: &str) -> String {
    if base_dir.is_empty() {
        href.to_string()
    } else {
        format!("{}/{}", base_dir.trim_end_matches('/'), href)
    }
}

fn extract_html_title(html: &str) -> Option<String> {
    let doc = Document::parse(html).ok()?;

    // Сначала ищем в <title> теге
    if let Some(title) = doc
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "title")
        .and_then(|n| n.text())
        .map(|t| t.trim().to_string())
    {
        if !title.is_empty() {
            return Some(title);
        }
    }

    // Если не нашли, ищем первый H1
    if let Some(h1) = doc
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "h1")
        .and_then(|n| n.text())
        .map(|t| t.trim().to_string())
    {
        if !h1.is_empty() {
            return Some(h1);
        }
    }

    // Если не нашли, ищем первый H2
    if let Some(h2) = doc
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "h2")
        .and_then(|n| n.text())
        .map(|t| t.trim().to_string())
    {
        if !h2.is_empty() {
            return Some(h2);
        }
    }

    None
}

/// Встраивает CSS стили в HTML документ
fn embed_css_into_html(html: &str, css: &str) -> String {
    let style_tag = format!("<style type=\"text/css\">\n{}\n</style>\n", css);

    // Ищем закрывающий тег </head>
    if let Some(head_end) = html.find("</head>") {
        let mut result = html.to_string();
        result.insert_str(head_end, &style_tag);
        return result;
    }

    // Если </head> не найден, ищем открывающий <body> и вставляем после него
    if let Some(body_start) = html.find("<body") {
        // Ищем закрывающую > тега <body ...>
        let after_body = &html[body_start..];
        let mut depth = 0;
        let mut body_tag_end = None;

        for (i, ch) in after_body.char_indices() {
            if ch == '<' {
                depth += 1;
            } else if ch == '>' {
                depth -= 1;
                if depth == 0 {
                    body_tag_end = Some(i);
                    break;
                }
            }
        }

        if let Some(pos) = body_tag_end {
            let insert_pos = body_start + pos + 1;
            let mut result = html.to_string();
            result.insert_str(insert_pos, &style_tag);
            return result;
        }
    }

    // Если ничего не нашли, просто добавляем в начало
    format!("{}{}", style_tag, html)
}

/// Удаляет page-break-before и page-break-after свойства из CSS
/// Эти свойства не имеют смысла в веб-ридере и ломают отображение
fn remove_page_break_properties(css: &str) -> String {
    use regex::Regex;

    // Паттерн для page-break-before и page-break-after
    let page_break_re = Regex::new(r"\s*page-break-(before|after)\s*:\s*[^;]+;\s*").unwrap();
    let result = page_break_re.replace_all(css, "").to_string();

    // Паттерн для break-before и break-after
    let break_re = Regex::new(r"\s*break-(before|after)\s*:\s*[^;]+;\s*").unwrap();
    let result = break_re.replace_all(&result, "").to_string();

    result
}

fn embed_images_base64(zip: &mut ZipArchive<File>, base_dir: &str, html: &str) -> Result<String> {
    let re = Regex::new(r#"<img[^>]*src="([^"]+)"[^>]*>"#)?;

    let mut last_error: Option<anyhow::Error> = None;
    let result = re.replace_all(html, |caps: &regex::Captures| {
        let src = &caps[1];

        // Уже base64
        if src.starts_with("data:") {
            return caps[0].to_string();
        }

        // Пустой src
        if src.trim().is_empty() {
            return caps[0].to_string();
        }

        let zip_path = join_zip_path(base_dir, src);
        let bytes = match read_zip_bytes(zip, &zip_path) {
            Ok(b) => b,
            Err(e) => {
                last_error = Some(anyhow::anyhow!(
                    "Failed to read image '{}': {}",
                    zip_path,
                    e
                ));
                return caps[0].to_string();
            }
        };

        // Пропускаем слишком маленькие файлы (менее 100 байт)
        if bytes.len() < 100 {
            return caps[0].to_string();
        }

        let mime = get_mime_type(src);
        let b64 = general_purpose::STANDARD.encode(&bytes);

        format!(r#"<img src="data:{};base64,{}">"#, mime, b64)
    });

    // Игнорируем ошибки, если не удалось прочитать одно изображение
    // Просто возвращаем оригинальный HTML
    drop(last_error);

    Ok(result.to_string())
}

/// Get cover raw bytes from EPUB
pub fn get_cover_bytes(path: &str) -> Option<(Vec<u8>, String)> {
    use std::path::Path;
    let path = Path::new(path);
    let file = File::open(path).ok()?;
    let mut zip = ZipArchive::new(file).ok()?;

    let container_xml = read_zip_file(&mut zip, "META-INF/container.xml").ok()?;
    let opf_path = find_opf_path(&container_xml).ok()?;
    let opf_xml = read_zip_file(&mut zip, &opf_path).ok()?;

    let doc = roxmltree::Document::parse(&opf_xml).ok()?;
    let base_dir = base_dir_from_opf(&opf_path);

    let mut manifest = HashMap::new();
    let mut cover_href: Option<String> = None;
    let mut cover_id: Option<String> = None;

    for item in doc.descendants().filter(|n| n.is_element() && n.tag_name().name() == "item") {
        let id = item.attribute("id").unwrap_or_default();
        let href = item.attribute("href").unwrap_or_default();
        let properties = item.attribute("properties").unwrap_or_default();
        if !id.is_empty() && !href.is_empty() {
            manifest.insert(id.to_string(), href.to_string());
        }
        if properties.contains("cover-image") {
            cover_href = Some(href.to_string());
        }
    }

    for meta in doc.descendants().filter(|n| n.is_element() && n.tag_name().name() == "meta") {
        if meta.attribute("name") == Some("cover") {
            cover_id = meta.attribute("content").map(|s| s.to_string());
        }
    }

    if cover_href.is_none() {
        if let Some(id) = cover_id {
            cover_href = manifest.get(&id).cloned();
        }
    }

    if cover_href.is_none() {
        for href in manifest.values() {
            let lower = href.to_lowercase();
            if lower.contains("cover") && matches!(
                Path::new(&lower).extension().and_then(|e| e.to_str()),
                Some("jpg" | "jpeg" | "png" | "webp")
            ) {
                cover_href = Some(href.clone());
                break;
            }
        }
    }

    if cover_href.is_none() {
        for href in manifest.values() {
            let lower = href.to_lowercase();
            if matches!(
                Path::new(&lower).extension().and_then(|e| e.to_str()),
                Some("jpg" | "jpeg" | "png" | "webp")
            ) {
                cover_href = Some(href.clone());
                break;
            }
        }
    }

    let href = cover_href?;
    let zip_path = join_zip_path(&base_dir, &href);
    let bytes = read_zip_bytes(&mut zip, &zip_path).ok()?;

    let ext = Path::new(&href)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_else(|| "jpg".to_string());

    Some((bytes, ext))
}

fn get_mime_type(path: &str) -> &'static str {
    let path_lower = path.to_lowercase();
    if path_lower.ends_with(".jpg") || path_lower.ends_with(".jpeg") {
        "image/jpeg"
    } else if path_lower.ends_with(".png") {
        "image/png"
    } else if path_lower.ends_with(".gif") {
        "image/gif"
    } else if path_lower.ends_with(".webp") {
        "image/webp"
    } else if path_lower.ends_with(".svg") {
        "image/svg+xml"
    } else if path_lower.ends_with(".bmp") {
        "image/bmp"
    } else {
        "image/jpeg" // по умолчанию
    }
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