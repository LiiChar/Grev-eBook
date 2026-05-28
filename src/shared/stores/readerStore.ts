import { createStore } from "solid-js/store";
import { Book, Chapter } from "../types/book";
import { getBooks, getBooksVersion } from "../api/book";
import { listen } from '@tauri-apps/api/event';

export const defaultReader = {
	bookId: '',
	chapters: [] as Chapter[],
	books: [] as Book[],
	currentIndex: 0,
	autoscroll: false,
	autoplay: false,
  booksLoaded: false,
  booksLoading: false,
  booksVersion: 0,
};

export const [reader, setReader] = createStore(defaultReader);

let booksRequest: Promise<Book[]> | null = null;

export async function ensureBooksLoaded(force = false) {
  // Check backend version to avoid reloading when nothing changed
  try {
    const version = await getBooksVersion();
    if (!force && reader.booksLoaded && reader.booksVersion === version) {
      console.log('books loaded (cached)');
      return reader.books;
    }
  } catch (e) {
    // if version check fails, fall back to existing behavior
    console.warn('Failed to get books version:', e);
  }

  if (!force && booksRequest) {
    return booksRequest;
  }

  setReader("booksLoading", true);

  booksRequest = getBooks()
    .then((books) => {
      const nextBooks = books ?? [];
      // Clear loading flag immediately so UI can react fast,
      // but set the potentially large `books` array in the next frame
      // to avoid blocking navigation/render.
      setReader('booksLoading', false);
      const apply = () => {
        setReader({ books: nextBooks, booksLoaded: true });
        // update version from backend (best-effort)
        getBooksVersion()
          .then(v => setReader('booksVersion', v))
          .catch(() => {});
      };
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        window.requestAnimationFrame(() => {
          apply();
        });
      } else {
        // Fallback
        setTimeout(() => apply(), 0);
      }
      return nextBooks;
    })
    .catch((error) => {
      setReader("booksLoading", false);
      throw error;
    })
    .finally(() => {
      booksRequest = null;
      setReader('currentIndex', 0);
    });

  return booksRequest;
}

// Merge two book lists by `id`. For existing books, update `meta.path` and
// replace chapters if incoming has them. New books are appended.
export function mergeBooksById(existing: Book[], incoming: Book[]): Book[] {
  const map = new Map<string, Book>();
  // Start with existing
  for (const b of existing) {
    map.set(b.id, { ...b });
  }
  // Merge/insert incoming
  for (const nb of incoming) {
    const eb = map.get(nb.id);
    if (eb) {
      // update path and chapters if provided
      eb.meta = { ...eb.meta, path: nb.meta.path };
      if (nb.chapters && nb.chapters.length > 0) eb.chapters = nb.chapters;
      map.set(nb.id, eb);
    } else {
      map.set(nb.id, { ...nb });
    }
  }

  return Array.from(map.values());
}

export const getBook = (path: string) => {
  return reader.books.find((b) => b.meta.path === path);
};

export const getChapter = (bookPath: string, chapterId: string) => {
  const book = getBook(bookPath);
  if (!book) return null;
  return book.chapters?.find((c) => c.id === chapterId);
};

export const resetDefaultReader = () => {
  setReader(defaultReader);
}

export const updateBook = (book: Book) => {
  const index = reader.books.findIndex(b => b.id === book.id);
  if (index >= 0) {
    setReader('books', reader.books.map((b, i) => i === index ? book : b));
  }
}

// Listen for backend store changes and refresh books when signaled
if (typeof window !== 'undefined') {
  try {
    listen('books:changed', (event) => {
      const payload = event.payload as any;
      const ver = typeof payload === 'number' ? payload : Number(payload || 0);
      if (ver && reader.booksVersion !== ver) {
        setReader('booksVersion', ver);
        // reload books (best-effort; ensureBooksLoaded will short-circuit if up-to-date)
        ensureBooksLoaded(true).catch(() => {});
      }
    });
  } catch (e) {
    // ignore in non-tauri env or if event subsystem unavailable
  }
}