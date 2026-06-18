import { invoke } from "@tauri-apps/api/core";
import { Book } from "../types/book";

export const getBook = async (path: string) => {
  const book = await invoke<Book>("get_book", { path });
  return book;
};
export const getBooks = async () => {
  const books = await invoke<Book[]>("get_books");
  return books;
};

export const getBooksVersion = async (): Promise<number> => {
  const v = await invoke<number>("get_books_version");
  return v ?? 0;
};

export const addBooks = async (path: string) => {
  const books = await invoke<Book[]>('add_books', { path });
  return books;
};

export const addBook = async (path: string): Promise<Book> => {
  const res = await invoke<Book>("add_book", { path });
  return res;
};

export const openBook = async (path: string) => {
  console.time("openBook");
  const book = await invoke<Book>("open_book", { path });
  console.timeEnd('openBook');
  return book;
};

export const clearStore = async () => {
  await invoke("clear_store");
};
