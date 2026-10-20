/** Open Library (https://openlibrary.org/developers/api). */
import { cleanIsbn, isValidIsbn10, isValidIsbn13, toIsbn10, toIsbn13 } from "../../isbn";
import { getJson, type Fetcher } from "../http";
import { joinTitle, languageName, year } from "../text";
import { emptyRecord, type SourceRecord } from "../types";

type BooksData = {
  title?: string;
  subtitle?: string;
  authors?: { name: string }[];
  publishers?: { name: string }[];
  publish_date?: string;
  number_of_pages?: number;
  cover?: { large?: string; medium?: string };
  identifiers?: { isbn_13?: string[]; isbn_10?: string[]; goodreads?: string[]; amazon?: string[] };
  url?: string;
};

export function fromOpenLibraryEdition(d: BooksData, isbn: string): SourceRecord {
  const r = emptyRecord("Open Library");
  r.title = joinTitle(d.title, d.subtitle);
  r.authors = (d.authors ?? []).map((a) => a.name);
  r.publisher = d.publishers?.[0]?.name ?? "";
  r.edition = year(d.publish_date);
  r.pages = d.number_of_pages ?? 0;
  r.isbn13 = toIsbn13(isbn);
  r.isbn10 = d.identifiers?.isbn_10?.[0] ?? toIsbn10(r.isbn13);
  r.cover = d.cover?.large ?? d.cover?.medium;
  r.url = d.url;
  r.ids = { goodreads: d.identifiers?.goodreads?.[0], amazon: d.identifiers?.amazon?.find((a) => /^[A-Z0-9]{10}$/.test(a)) };
  return r;
}

/** Same call as the reference ISBN-Lookup: api/books?bibkeys=ISBN:<isbn>&jscmd=data. */
export async function openLibraryByIsbn(f: Fetcher, isbn: string): Promise<SourceRecord | null> {
  const data = await getJson<Record<string, BooksData>>(f, `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
  const d = data?.[`ISBN:${isbn}`];
  return d ? fromOpenLibraryEdition(d, isbn) : null;
}

type SearchDoc = {
  title?: string;
  subtitle?: string;
  author_name?: string[];
  isbn?: string[];
  first_publish_year?: number;
  publisher?: string[];
  number_of_pages_median?: number;
  language?: string[];
  cover_i?: number;
  id_goodreads?: string[];
};

export function fromOpenLibrarySearch(d: SearchDoc): SourceRecord {
  const r = emptyRecord("Open Library");
  r.title = joinTitle(d.title, d.subtitle);
  r.authors = d.author_name ?? [];
  r.published = d.first_publish_year ? String(d.first_publish_year) : "";
  r.publisher = d.publisher?.[0] ?? "";
  r.pages = d.number_of_pages_median ?? 0;
  r.language = languageName(d.language?.[0]);
  const isbns = (d.isbn ?? []).map(cleanIsbn);
  const pick = isbns.find(isValidIsbn13) ?? isbns.find(isValidIsbn10);
  if (pick) {
    r.isbn13 = toIsbn13(pick);
    r.isbn10 = toIsbn10(r.isbn13);
  }
  r.cover = d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : undefined;
  r.ids = { goodreads: d.id_goodreads?.[0] };
  return r;
}

const FIELDS = "title,subtitle,author_name,isbn,first_publish_year,publisher,number_of_pages_median,language,cover_i,id_goodreads";

export async function openLibrarySearch(f: Fetcher, q: string, limit: number): Promise<SourceRecord[]> {
  const data = await getJson<{ docs?: SearchDoc[] }>(f, `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}&fields=${FIELDS}`);
  return (data?.docs ?? []).map(fromOpenLibrarySearch);
}

/** The year the work first came out: the edition lookup doesn't say, the search index does. */
export async function openLibraryFirstPublished(f: Fetcher, isbn: string): Promise<string> {
  const data = await getJson<{ docs?: SearchDoc[] }>(f, `https://openlibrary.org/search.json?isbn=${isbn}&limit=1&fields=first_publish_year`);
  return data?.docs?.[0]?.first_publish_year ? String(data.docs[0].first_publish_year) : "";
}

/** default=false makes Open Library answer 404 instead of a blank image when it has no cover. */
export const openLibraryCoverUrl = (isbn13: string) => `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg?default=false`;
