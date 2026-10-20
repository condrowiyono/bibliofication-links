/** Suggestions while typing a title (or an ISBN) in the editor. Fast: catalogue APIs only, no store pages. */
import { parseIsbn } from "../isbn";
import type { Fetcher } from "./http";
import { storeLinks } from "./links";
import { lookupIsbn } from "./metadata";
import { googleSearch } from "./sources/googleBooks";
import { isbndbSearch } from "./sources/isbndb";
import { openLibrarySearch } from "./sources/openLibrary";
import { norm } from "./text";
import type { BookInfo, LookupOptions, SourceRecord } from "./types";

const keyOf = (r: SourceRecord) => r.isbn13 || `${norm(r.title)}|${norm(r.authors[0] ?? "")}`;

function toInfo(r: SourceRecord): BookInfo {
  const author = r.authors.slice(0, 3).join(", ");
  return {
    title: r.title,
    author,
    cover: r.cover ?? "",
    synopsis: r.synopsis,
    isbn13: r.isbn13,
    isbn10: r.isbn10,
    publisher: r.publisher,
    published: r.published || r.edition,
    edition: r.edition,
    pages: r.pages,
    language: r.language,
    links: storeLinks({ isbn13: r.isbn13, title: r.title, author }, { goodreadsId: r.ids?.goodreads }),
  };
}

/** Fills a's empty fields from b. */
function fill(a: SourceRecord, b: SourceRecord): SourceRecord {
  const out = { ...a };
  for (const k of ["title", "publisher", "published", "edition", "language", "isbn13", "isbn10", "cover"] as const) out[k] = (a[k] || b[k]) as never;
  if (!a.authors.length) out.authors = b.authors;
  if (!a.pages) out.pages = b.pages;
  if (b.synopsis.length > a.synopsis.length) out.synopsis = b.synopsis;
  out.ids = { ...b.ids, ...Object.fromEntries(Object.entries(a.ids ?? {}).filter(([, v]) => v)) };
  return out;
}

export async function searchBooks(query: string, limit = 8, opts: LookupOptions = {}): Promise<BookInfo[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const isbn = parseIsbn(q);
  if (isbn) {
    const r = await lookupIsbn(isbn, opts);
    return r ? [r.book] : [];
  }
  const f: Fetcher = opts.fetch ?? fetch;
  // ISBNdb first; Google Books and Open Library only when it has nothing (or there's no key).
  const fromIsbndb = (await isbndbSearch(f, q, limit, opts.isbndbKey, opts.isbndbHost)).filter((r) => r.title);
  const lists = fromIsbndb.length
    ? [fromIsbndb]
    : [[], ...(await Promise.all([googleSearch(f, q, limit, opts.googleApiKey), openLibrarySearch(f, q, limit)]))];
  // ISBNdb's results as they come; otherwise Google Books and Open Library interleaved. Duplicates merged.
  const [isbndb, ...others] = lists;
  const byKey = new Map<string, SourceRecord>();
  for (const r of isbndb) if (r.title) byKey.set(keyOf(r), byKey.has(keyOf(r)) ? fill(byKey.get(keyOf(r))!, r) : r);
  for (let i = 0; i < Math.max(0, ...others.map((l) => l.length)); i++)
    for (const list of others) {
      const r = list[i];
      if (!r?.title) continue;
      const k = keyOf(r);
      const prev = byKey.get(k);
      byKey.set(k, prev ? fill(prev, r) : r);
    }
  return [...byKey.values()].slice(0, limit).map(toInfo);
}
