mod docx;
pub mod epub;
pub mod fb2;
mod html;
mod loader;
mod markdown;
mod pdf;
mod txt;
mod mobi;
mod rtf;
pub mod cbz;

pub use loader::{get_book, get_books};
