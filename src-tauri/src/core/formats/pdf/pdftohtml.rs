use std::fs;
use std::path::Path;
use std::process::Command;

use base64::{engine::general_purpose, Engine as _};
use kuchiki::traits::TendrilSink;
use regex::Regex;
use std::collections::HashMap;

//////////////////////////////////////////////////////////////
// PUBLIC
//////////////////////////////////////////////////////////////

pub fn pdf_to_html(input: &str, output: &str) -> Result<String, String> {
    run_pdftohtml(input, output)?;

    let mut html = fs::read_to_string(output).map_err(|e| e.to_string())?;

    html = normalize_pdf_css(&html);

    let html = build_reader_html(&html, output)?;

    Ok(html)
}

pub fn pdf_to_html_pages(input: &str, output: &str) -> Result<Vec<(Option<String>, String)>, String> {
    run_pdftohtml(input, output)?;

    let mut html = fs::read_to_string(output).map_err(|e| e.to_string())?;
    html = normalize_pdf_css(&html);

    let pages = build_reader_pages(&html, output)?;
    Ok(pages)
}

//////////////////////////////////////////////////////////////
// PDFTOHTML
//////////////////////////////////////////////////////////////

fn run_pdftohtml(input: &str, output: &str) -> Result<(), String> {
    let cmd = Command::new("bin/poppler/pdftohtml.exe")
        .args([
            "-c",
            "-hidden",
            "-noframes",
            "-enc",
            "UTF-8",
            "-zoom",
            "1.2",
            input,
            output,
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if !cmd.status.success() {
        return Err(String::from_utf8_lossy(&cmd.stderr).to_string());
    }

    Ok(())
}

//////////////////////////////////////////////////////////////
// CSS NORMALIZE
//////////////////////////////////////////////////////////////

fn normalize_pdf_css(html: &str) -> String {
    let mut out = html.to_string();

    let rules = [
        r#"white-space\s*:\s*nowrap\s*;?"#,
        r#"position\s*:\s*absolute\s*;?"#,
        r#"transform\s*:[^;]+;?"#,
    ];

    for r in rules {
        let re = Regex::new(r).unwrap();
        out = re.replace_all(&out, "").to_string();
    }

    out
}

//////////////////////////////////////////////////////////////
// LAYOUT ENGINE
//////////////////////////////////////////////////////////////

#[derive(Clone, Debug)]
struct TextItem {
    text: String,
    top: f32,
    left: f32,
    font: f32,
    bold: bool,
    page: usize,
}

#[derive(Clone, Debug, Default)]
struct StyleProps {
    left: Option<f32>,
    top: Option<f32>,
    font: Option<f32>,
    bold: Option<bool>,
}

fn build_reader_html(html: &str, html_path: &str) -> Result<String, String> {
    let document = kuchiki::parse_html().one(html);

    let style_map = build_style_map(&document);
    let items = extract_items(&document, &style_map);

    if items.is_empty() {
        return Ok(html.to_string());
    }

    let pages = build_reader_chapters_from_items(items);
    let mut final_html = String::new();
    for (_title, page_html) in pages {
        final_html.push_str(&page_html);
    }

    let final_html = embed_images_base64(&final_html, html_path)?;

    Ok(final_html)
}

fn build_reader_pages(
    html: &str,
    html_path: &str,
) -> Result<Vec<(Option<String>, String)>, String> {
    let document = kuchiki::parse_html().one(html);
    let style_map = build_style_map(&document);
    let items = extract_items(&document, &style_map);
    if items.is_empty() {
        return Ok(vec![(None, html.to_string())]);
    }

    let pages = build_reader_chapters_from_items(items);
    let mut out = Vec::new();
    for (title, page_html) in pages {
        let html = embed_images_base64(&page_html, html_path)?;
        out.push((title, html));
    }

    Ok(out)
}

fn build_reader_chapters_from_items(items: Vec<TextItem>) -> Vec<(Option<String>, String)> {
    let mut pages_map: std::collections::BTreeMap<usize, Vec<TextItem>> = std::collections::BTreeMap::new();
    for item in items {
        pages_map.entry(item.page).or_default().push(item);
    }

    let mut sections: Vec<(Option<String>, String)> = Vec::new();
    for (_page, items) in pages_map {
        let base_font = page_base_font(&items);
        let columns = split_columns(items);
        for column in columns {
            let lines = group_lines(column);
            let paragraphs = group_paragraphs(lines);
            sections.extend(build_semantic_sections(paragraphs, base_font));
        }
    }

    // Merge sections into chapters by headings
    let mut chapters: Vec<(Option<String>, String)> = Vec::new();
    let mut current_title: Option<String> = None;
    let mut current_html = String::new();
    let mut page_fallback = 1usize;

    for (title, html) in sections {
        if let Some(t) = title {
            if !current_html.is_empty() || current_title.is_some() {
                chapters.push((current_title.take(), std::mem::take(&mut current_html)));
            }
            current_title = Some(t);
            current_html.push_str(&html);
        } else {
            if current_title.is_none() && current_html.is_empty() {
                current_title = Some(format!("Page {}", page_fallback));
                page_fallback += 1;
            }
            current_html.push_str(&html);
        }
    }

    if !current_html.is_empty() || current_title.is_some() {
        chapters.push((current_title, current_html));
    }

    chapters
}

fn page_base_font(items: &[TextItem]) -> f32 {
    if items.is_empty() {
        return 12.0;
    }
    let mut fonts: Vec<f32> = items.iter().map(|i| i.font).collect();
    fonts.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let mid = fonts.len() / 2;
    fonts[mid].max(10.0)
}

//////////////////////////////////////////////////////////////
// EXTRACT
//////////////////////////////////////////////////////////////

fn build_style_map(doc: &kuchiki::NodeRef) -> HashMap<String, StyleProps> {
    let mut map: HashMap<String, StyleProps> = HashMap::new();
    let rule_re = Regex::new(r"\.([A-Za-z0-9_-]+)\s*\{([^}]*)\}").unwrap();

    if let Ok(styles) = doc.select("style") {
        for s in styles {
            let css = s.text_contents();
            for cap in rule_re.captures_iter(&css) {
                let class_name = cap.get(1).map(|m| m.as_str()).unwrap_or("");
                let body = cap.get(2).map(|m| m.as_str()).unwrap_or("");
                let mut props = parse_style_props(body);
                if class_name.is_empty() {
                    continue;
                }
                map.entry(class_name.to_string())
                    .and_modify(|existing| merge_props(existing, &props))
                    .or_insert_with(|| {
                        if props.font.is_none() {
                            props.font = None;
                        }
                        props
                    });
            }
        }
    }

    map
}

fn parse_style_props(style: &str) -> StyleProps {
    StyleProps {
        left: px_opt(style, "left"),
        top: px_opt(style, "top"),
        font: px_opt(style, "font-size"),
        bold: if style.contains("bold") {
            Some(true)
        } else {
            None
        },
    }
}

fn merge_props(dst: &mut StyleProps, src: &StyleProps) {
    if src.left.is_some() {
        dst.left = src.left;
    }
    if src.top.is_some() {
        dst.top = src.top;
    }
    if src.font.is_some() {
        dst.font = src.font;
    }
    if src.bold.is_some() {
        dst.bold = src.bold;
    }
}

fn extract_items(doc: &kuchiki::NodeRef, style_map: &HashMap<String, StyleProps>) -> Vec<TextItem> {
    let mut out = Vec::new();
    let mut seen = std::collections::HashSet::new();

    if let Ok(pages) = doc.select("div[id^=page]") {
        for (page_index, p) in pages.enumerate() {
            if let Ok(nodes) = p.as_node().select("p, span") {
                for n in nodes {
                    let node = n.as_node();

                    let text = normalize_line(&node.text_contents());
                    if text.is_empty() {
                        continue;
                    }

                    let attrs = n.attributes.borrow();
                    let style = attrs.get("style").unwrap_or("");
                    let class_attr = attrs.get("class").unwrap_or("");

                    let mut props = StyleProps::default();
                    if !class_attr.is_empty() {
                        for class_name in class_attr.split_whitespace() {
                            if let Some(p) = style_map.get(class_name) {
                                merge_props(&mut props, p);
                            }
                        }
                    }

                    let inline = parse_style_props(style);
                    merge_props(&mut props, &inline);

                    let top = props.top.unwrap_or(0.0);
                    let left = props.left.unwrap_or(0.0);

                    out.push(TextItem {
                        text,
                        top,
                        left,
                        font: props.font.unwrap_or(12.0).max(12.0),
                        bold: props.bold.unwrap_or(false),
                        page: page_index,
                    });
                    let key = format!(
                        "{}|{}|{}|{}",
                        page_index,
                        (top * 10.0) as i64,
                        (left * 10.0) as i64,
                        normalize_line(&node.text_contents())
                    );
                    if seen.contains(&key) {
                        out.pop();
                    } else {
                        seen.insert(key);
                    }
                }
            }
        }
    }

    out
}

fn px(style: &str, key: &str) -> f32 {
    let re = Regex::new(&format!(r#"{}:\s*([0-9\.]+)px"#, key)).unwrap();

    re.captures(style)
        .and_then(|c| c.get(1))
        .and_then(|m| m.as_str().parse().ok())
        .unwrap_or(0.0)
}

fn px_opt(style: &str, key: &str) -> Option<f32> {
    let re = Regex::new(&format!(r#"{}:\s*([0-9\.]+)px"#, key)).unwrap();

    re.captures(style)
        .and_then(|c| c.get(1))
        .and_then(|m| m.as_str().parse().ok())
}

//////////////////////////////////////////////////////////////
// COLUMN DETECT
//////////////////////////////////////////////////////////////

fn split_columns(mut items: Vec<TextItem>) -> Vec<Vec<TextItem>> {
    if items.len() < 20 {
        return vec![items];
    }

    items.sort_by(|a, b| a.left.partial_cmp(&b.left).unwrap());

    let mut max_gap = 0.0_f32;
    let mut split_at: Option<f32> = None;
    for i in 0..items.len().saturating_sub(1) {
        let gap = items[i + 1].left - items[i].left;
        if gap > max_gap {
            max_gap = gap;
            split_at = Some((items[i + 1].left + items[i].left) / 2.0);
        }
    }

    if let Some(split_x) = split_at {
        if max_gap > 120.0 {
            let mut left = Vec::new();
            let mut right = Vec::new();
            for item in items.iter().cloned() {
                if item.left < split_x {
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

//////////////////////////////////////////////////////////////
// LINES
//////////////////////////////////////////////////////////////

fn group_lines(mut items: Vec<TextItem>) -> Vec<Vec<TextItem>> {
    items.sort_by(|a, b| {
        a.page
            .cmp(&b.page)
            .then_with(|| a.top.partial_cmp(&b.top).unwrap())
            .then_with(|| a.left.partial_cmp(&b.left).unwrap())
    });

    let mut lines: Vec<Vec<TextItem>> = Vec::new();

    for item in items {
        if let Some(last) = lines.last_mut() {
            let base_font = last[0].font;
            let tol = (base_font * 0.6).max(4.0);
            if item.page == last[0].page && (item.top - last[0].top).abs() < tol {
                last.push(item);
                continue;
            }
        }

        lines.push(vec![item]);
    }

    for l in &mut lines {
        l.sort_by(|a, b| a.left.partial_cmp(&b.left).unwrap());
    }

    lines
}

//////////////////////////////////////////////////////////////
// PARAGRAPHS
//////////////////////////////////////////////////////////////

fn group_paragraphs(lines: Vec<Vec<TextItem>>) -> Vec<Vec<Vec<TextItem>>> {
    let mut result = Vec::new();
    let mut current = Vec::new();

    let mut last_top: Option<f32> = None;
    let mut last_font: f32 = 12.0;

    for l in lines {
        let top = l[0].top;
        let font = l[0].font;

        if let Some(prev) = last_top {
            let gap = top - prev;
        let threshold = (last_font * 1.8).max(20.0);
            if gap > threshold {
                if !current.is_empty() {
                    result.push(current);
                    current = Vec::new();
                }
            }
        }

        current.push(l);
        last_top = Some(top);
        last_font = font;
    }

    if !current.is_empty() {
        result.push(current);
    }

    result
}

//////////////////////////////////////////////////////////////
// SEMANTIC BUILD
//////////////////////////////////////////////////////////////

fn build_semantic_sections(
    paragraphs: Vec<Vec<Vec<TextItem>>>,
    base_font: f32,
) -> Vec<(Option<String>, String)> {
    let mut sections: Vec<(Option<String>, String)> = Vec::new();
    let mut current_title: Option<String> = None;
    let mut current_html = String::new();

    for p in paragraphs {
        let lines = paragraph_lines(&p);
        let text = lines
            .iter()
            .map(|l| l.text.clone())
            .collect::<Vec<_>>()
            .join(" ");
        let avg_font = avg_font(&p);

        if text.trim().is_empty() {
            continue;
        }

        if let Some(lead) = &lines[0].leading_heading {
            if looks_like_chapter_title(lead)
                && (lines[0].font >= (base_font * 1.2).max(base_font + 2.0)
                    || lines[0].bold)
            {
                if !current_html.is_empty() || current_title.is_some() {
                    sections.push((current_title.take(), std::mem::take(&mut current_html)));
                }
                current_title = Some(lead.trim().to_string());

                if let Some(trail) = &lines[0].trailing_text {
                    current_html.push_str(&format!("<p>{}</p>", esc(trail)));
                }
                continue;
            }
        }

        if is_heading(&text, avg_font, base_font, &p) {
            if !current_html.is_empty() || current_title.is_some() {
                sections.push((current_title.take(), std::mem::take(&mut current_html)));
            }
            current_title = Some(text.trim().to_string());
            continue;
        }

        let rendered = lines
            .iter()
            .map(|l| l.render())
            .collect::<Vec<_>>()
            .join(" ");
        current_html.push_str(&format!("<p>{}</p>", rendered));
    }

    if !current_html.is_empty() || current_title.is_some() {
        sections.push((current_title, current_html));
    }

    sections
}

//////////////////////////////////////////////////////////////
// HEURISTICS
//////////////////////////////////////////////////////////////

#[derive(Clone, Debug)]
struct LineRender {
    text: String,
    font: f32,
    bold: bool,
    leading_heading: Option<String>,
    trailing_text: Option<String>,
}

impl LineRender {
    fn render(&self) -> String {
        let mut style = String::new();
        if self.font > 0.0 {
            style.push_str(&format!("font-size:{}px;", self.font));
        }
        if self.bold {
            style.push_str("font-weight:bold;");
        }
        if style.is_empty() {
            esc(&self.text)
        } else {
            format!(r#"<span style="{}">{}</span>"#, style, esc(&self.text))
        }
    }
}

fn paragraph_lines(p: &Vec<Vec<TextItem>>) -> Vec<LineRender> {
    p.iter()
        .map(|l| {
            let joined = l
                .iter()
                .map(|i| i.text.clone())
                .collect::<Vec<_>>()
                .join(" ");
            let text = normalize_line(&joined);
            let font = l.iter().map(|i| i.font).fold(0.0_f32, |m, v| m.max(v));
            let bold = l.iter().any(|i| i.bold);

            let mut leading_heading: Option<String> = None;
            let mut trailing_text: Option<String> = None;
            if l.len() >= 2 {
                let first = &l[0];
                let rest = l[1..]
                    .iter()
                    .map(|i| i.text.clone())
                    .collect::<Vec<_>>()
                    .join(" ");
                let rest_norm = normalize_line(&rest);
                if first.font >= (font * 0.95) && !rest_norm.is_empty() {
                    leading_heading = Some(normalize_line(&first.text));
                    trailing_text = Some(rest_norm);
                }
            }

            LineRender {
                text,
                font,
                bold,
                leading_heading,
                trailing_text,
            }
        })
        .filter(|l| !l.text.is_empty())
        .collect()
}

fn normalize_line(input: &str) -> String {
    let replaced = input
        .replace('\n', " ")
        .replace('\r', " ")
        .replace('\u{00A0}', " ");
    replaced
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string()
}

fn avg_font(p: &Vec<Vec<TextItem>>) -> f32 {
    let mut s = 0.0;
    let mut c = 0.0;

    for l in p {
        for i in l {
            s += i.font;
            c += 1.0;
        }
    }

    if c == 0.0 {
        12.0
    } else {
        s / c
    }
}

fn is_heading(text: &str, font: f32, base_font: f32, p: &Vec<Vec<TextItem>>) -> bool {
    let short = text.len() < 120;
    let single_line = p.len() <= 2;
    let size_bump = font >= (base_font * 1.2).max(base_font + 2.0);
    let chapter_like = looks_like_chapter_title(text);
    (size_bump && short) || (chapter_like && (size_bump || is_bold(p)) && single_line)
}

fn looks_like_chapter_title(text: &str) -> bool {
    let trimmed = text.trim();
    if trimmed.len() < 3 || trimmed.len() > 120 {
        return false;
    }
    // Exclude separators like "* * *" or "---"
    if trimmed.chars().all(|c| c == '*' || c == '-' || c == '•' || c == '·' || c.is_whitespace())
    {
        return false;
    }
    // "4. Title" or "Глава 4"
    let re = Regex::new(r"^(\d+[\.\)]\s+.+|глава\s+\d+|chapter\s+\d+)").unwrap();
    re.is_match(&trimmed.to_lowercase())
}

fn is_bold(p: &Vec<Vec<TextItem>>) -> bool {
    p.iter().any(|l| l.iter().any(|i| i.bold))
}

fn is_dialogue(_text: &str) -> bool {
    false
}

//////////////////////////////////////////////////////////////
// IMAGES
//////////////////////////////////////////////////////////////

fn embed_images_base64(html: &str, html_path: &str) -> Result<String, String> {
    let base_dir = Path::new(html_path).parent().unwrap_or(Path::new(""));

    let re = Regex::new(r#"<img[^>]*src="([^"]+)"[^>]*>"#).unwrap();

    let out = re.replace_all(html, |caps: &regex::Captures| {
        let src = &caps[1];

        if src.starts_with("data:") {
            return caps[0].to_string();
        }

        let path = base_dir.join(src);

        let bytes = match fs::read(&path) {
            Ok(b) => b,
            Err(_) => return "".to_string(),
        };

        if bytes.len() < 300 {
            return "".to_string();
        }

        let mime = mime(&path);
        let b64 = general_purpose::STANDARD.encode(bytes);

        format!(r#"<img src="data:{};base64,{}">"#, mime, b64)
    });

    Ok(out.to_string())
}

fn mime(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        _ => "application/octet-stream",
    }
}

//////////////////////////////////////////////////////////////
// UTILS
//////////////////////////////////////////////////////////////

fn esc(s: &str) -> String {
    s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
}
