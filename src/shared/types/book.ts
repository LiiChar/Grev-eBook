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
	cover?: number[]; 
	path: string;
}

export type Chapter = {
	id: string;
	title?: string;
	html: string;
	order: number;
}


export type BookWithoutChapters = Omit<Book, 'chapters'>;