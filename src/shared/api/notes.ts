import { invoke } from '@tauri-apps/api/core';
import { Note, TextRange } from '../types/note';



// API functions
export async function addNote(
	bookPath: string,
	range: TextRange,
	text: string,
	preview: string,
	highlight: boolean = false,
	highlightColor: string | null = null,
): Promise<Note> {
	return invoke<Note>('add_note', {
		bookPath,
		range,
		text,
    preview,
		highlight,
		highlightColor,
	});
}

export async function getNotes(bookPath?: string): Promise<Note[]> {
  return invoke<Note[]>('get_notes', { bookPath: bookPath ?? null });
}

export async function updateNote(
	noteId: string,
	range: TextRange,
	text: string,
	highlight: boolean,
	highlightColor?: string,
): Promise<Note> {
	return invoke<Note>('update_note', {
		noteId,
		range,
		text,
		highlight,
		highlightColor,
	});
}

export async function deleteNote(noteId: string): Promise<void> {
  return invoke('delete_note', { noteId });
}

