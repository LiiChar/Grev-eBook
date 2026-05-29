import {
	wrapRangeWithMarks,
	wrapOffsetsWithMarks,
} from '../utils/noteHighlight';
import { buildTextIndex, getTextOffsetsInRoot } from '../utils/textSelection';
import { createSignal } from 'solid-js';
import { addBookmark, getBookmark } from '../../../shared/api/bookmarks';
import { getReadingAnchor } from '../../../shared/utils/anchor';
import { scrollToAnchor } from '../../../shared/utils/anchor';
import { toast } from 'solid-sonner';
import { normalizeWhitespace } from '../utils/noteHighlight';
import { getRangeStartSnippet, findAllAndSelect } from '../utils/textSelection';
import type { Bookmark } from '../../../shared/api/bookmarks';

export interface UseBookmarksManagerReturn {
	bookmarks: () => Bookmark[];
	setBookmarks: (v: Bookmark[] | ((prev: Bookmark[]) => Bookmark[])) => void;
	handleAddBookmark: (options: {
		contentEl: HTMLDivElement;
		chapterId: string;
		bookPath: string;
	}) => Promise<void>;
	scrollToBookmark: (options: {
		bookmarkId: string;
		contentEl: HTMLDivElement;
	}) => Promise<void>;
	updateBookmarks: (bookmarks: Bookmark[], contentEl: HTMLDivElement) => void;
}

export function useBookmarksManager(): UseBookmarksManagerReturn {
	const [bookmarks, setBookmarks] = createSignal<Bookmark[]>([]);

	async function handleAddBookmark(options: {
		contentEl: HTMLDivElement;
		chapterId: string;
		bookPath: string;
	}): Promise<void> {
		const { contentEl, chapterId, bookPath } = options;

		const selection = window.getSelection();

		if (!selection) {
			toast.error('Вы ничего не выделили');
			return;
		}

		const selectedText = selection.toString();

		if (!selectedText) {
			toast.error('Вы ничего не выделили');
			return;
		}

		const range = selection.getRangeAt(0);

		const rawSnippet = getRangeStartSnippet(range, 120);
		const anchorSnippet = normalizeWhitespace(rawSnippet || selectedText).slice(
			0,
			120,
		);

		const preview = normalizeWhitespace(selectedText);

		const offsets = getTextOffsetsInRoot(contentEl, range);

		const startOffset = offsets?.startOffset ?? 0;
		const endOffset = offsets?.endOffset ?? startOffset + selectedText.length;

		const color = `hsl(${getComputedStyle(document.body).getPropertyValue(
			'--primary',
		)})`;

		const position = getReadingAnchor(
			contentEl,
			chapterId,
			anchorSnippet || preview,
		);

		if (!position) return;

		try {
			const bm = await addBookmark(bookPath, position[0], {
						start: {
							chapter_id: chapterId,
							offset: startOffset,
						},
						end: {
							chapter_id: chapterId,
							offset: endOffset,
						},
					}, preview, 'regular');

			wrapRangeWithMarks(range, bm.id, color);

			selection.removeAllRanges();

			setBookmarks(prev => [
				...prev,
				{
					...bm,
					range: {
						start: {
							chapter_id: chapterId,
							offset: startOffset,
						},
						end: {
							chapter_id: chapterId,
							offset: endOffset,
						},
					},
				},
			]);

			toast.success('Закладка добавлена');
		} catch (err) {
			console.error('Failed to add bookmark:', err);
			toast.error('Не удалось добавить закладку');
		}
	}

  function updateBookmarks(bookmarks: Bookmark[], contentEl: HTMLDivElement) {
			if (!contentEl) return;

			bookmarks.forEach(bookmark => {
				const existingMarks = contentEl.querySelectorAll(
					`mark[data-note="${bookmark.id}"]`,
				);

				if (existingMarks.length > 0) return;

				const startOffset = bookmark.range?.start?.offset ?? null;

				const endOffset = bookmark.range?.end?.offset ?? null;

				if (startOffset !== null && endOffset !== null && endOffset > startOffset) {
					const total = buildTextIndex(contentEl).total;

					const safeStart = Math.max(0, Math.floor(startOffset));

					const safeEnd = Math.min(total, Math.floor(endOffset));

					if (safeEnd > safeStart) {
						wrapOffsetsWithMarks(
							contentEl,
							safeStart,
							safeEnd,
							bookmark.id,
							`hsl(${getComputedStyle(document.body).getPropertyValue('--primary')})`,
						);

						return;
					}
				}

				const { text } = buildTextIndex(contentEl);

				if (!bookmark.preview) return;

				const idx = text.indexOf(bookmark.preview);

				if (idx !== -1) {
					wrapOffsetsWithMarks(
						contentEl,
						idx,
						idx + bookmark.preview.length,
						bookmark.id,
						`hsl(${getComputedStyle(document.body).getPropertyValue('--primary')})`,
					);
				}
			});
		}

	async function scrollToBookmark(options: {
		bookmarkId: string;
		contentEl: HTMLDivElement;
	}): Promise<void> {
		const { bookmarkId, contentEl } = options;
		const bookmark = await getBookmark(bookmarkId);
		if (!bookmark) return;

		scrollToAnchor(contentEl, bookmark.position);
		findAllAndSelect(contentEl, bookmark.preview);
	}

	return {
		bookmarks,
		setBookmarks,
		handleAddBookmark,
		scrollToBookmark,
    updateBookmarks,
	};
}
