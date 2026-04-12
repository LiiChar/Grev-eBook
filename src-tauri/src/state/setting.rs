use serde::{Deserialize, Serialize};
use std::fmt::Debug;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    #[serde(rename = "light")]
    Light,
    #[serde(rename = "dark")]
    Dark,
    #[serde(rename = "sepia")]
    Sepia, // часто используется в читалках
    #[serde(rename = "night")]
    Night,
}

impl Default for Theme {
    fn default() -> Self {
        Self::Light
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum FontFamily {
    Serif,
    SansSerif,
    Monospace,
    Custom(String), // на случай, если пользователь укажет свой шрифт
}

impl Default for FontFamily {
    fn default() -> Self {
        Self::Serif
    }
}

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
pub struct GeneralSettings {
    pub theme: Theme,
    pub remember_last_book: bool,
    pub library_path: Option<String>, // где хранится библиотека книг
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ReaderSettings {
    pub font_family: FontFamily,
    pub font_size: u16,    // например, 16
    pub line_height: f32,  // 1.4
    pub column_width: u16, // ширина колонки
    pub mode: String,      // scroll | chapters
}

impl Default for ReaderSettings {
    fn default() -> Self {
        Self {
            font_family: FontFamily::default(),
            font_size: 18,
            line_height: 1.5,
            column_width: 720,
            mode: "scroll".to_string(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HotkeySettings {
    pub next_page: String,
    pub prev_page: String,
    pub toggle_theme: String,
    pub increase_font: String,
    pub decrease_font: String,
}

impl Default for HotkeySettings {
    fn default() -> Self {
        Self {
            next_page: "ArrowRight".to_string(),
            prev_page: "ArrowLeft".to_string(),
            toggle_theme: "KeyT".to_string(),
            increase_font: "Equal".to_string(),
            decrease_font: "Minus".to_string(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UiBehaviorSettings {
    pub auto_hide: bool,
    pub animations: bool,
    pub distraction_free: bool,
}

impl Default for UiBehaviorSettings {
    fn default() -> Self {
        Self {
            auto_hide: true,
            animations: true,
            distraction_free: false,
        }
    }
}

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
pub struct SettingStore {
    pub general: GeneralSettings,
    pub reader: ReaderSettings,
    pub hotkeys: HotkeySettings,
    pub ui: UiBehaviorSettings,
}
