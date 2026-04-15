/**
 * Хук для загрузки книги и инициализации данных.
 * Вынесен из BookRead.tsx — отвечает за загрузку книги, глав, закладок, заметок
 * и восстановление позиции чтения.
 */

import { createSignal } from 'solid-js';
import { openBook } from '../../../shared/api/book';
import { getBookmarks } from '../../../shared/api/bookmarks';
import { getNotes } from '../../../shared/api/notes';
import { getReadingPosition, ReadingPosition, setCurrentBook } from '../../../shared/api/reader';
import { toast } from '../../../shared/stores/toastStore';
import { ensureBooksLoaded, reader, setReader } from '../../../shared/stores/readerStore';
import type { Book } from '../../../shared/types/book';
import type { Bookmark } from '../../../shared/api/bookmarks';
import type { Note } from '../../../shared/types/note';

export interface UseBookLoaderReturn {
  book: () => Book | null;
  isLoading: () => boolean;
  bookmarks: () => Bookmark[];
  notes: () => Note[];
  contentRef: () => HTMLDivElement | undefined;
  loadBook: (params: {
    bookId: string;
    chapterId?: string;
    bookmarkId?: string;
    contentEl: HTMLDivElement;
    navigate: (path: string) => void;
  }) => Promise<void>;
  position: () => ReadingPosition | null;
}

export function useBookLoader(): UseBookLoaderReturn {
  const [book, setBook] = createSignal<Book | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [bookmarks, setBookmarks] = createSignal<Bookmark[]>([]);
  const [notes, setNotes] = createSignal<Note[]>([]);
  const [position, setPosition] = createSignal<ReadingPosition | null>(null);
  let contentRef: HTMLDivElement | undefined;

  async function loadBook(options: {
    bookId: string;
    chapterId?: string;
    bookmarkId?: string;
    contentEl: HTMLDivElement;
    navigate: (path: string) => void;
  }): Promise<void> {
    const { bookId, contentEl, navigate } = options;
    contentRef = contentEl;
    setIsLoading(true);

    try {
      await ensureBooksLoaded();

      if (!bookId) throw new Error('Book ID is missing');

      const libraryBook =
        reader.books.find((b: Book) => b.id === bookId) ??
        reader.books.find((b: Book) => b.id === reader.bookId);

      if (!libraryBook) throw new Error('Book not found in library');
      if (!libraryBook.meta?.path) throw new Error('Book path is missing');

      let data = { ...libraryBook };

      // Если у книги нет глав, открываем её
      if (!data.chapters || data.chapters.length < 1) {
        const openedBook = await openBook(libraryBook.meta.path);
        data = { ...data, ...openedBook };
      }

      // Проверяем наличие глав после открытия
      if (!data.chapters || data.chapters.length === 0) {
        const bookChapters = reader.chapters;
        if (bookChapters && bookChapters.length > 0) {
          data.chapters = bookChapters;
        } else {
          throw new Error('No chapters found in the book');
        }
      }

      setBook(data);
      await setCurrentBook(data.meta.path);

      // Закладки
      const bms = await getBookmarks(data.meta.path);
      setBookmarks(bms || []);

      // Заметки
      const nts = await getNotes(data.meta.path);
      setNotes(nts || []);

      // Восстановить позицию — после того как заметки загружены
      const saved = await getReadingPosition(data.meta.path);
      
      // Возвращаем информацию о позиции чтобы применить её на уровне страницы
      // (после того как DOM будет готов и заметки применены)
      if (saved) {
        // Сохраняем позицию для последующего восстановления
        setPosition(saved);
      }
      setReader('chapters', data.chapters);
      setReader('bookId', data.id);
      // Перейти к закладке — обрабатывается на уровне страницы
    } catch (err) {
      console.error('Failed to load book:', err);
      toast.error('Не удалось загрузить книгу');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  }

  return {
		book,
		isLoading,
		bookmarks,
		notes,
		contentRef: () => contentRef,
		loadBook,
		position,
	};
}
