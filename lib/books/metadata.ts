/**
 * Step 1: ISBN → book details.
 *
 * Asks ISBNdb (with a key), Google Books, Gramedia and Open Library at the same time, the way the
 * ISBN-Lookup project does (github.com/ImranR98/ISBN-Lookup), then merges their answers into one book:
 * - title: the longest one any source gives (as ISBN-Lookup does: short titles are usually cut off)
 * - synopsis: the longest one
 * - first published: the earliest year any source knows
 * - everything else: the first source that has it, in the order ISBNdb, Google Books, Gramedia, Open Library
 */
import { parseIsbn, toIsbn10, toIsbn13 } from "../isbn";
import type { Fetcher } from "./http";
import { storeLinks } from "./links";
import { goodreads } from "./sources/goodreads";
import { googleByIsbn } from "./sources/googleBooks";
import { gramedia } from "./sources/gramedia";
import { isbndbByIsbn } from "./sources/isbndb";
import { openLibraryByIsbn, openLibraryFirstPublished } from "./sources/openLibrary";
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

/** Merges the sources' answers. Exported for tests. */
export function mergeRecords(records: SourceRecord[], isbn: string, firstPublished = ""): Omit<BookInfo, "links" | "cover"> {
  const ranked = [...records].sort((a, b) => PRIORITY.indexOf(a.source as (typeof PRIORITY)[number]) - PRIORITY.indexOf(b.source as (typeof PRIORITY)[number]));
  const first = <K extends keyof SourceRecord>(k: K) => ranked.map((r) => r[k]).find((v) => (Array.isArray(v) ? v.length : Boolean(v)));
  const longest = (k: "title" | "synopsis") => ranked.map((r) => r[k].trim()).reduce((a, b) => (b.length > a.length ? b : a), "");
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

/** Accepts an ISBN-10 or ISBN-13, with or without dashes. Returns null for an invalid ISBN or when no source knows it. */
export async function lookupIsbn(input: string, opts: LookupOptions = {}): Promise<MetadataResult | null> {
  const f: Fetcher = opts.fetch ?? fetch;
  const isbn = parseIsbn(input);
  if (!isbn) return null;
  const isbn13 = toIsbn13(isbn);
  const [isbndb, google, gram, ol, firstYear, gr] = await Promise.all([
    isbndbByIsbn(f, isbn13, opts.isbndbKey),
    googleByIsbn(f, isbn13, opts.googleApiKey),
    gramedia(f, isbn13),
    openLibraryByIsbn(f, isbn13),
    openLibraryFirstPublished(f, isbn13),
    goodreads(f, isbn13),
  ]);

  const records = [isbndb, google, gram, ol].filter((r): r is SourceRecord => !!r && !!r.title);
  if (!records.length) return null;
  const merged = mergeRecords(records, isbn13, firstYear);
  const hints: Hints = {
    gramediaUrl: gram?.url,
    gramediaCover: gram?.cover,
    goodreadsUrl: gr?.url,
    goodreadsImage: gr?.image,
    googleId: google?.ids?.google,
    googleCover: google?.cover,
    openLibraryCover: ol?.cover,
    amazonId: ol?.ids?.amazon,
  };
  const links = storeLinks(merged, { gramediaUrl: gram?.url, goodreadsId: ol?.ids?.goodreads, goodreadsUrl: gr?.url, amazonId: ol?.ids?.amazon });
  // Provisional cover until step 2 checks the candidates.
  const cover = gram?.cover ?? gr?.image ?? google?.cover ?? ol?.cover ?? "";
  return { book: { ...merged, cover, links }, records, hints };
}

