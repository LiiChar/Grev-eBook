use crate::core::{
    book::model::{Book, BookMeta, Chapter},
    formats::loader::BookSource,
};
use anyhow::Result;
use base64::{engine::general_purpose, Engine as _};
use image::ImageFormat;
use pdfium_render::prelude::*;
use std::io::Cursor;
use std::path::Path;
use tauri_plugin_log::log;
use uuid::Uuid;

use crate::core::formats::pdf::pdf_to_html_pages;
use crate::core::utils::normalize_pdf_text;
use std::path::PathBuf;
use std::env;

#[derive(Debug, Clone)]
struct TextFragment {
    text: String,
    x: f32,
    y: f32,
    width: f32,
    font_size: f32,
    page: usize,
    column: usize,
}

#[derive(Debug, Clone)]
enum BlockKind {
    H1(String),
    H2(String),
    H3(String),
    P(Vec<String>),
    Ul(Vec<String>),
    Image {
        src: String,
        width: u32,
        height: u32,
    },
}

#[derive(Debug, Clone)]
struct Block {
    kind: BlockKind,
    page: usize,
}

pub struct PdfLoader;

impl BookSource for PdfLoader {
    fn load(&self, path: &Path, _with_chapters: bool) -> Result<Book> {
        let pdfium = Pdfium::new(Pdfium::bind_to_library(
            Pdfium::pdfium_platform_library_name_at_path("../bin"),
        )?);
        let document = pdfium.load_pdf_from_file(path, None)?;
        let title = document
            .metadata()
            .get(PdfDocumentMetadataTagType::Title)
            .map(|v| v.value().to_string())
            .unwrap_or_else(|| "Untitled".to_string());
        let author = document
            .metadata()
            .get(PdfDocumentMetadataTagType::Author)
            .map(|v| v.value().to_string());

        if !_with_chapters {
            // Return only metadata for fast loading
            return Ok(Book {
                id: Uuid::new_v4().to_string(),
                meta: BookMeta {
                    title,
                    author,
                    language: None,
                    cover: None,
                    path: path.to_string_lossy().to_string(),
                },
                chapters: None,
            });
        }

        let temp_dir = env::temp_dir();
        let html_path: PathBuf = temp_dir.join(format!("grev_pdf_{}.html", Uuid::new_v4()));
        let html_pages = pdf_to_html_pages(
            &path.to_string_lossy(),
            &html_path.to_string_lossy(),
        )
        .map_err(|e| anyhow::anyhow!(e))?;

        let mut chapters = Vec::new();
        for (i, (title, html)) in html_pages.into_iter().enumerate() {
            chapters.push(Chapter {
                id: Uuid::new_v4().to_string(),
                title: title.or_else(|| Some(format!("Page {}", i + 1))),
                order: i,
                html,
            });
        }

        Ok(Book {
            id: Uuid::new_v4().to_string(),
            meta: BookMeta {
                title,
                author,
                language: None,
                cover: None,
                path: path.to_string_lossy().to_string(),
            },
            chapters: Some(chapters),
        })
    }

    fn can_load(&self, path: &Path) -> bool {
        path.extension().map(|e| e == "pdf").unwrap_or(false)
    }
}

#[derive(Debug, Clone)]
struct ImageBlock {
    page: usize,
    y: f32,
    width: u32,
    height: u32,
    src: String,
}

fn extract_images(document: &PdfDocument, max_pages: u32) -> Vec<ImageBlock> {
    let mut images = Vec::new();
    let pages = document.pages();

    for (page_index, page) in pages.iter().enumerate() {
        if (page_index as u32) >= max_pages {
            break;
        }

        log::debug!("Extracting images from page {}", page_index);
        let objects = page.objects();
        let mut image_count = 0;

        for obj in objects.iter() {
            if let Some(image) = obj.as_image_object() {
                match image.get_raw_bitmap() {
                    Ok(bitmap) => {
                        let dyn_img = bitmap.as_image();
                        let mut png_bytes = Vec::new();
                        if dyn_img
                            .write_to(&mut Cursor::new(&mut png_bytes), ImageFormat::Png)
                            .is_err()
                        {
                            log::error!("Failed to encode image as PNG on page {}", page_index);
                            continue;
                        }
                        let encoded = general_purpose::STANDARD.encode(&png_bytes);

                        match image.bounds() {
                            Ok(bounds) => {
                                images.push(ImageBlock {
                                    page: page_index,
                                    y: bounds.top().value,
                                    width: bitmap.width() as u32,
                                    height: bitmap.height() as u32,
                                    src: format!("data:image/png;base64,{}", encoded),
                                });
                                image_count += 1;
                            }
                            Err(e) => {
                                log::error!(
                                    "Failed to get image bounds on page {}: {}",
                                    page_index,
                                    e
                                );
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("Failed to get bitmap on page {}: {}", page_index, e);
                    }
                }
            }
        }
        log::debug!("Found {} images on page {}", image_count, page_index);
    }

    images
}

#[derive(Debug, Clone)]
enum LineKind {
    H1(String),
    H2(String),
    H3(String),
    ListItem(String),
    Text(String),
}

fn classify_line(line: &[TextFragment], _page_width: f32) -> LineKind {
    let text = build_line_text(line);
    let text_trim = text.trim();

    if text_trim.is_empty() {
        return LineKind::Text(String::new());
    }

    let max_font =
        line.iter()
            .map(|f| f.font_size)
            .fold(0.0, |max, size| match size.partial_cmp(&max) {
                Some(std::cmp::Ordering::Greater) => size,
                _ => max,
            });

    // Определяем тип строки
    if is_heading(line, _page_width) && max_font > 20.0 {
        LineKind::H1(text_trim.to_string())
    } else if is_heading(line, _page_width) && max_font > 16.0 {
        LineKind::H2(text_trim.to_string())
    } else if max_font > 14.0 && text_trim.len() < 100 && line.len() <= 3 {
        LineKind::H3(text_trim.to_string())
    } else if is_list_item(text_trim) {
        let cleaned = clean_list_item(text_trim);
        LineKind::ListItem(cleaned)
    } else {
        LineKind::Text(text)
    }
}

fn is_list_item(text: &str) -> bool {
    let trimmed = text.trim();
    if trimmed.starts_with('-') || trimmed.starts_with('•') || trimmed.starts_with('*') {
        return trimmed.chars().nth(1).map_or(false, |c| c.is_whitespace());
    }
    if trimmed.chars().next().map_or(false, |c| c.is_ascii_digit()) {
        let mut idx = 1;
        while idx < trimmed.len()
            && trimmed[idx..]
                .chars()
                .next()
                .map_or(false, |c| c.is_ascii_digit())
        {
            idx += 1;
        }
        return trimmed
            .chars()
            .nth(idx)
            .map_or(false, |c| c == '.' || c == ')')
            && trimmed.chars().nth(idx + 1).map_or(false, |c| c.is_whitespace());
    }
    false
}

fn clean_list_item(text: &str) -> String {
    let trimmed = text.trim();

    // Убираем маркеры списка
    let cleaned =
        if trimmed.starts_with('-') || trimmed.starts_with('•') || trimmed.starts_with('*') {
            trimmed[1..].trim_start()
        } else if trimmed.chars().next().map_or(false, |c| c.is_ascii_digit()) {
            // Находим конец номера
            let mut end = 1;
            while end < trimmed.len()
                && trimmed[end..]
                    .chars()
                    .next()
                    .map_or(false, |c| c.is_ascii_digit())
            {
                end += 1;
            }
            if end < trimmed.len()
                && (trimmed.chars().nth(end) == Some('.') || trimmed.chars().nth(end) == Some(')'))
            {
                trimmed[end + 1..].trim_start()
            } else {
                trimmed
            }
        } else {
            trimmed
        };

    cleaned.to_string()
}

// blockquote отключен намеренно — приводим все строки к обычному тексту

fn is_heading(line: &[TextFragment], page_width: f32) -> bool {
    if line.is_empty() || line.len() > 5 {
        return false;
    }

    let total_width: f32 = line.iter().map(|f| f.width).sum();
    let center: f32 = line.iter().map(|f| f.x + f.width / 2.0).sum::<f32>() / line.len() as f32;
    let page_center = page_width / 2.0;

    // Заголовок обычно отцентрирован и занимает не всю ширину страницы
    (center - page_center).abs() < page_width * 0.15 && total_width < page_width * 0.8
}

fn build_blocks(
    lines: Vec<Vec<TextFragment>>,
    page_widths: &[f32],
    mut images: Vec<ImageBlock>,
) -> Vec<Block> {
    let mut blocks = Vec::new();
    let mut paragraph: Vec<String> = Vec::new();
    let mut list = Vec::new();

    // Сортируем изображения по странице и y (сверху вниз, предполагая что y увеличивается вниз)
    images.sort_by(|a, b| {
        a.page
            .cmp(&b.page)
            .then_with(|| a.y.partial_cmp(&b.y).unwrap_or(std::cmp::Ordering::Equal))
    });

    let mut img_idx = 0;
    let mut current_page = 0;
    let mut current_column = 0;
    let mut last_page = 0;
    let mut last_line_y: Option<f32> = None;
    let mut last_line_font: f32 = 0.0;
    let _epsilon = 2.0; // Допуск для сравнения координат

    log::debug!(
        "Processing {} lines with {} images",
        lines.len(),
        images.len()
    );

    for (_line_index, mut line) in lines.into_iter().enumerate() {
        if line.is_empty() {
            continue;
        }

        let page = line[0].page;
        let column = line[0].column;
        let y = line.iter().map(|f| f.y).fold(f32::MAX, |m, v| m.min(v));
        let line_font = line
            .iter()
            .map(|f| f.font_size)
            .fold(0.0_f32, |max, size| max.max(size));

        // Если перешли на новую страницу или колонку, обрабатываем изображения
        if page != current_page || column != current_column {
            // Вставляем изображения до текущей позиции
            while img_idx < images.len()
                && (images[img_idx].page < page
                    || (images[img_idx].page == page && images[img_idx].y < y))
            {
                flush_all(&mut blocks, &mut paragraph, &mut list, images[img_idx].page);
                let img = &images[img_idx];
                log::debug!("Inserting image: page {} y: {}", img.page, img.y);
                blocks.push(Block {
                    kind: BlockKind::Image {
                        src: img.src.clone(),
                        width: img.width,
                        height: img.height,
                    },
                    page: img.page,
                });
                img_idx += 1;
            }
            current_page = page;
            current_column = column;
            last_line_y = None;
            last_line_font = 0.0;
        }

        // Обрабатываем текстовую строку
        line.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap_or(std::cmp::Ordering::Equal));
        let page_width = if page < page_widths.len() {
            page_widths[page]
        } else {
            page_widths.last().copied().unwrap_or(600.0)
        };

        let kind = classify_line(&line, page_width);

        let block_kind = match kind {
            LineKind::H1(t) => {
                flush_all(&mut blocks, &mut paragraph, &mut list, page);
                BlockKind::H1(t)
            }
            LineKind::H2(t) => {
                flush_all(&mut blocks, &mut paragraph, &mut list, page);
                BlockKind::H2(t)
            }
            LineKind::H3(t) => {
                flush_all(&mut blocks, &mut paragraph, &mut list, page);
                BlockKind::H3(t)
            }
            LineKind::ListItem(t) => {
                flush_paragraph(&mut blocks, &mut paragraph, page);
                list.push(t);
                last_line_y = Some(y);
                last_line_font = line_font;
                continue;
            }
            LineKind::Text(t) => {
                flush_list(&mut blocks, &mut list, &mut paragraph, page);
                if let Some(prev_y) = last_line_y {
                    if page == current_page && column == current_column {
                        let gap = (y - prev_y).abs();
                        if gap > (last_line_font * 1.4).max(8.0) {
                            flush_paragraph(&mut blocks, &mut paragraph, page);
                        }
                    }
                }
                append_line_to_paragraph(&mut paragraph, &t);
                last_line_y = Some(y);
                last_line_font = line_font;
                continue;
            }
        };

        blocks.push(Block {
            kind: block_kind,
            page,
        });
        last_page = page;
        last_line_y = Some(y);
        last_line_font = line_font;
    }

    // Вставляем все оставшиеся изображения
    while img_idx < images.len() {
        flush_all(&mut blocks, &mut paragraph, &mut list, images[img_idx].page);
        let img = &images[img_idx];
        log::debug!("Inserting image: page {} y: {}", img.page, img.y);
        blocks.push(Block {
            kind: BlockKind::Image {
                src: img.src.clone(),
                width: img.width,
                height: img.height,
            },
            page: img.page,
        });
        img_idx += 1;
    }

    flush_all(&mut blocks, &mut paragraph, &mut list, last_page);
    blocks
}

fn esc(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn render_block(b: &Block) -> String {
    match &b.kind {
        BlockKind::H1(t) => format!("<h1>{}</h1>\n", esc(t)),
        BlockKind::H2(t) => format!("<h2>{}</h2>\n", esc(t)),
        BlockKind::H3(t) => format!("<h3>{}</h3>\n", esc(t)),
        BlockKind::P(lines) => {
            if lines.is_empty() {
                String::new()
            } else {
                let rendered = lines
                    .iter()
                    .map(|l| esc(l.trim()))
                    .filter(|l| !l.is_empty())
                    .collect::<Vec<_>>()
                    .join("<br/>");
                if rendered.is_empty() {
                    String::new()
                } else {
                    format!("<p>{}</p>\n", rendered)
                }
            }
        }
        BlockKind::Ul(items) => {
            if items.is_empty() {
                return String::new();
            }
            let mut s = "<ul>\n".to_string();
            for i in items {
                let item = i.trim();
                if !item.is_empty() {
                    s.push_str(&format!("<li>{}</li>\n", esc(item)));
                }
            }
            s.push_str("</ul>\n");
            s
        }
        BlockKind::Image { src, width, height } => {
            format!(
                "<img src=\"{}\" width=\"{}\" height=\"{}\" />\n",
                src, width, height
            )
        }
    }
}

fn split_into_chapters(blocks: Vec<Block>) -> Vec<Chapter> {
    use std::collections::BTreeMap;

    let mut chapters_per_page: BTreeMap<usize, Vec<Block>> = BTreeMap::new();
    for block in blocks {
        chapters_per_page
            .entry(block.page)
            .or_insert(Vec::new())
            .push(block);
    }

    let mut chapters = Vec::new();
    for (page, blocks_in_page) in chapters_per_page {
        let mut title: Option<String> = None;
        let mut html = String::new();
        for b in &blocks_in_page {
            match &b.kind {
                BlockKind::H1(t) | BlockKind::H2(t) => {
                    if title.is_none() && !t.trim().is_empty() {
                        title = Some(t.trim().to_string());
                        continue;
                    }
                }
                _ => {}
            }
            html.push_str(&render_block(b));
        }

        chapters.push(Chapter {
            id: Uuid::new_v4().to_string(),
            title: title.or_else(|| Some(format!("Page {}", page + 1))),
            order: chapters.len(),
            html,
        });
    }

    chapters
}

fn flush_paragraph(out: &mut Vec<Block>, buf: &mut Vec<String>, page: usize) {
    if buf.is_empty() {
        return;
    }
    let mut lines = Vec::new();
    for line in buf.iter() {
        let merged = merge_hyphenation(line.trim());
        let text = normalize_pdf_text(&merged);
        if !text.is_empty() {
            lines.push(text);
        }
    }
    if !lines.is_empty() {
        out.push(Block {
            kind: BlockKind::P(lines),
            page,
        });
    }
    buf.clear();
}

fn flush_list(
    out: &mut Vec<Block>,
    list: &mut Vec<String>,
    paragraph: &mut Vec<String>,
    page: usize,
) {
    if !list.is_empty() {
        let cleaned_list = list
            .iter()
            .filter(|item| !item.trim().is_empty())
            .cloned()
            .collect::<Vec<_>>();

        if cleaned_list.len() == 1 {
            append_line_to_paragraph(paragraph, &cleaned_list[0]);
        } else if !cleaned_list.is_empty() {
            out.push(Block {
                kind: BlockKind::Ul(cleaned_list),
                page,
            });
        }
    }
    list.clear();
}

fn flush_all(out: &mut Vec<Block>, p: &mut Vec<String>, l: &mut Vec<String>, page: usize) {
    flush_paragraph(out, p, page);
    flush_list(out, l, p, page);
}

fn build_line_text(line: &[TextFragment]) -> String {
    let mut out = String::new();

    for i in 0..line.len() {
        let curr = &line[i];
        let merged = merge_hyphenation(&curr.text);
        out.push_str(&merged);

        if i + 1 < line.len() {
            let next = &line[i + 1];
            let gap = next.x - (curr.x + curr.width);

            // Добавляем пробел, если расстояние между словами достаточно большое
            if gap > curr.font_size * 0.25 {
                out.push(' ');
            }
        }
    }

    // Нормализуем пробелы
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn append_line_to_paragraph(paragraph: &mut Vec<String>, line: &str) {
    let text = line.trim();
    if text.is_empty() {
        return;
    }

    if let Some(last) = paragraph.last_mut() {
        if last
            .chars()
            .last()
            .map(|c| matches!(c, '-' | '‐' | '‑' | '–'))
            .unwrap_or(false)
        {
            let new_len = last.len().saturating_sub(1);
            last.truncate(new_len);
            last.push_str(text);
            return;
        }
    }

    paragraph.push(text.to_string());
}

fn merge_hyphenation(text: &str) -> String {
    let mut out = String::new();
    let mut chars = text.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '-' {
            // Проверяем, является ли дефис знаком переноса
            if let Some(next_char) = chars.peek() {
                if next_char.is_whitespace() {
                    // Пропускаем дефис и следующий пробел
                    chars.next();
                    continue;
                }
            }
        }
        out.push(c);
    }

    out
}

fn extract_fragments(
    document: &PdfDocument,
    max_pages: u32,
    page_widths: &[f32],
) -> Vec<TextFragment> {
    let mut out = Vec::new();
    let pages = document.pages();

    for (page_index, page) in pages.iter().enumerate() {
        if (page_index as u32) >= max_pages {
            break;
        }

        log::debug!("Extracting text from page {}", page_index);

        let text_page = match page.text() {
            Ok(t) => t,
            Err(e) => {
                log::error!("Failed to extract text from page {}: {}", page_index, e);
                continue;
            }
        };

        let mut page_fragments: Vec<TextFragment> = Vec::new();
        for segment in text_page.segments().iter() {
            let text = segment
                .text()
                .to_string()
                .replace("\n", " ")
                .replace("\r", " ")
                .trim()
                .to_string();

            if text.is_empty() {
                continue;
            }

            let bounds = segment.bounds();
            page_fragments.push(TextFragment {
                text,
                x: bounds.left().value,
                y: bounds.top().value,
                width: bounds.width().value,
                font_size: segment.height().value,
                page: page_index,
                column: 0, // placeholder
            });
        }

        let page_width = page_widths.get(page_index).copied().unwrap_or(600.0);
        let columns = split_columns(page_fragments, page_width);
        for (col_idx, mut col) in columns.into_iter().enumerate() {
            for frag in &mut col {
                frag.column = col_idx;
            }
            out.append(&mut col);
        }

        log::debug!(
            "Processed {} fragments into columns on page {}",
            out.len(),
            page_index
        );
    }

    out
}

fn get_page_widths(document: &PdfDocument, max_pages: u32) -> Vec<f32> {
    document
        .pages()
        .iter()
        .take(max_pages as usize)
        .map(|p| p.width().value)
        .collect()
}

fn split_columns(mut items: Vec<TextFragment>, page_width: f32) -> Vec<Vec<TextFragment>> {
    if items.len() < 20 {
        return vec![items];
    }

    // Sort by x to find a robust split point
    items.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap_or(std::cmp::Ordering::Equal));

    let mut max_gap = 0.0_f32;
    let mut split_at: Option<f32> = None;
    for i in 0..items.len().saturating_sub(1) {
        let gap = items[i + 1].x - items[i].x;
        if gap > max_gap {
            max_gap = gap;
            split_at = Some((items[i + 1].x + items[i].x) / 2.0);
        }
    }

    // Split only if gap is clearly large and both sides have enough items
    if let Some(split_x) = split_at {
        if max_gap > page_width * 0.15 {
            let mut left = Vec::new();
            let mut right = Vec::new();
            for item in items.iter().cloned() {
                if item.x < split_x {
                    left.push(item);
                } else {
                    right.push(item);
                }
            }

            let min_items = 10;
            if left.len() >= min_items && right.len() >= min_items {
                return vec![left, right];
            }
        }
    }

    vec![items]
}

fn build_lines(fragments: Vec<TextFragment>) -> Vec<Vec<TextFragment>> {
    if fragments.is_empty() {
        return Vec::new();
    }

    let mut frags = fragments.to_vec();

    // Сортируем по странице, колонке, затем по Y (сверху вниз), затем по X (слева направо)
    frags.sort_by(|a, b| {
        a.page
            .cmp(&b.page)
            .then_with(|| a.column.cmp(&b.column))
            .then_with(|| a.y.partial_cmp(&b.y).unwrap_or(std::cmp::Ordering::Equal))
            .then_with(|| a.x.partial_cmp(&b.x).unwrap_or(std::cmp::Ordering::Equal))
    });

    let mut lines = Vec::new();
    let mut current_line = Vec::new();
    let mut last_page = frags[0].page;
    let mut last_column = frags[0].column;
    let mut last_y = frags[0].y;
    let mut current_line_font = frags[0].font_size;

    for frag in frags {
        // Определяем, принадлежит ли фрагмент текущей строке
        let threshold = (current_line_font.max(frag.font_size) * 0.5).max(2.0);
        let is_same_line = frag.page == last_page
            && frag.column == last_column
            && (frag.y - last_y).abs() < threshold;

        if is_same_line {
            current_line.push(frag.clone());
            if frag.font_size > current_line_font {
                current_line_font = frag.font_size;
            }
        } else {
            // Сохраняем предыдущую строку, если она не пустая
            if !current_line.is_empty() {
                // Сортируем фрагменты в строке по X
                current_line
                    .sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap_or(std::cmp::Ordering::Equal));
                lines.push(current_line);
            }

            // Начинаем новую строку
            current_line = vec![frag.clone()];
            last_page = frag.page;
            last_column = frag.column;
            last_y = frag.y;
            current_line_font = frag.font_size;
        }
    }

    // Добавляем последнюю строку
    if !current_line.is_empty() {
        current_line.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap_or(std::cmp::Ordering::Equal));
        lines.push(current_line);
    }

    log::debug!(
        "Built {} lines from {} fragments",
        lines.len(),
        fragments.len()
    );
    lines
}
