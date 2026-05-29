import { invoke } from '@tauri-apps/api/core';
import type { ReadingPosition } from './reader';
import { TextRange } from '../types/note';

// Types matching backend structs
export type BookmarkKind = 'regular' | 'custom';

export type Bookmark = {
  id: string;
  book_path: string;
  position: ReadingPosition;
  preview: string;
  kind: BookmarkKind;
  created_at: number;
  range: TextRange;
};

// API functions
export async function addBookmark(
	bookPath: string,
	position: ReadingPosition,
	range: TextRange,
	preview: string,
	kind: BookmarkKind = 'regular',
): Promise<Bookmark> {
	return invoke<Bookmark>('add_bookmark', { bookPath, position, range, preview, kind });
}

export async function getBookmarks(bookPath?: string): Promise<Bookmark[]> {
  return invoke<Bookmark[]>('get_bookmarks', { bookPath: bookPath ?? null });
}

export async function deleteBookmark(bookmarkId: string): Promise<void> {
  return invoke('delete_bookmark', { bookmarkId });
}

export async function getBookmark(bookmarkId: string): Promise<Bookmark | null> {
  return invoke<Bookmark>('get_bookmark', { bookmarkId });
}