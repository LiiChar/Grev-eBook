import { ReadingPosition } from "../api/reader";

export type Book = {
	id: string;
	meta: BookMeta;
	chapters: Chapter[];
	position?: ReadingPosition;
}

export type BookMeta = {
	title: string;
	author?: string;
	language?: string;
	cover_path?: string;
	path: string;
	size: number;
	last_read_at: number;
	last_modified: number;
	created_at: number;
	chars_read?: number;
	progress_read?: number;
	genres?: string[];
	description?: string;
	count_chapters: number;
};

export type Chapter = {
	id: string;
	title?: string;
	html: string;
	order: number;
}


export type BookWithoutChapters = Omit<Book, 'chapters'>;