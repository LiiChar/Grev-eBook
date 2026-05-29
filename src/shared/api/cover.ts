import { invoke } from "@tauri-apps/api/core";

/**
 * Get cover image as a data URL for a given book.
 * Extracts and caches cover from the book file on first call.
 */
export const getCoverImage = async (bookId: string, bookPath: string): Promise<string> => {
  const dataUrl = await invoke<string>("get_cover_image", { bookId, bookPath });
  return dataUrl;
};

/**
 * Create a lazy cover URL from a book's id and path.
 * Returns a signal-compatible object that resolves on demand.
 * Uses caching to avoid re-fetching.
 */
const coverCache = new Map<string, string>();

export const getCachedCoverUrl = async (bookId: string, bookPath: string): Promise<string | null> => {
  const cacheKey = bookId;
  if (coverCache.has(cacheKey)) {
    return coverCache.get(cacheKey)!;
  }

  try {
    const dataUrl = await getCoverImage(bookId, bookPath);
    coverCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (err) {
    console.warn(`Failed to load cover for book ${bookId}:`, err);
    return null;
  }
};