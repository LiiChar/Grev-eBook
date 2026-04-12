use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::core::reader::ReadingSession;

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
pub struct ReaderState {
    pub current_book_path: Option<String>,
    pub last_session_book_path: Option<String>,
    pub sessions: HashMap<String, ReadingSession>,
}
