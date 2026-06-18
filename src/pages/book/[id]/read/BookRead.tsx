import {
  createSignal,
  createMemo,
  onMount,
  Show,
	onCleanup,
} from 'solid-js';
import { useParams, useSearchParams } from '@solidjs/router';
import { reader, setReader } from '../../../../shared/stores/readerStore';
import { settings } from '../../../../shared/stores/settingsStore';
import { scrollToTop } from '../../../../shared/utils/scroll';
import { scrollToAnchor } from '../../../../shared/utils/anchor';
import { isHexLight } from '../../../../shared/utils/color';
import { BookLoader } from '../../../../shared/ui/Loader';
import { SettingSidebar } from '../../../../components/reader/SettingSidebar';
import { TOCSidebar } from '../../../../components/reader/TOCSidebar';

import { useBookLoader } from '@/features/reader/hooks/useBookLoader';
import { useReadingPosition, createScrollSaveHandler } from '@/features/reader/hooks/useReadingPosition';
import { useNotesManager } from '@/features/reader/hooks/useNotesManager';
import { useBookmarksManager } from '@/features/reader/hooks/useBookmarksManager';
import { useAutoHideControls } from '@/features/reader/hooks/useAutoHideControls';
import { ReaderContent } from '@/features/reader/components/ReaderContent';
import { ReaderToolbar } from '@/features/reader/components/ReaderToolbar';
import { ReaderFooter } from '@/features/reader/components/ReaderFooter';
import { ReaderNotePopup } from '@/features/reader/components/ReaderNotePopup';
import { useSelection } from '@/shared/hooks/useSelection';
import { GlassButton } from '@/shared/ui/GlassButton';
import { Icon } from '@/shared/ui/Icon';
import { ReaderIframe } from '@/features/reader/components/ReaderIframe';

export function ReaderPage() {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const { book, isLoading, notes, loadBook, position, bookmarks } = useBookLoader();
  const { debouncedSavePosition } = useReadingPosition();
  const {
    nodeEditing,
    setNodeEditing,
    handleAddNote,
    createNote,
    closeNoteEditor,
    updateNotes,
  } = useNotesManager();
  const { handleAddBookmark,updateBookmarks, scrollToBookmark } = useBookmarksManager();
  const { showControls, setupAutoHide } = useAutoHideControls();

  const [showToc, setShowToc] = createSignal(false);
  const [showSettings, setShowSettings] = createSignal(false);
  const [toolPosition, setToolPosition] = createSignal<{x: number, y: number} | null>(null);
	
  useSelection('.reader', {
		onSelect: (range, _) => {
			if (!range) {
				setToolPosition(null);
        return;
      };
      const position = range.getBoundingClientRect();
      setToolPosition({
				x: position.x + position.width,
				y: position.y + position.height + 8,
			});
    },
  });

	let contentRef: HTMLDivElement | undefined;

  const sortedChapters = createMemo(() =>
    [...(book()?.chapters ?? [])].sort((a, b) => a.order - b.order),
  );

  const currentChapter = createMemo(
    () => sortedChapters()[reader.currentIndex],
  );

  const hasMultipleChapters = createMemo(() => sortedChapters().length > 1);

  const currentBookPath = createMemo(() => book()?.meta.path ?? '');

  const scrollSaveHandler = createScrollSaveHandler(
		() => contentRef,
		() => currentChapter()?.id ?? '',
		currentBookPath,
		() => settings.reader.mode,
		debouncedSavePosition,
	);

  onMount(async () => {
    await loadBook({
      bookId: params.id,
      chapterId: searchParams.chapter as string | undefined,
      bookmarkId: searchParams.bookmark as string | undefined,
      contentEl: contentRef!,
    });

    setupAutoHide({ showToc, showSettings });

    const bookmarkId = searchParams.bookmark;
    const chapterId = searchParams.chapter;
    setTimeout(() => {
      const currentNotes = notes();
      const currentBookmarks = bookmarks();
			const currentBook = book();
			const el = contentRef;

			if (currentBook && el) {
				updateNotes(currentNotes, el);
				updateBookmarks(currentBookmarks, el);

				if (bookmarkId && !Array.isArray(bookmarkId) && contentRef) {
					scrollToBookmark({ bookmarkId, contentEl: contentRef! });
				}

				if (chapterId && !Array.isArray(chapterId) && contentRef) {
					let index = book()!.chapters.findIndex(c => c.id === chapterId);
					if (index === -1) return;
					goToChapter(index);
				}

				if (bookmarkId && chapterId) {
					if (position()) {
						scrollToAnchor(el, position()!);
					}
				}
			}
    }, 300);
  });

	function goToChapter(index: number) {
		if (contentRef) {
			debouncedSavePosition({
				contentEl: contentRef,
				chapterId: currentChapter()?.id ?? '',
				bookPath: currentBookPath(),
				mode: settings.reader.mode,
			});
		}

		if (settings.reader.mode === 'chapters') {
			scrollToTop(contentRef!);
		} 

		setShowToc(false);
		setReader('currentIndex', index);
	}

  return (
			<div class='h-full w-full flex flex-col bg-background overflow-hidden'>
				<ReaderIframe contentRef={contentRef} />
				<Show when={toolPosition()}>
					<div
						class='absolute flex top-0 left-0 bg-background/50 backdrop-blur-sm z-20 rounded-full overflow-hidden -translate-x-full'
						style={{
							transform: `translate(${toolPosition()?.x ?? 0}px, ${toolPosition()?.y ?? 0}px)`,
						}}
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
						}}
					>
						<GlassButton
							size='icon'
							variant='ghost'
							class='rounded-lg'
							onClick={() => {
								handleAddBookmark({
									contentEl: contentRef!,
									chapterId: currentChapter()?.id ?? '',
									bookPath: currentBookPath(),
								});
								setToolPosition(null);
							}}
							title='Закладка (B)'
						>
							<Icon name='bookmark' size={18} />
						</GlassButton>
						<GlassButton
							size='icon'
							class='rounded-lg'
							variant='ghost'
							onClick={() => {
								handleAddNote({
									contentEl: contentRef!,
									chapterId: currentChapter()?.id ?? '',
									position: toolPosition() ?? undefined,
								});
								setToolPosition(null);
							}}
							title='Заметки (N)'
						>
							<Icon name='note' size={18} />
						</GlassButton>
					</div>
				</Show>

				<Show when={nodeEditing().visible}>
					<ReaderNotePopup
						nodeEditing={nodeEditing()}
						onColorChange={(color: string) =>
							setNodeEditing({ ...nodeEditing(), color })
						}
						onTextChange={(text: string) =>
							setNodeEditing({ ...nodeEditing(), text })
						}
						onCancel={() => closeNoteEditor('cancel')}
						onSave={() => createNote({ bookPath: currentBookPath() })}
						onUpdateMarks={(noteId: string, color: string) => {
							document
								.querySelectorAll(`mark[data-note="${noteId}"]`)
								.forEach((el: Element) => {
									const elh = el as HTMLElement;
									elh.style.backgroundColor = color;
									elh.style.color = isHexLight(color) ? '#000' : '#fff';
								});
						}}
					/>
				</Show>

				<BookLoader loading={isLoading} />

				<Show when={!isLoading() && book()}>
					<ReaderToolbar
						book={book()!}
						hasMultipleChapters={hasMultipleChapters()}
						showControls={showControls()}
						onToggleToc={() => setShowToc(!showToc())}
						onToggleSettings={() => setShowSettings(!showSettings())}
					/>

					<div class='flex-1 flex overflow-hidden relative'>
						<TOCSidebar
							show={showToc}
							setShow={setShowToc}
							chapters={sortedChapters}
							toChapter={goToChapter}
						/>

						<SettingSidebar show={showSettings} setShow={setShowSettings} />

						<ReaderContent
							book={book()!}
							contentRef={(el: HTMLDivElement | undefined) => {
								contentRef = el;
							}}
							onScroll={scrollSaveHandler}
						/>
					</div>

					<Show when={showControls()}>
						<ReaderFooter
							currentIndex={reader.currentIndex}
							totalChapters={sortedChapters().length}
							onSelect={goToChapter}
						/>
					</Show>
				</Show>
			</div>
		);
}
