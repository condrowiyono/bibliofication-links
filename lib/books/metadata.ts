/**
 * Step 1: ISBN → book details.
 *
 * With an ISBNdb key: ISBNdb is the only source of details (title, author, publisher, year, pages,
 * language, synopsis). Gramedia's and Goodreads' pages are read too, only for store links and covers.
 *
 * Without a key, as in ISBN-Lookup (github.com/ImranR98/ISBN-Lookup): Google Books, Gramedia and Open
 * Library are asked at once, answers about a different book are dropped, the longest title and synopsis
 * win, the first-published year is the earliest any source knows, and other fields come from the first
 * source that has them.
 */
import { parseIsbn, toIsbn10, toIsbn13 } from "../isbn";
import type { Fetcher } from "./http";
import { storeLinks } from "./links";
import { goodreads } from "./sources/goodreads";
import { googleByIsbn } from "./sources/googleBooks";
import { gramedia } from "./sources/gramedia";
import { isbndbByIsbn } from "./sources/isbndb";
import { openLibraryByIsbn, openLibraryFirstPublished } from "./sources/openLibrary";
import { sameTitle } from "./text";
import type { BookInfo, LookupOptions, SourceRecord } from "./types";

const PRIORITY = ["ISBNdb", "Google Books", "Gramedia", "Open Library"] as const;

/** What step 1 learned that step 2 (covers) can reuse instead of asking again. */
export type Hints = {
  gramediaUrl?: string;
  gramediaCover?: string;
  goodreadsUrl?: string;
  goodreadsImage?: string;
  googleId?: string;
  googleCover?: string;
  openLibraryCover?: string;
  amazonId?: string;
};

export type MetadataResult = {
  book: BookInfo;
  /** Each source's own answer, for checking where a field came from. */
  records: SourceRecord[];
  hints: Hints;
};

/**
 * Drops answers about a different book. ISBNdb, Google Books and Open Library are queried by the exact
 * ISBN, so they're trusted unless they report another ISBN. Gramedia's search can return some other
 * product when it doesn't stock this ISBN, so its answer is kept only when the product page shows this
 * ISBN, or (no ISBN on the page) when its title matches a trusted source's. Exported for tests.
 */
export function sameBookOnly(records: SourceRecord[], isbn13: string): SourceRecord[] {
  const own = records.filter((r) => !r.isbn13 || r.isbn13 === isbn13);
  const trusted = own.filter((r) => r.source !== "Gramedia");
  return own.filter(
    (r) => r.source !== "Gramedia" || r.isbn13 === isbn13 || (r.isbn13 === "" && (trusted.length === 0 || trusted.some((t) => sameTitle(t.title, r.title)))),
  );
}

/** Merges the sources' answers. Exported for tests. */
export function mergeRecords(records: SourceRecord[], isbn: string, firstPublished = ""): Omit<BookInfo, "links" | "cover"> {
  const ranked = [...records].sort((a, b) => PRIORITY.indexOf(a.source as (typeof PRIORITY)[number]) - PRIORITY.indexOf(b.source as (typeof PRIORITY)[number]));
  const first = <K extends keyof SourceRecord>(k: K) => ranked.map((r) => r[k]).find((v) => (Array.isArray(v) ? v.length : Boolean(v)));
  const isbndb = ranked.find((r) => r.source === "ISBNdb");
  const longest = (k: "title" | "synopsis") =>
    isbndb?.[k].trim() || ranked.map((r) => r[k].trim()).reduce((a, b) => (b.length > a.length ? b : a), "");
  const isbn13 = toIsbn13(isbn);
  const editionYear = (first("edition") as string) ?? "";
  const years = [firstPublished, ...ranked.map((r) => r.published)].filter(Boolean).sort();
  return {
    title: longest("title"),
    author: ((first("authors") as string[]) ?? []).slice(0, 3).join(", "),
    synopsis: longest("synopsis"),
    isbn13,
    isbn10: toIsbn10(isbn13) || ((first("isbn10") as string) ?? ""),
    publisher: (first("publisher") as string) ?? "",
    published: years[0] ?? editionYear,
    edition: editionYear,
    pages: (first("pages") as number) ?? 0,
    language: (first("language") as string) ?? "",
  };
}

/**
 * Accepts an ISBN-10 or ISBN-13, with or without dashes. Returns null for an invalid ISBN or when no source knows it.
 *
 * With an ISBNdb key, the details are ISBNdb's alone: when ISBNdb doesn't know the ISBN, the answer is null.
 * Gramedia and Goodreads are read alongside it only for their store links and covers, and only when they
 * show the same book. Without a key, Google Books, Gramedia and Open Library answer instead and are merged.
 */
export async function lookupIsbn(input: string, opts: LookupOptions = {}): Promise<MetadataResult | null> {
  const f: Fetcher = opts.fetch ?? fetch;
  const isbn = parseIsbn(input);
  if (!isbn) return null;
  const isbn13 = toIsbn13(isbn);

  // With an ISBNdb key, the details come from ISBNdb only. Gramedia and Goodreads are still read,
  // but only for their store links and covers, and only when they're the same book.
  const isbndbOnly = !!opts.isbndbKey;

  // 1. ISBNdb, with the store pages (and, without ISBNdb, the first-published year) alongside.
  const [isbndbRaw, gram, gr, firstYear] = await Promise.all([
    isbndbByIsbn(f, isbn13, opts.isbndbKey, opts.isbndbHost),
    gramedia(f, isbn13),
    goodreads(f, isbn13),
    isbndbOnly ? Promise.resolve("") : openLibraryFirstPublished(f, isbn13),
  ]);
  const isbndb = isbndbRaw?.title && (!isbndbRaw.isbn13 || isbndbRaw.isbn13 === isbn13) ? isbndbRaw : null;
  if (isbndbOnly && !isbndb) return null;

  // 2. Without an ISBNdb key: the other catalogues.
  const [google, ol] = isbndbOnly ? [null, null] : await Promise.all([googleByIsbn(f, isbn13, opts.googleApiKey), openLibraryByIsbn(f, isbn13)]);

  const checked = sameBookOnly(
    [isbndb, google, gram, ol].filter((r): r is SourceRecord => !!r && !!r.title),
    isbn13,
  );
  // Gramedia passing the same-book check still only counts for links and covers when ISBNdb is the source.
  const records = isbndbOnly ? [isbndb!] : checked;
  if (!records.length) return null;
  // Gramedia or Goodreads answering about another book: keep neither their links nor their covers.
  const gramOk = !!gram && checked.includes(gram);
  const grOk = !!gr && (!gr.title || records.some((r) => sameTitle(r.title, gr.title!)));
  const merged = mergeRecords(records, isbn13, firstYear);
  const hints: Hints = {
    // An empty string tells step 2 "already checked, nothing usable" so it doesn't search again.
    gramediaUrl: gramOk ? gram!.url : "",
    gramediaCover: gramOk ? gram!.cover : undefined,
    goodreadsUrl: grOk ? gr!.url : "",
    goodreadsImage: grOk ? gr!.image : undefined,
    googleId: google?.ids?.google,
    googleCover: google?.cover,
    openLibraryCover: ol?.cover,
    amazonId: ol?.ids?.amazon,
  };
  const links = storeLinks(merged, {
    gramediaUrl: hints.gramediaUrl || undefined,
    goodreadsId: ol?.ids?.goodreads,
    goodreadsUrl: hints.goodreadsUrl || undefined,
    amazonId: ol?.ids?.amazon,
  });
  // Provisional cover until step 2 checks the candidates.
  const cover = hints.gramediaCover ?? hints.goodreadsImage ?? google?.cover ?? ol?.cover ?? "";
  return { book: { ...merged, cover, links }, records, hints };
}

