import { createStore } from "solid-js/store";
import { Book, Chapter } from "../types/book";
import { getBooks } from "../api/book";

export const [reader, setReader] = createStore({
  bookId: "",
  chapters: [] as Chapter[],
  books: [] as Book[],
  currentIndex: 0,
  autoscroll: false,
  autoplay: false,
  booksLoaded: false,
  booksLoading: false,
});

let booksRequest: Promise<Book[]> | null = null;

export async function ensureBooksLoaded(force = false) {
  if (!force && reader.booksLoaded) {
    console.log('books loaded');
    return reader.books;
  }

  if (!force && booksRequest) {
    return booksRequest;
  }

  setReader("booksLoading", true);

  booksRequest = getBooks()
    .then((books) => {
      const nextBooks = books ?? [];
      setReader({
        books: nextBooks,
        booksLoaded: true,
        booksLoading: false,
      });
      return nextBooks;
    })
    .catch((error) => {
      setReader("booksLoading", false);
      throw error;
    })
    .finally(() => {
      booksRequest = null;
      setReader('currentIndex', 0)
    });

  return booksRequest;
}

export const getBook = (path: string) => {
  return reader.books.find((b) => b.meta.path === path);
};

export const getChapter = (bookPath: string, chapterId: string) => {
  const book = getBook(bookPath);
  if (!book) return null;
  return book.chapters?.find((c) => c.id === chapterId);
};
