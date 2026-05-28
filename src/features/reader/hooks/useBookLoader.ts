import { createSignal } from 'solid-js';
import { getBook, openBook } from '../../../shared/api/book';
import { getBookmarks } from '../../../shared/api/bookmarks';
import { getNotes } from '../../../shared/api/notes';
import {
	getReadingPosition,
	ReadingPosition,
	setCurrentBook,
} from '../../../shared/api/reader';
import { toast } from "solid-sonner"
import {
	ensureBooksLoaded,
	reader,
	setReader,
} from '../../../shared/stores/readerStore';
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

		// UI сразу может показывать skeleton reader
		setIsLoading(true);

		// библиотеку грузим в фоне, не ждём
		void ensureBooksLoaded();

		try {
			if (!bookId) throw new Error('Book ID is missing');

			let libraryBook = reader.books.find((b: Book) => b.id === bookId) ?? null;

			// если книги нет в store — грузим напрямую
			if (!libraryBook) {
				libraryBook = await getBook(bookId);
			}

			if (!libraryBook?.meta?.path) {
				throw new Error('Book path is missing');
			}

			let data = { ...libraryBook };

			// позицию вытаскиваем как можно раньше
			const positionPromise = data.position
				? Promise.resolve(data.position)
				: getReadingPosition(data.meta.path);

			// главы грузим отдельно
			if (!data.chapters?.length) {
				const openedBook = await openBook(data.meta.path);
				data = { ...data, ...openedBook };
			}

			if (!data.chapters?.length) {
				throw new Error('No chapters found');
			}

			// книга готова → можно рендерить
			setBook(data);

			setReader({
				chapters: data.chapters,
				bookId: data.id,
			});

			await setCurrentBook(data.meta.path);

			// позиция — применяем сразу после рендера
			positionPromise
				.then(saved => {
					if (saved) {
						setPosition(saved);
					}
				})
				.catch(console.error);

			// заметки в фоне
			void getNotes(data.meta.path)
				.then(nts => {
					setNotes(nts || []);
				})
				.catch(console.error);

			// закладки в фоне
			void getBookmarks(data.meta.path)
				.then(bms => {
					setBookmarks(bms || []);
				})
				.catch(console.error);
		} catch (err) {
			console.error('Failed to load book:', err);
			toast.error('Не удалось загрузить книгу');
			navigate('/');
		} finally {
			// выключаем loader максимально рано
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
