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

type ViewMode = 'chapters' | 'scroll';

export function ReaderPage() {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();


  const { book, isLoading, notes, loadBook } = useBookLoader();

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
    isChaptersMode: () => viewMode() === 'chapters',
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

  const [viewMode, setViewMode] = createSignal<ViewMode>('scroll');
  const [showToc, setShowToc] = createSignal(false);
  const [showSettings, setShowSettings] = createSignal(false);
  let contentRef: HTMLDivElement | undefined;
  let textRef: HTMLTextAreaElement | undefined;

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

  const readerMode = createMemo(
    (): ReaderMode => (viewMode() === 'chapters' ? 'page' : 'scroll'),
  );

  const scrollSaveHandler = createScrollSaveHandler(
    () => contentRef,
    () => currentChapter()?.id ?? '',
    currentBookPath,
    readerMode,
  );

  createEffect(() => {
    const currentNotes = notes();
    if (!currentNotes.length || !contentRef) return;
    updateNotes(currentNotes, contentRef);
  });

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
    if (bookmarkId && !Array.isArray(bookmarkId) && contentRef) {
      setTimeout(() => {
        scrollToBookmark({ bookmarkId, contentEl: contentRef! });
      }, 300);
    }

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
      mode: readerMode(),
    });
  }

  function goToPrevChapter() {
    scrollToTop(contentRef!);
    savePosition({
      contentEl: contentRef!,
      chapterId: currentChapter()?.id ?? '',
      bookPath: currentBookPath(),
      mode: readerMode(),
    });
  }

  function goToChapter(index: number) {
    if (viewMode() === 'chapters') {
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
      mode: readerMode(),
    });
  }

  return (
    <div class='h-full w-full flex flex-col bg-[var(--background)] overflow-hidden'>
      {/* Note editor popup */}
      <Show when={nodeEditing().visible}>
        <ReaderNotePopup
          nodeEditing={nodeEditing()}
          textareaRef={(el: HTMLTextAreaElement | undefined) => { textRef = el; }}
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
          onAddBookmark={() =>
            handleAddBookmark({
              contentEl: contentRef!,
              chapterId: currentChapter()?.id ?? '',
              bookPath: currentBookPath(),
            })
          }
          onAddNote={() =>
            handleAddNote({
              contentEl: contentRef!,
              chapterId: currentChapter()?.id ?? '',
            })
          }
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
            contentRef={(el: HTMLDivElement | undefined) => { contentRef = el; }}
            onScroll={scrollSaveHandler}
            settings={{
              columnWidth: settings.reader.column_width,
              fontSize: settings.reader.font_size,
              lineHeight: settings.reader.line_height,
            }}
          />
        </div>

        <Show when={viewMode() === 'chapters' && hasMultipleChapters()}>
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
