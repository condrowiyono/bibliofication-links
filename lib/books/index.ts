/**
 * Book lookup in two steps:
 *   1. lookupIsbn(isbn)   ISBN → details, from ISBNdb, Google Books, Gramedia and Open Library   (metadata.ts)
 *   2. findCovers(book)   cover images from Gramedia, Goodreads, Amazon, Apple Books, Google Books,
 *                         Open Library and the Bookcover API, each checked to be a real image     (covers.ts)
 * lookupBook runs both, passing step 1's findings to step 2 so nothing is fetched twice.
 * searchBooks gives the editor's suggestions while typing a title.
 */
import { parseIsbn } from "../isbn";
import { findCovers } from "./covers";
import { lookupIsbn } from "./metadata";
import { searchBooks } from "./search";
import type { BookInfo, CoverOption, LookupOptions, SourceRecord } from "./types";

export { findCovers } from "./covers";
export { lookupIsbn } from "./metadata";
export { searchBooks } from "./search";
export type { BookInfo, CoverOption, LookupOptions, SourceRecord } from "./types";

export type FullLookup = { book: BookInfo; covers: CoverOption[]; records: SourceRecord[] };

/** Both steps for an ISBN, or for a title (its first match that has an ISBN). */
export async function lookupBook(query: string, opts: LookupOptions = {}): Promise<FullLookup | null> {
  let isbn = parseIsbn(query);
  if (!isbn) {
    const hits = await searchBooks(query, 5, opts);
    isbn = hits.find((h) => h.isbn13)?.isbn13 ?? null;
    if (!isbn) {
      // No ISBN anywhere: covers by title only.
      const hit = hits[0];
      if (!hit) return null;
      const covers = await findCovers({ title: hit.title, author: hit.author }, opts);
      return { book: { ...hit, cover: covers[0]?.url || hit.cover }, covers, records: [] };
    }
  }
  const meta = await lookupIsbn(isbn, opts);
  if (!meta) return null;
  const { book, hints } = meta;
  const covers = await findCovers({ isbn13: book.isbn13, isbn10: book.isbn10, title: book.title, author: book.author }, opts, hints);
  // If no candidate passed the check (a store blocking the Worker, say), keep step 1's unchecked cover.
  return { book: { ...book, cover: covers[0]?.url || book.cover }, covers, records: meta.records };
}
