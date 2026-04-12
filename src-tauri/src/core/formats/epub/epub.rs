use std::{collections::HashMap, fs::File, io::Read, path::Path};

use anyhow::{bail, Result};
use lol_html::{element, HtmlRewriter, OutputSink, RewriteStrSettings, Settings};
use roxmltree::Document;
use uuid::Uuid;
use zip::ZipArchive;

use crate::core::{
    book::model::{Book, BookMeta, Chapter},
    formats::loader::BookSource,
    utils::{normalize_epub_text, normalize_text},
};

pub struct EpubLoader;

impl BookSource for EpubLoader {
    fn can_load(&self, path: &Path) -> bool {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("epub"))
            .unwrap_or(false)
    }

    fn load(&self, path: &Path, with_chapters: bool) -> Result<Book> {
        let file = File::open(path)?;
        let mut zip = ZipArchive::new(file)?;

        let container_xml = read_zip_file(&mut zip, "META-INF/container.xml")?;
        let opf_path = find_opf_path(&container_xml)?;
        let opf_xml = read_zip_file(&mut zip, &opf_path)?;

        let (meta, spine, cover_href) = parse_opf(&opf_xml, path)?;
        let base_dir = base_dir_from_opf(&opf_path);

        let chapters = if with_chapters {
            Some(load_chapters(&mut zip, &base_dir, &spine)?)
        } else {
            None
        };

        let cover = cover_href
            .and_then(|href| read_zip_bytes(&mut zip, &join_zip_path(&base_dir, &href)).ok());

        Ok(Book {
            id: Uuid::new_v4().to_string(),
            meta: BookMeta { cover, ..meta },
            chapters,
        })
    }
}

fn read_zip_file(zip: &mut ZipArchive<File>, path: &str) -> Result<String> {
    let bytes = read_zip_bytes(zip, path)?;
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

fn read_zip_bytes(zip: &mut ZipArchive<File>, path: &str) -> Result<Vec<u8>> {
    let mut file = zip.by_name(path)?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)?;
    Ok(bytes)
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

fn parse_opf(opf_xml: &str, path: &Path) -> Result<(BookMeta, Vec<String>, Option<String>)> {
    let doc = Document::parse(opf_xml)?;
    let title = find_text(&doc, "title").unwrap_or_else(|| "Untitled".to_string());
    let author = find_text(&doc, "creator");
    let language = find_text(&doc, "language");

    let mut manifest = HashMap::new();
    let mut cover_id = None;
    let mut cover_href = None;

    for item in doc
        .descendants()
        .filter(|n| n.is_element() && n.tag_name().name() == "item")
    {
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

    for meta in doc
        .descendants()
        .filter(|n| n.is_element() && n.tag_name().name() == "meta")
    {
        if meta.attribute("name") == Some("cover") {
            cover_id = meta.attribute("content").map(|s| s.to_string());
        }
    }

    if cover_href.is_none() {
        if let Some(id) = cover_id {
            cover_href = manifest.get(&id).cloned();
        }
    }

    let mut spine = Vec::new();
    for itemref in doc
        .descendants()
        .filter(|n| n.is_element() && n.tag_name().name() == "itemref")
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
            cover: None,
            path: path.to_string_lossy().to_string(),
        },
        spine,
        cover_href,
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
) -> Result<Vec<Chapter>> {
    if spine.is_empty() {
        bail!("EPUB spine is empty");
    }

    let mut chapters = Vec::new();
    for (idx, href) in spine.iter().enumerate() {
        let zip_path = join_zip_path(base_dir, href);
        let html = read_zip_file(zip, &zip_path)?;
        let html = normalize_epub_text(&html);
        // let html = normalize_html(&html);

        let title = extract_html_title(&html).or_else(|| Some(format!("Chapter {}", idx + 1)));
        chapters.push(Chapter {
            id: Uuid::new_v4().to_string(),
            title,
            html,
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
    doc.descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "title")
        .and_then(|n| n.text())
        .map(|t| t.trim().to_string())
}
