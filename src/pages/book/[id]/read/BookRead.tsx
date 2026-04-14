/**
 * ReaderPage — оркестратор страницы читалки.
 * Тонкий компонент: собирает хуки и компоненты, управляет общей логикой.
 * ~180 строк вместо 1412.
 */

import {
  createSignal,
  createMemo,
  createEffect,
  onMount,
  Show,
} from 'solid-js';
import { useParams, useNavigate, useSearchParams } from '@solidjs/router';
import { reader } from '../../../../shared/stores/readerStore';
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
import { useKeyboardShortcuts } from '@/features/reader/hooks/useKeyboardShortcuts';
import { useFullscreen } from '@/features/reader/hooks/useFullscreen';
import { ReaderContent } from '@/features/reader/components/ReaderContent';
import { ReaderToolbar } from '@/features/reader/components/ReaderToolbar';
import { ReaderFooter } from '@/features/reader/components/ReaderFooter';
import { ReaderNotePopup } from '@/features/reader/components/ReaderNotePopup';
import type { ReaderMode } from '@/shared/api/reader';
import { useSelection } from '@/shared/hooks/useSelection';
import { GlassButton } from '@/shared/ui/GlassButton';
import { Icon } from '@/shared/ui/Icon';

type ViewMode = 'chapters' | 'scroll';

export function ReaderPage() {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();




  const { book, isLoading, notes, loadBook, position } = useBookLoader();

  const { savePosition } = useReadingPosition();

  const {
    nodeEditing,
    setNodeEditing,
    handleAddNote,
    createNote,
    closeNoteEditor,
    updateNotes,
  } = useNotesManager();

  const { handleAddBookmark, scrollToBookmark } = useBookmarksManager();

  const { showControls, setupAutoHide } = useAutoHideControls();

  const { isFullscreen, toggleFullscreen } = useFullscreen();


  const { setup: setupShortcuts } = useKeyboardShortcuts({
		isChaptersMode: () => settings.reader.mode === 'chapters',
		isTocOpen: () => showToc(),
		isSettingsOpen: () => showSettings(),
		isFullscreen: () => isFullscreen(),
		onToggleToc: () => setShowToc(!showToc()),
		onToggleSettings: () => setShowSettings(!showSettings()),
		onToggleFullscreen: toggleFullscreen,
		onAddNote: () =>
			handleAddNote({
				contentEl: contentRef!,
				chapterId: currentChapter()?.id ?? '',
			}),
		onNavigateBack: () => navigate(`/book/${params.id}`),
		onNextChapter: goToNextChapter,
		onPrevChapter: goToPrevChapter,
	});

  const [showToc, setShowToc] = createSignal(false);
  const [showSettings, setShowSettings] = createSignal(false);
  const [toolPosition, setToolPosition] = createSignal<{x: number, y: number} | null>(null);

  let contentRef: HTMLDivElement | undefined;
  let textRef: HTMLTextAreaElement | undefined;

  useSelection('.reader', {
    onSelect: (range, selection) => {
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

  const sortedChapters = createMemo(() =>
    [...(book()?.chapters ?? [])].sort((a, b) => a.order - b.order),
  );

  const currentChapter = createMemo(
    () => sortedChapters()[reader.currentIndex],
  );

  const hasMultipleChapters = createMemo(() => sortedChapters().length > 1);

  const progress = createMemo(() => {
    const total = sortedChapters().length;
    if (total === 0) return 0;
    return Math.round(((reader.currentIndex + 1) / total) * 100);
  });

  const currentBookPath = createMemo(() => book()?.meta.path ?? '');

  const scrollSaveHandler = createScrollSaveHandler(
    () => contentRef,
    () => currentChapter()?.id ?? '',
    currentBookPath,
    () => settings.reader.mode,
  );



  onMount(async () => {
    await loadBook({
      bookId: params.id,
      chapterId: searchParams.chapter as string | undefined,
      bookmarkId: searchParams.bookmark as string | undefined,
      contentEl: contentRef!,
      navigate,
    });

    setupShortcuts();
    setupAutoHide({ showToc, showSettings });

    const bookmarkId = searchParams.bookmark;
    setTimeout(() => {
      if (bookmarkId && !Array.isArray(bookmarkId) && contentRef) {
        scrollToBookmark({ bookmarkId, contentEl: contentRef! });
        return;
      }
      const currentNotes = notes();
			const currentBook = book();
			const el = contentRef;

			if (!currentBook || !el) return;

			updateNotes(currentNotes, el);

			if (!position()) return;

			scrollToAnchor(el, position()!);
    }, 300);

        

    queueMicrotask(() => {
      textRef?.focus();
    });
  });

  function goToNextChapter() {
    scrollToTop(contentRef!);
    savePosition({
      contentEl: contentRef!,
      chapterId: currentChapter()?.id ?? '',
      bookPath: currentBookPath(),
      mode: settings.reader.mode,
    });
  }

  function goToPrevChapter() {
    scrollToTop(contentRef!);
    savePosition({
      contentEl: contentRef!,
      chapterId: currentChapter()?.id ?? '',
      bookPath: currentBookPath(),
      mode: settings.reader.mode,
    });
  }

  function goToChapter(index: number) {
    if (settings.reader.mode === 'chapters') {
			scrollToTop(contentRef!);
		} else {
			const chapterEl = document.getElementById(`chapter-${index}`);
			if (chapterEl) {
				chapterEl.scrollIntoView({ behavior: 'smooth' });
			}
		}
    setShowToc(false);
    savePosition({
      contentEl: contentRef!,
      chapterId: currentChapter()?.id ?? '',
      bookPath: currentBookPath(),
      mode: settings.reader.mode,
    });
  }

  return (
		<div class='h-full w-full flex flex-col bg-(--background) overflow-hidden'>
			<Show when={toolPosition()}>
				<div
					class='absolute flex gap-1 top-0 left-0 bg-(--background)/50 backdrop-blur-sm z-20 rounded-lg p-1 -translate-x-full'
					style={{
						transform: `translate(${toolPosition()?.x ?? 0}px, ${toolPosition()?.y ?? 0}px)`,
					}}
          onClick={(e) => {
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
                })
                setToolPosition(null);
              }
						}
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
                })
                setToolPosition(null);
              }
						}
						title='Заметки (N)'
					>
						<Icon name='note' size={18} />
					</GlassButton>
				</div>
			</Show>
			{/* Note editor popup */}
			<Show when={nodeEditing().visible}>
				<ReaderNotePopup
					nodeEditing={nodeEditing()}
					textareaRef={(el: HTMLTextAreaElement | undefined) => {
						textRef = el;
					}}
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
								elh.style.boxShadow = `0 0 0 3px ${color}`;
								elh.style.color = isHexLight(color) ? '#000' : '#fff';
							});
					}}
				/>
			</Show>

			<BookLoader loading={isLoading} />

			<Show when={!isLoading() && book()}>
				<ReaderToolbar
					bookTitle={book()!.meta.title}
					hasMultipleChapters={hasMultipleChapters()}
					showControls={showControls()}
					isFullscreen={isFullscreen()}
					onNavigateBack={() => navigate(`/book/${params.id}`)}
					onToggleToc={() => setShowToc(!showToc())}
					onToggleSettings={() => setShowSettings(!showSettings())}
					onToggleFullscreen={toggleFullscreen}
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
						currentIndex={() => reader.currentIndex}
						contentRef={(el: HTMLDivElement | undefined) => {
							contentRef = el;
						}}
						onScroll={scrollSaveHandler}
						settings={{
							columnWidth: settings.reader.column_width,
							fontSize: settings.reader.font_size,
							lineHeight: settings.reader.line_height,
						}}
					/>
				</div>

				<Show when={settings.reader.mode === 'chapters'}>
					<ReaderFooter
						currentIndex={reader.currentIndex}
						totalChapters={sortedChapters().length}
						progress={progress()}
						showControls={showControls()}
						onPrevChapter={goToPrevChapter}
						onNextChapter={goToNextChapter}
						disabledPrev={reader.currentIndex === 0}
						disabledNext={reader.currentIndex >= sortedChapters().length - 1}
					/>
				</Show>
			</Show>
		</div>
	);
}
