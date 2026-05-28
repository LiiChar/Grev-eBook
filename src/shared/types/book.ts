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
	cover?: string;
	path: string;
	size: number;
	lastReadAt: number;
	lastModified: number;
	createdAt: number;
	charsRead?: number;
	progressRead?: number;
	genres?: string[];
	description?: string;
}

export type Chapter = {
	id: string;
	title?: string;
	html: string;
	order: number;
}


export type BookWithoutChapters = Omit<Book, 'chapters'>;