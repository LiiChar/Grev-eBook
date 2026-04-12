/**
 * Компонент рендеринга содержимого читалки (главы).
 * Поддерживает два режима: scroll (все главы) и chapters (одна глава).
 */

import { For, Show, createMemo } from 'solid-js';
import type { Book } from '../../../shared/types/book';
import { settings } from '@/shared/stores/settingsStore';

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

export function ReaderContent(props: ReaderContentProps) {
  const sortedChapters = createMemo(() =>
    [...(props.book.chapters ?? [])].sort((a, b) => a.order - b.order),
  );

  const currentChapter = createMemo(
    () => sortedChapters()[props.currentIndex()],
  );

  const hasMultipleChapters = createMemo(() => sortedChapters().length > 1);

  return (
		<div
			ref={props.contentRef}
			class='flex-1 overflow-y-auto reader-wrapper'
			onScroll={props.onScroll}
		>
			<article
				class='reader mx-auto px-6 py-8'
				style={{
					'max-width': `${props.settings.columnWidth}px`,
					'font-size': `${props.settings.fontSize}px`,
					'line-height': props.settings.lineHeight,
				}}
			>
				{/* Continuous scroll mode */}
				<Show when={settings.reader.mode === 'scroll'}>
					<For each={sortedChapters()}>
						{(chapter, index) => (
							<div id={`chapter-${index()}`} class='mb-12'>
								<Show when={chapter.title && hasMultipleChapters()}>
									<h2 class='text-xl font-semibold mb-6 pb-3 border-b border-[var(--border)]'>
										{chapter.title}
									</h2>
								</Show>
								<div
									class='chapter'
									data-chapter-id={chapter.id}
									innerHTML={chapter.html}
								/>
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
						class='chapter animate-fade-in'
						data-chapter-id={currentChapter()!.id}
						innerHTML={currentChapter()!.html}
					/>
				</Show>
			</article>
		</div>
	);
}
