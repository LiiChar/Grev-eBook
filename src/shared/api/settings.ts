import { invoke } from '@tauri-apps/api/core';

// Types matching backend structs
export type Theme = 'light' | 'dark' | 'sepia' | 'night';

export type FontFamily = 'serif' | 'sans_serif' | 'monospace' | { custom: string };

export type GeneralSettings = {
  theme: Theme;
  remember_last_book: boolean;
  library_path: string | null;
};

export type ReaderSettings = {
  font_family: FontFamily;
  font_size: number;
  line_height: number;
  column_width: number;
  mode: 'scroll' | 'chapters';
};

export type HotkeySettings = {
  next_page: string;
  prev_page: string;
  toggle_theme: string;
  increase_font: string;
  decrease_font: string;
};

export type UiBehaviorSettings = {
  auto_hide: boolean;
  animations: boolean;
  distraction_free: boolean;
};

export type SettingStore = {
  general: GeneralSettings;
  reader: ReaderSettings;
  hotkeys: HotkeySettings;
  ui: UiBehaviorSettings;
};

// API functions
export async function getSettings(): Promise<SettingStore> {
  return invoke<SettingStore>('get_settings');
}

export async function updateSettings(settings: SettingStore): Promise<void> {
  return invoke('update_settings', { settings });
}

// Helper to get default settings
export function getDefaultSettings(): SettingStore {
  return {
    general: {
      theme: 'light',
      remember_last_book: true,
      library_path: null,
    },
    reader: {
      font_family: 'serif',
      font_size: 18,
      line_height: 1.5,
      column_width: 720,
      mode: 'scroll'
    },
    hotkeys: {
      next_page: 'ArrowRight',
      prev_page: 'ArrowLeft',
      toggle_theme: 'KeyT',
      increase_font: 'Equal',
      decrease_font: 'Minus',
    },
    ui: {
      auto_hide: true,
      animations: true,
      distraction_free: false,
    },
  };
}

