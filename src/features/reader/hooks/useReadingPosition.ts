import { getReadingAnchor } from '../../../shared/utils/anchor';
import { saveReadingPosition } from '../../../shared/api/reader';
import type { ReaderMode, ReaderState } from '../../../shared/api/reader';
import { reader, setReader, updateBook } from '@/shared/stores/readerStore';

export interface UseReadingPositionReturn {
	savePosition: (
		options: SaveOptions,
	) => Promise<[ReaderState, number] | undefined>;

	debouncedSavePosition: (
		options: SaveOptions,
	) => Promise<[ReaderState, number] | undefined>;
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
	}: SaveOptions): Promise<[ReaderState, number] | undefined> {
		const anchor = getReadingAnchor(contentEl, chapterId);
		if (!anchor) return;

		const [position, globalOffset] = anchor;

		const requestId = ++saveRequestId;

		try {
			const result = await saveReadingPosition(bookPath, globalOffset, position, mode);

			let book = reader.books.find(b => b.meta.path === bookPath);
			if (book) {
				updateBook({
					...book,
					meta: {
						...book.meta,
						progress_read: result[1],
					}
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
	): Promise<[ReaderState, number] | undefined> {
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

export function createScrollSaveHandler(
	getContentEl: () => HTMLDivElement | undefined,
	getChapterId: () => string,
	getBookPath: () => string,
	getMode: () => ReaderMode,
	debouncedSavePosition: (
		options: SaveOptions,
	) => Promise<[ReaderState, number] | undefined>,
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
