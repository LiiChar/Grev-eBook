// Types matching backend structs
export type TextLocation = {
	chapter_id: string;
	offset: number;
};

export type TextRange = {
	start: TextLocation;
	end: TextLocation;
};

export type Note = {
	id: string;
	book_path: string;
	range: TextRange;
	text: string;
	preview: string;
	highlight: boolean;
	highlight_color: string | null;
	created_at: number;
	updated_at: number;
};
