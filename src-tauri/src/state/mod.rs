mod book;
mod bookmark;
mod note;
mod reader;
mod setting;

use serde::{Deserialize, Serialize};

pub use book::BookStore;
pub use bookmark::BookmarkStore;
pub use note::NoteStore;
pub use reader::ReaderState;
pub use setting::SettingStore;

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
pub struct AppState {
    pub book: BookStore,
    pub setting: SettingStore,
    pub reader: ReaderState,
    pub bookmarks: BookmarkStore,
    pub notes: NoteStore,
}
