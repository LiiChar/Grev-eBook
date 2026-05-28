
import { getReadingAnchor } from '../../../shared/utils/anchor';
import { saveReadingPosition } from '../../../shared/api/reader';
import { debounce } from '../../../shared/utils/common';
import type { ReaderMode } from '../../../shared/api/reader';

export interface UseReadingPositionReturn {
	savePosition: (options: {
		contentEl: HTMLDivElement;
		chapterId: string;
		bookPath: string;
		mode: ReaderMode;
	}) => Promise<void>;

	debouncedSavePosition: (options: {
		contentEl: HTMLDivElement;
		chapterId: string;
		bookPath: string;
		mode: ReaderMode;
	}) => void;
}

type SaveOptions = {
	contentEl: HTMLDivElement;
	chapterId: string;
	bookPath: string;
	mode: ReaderMode;
};

export function useReadingPosition(): UseReadingPositionReturn {
	async function savePosition({
		contentEl,
		chapterId,
		bookPath,
		mode,
	}: SaveOptions): Promise<void> {
		const position = getReadingAnchor(contentEl, chapterId);
		if (!position) return;

		try {
			await saveReadingPosition(bookPath, position, mode);
		} catch (err) {
			console.error('Failed to save position:', err);
		}
	}

	/**
	 * Один debounce на все сохранения:
	 * scroll / смена главы / ручной вызов
	 */
	const debouncedSavePosition = debounce((options: SaveOptions) => {
		savePosition(options);
	}, 500);

	return {
		savePosition,
		debouncedSavePosition,
	};
}

/**
 * debounce handler для onScroll
 */
export function createScrollSaveHandler(
	getContentEl: () => HTMLDivElement | undefined,
	getChapterId: () => string,
	getBookPath: () => string,
	getMode: () => ReaderMode,
	debouncedSavePosition: (options: {
		contentEl: HTMLDivElement;
		chapterId: string;
		bookPath: string;
		mode: ReaderMode;
	}) => void,
): () => void {
	return () => {
		const contentEl = getContentEl();
		const chapterId = getChapterId();
		const bookPath = getBookPath();

		if (!contentEl || !chapterId || !bookPath) return;

		debouncedSavePosition({
			contentEl,
			chapterId,
			bookPath,
			mode: getMode(),
		});
	};
}
