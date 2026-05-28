/**
 * Хук управления закладками читалки.
 * Вынесен из BookRead.tsx.
 */

import { createSignal } from 'solid-js';
import { addBookmark, getBookmark } from '../../../shared/api/bookmarks';
import { getReadingAnchor } from '../../../shared/utils/anchor';
import { scrollToAnchor } from '../../../shared/utils/anchor';
import { toast } from "solid-sonner"
import { normalizeWhitespace } from '../utils/noteHighlight';
import { getRangeStartSnippet, findAllAndSelect } from '../utils/textSelection';
import type { Bookmark } from '../../../shared/api/bookmarks';

export interface UseBookmarksManagerReturn {
  bookmarks: () => Bookmark[];
  setBookmarks: (v: Bookmark[] | ((prev: Bookmark[]) => Bookmark[])) => void;
  handleAddBookmark: (options: {
    contentEl: HTMLDivElement;
    chapterId: string;
    bookPath: string;
  }) => Promise<void>;
  scrollToBookmark: (options: {
    bookmarkId: string;
    contentEl: HTMLDivElement;
  }) => Promise<void>;
}

export function useBookmarksManager(): UseBookmarksManagerReturn {
  const [bookmarks, setBookmarks] = createSignal<Bookmark[]>([]);

  async function handleAddBookmark(options: {
    contentEl: HTMLDivElement;
    chapterId: string;
    bookPath: string;
  }): Promise<void> {
    const { contentEl, chapterId, bookPath } = options;
    const selection = window.getSelection();
    if (!selection) {
      toast.error('Вы ничего не выделили');
      return;
    }
    const selectedText = selection.toString();
    if (!selectedText) {
      toast.error('Вы ничего не выделили');
      return;
    }

    const range = selection.getRangeAt(0);
    const rawSnippet = getRangeStartSnippet(range, 120);
    const anchorSnippet = normalizeWhitespace(rawSnippet || selectedText).slice(0, 120);
    const preview = normalizeWhitespace(selectedText);

    const position = getReadingAnchor(contentEl, chapterId, anchorSnippet || preview);
    if (!position) return;

    try {
      const bm = await addBookmark(bookPath, position, preview, 'regular');
      setBookmarks([...bookmarks(), bm]);
      toast.success('Закладка добавлена');
    } catch (err) {
      console.error('Failed to add bookmark:', err);
      toast.error('Не удалось добавить закладку');
    }
  }

  async function scrollToBookmark(options: {
    bookmarkId: string;
    contentEl: HTMLDivElement;
  }): Promise<void> {
    const { bookmarkId, contentEl } = options;
    const bookmark = await getBookmark(bookmarkId);
    if (!bookmark) return;

    scrollToAnchor(contentEl, bookmark.position);
    findAllAndSelect(contentEl, bookmark.preview);
  }

  return {
    bookmarks,
    setBookmarks,
    handleAddBookmark,
    scrollToBookmark,
  };
}
