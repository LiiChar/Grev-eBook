use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ReadingPosition {
    pub chapter_id: Option<String>,
    pub anchor_text: String,
    pub before: Option<String>,
	pub after: Option<String>
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct TextLocation {
    pub chapter_id: Option<String>,
    pub offset: Option<f32>,
    pub percent: Option<f32>,
    pub page: Option<u32>,
}
