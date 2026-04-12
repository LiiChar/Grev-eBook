use serde::{Deserialize, Serialize};

use crate::core::book::model::Book;

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
pub struct BookStore {
    pub books: Vec<Book>,
}
