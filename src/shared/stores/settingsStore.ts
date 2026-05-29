import { createStore, produce } from 'solid-js/store';
import { createEffect, onMount } from 'solid-js';
import {
  getSettings,
  updateSettings,
  getDefaultSettings,
  type SettingStore,
  type Theme,
  FontFamily,
} from '../api/settings';

// Create store with defaults
const [settings, setSettings] = createStore<SettingStore>(getDefaultSettings());

// Track if settings have been loaded
let isLoaded = false;

// Apply theme to document
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark', 'sepia', 'night');
  if (theme !== 'light') {
    root.classList.add(theme);
  }
}

// Apply reader CSS variables
function applyReaderSettings(reader: SettingStore['reader']) {
  const root = document.documentElement;
  root.style.setProperty('--reader-font-size', `${reader.font_size}px`);
  root.style.setProperty('--reader-line-height', `${reader.line_height}`);
  root.style.setProperty('--reader-max-width', `${reader.column_width}px`);
  root.style.setProperty('--reader-pdf-zoom', `${reader.pdf_zoom}`);
  root.style.setProperty(
    '--reader-pdf-zoom-lock',
    reader.pdf_zoom_lock ? '1' : '0',
  );

  document.documentElement.dataset.readerFont = reader.reader_font;
}

// Load settings from backend
async function loadSettings() {
  try {
    const data = await getSettings();
    setSettings(data);
    isLoaded = true;
    applyTheme(data.general.theme);
    applyReaderSettings(data.reader);
  } catch (err) {
    console.error('Failed to load settings:', err);
    // Use defaults
    applyTheme(settings.general.theme);
    applyReaderSettings(settings.reader);
  }
}

async function saveSettings() {
  await updateSettings(settings);
}

// Exported actions
export function setTheme(theme: Theme) {
  setSettings('general', 'theme', theme);
  applyTheme(theme);
  saveSettings();
}

export function setReaderFont(font: FontFamily) {
	const newReader = {
		...settings.reader,
		reader_font: font,
	};

	setSettings('reader', 'reader_font', font);
	applyReaderSettings(newReader);
	saveSettings();
}

export function setFontSize(size: number) {
  const clamped = Math.min(Math.max(size, 12), 32);
  setSettings('reader', 'font_size', clamped);
  applyReaderSettings(settings.reader);
  saveSettings();
}

export function setReaderMode(mode: 'scroll' | 'chapters') {
	setSettings('reader', 'mode', mode);
	applyReaderSettings(settings.reader);
	saveSettings();
}

export function setLineHeight(height: number) {
  const clamped = Math.min(Math.max(height, 1.2), 2.5);
  setSettings('reader', 'line_height', clamped);
  applyReaderSettings(settings.reader);
  saveSettings();
}

export function setColumnWidth(width: number) {
  const clamped = Math.min(Math.max(width, 400), 1200);
  setSettings('reader', 'column_width', clamped);
  applyReaderSettings(settings.reader);
  saveSettings();
}

export function setPdfZoom(zoom: number) {
  const clamped = Math.min(Math.max(zoom, 0.5), 3);
  setSettings('reader', 'pdf_zoom', clamped);
  applyReaderSettings(settings.reader);
  saveSettings();
}

export function setPdfZoomLock(enabled: boolean) {
  setSettings('reader', 'pdf_zoom_lock', enabled);
  applyReaderSettings(settings.reader);
  saveSettings();
}

export function setAutoHide(enabled: boolean) {
  setSettings('ui', 'auto_hide', enabled);
  saveSettings();
}

export function setAnimations(enabled: boolean) {
  setSettings('ui', 'animations', enabled);
  saveSettings();
}

export function setDistractionFree(enabled: boolean) {
  setSettings('ui', 'distraction_free', enabled);
  saveSettings();
}

export function updateFullSettings(newSettings: Partial<SettingStore>) {
  setSettings(
    produce((s) => {
      if (newSettings.general) Object.assign(s.general, newSettings.general);
      if (newSettings.reader) Object.assign(s.reader, newSettings.reader);
      if (newSettings.hotkeys) Object.assign(s.hotkeys, newSettings.hotkeys);
      if (newSettings.ui) Object.assign(s.ui, newSettings.ui);
    })
  );
  applyTheme(settings.general.theme);
  applyReaderSettings(settings.reader);
  saveSettings();
}

// Export store and loader
export { settings, loadSettings };

