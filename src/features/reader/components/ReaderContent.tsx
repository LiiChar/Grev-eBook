import { For, Show, createMemo } from 'solid-js';
import type { Book } from '../../../shared/types/book';
import { settings } from '@/shared/stores/settingsStore';
import { createVirtualizer } from '@tanstack/solid-virtual';

export interface ReaderContentProps {
  book: Book;
  currentIndex: () => number;
  contentRef: (el: HTMLDivElement | undefined) => void;
  onScroll: () => void;
  settings: {
    columnWidth: number;
    fontSize: number;
    lineHeight: number;
  };
}

export function ReaderContent(props: ReaderContentProps) {  let parentRef!: HTMLDivElement;

	const sortedChapters = createMemo(() => {
		return props.book.chapters?.toSorted((a, b) => a.order - b.order) ?? [];
	});

const rowVirtualizer = createVirtualizer({
	count: sortedChapters().length,
	getScrollElement: () => parentRef,

	// Более щедрая начальная оценка — уменьшает перекрытия
	estimateSize: index => {
		const chapter = sortedChapters()[index];

		return Math.max(300, Math.min(chapter.html.length * 0.5, 5000));
	},

	measureElement(element, entry, instance) {
		if (entry) {
			let target = entry.target;
			if (target) {
				let hight = target.getBoundingClientRect().height;
				if (hight > 0) {
					return hight;
				}
			}
		}

		if (!element) {
			return 0;
		}

		let hight = element.getBoundingClientRect().height;
		console.log(hight);
		if (hight > 0) {
			return hight;
		}

		return 0;
	},

	overscan: 5,
});

  const currentChapter = createMemo(
    () => sortedChapters()[props.currentIndex()],
  );

  const hasMultipleChapters = createMemo(() => sortedChapters().length > 1);

  return (
			<div
				ref={el => {
					parentRef = el;
					props.contentRef(el);
				}}
				class='flex-1 overflow-y-auto reader-wrapper scroll-smooth pt-11'
				onScroll={props.onScroll}
			>
				<article
					class='reader mx-auto px-6 py-8 overflow-x-hidden'
					style={{
						'max-width': `${props.settings.columnWidth}px`,
						'font-size': `${props.settings.fontSize}px`,
						'line-height': props.settings.lineHeight,
					}}
				>
					{/* Continuous scroll mode */}
					{/* <Show when={settings.reader.mode === 'scroll'}>
						<div
							style={{
								height: `${rowVirtualizer.getTotalSize()}px`,
								position: 'relative',
								width: '100%',
							}}
						>	
							<For each={rowVirtualizer.getVirtualItems()}>
								{(virtualRow) => {
									const chapter = sortedChapters()[virtualRow.index];
									return (
										<div
											onLoad={() => rowVirtualizer.measure()}
											data-index={virtualRow.index}
											ref={rowVirtualizer.measureElement}
											style={{
												position: 'absolute',
												top: 0,
												left: 0,
												width: '100%',
												transform: `translateY(${virtualRow.start}px)`,
											}}
										>
											<div class='chapter' innerHTML={chapter.html} />
										</div>
									);
								}}
							</For>
						</div>
					</Show> */}

					<Show when={settings.reader.mode === 'scroll'}> 
						<For each={sortedChapters()}> 
							{(chapter, index) => ( 
								<div id={`chapter-${index()}`} class='mb-12'> 
									<div class='chapter' data-chapter-id={chapter.id} innerHTML={chapter.html} /> 
								</div> 
							)} 
						</For> 
					</Show>

					{/* Chapter mode */}
					<Show when={settings.reader.mode === 'chapters' && currentChapter()}>
						<Show when={currentChapter()?.title}>
							<h1 class='text-xl font-semibold mb-6 text-center'>
								{currentChapter()!.title}
							</h1>
						</Show>
						<div
							class='chapter animate-fade-in mb-3'
							data-chapter-id={currentChapter()!.id}
							innerHTML={currentChapter()!.html}
						/>
					</Show>
				</article>
			</div>
		);
}
