use serde::{Deserialize, Serialize};

use crate::core::reader::Note;

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
pub struct NoteStore {
    pub items: Vec<Note>,
}
