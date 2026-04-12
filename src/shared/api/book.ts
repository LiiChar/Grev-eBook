import { invoke } from "@tauri-apps/api/core";
import { Book } from "../types/book";
import { getFileExtension } from "../utils/file";

export const getBook = async (id: string) => {
  const book = await invoke<Book>("get_book", { id });
  return book;
};
export const getBooks = async () => {
  const books = await invoke<Book[]>("get_books");
  return books;
};

export const addBooks = async (path: string) => {
  const books = await invoke<Book[]>("add_books", { path });
  return books;
};

export const addBook = async (path: string) => {
  const books = await invoke<Book>("add_book", { path });
  return books;
};

export const openBook = async (path: string) => {
  const book = await invoke<Book>("open_book", { path });
  return book;
};

export const clearStore = async () => {
  await invoke("clear_store");
};
