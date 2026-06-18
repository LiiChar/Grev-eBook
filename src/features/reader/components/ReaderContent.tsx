import {
	For,
	Show,
	createMemo,
	createEffect,
	createSignal,
	onCleanup,
} from 'solid-js';

import type { Book, Chapter } from '../../../shared/types/book';
import { getFileExtension } from '@/shared/utils/file';
import { ReaderContentPDF } from './content/PDFContent';
import { settings } from '@/shared/stores/settingsStore';
import { reader, setReader } from '@/shared/stores/readerStore';

const ESTIMATED_HEIGHT = 2500;

export interface ReaderContentProps {
	book: Book;
	contentRef: (el: HTMLDivElement | undefined) => void;
	onScroll: () => void;
}

export function ReaderContent(props: ReaderContentProps) {
	if (props.book.meta.path.endsWith('.pdf')) {
		return <ReaderContentPDF {...props} />;
	}

	return <ReaderContentDefault {...props} />;
}

export function ReaderContentDefault(props: ReaderContentProps) {
	let parentRef!: HTMLDivElement;

	const sortedChapters = createMemo(() => {
		return props.book.chapters?.toSorted((a, b) => a.order - b.order) ?? [];
	});


	const [chapterHeights, setChapterHeights] = createSignal<
		Record<string, number>
	>({});

const chapterOffsets = createMemo(() => {
	const heights = chapterHeights();

	const result = [];

	let offset = 0;

	for (const chapter of sortedChapters()) {
		const start = offset;

		offset += heights[chapter.id] ?? ESTIMATED_HEIGHT;

		result.push({
			start,
			end: offset,
		});
	}

	return result;
});

	function findChapterIndex(scrollPosition: number) {
		const offsets = chapterOffsets();

		let left = 0;
		let right = offsets.length - 1;

		while (left <= right) {
			const mid = (left + right) >> 1;

			const item = offsets[mid];

			if (scrollPosition < item.start) {
				right = mid - 1;
			} else if (scrollPosition >= item.end) {
				left = mid + 1;
			} else {
				return mid;
			}
		}

		return Math.max(0, offsets.length - 1);
	}

	const WINDOW_SIZE = 9;
	const WINDOW_OFFSET = 4;



const visibleRange = createMemo(() => {
	const total = sortedChapters().length;

	let start = Math.max(0, reader.currentIndex - WINDOW_OFFSET);

	let end = start + WINDOW_SIZE;

	if (end > total) {
		end = total;
		start = Math.max(0, end - WINDOW_SIZE);
	}

	return [start, end] as const;
});


function setMeasuredHeight(id: string, newHeight: number) {
	const oldHeight = chapterHeights()[id] ?? ESTIMATED_HEIGHT;

	if (oldHeight === newHeight) {
		return;
	}

	const delta = newHeight - oldHeight;

	const chapterIndex = sortedChapters().findIndex(c => c.id === id);

	if (chapterIndex >= 0 && chapterIndex < visibleRange()[0]) {
		parentRef.scrollTop += delta;
	}

	setChapterHeights(prev => ({
		...prev,
		[id]: newHeight,
	}));
}

	const visibleChapters = createMemo(() => {
		const [start, end] = visibleRange();

		return sortedChapters().slice(start, end);
	});
	const currentChapter = createMemo(() => sortedChapters()[reader.currentIndex]);

	const chapterRefs = new Map<string, HTMLDivElement>();

	function updateChapterHeight(id: string, height: number) {
		setChapterHeights(prev => ({
			...prev,
			[id]: height,
		}));
	}

	const topSpacer = createMemo(() => {
		const [start] = visibleRange();

		let height = 0;

		for (let i = 0; i < start; i++) {
			const chapter = sortedChapters()[i];

			height += chapterHeights()[chapter.id] ?? ESTIMATED_HEIGHT;
		}

		return height;
	});

	const bottomSpacer = createMemo(() => {
		const [, end] = visibleRange();

		let height = 0;

		for (let i = end; i < sortedChapters().length; i++) {
			const chapter = sortedChapters()[i];

			height += chapterHeights()[chapter.id] ?? ESTIMATED_HEIGHT;
		}

		return height;
	});
function handleVirtualScroll() {
	const center = parentRef.scrollTop + parentRef.clientHeight / 2;

	const index = findChapterIndex(center);

	if (index !== reader.currentIndex) {
		setReader('currentIndex', index);
	}
}

createEffect(() => {
	if (reader.currentIndex >= 0) {
		parentRef && requestAnimationFrame(() => handleVirtualScroll());
	}
});

	return (
		<div
			ref={el => {
				parentRef = el;
				props.contentRef(el);
			}}
			class='flex-1 overflow-y-auto reader-wrapper scroll-smooth pt-11'
			onScroll={() => {
				props.onScroll();
				handleVirtualScroll();
			}}
		>
			<article
				data-type={getFileExtension(props.book.meta.path)}
				lang={props.book.meta.language}
				class='reader mx-auto px-6 py-8 overflow-x-hidden'
				style={{
					'max-width': `${settings.reader.column_width}px`,
					'font-size': `${settings.reader.font_size}px`,
					'line-height': settings.reader.line_height,
				}}
			>
				<Show when={settings.reader.mode === 'scroll'}>
					<div
						style={{
							height: `${topSpacer()}px`,
						}}
					/>

					<For each={visibleChapters()}>
						{chapter => (
							<div
								ref={el => {
									chapterRefs.set(chapter.id, el);

									requestAnimationFrame(() => {
										const height = el.offsetHeight;

										setMeasuredHeight(chapter.id, height);
											});
										}}
							>
								<ContentChapterDefault chapter={chapter} />
							</div>
						)}
					</For>

					<div
						style={{
							height: `${bottomSpacer()}px`,
						}}
					/>
				</Show>

				<Show when={settings.reader.mode === 'chapters' && currentChapter()}>
					<Show when={currentChapter()?.title}>
						<h1 class='text-xl font-semibold mb-6 text-center'>
							{currentChapter()!.title}
						</h1>
					</Show>

					<div class='animate-fade-in mb-3'>
						<ContentChapterDefault chapter={currentChapter()!} />
					</div>
				</Show>
			</article>
		</div>
	);
}

export type ContentChapterTypeProps = {
	chapter: Chapter;
};

export function ContentChapterDefault(props: ContentChapterTypeProps) {
	return (
		<div
			innerHTML={props.chapter.html}
			class='chapter animate-fade-in'
			data-chapter-id={props.chapter.id}
		/>
	);
}
