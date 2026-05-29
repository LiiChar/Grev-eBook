import { invoke } from '@tauri-apps/api/core';

// Types matching backend structs
export type ReadingPosition = {
	chapter_id: string;
	anchor_text: string;
	before?: string; 
	after?: string; 
};

export type ReaderMode = 'scroll' | 'chapters';

export type ReadingSession = {
	book_path: string;
	position: ReadingPosition;
	mode: ReaderMode;
	last_opened_at: number;
	last_read_at: number;
};

export type ReaderState = {
  current_book_path: string | null;
  last_session_book_path: string | null;
  sessions: Record<string, ReadingSession>;
};

// API functions
export async function getReaderState(): Promise<ReaderState> {
  return invoke<ReaderState>('get_reader_state');
}

export async function setCurrentBook(bookPath: string): Promise<ReaderState> {
  return invoke<ReaderState>('set_current_book', { bookPath });
}

export async function saveReadingPosition(
  bookPath: string,
  chars: number,
  position: ReadingPosition,
  mode: ReaderMode
) {
  return invoke<[ReaderState, number]>('save_reading_position', { bookPath, chars, position, mode });
}

export async function getReadingPosition(
  bookPath: string
) {
  return invoke<ReadingPosition | null>("get_reading_position", { bookPath });
}
