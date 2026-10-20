/**
 * ISBNdb (https://isbndb.com/apidocs/v2). Paid, so it's only asked when ISBNDB_API_KEY is set.
 * Same call as the reference ISBN-Lookup: GET /book/<isbn> with the key in the Authorization header.
 */
import { cleanIsbn, toIsbn10, toIsbn13 } from "../../isbn";
import { getJson, type Fetcher } from "../http";
import { languageName, stripHtml, year } from "../text";
import { emptyRecord, type SourceRecord } from "../types";

type IsbndbBook = {
  title?: string;
  title_long?: string;
  isbn?: string;
  isbn13?: string;
  isbn10?: string;
  authors?: string[];
  publisher?: string;
  language?: string;
  date_published?: string;
  edition?: string;
  pages?: number;
  synopsis?: string;
  overview?: string;
  image?: string;
};

export function fromIsbndb(b: IsbndbBook): SourceRecord {
  const r = emptyRecord("ISBNdb");
  r.title = (b.title || b.title_long || "").trim();
  r.authors = (b.authors ?? []).map((a) => a.trim()).filter(Boolean);
  r.publisher = b.publisher?.trim() ?? "";
  r.edition = year(b.date_published);
  r.pages = Number(b.pages) || 0;
  r.language = languageName(b.language);
  r.synopsis = stripHtml(b.synopsis || b.overview || "");
  const isbn = cleanIsbn(b.isbn13 || b.isbn || b.isbn10 || "");
  if (isbn) {
    r.isbn13 = toIsbn13(isbn);
    r.isbn10 = b.isbn10 ? cleanIsbn(b.isbn10) : toIsbn10(r.isbn13);
  }
  return r;
}

const headers = (key: string) => ({ Authorization: key });

export async function isbndbByIsbn(f: Fetcher, isbn: string, key?: string): Promise<SourceRecord | null> {
  if (!key) return null;
  const data = await getJson<{ book?: IsbndbBook }>(f, `https://api2.isbndb.com/book/${isbn}`, headers(key));
  return data?.book ? fromIsbndb(data.book) : null;
}

export async function isbndbSearch(f: Fetcher, q: string, limit: number, key?: string): Promise<SourceRecord[]> {
  if (!key) return [];
  const data = await getJson<{ books?: IsbndbBook[] }>(f, `https://api2.isbndb.com/books/${encodeURIComponent(q)}?page=1&pageSize=${limit}`, headers(key));
  return (data?.books ?? []).map(fromIsbndb);
}
