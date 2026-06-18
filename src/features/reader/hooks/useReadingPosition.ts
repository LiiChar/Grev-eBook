import { getReadingAnchor } from '../../../shared/utils/anchor';
import { saveReadingPosition } from '../../../shared/api/reader';
import type { ReaderMode, ReaderState } from '../../../shared/api/reader';
import { reader, updateBook } from '@/shared/stores/readerStore';
import { convert } from 'html-to-text';

export interface UseReadingPositionReturn {
	savePosition: (
		options: SaveOptions,
	) => Promise<ReaderState | undefined>;

	debouncedSavePosition: (
		options: SaveOptions,
	) => Promise<ReaderState | undefined>;
}

type SaveOptions = {
	contentEl: HTMLDivElement;
	chapterId: string;
	bookPath: string;
	mode: ReaderMode;
};

export function useReadingPosition(): UseReadingPositionReturn {
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let saveRequestId = 0;

	async function savePosition({
		contentEl,
		chapterId,
		bookPath,
		mode,
	}: SaveOptions): Promise<ReaderState | undefined> {
		let anchor = getReadingAnchor(contentEl, chapterId);

		const [position, _] = anchor;

		const requestId = ++saveRequestId;

		try {
			let chars = 0;
			let book = reader.books.find(b => b.meta.path === bookPath);

			let chapterIndex = book?.chapters.findIndex(c => c.id === chapterId);

			let curChapterChar = 0;

			if (chapterIndex !== -1) {
				let curChapterText = clearText(book?.chapters[chapterIndex!].html ?? "");

				let index = curChapterText.indexOf(position.anchor_text);
				if (index !== -1) {
					curChapterChar = index + position.anchor_text.length;
				}
			}

			if (chapterIndex === -1) {
				chars = 0;
			} else {
				if (book) {
					chars =
						book?.chapters
							.slice(0, chapterIndex)
							.reduce((acc, c) => acc + countTextChars(c.html), 0) + curChapterChar;
				}

			}

			const result = await saveReadingPosition(bookPath, position, chars, mode);

			if (book) {
				updateBook({
					...book,
					meta: {
						...book.meta,
						progress_read: chars,
					},
				});
			}


			// Игнорируем устаревший ответ
			if (requestId !== saveRequestId) return;

			return result;
		} catch (err) {
			console.error('Failed to save position:', err);
		}
	}

	function debouncedSavePosition(
		options: SaveOptions,
	): Promise<ReaderState | undefined> {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		return new Promise(resolve => {
			debounceTimer = setTimeout(async () => {
				resolve(await savePosition(options));
			}, 500);
		});
	}

	return {
		savePosition,
		debouncedSavePosition,
	};
}

export function clearText(html: string): string {
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
}

export function countTextChars(html: string): number {
	const text = html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();

	return Array.from(text).length;
}

export function createScrollSaveHandler(
	getContentEl: () => HTMLDivElement | undefined,
	getChapterId: () => string,
	getBookPath: () => string,
	getMode: () => ReaderMode,
	debouncedSavePosition: (
		options: SaveOptions,
	) => Promise<ReaderState | undefined>,
): () => void {
	return () => {
		const contentEl = getContentEl();
		const chapterId = getChapterId();
		const bookPath = getBookPath();

		if (!contentEl || !chapterId || !bookPath) return;

		void debouncedSavePosition({
			contentEl,
			chapterId,
			bookPath,
			mode: getMode(),
		});
	};
}
