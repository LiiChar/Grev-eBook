import { createStore } from "solid-js/store";
import { Book, Chapter } from "../types/book";
import { getBooks } from "../api/book";

export const [reader, setReader] = createStore({
  bookId: "",
  chapters: [] as Chapter[],
  books: await getBooks() ?? [] as Book[],
  currentIndex: 0,
});

export const getBook = (path: string) => {
  return reader.books.find((b) => b.meta.path === path);
};

export const getChapter = (bookPath: string, chapterId: string) => {
  const book = getBook(bookPath);
  if (!book) return null;
  return book.chapters?.find((c) => c.id === chapterId);
};