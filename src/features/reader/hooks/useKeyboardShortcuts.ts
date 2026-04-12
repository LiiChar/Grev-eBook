/**
 * Хук горячих клавиш читалки.
 * Вынесен из BookRead.tsx.
 */

import { onCleanup } from 'solid-js';

export interface UseKeyboardShortcutsOptions {
  onToggleToc?: () => void;
  onToggleSettings?: () => void;
  onToggleFullscreen?: () => void;
  onAddBookmark?: () => void;
  onAddNote?: () => void;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  onNavigateBack?: () => void;
  isChaptersMode: () => boolean;
  isTocOpen: () => boolean;
  isSettingsOpen: () => boolean;
  isFullscreen: () => boolean;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  function handleKeyDown(e: KeyboardEvent) {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      // Escape работает даже в input/textarea для закрытия popup
      if (e.code === 'Escape') {
        e.preventDefault();
        if (options.isTocOpen()) {
          options.onToggleToc?.();
        } else if (options.isSettingsOpen()) {
          options.onToggleSettings?.();
        }
      }
      return;
    }

    switch (e.code) {
      case 'ArrowRight':
      case 'PageDown':
        if (options.isChaptersMode()) {
          e.preventDefault();
          options.onNextChapter?.();
        }
        break;

      case 'ArrowLeft':
      case 'PageUp':
        if (options.isChaptersMode()) {
          e.preventDefault();
          options.onPrevChapter?.();
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (options.isTocOpen()) {
          options.onToggleToc?.();
        } else if (options.isSettingsOpen()) {
          options.onToggleSettings?.();
        } else if (options.isFullscreen()) {
          options.onToggleFullscreen?.();
        } else {
          options.onNavigateBack?.();
        }
        break;

      case 'KeyF':
        e.preventDefault();
        options.onToggleFullscreen?.();
        break;

      case 'KeyT':
        e.preventDefault();
        options.onToggleToc?.();
        break;

      case 'KeyB':
        e.preventDefault();
        options.onAddBookmark?.();
        break;

      case 'KeyN':
        e.preventDefault();
        options.onAddNote?.();
        break;
    }
  }

  function setup() {
    document.addEventListener('keydown', handleKeyDown);

    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown);
    });
  }

  return { setup };
}
