/**
 * Хук для сохранения и восстановления позиции чтения.
 * Вынесен из BookRead.tsx.
 */

import { getReadingAnchor } from '../../../shared/utils/anchor';
import { saveReadingPosition } from '../../../shared/api/reader';
import { debounce } from '../../../shared/utils/common';
import type { ReaderMode } from '../../../shared/api/reader';

export interface UseReadingPositionReturn {
  savePosition: (options: {
    contentEl: HTMLDivElement;
    chapterId: string;
    bookPath: string;
    mode: ReaderMode;
  }) => Promise<void>;
  debouncedSavePosition: (options: {
    contentEl: HTMLDivElement;
    chapterId: string;
    bookPath: string;
    mode: () => ReaderMode;
  }) => void;
}

export function useReadingPosition(): UseReadingPositionReturn {
  async function savePosition(options: {
    contentEl: HTMLDivElement;
    chapterId: string;
    bookPath: string;
    mode: ReaderMode;
  }): Promise<void> {
    const { contentEl, chapterId, bookPath, mode } = options;
    const position = getReadingAnchor(contentEl, chapterId);
    if (!position) return;

    try {
      await saveReadingPosition(bookPath, position, mode);
    } catch (err) {
      console.error('Failed to save position:', err);
    }
  }

  // Debounce-обёртка для onScroll
  function debouncedSavePosition(options: {
    contentEl: HTMLDivElement;
    chapterId: string;
    bookPath: string;
    mode: () => ReaderMode;
  }): void {
    const { contentEl, chapterId, bookPath, mode } = options;
    const position = getReadingAnchor(contentEl, chapterId);
    if (!position) return;

    saveReadingPosition(bookPath, position, mode()).catch((err: unknown) => {
      console.error('Failed to save position:', err);
    });
  }

  return {
    savePosition,
    debouncedSavePosition,
  };
}

/**
 * Создать debounce-функцию для сохранения позиции при скролле.
 * Возвращает функцию-обработчик для onScroll.
 */
export function createScrollSaveHandler(
  getContentEl: () => HTMLDivElement | undefined,
  getChapterId: () => string,
  getBookPath: () => string,
  getMode: () => ReaderMode,
): () => void {
  const handler = debounce(() => {
    const contentEl = getContentEl();
    const chapterId = getChapterId();
    const bookPath = getBookPath();
    const mode = getMode();
    if (!contentEl || !chapterId || !bookPath) return;

    const position = getReadingAnchor(contentEl, chapterId);
    if (!position) return;

    saveReadingPosition(bookPath, position, mode).catch((err: unknown) => {
      console.error('Failed to save position:', err);
    });
  }, 500);

  return () => {
    handler();
  };
}
