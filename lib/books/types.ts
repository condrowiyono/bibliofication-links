import type { Book } from "../site";

export type SourceName = "ISBNdb" | "Google Books" | "Gramedia" | "Open Library" | "Goodreads";

/** What one source says about a book. Empty strings and 0 mean "this source doesn't know". */
export type SourceRecord = {
  source: SourceName;
  title: string;
  authors: string[];
  publisher: string;
  /** Year the work first came out (only some sources know this). */
  published: string;
  /** Year of this edition. */
  edition: string;
  pages: number;
  language: string;
  synopsis: string;
  isbn13: string;
  isbn10: string;
  /** The source's own cover for this record, if it has one (used in step 2). */
  cover?: string;
  /** The source's page for this book (Gramedia product page, Goodreads book page). */
  url?: string;
  /** Ids other sources can use: Google's volume id, Goodreads book id, Amazon ASIN. */
  ids?: { google?: string; goodreads?: string; amazon?: string };
};

/** A book's catalogue fields, shaped exactly like a book in data/links.json (minus her own rating, review and status). */
export type BookInfo = Pick<
  Book,
  "title" | "author" | "cover" | "synopsis" | "isbn13" | "isbn10" | "publisher" | "published" | "edition" | "pages" | "language" | "links"
>;

export type CoverSource = "Gramedia" | "Goodreads" | "Amazon" | "Apple Books" | "Google Books" | "Open Library" | "Bookcover API";

/** `exact` means matched by ISBN (this edition); false means matched by title, so it may be another edition. */
export type CoverOption = { url: string; source: CoverSource; exact: boolean };

export type LookupOptions = {
  fetch?: typeof fetch;
  /** ISBNdb is only asked when there's a key (it's a paid API). */
  isbndbKey?: string;
  /** Optional: Google Books works without a key, but the keyless quota is shared and often used up. */
  googleApiKey?: string;
};

export const emptyRecord = (source: SourceName): SourceRecord => ({
  source,
  title: "",
  authors: [],
  publisher: "",
  published: "",
  edition: "",
  pages: 0,
  language: "",
  synopsis: "",
  isbn13: "",
  isbn10: "",
});
