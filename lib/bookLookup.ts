/**
 * Book lookup: search by title or ISBN, then find the book's pages on Goodreads, Amazon and Gramedia.
 *
 * Data comes from Open Library and Google Books (both free JSON APIs). Store links are resolved by
 * asking each site directly; when a site blocks us or finds nothing, we fall back to a search URL on
 * that site, flagged `exact: false`, so the editor always has somewhere to send the reader.
 *
 * Nothing here imports Cloudflare, so the parsers can be run and tested in plain Node.
 */
import type { Book } from "./site";
import { cleanIsbn, isValidIsbn10, isValidIsbn13, parseIsbn, toIsbn10, toIsbn13 } from "./isbn";

export type StoreLink = { label: "Goodreads" | "Amazon" | "Gramedia"; url: string; exact: boolean };

export type BookCandidate = {
  title: string;
  author: string;
  cover: string;
  isbn13: string;
  isbn10: string;
  publisher: string;
  /** Year the work first came out. */
  published: string;
  /** Year of this edition. */
  edition: string;
  pages: number;
  language: string;
  synopsis: string;
  /** Where the data came from, e.g. ["openlibrary", "google"]. */
  sources: string[];
  links: StoreLink[];
  /** Ids we picked up along the way, used to build exact links without another request. */
  ids: { goodreads?: string; amazon?: string; openlibrary?: string };
};

type Fetcher = typeof fetch;

const UA = "Mozilla/5.0 (compatible; BeyLinksBookLookup/1.0; +https://bethanielle.me)";
const TIMEOUT_MS = 7000;

const LANGS: Record<string, string> = {
  ind: "Indonesian",
  id: "Indonesian",
  eng: "English",
  en: "English",
  jpn: "Japanese",
  ja: "Japanese",
  kor: "Korean",
  ko: "Korean",
  may: "Malay",
  msa: "Malay",
  ms: "Malay",
  fre: "French",
  fr: "French",
  ger: "German",
  de: "German",
  spa: "Spanish",
  es: "Spanish",
  chi: "Chinese",
  zh: "Chinese",
};
const langName = (code?: string) => (code ? (LANGS[code.toLowerCase()] ?? code) : "");

const year = (s?: string) => s?.match(/\d{4}/)?.[0] ?? "";

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'");

const stripHtml = (s: string) => decodeEntities(s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).trim();

async function getJson<T>(f: Fetcher, url: string): Promise<T | null> {
  try {
    const res = await f(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getText(f: Fetcher, url: string): Promise<string | null> {
  try {
    const res = await f(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml", "accept-language": "id-ID,id;q=0.9,en;q=0.8" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function blank(): BookCandidate {
  return {
    title: "",
    author: "",
    cover: "",
    isbn13: "",
    isbn10: "",
    publisher: "",
    published: "",
    edition: "",
    pages: 0,
    language: "",
    synopsis: "",
    sources: [],
    links: [],
    ids: {},
  };
}

/** Sets both ISBN forms from whatever valid ISBNs a source listed, preferring the one we searched for. */
function setIsbns(c: BookCandidate, isbns: string[], preferred?: string) {
  const valid = isbns.map(cleanIsbn).filter((s) => isValidIsbn13(s) || isValidIsbn10(s));
  const pick = preferred && valid.some((s) => toIsbn13(s) === toIsbn13(preferred)) ? preferred : valid.find((s) => s.length === 13) ?? valid[0];
  if (!pick) return;
  c.isbn13 = toIsbn13(pick);
  c.isbn10 = valid.find((s) => s.length === 10 && toIsbn13(s) === c.isbn13) ?? toIsbn10(c.isbn13);
}

// ---------- Open Library ----------

type OLSearchDoc = {
  key?: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  isbn?: string[];
  first_publish_year?: number;
  publish_year?: number[];
  publisher?: string[];
  number_of_pages_median?: number;
  language?: string[];
  cover_i?: number;
  id_goodreads?: string[];
  id_amazon?: string[];
};

const OL_FIELDS = "key,title,subtitle,author_name,isbn,first_publish_year,publish_year,publisher,number_of_pages_median,language,cover_i,id_goodreads,id_amazon";

export function fromOpenLibraryDoc(d: OLSearchDoc, preferredIsbn?: string): BookCandidate {
  const c = blank();
  c.title = [d.title, d.subtitle].filter(Boolean).join(": ");
  c.author = (d.author_name ?? []).slice(0, 3).join(", ");
  setIsbns(c, d.isbn ?? [], preferredIsbn);
  c.published = d.first_publish_year ? String(d.first_publish_year) : "";
  c.edition = d.publish_year?.length ? String(Math.max(...d.publish_year)) : "";
  c.publisher = d.publisher?.[0] ?? "";
  c.pages = d.number_of_pages_median ?? 0;
  c.language = langName(d.language?.[0]);
  c.cover = d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : "";
  c.ids = { goodreads: d.id_goodreads?.[0], amazon: d.id_amazon?.find((a) => /^[A-Z0-9]{10}$/.test(a)), openlibrary: d.key };
  c.sources = ["openlibrary"];
  return c;
}

async function openLibrarySearch(f: Fetcher, q: string, limit: number): Promise<BookCandidate[]> {
  const isbn = parseIsbn(q);
  const param = isbn ? `isbn=${isbn}` : `q=${encodeURIComponent(q)}`;
  const data = await getJson<{ docs?: OLSearchDoc[] }>(f, `https://openlibrary.org/search.json?${param}&limit=${limit}&fields=${OL_FIELDS}`);
  return (data?.docs ?? []).map((d) => fromOpenLibraryDoc(d, isbn ?? undefined));
}

type OLBooksData = {
  title?: string;
  subtitle?: string;
  authors?: { name: string }[];
  publishers?: { name: string }[];
  publish_date?: string;
  number_of_pages?: number;
  cover?: { large?: string; medium?: string };
  identifiers?: { isbn_13?: string[]; isbn_10?: string[]; goodreads?: string[]; amazon?: string[] };
  key?: string;
};

/** Edition-level data for one ISBN (exact publisher, page count and edition year). */
export function fromOpenLibraryEdition(d: OLBooksData, isbn: string): BookCandidate {
  const c = blank();
  c.title = [d.title, d.subtitle].filter(Boolean).join(": ");
  c.author = (d.authors ?? []).map((a) => a.name).slice(0, 3).join(", ");
  setIsbns(c, [...(d.identifiers?.isbn_13 ?? []), ...(d.identifiers?.isbn_10 ?? []), isbn], isbn);
  c.publisher = d.publishers?.[0]?.name ?? "";
  c.edition = year(d.publish_date);
  c.pages = d.number_of_pages ?? 0;
  c.cover = d.cover?.large ?? d.cover?.medium ?? "";
  c.ids = { goodreads: d.identifiers?.goodreads?.[0], amazon: d.identifiers?.amazon?.[0], openlibrary: d.key };
  c.sources = ["openlibrary"];
  return c;
}

async function openLibraryEdition(f: Fetcher, isbn: string): Promise<BookCandidate | null> {
  const data = await getJson<Record<string, OLBooksData>>(f, `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`);
  const d = data?.[`ISBN:${isbn}`];
  return d ? fromOpenLibraryEdition(d, isbn) : null;
}

// ---------- Google Books ----------

type GBVolume = {
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    language?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

export function fromGoogleVolume(v: GBVolume, preferredIsbn?: string): BookCandidate {
  const i = v.volumeInfo ?? {};
  const c = blank();
  c.title = [i.title, i.subtitle].filter(Boolean).join(": ");
  c.author = (i.authors ?? []).slice(0, 3).join(", ");
  setIsbns(c, (i.industryIdentifiers ?? []).filter((x) => x.type.startsWith("ISBN")).map((x) => x.identifier), preferredIsbn);
  c.publisher = i.publisher ?? "";
  c.edition = year(i.publishedDate);
  c.pages = i.pageCount ?? 0;
  c.language = langName(i.language);
  c.synopsis = i.description ? stripHtml(i.description) : "";
  const thumb = i.imageLinks?.thumbnail ?? i.imageLinks?.smallThumbnail;
  c.cover = thumb ? thumb.replace(/^http:/, "https:").replace("&edge=curl", "") : "";
  c.sources = ["google"];
  return c;
}

async function googleSearch(f: Fetcher, q: string, limit: number, apiKey?: string): Promise<BookCandidate[]> {
  const isbn = parseIsbn(q);
  const query = isbn ? `isbn:${isbn}` : q;
  const key = apiKey ? `&key=${encodeURIComponent(apiKey)}` : "";
  const data = await getJson<{ items?: GBVolume[] }>(
    f,
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}&printType=books${key}`,
  );
  return (data?.items ?? []).map((v) => fromGoogleVolume(v, isbn ?? undefined));
}

// ---------- Merging ----------

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const keyOf = (c: BookCandidate) => c.isbn13 || `${norm(c.title)}|${norm(c.author.split(",")[0] ?? "")}`;

/** Fills a's empty fields from b. a wins on conflicts, except a longer synopsis and an earlier first-published year. */
export function mergeCandidates(a: BookCandidate, b: BookCandidate): BookCandidate {
  const ids = { ...a.ids };
  for (const [k, v] of Object.entries(b.ids) as [keyof BookCandidate["ids"], string | undefined][]) if (!ids[k] && v) ids[k] = v;
  const out: BookCandidate = { ...a, ids, sources: [...new Set([...a.sources, ...b.sources])] };
  for (const k of ["title", "author", "cover", "isbn13", "isbn10", "publisher", "edition", "language"] as const) out[k] = a[k] || b[k];
  out.pages = a.pages || b.pages;
  out.synopsis = b.synopsis.length > a.synopsis.length ? b.synopsis : a.synopsis;
  const years = [a.published, b.published].filter(Boolean).sort();
  out.published = years[0] ?? "";
  return out;
}

function dedupe(lists: BookCandidate[][], limit: number): BookCandidate[] {
  const byKey = new Map<string, BookCandidate>();
  // Interleave the sources so both get a say in the first few suggestions.
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++)
    for (const list of lists) {
      const c = list[i];
      if (!c || !c.title) continue;
      const k = keyOf(c);
      const prev = byKey.get(k);
      byKey.set(k, prev ? mergeCandidates(prev, c) : c);
    }
  return [...byKey.values()].slice(0, limit);
}

// ---------- Store links ----------

/** Links we can build without a request. Search URLs are marked inexact. */
export function quickLinks(c: BookCandidate): StoreLink[] {
  const q = c.isbn13 || `${c.title} ${c.author}`.trim();
  const goodreads: StoreLink = c.ids.goodreads
    ? { label: "Goodreads", url: `https://www.goodreads.com/book/show/${c.ids.goodreads}`, exact: true }
    : c.isbn13
      ? // Goodreads redirects /book/isbn/<isbn> to the book's page when it knows the edition.
        { label: "Goodreads", url: `https://www.goodreads.com/book/isbn/${c.isbn13}`, exact: false }
      : { label: "Goodreads", url: `https://www.goodreads.com/search?q=${encodeURIComponent(q)}`, exact: false };
  // Amazon ids come from Open Library. Without one we search by ISBN rather than guess /dp/<isbn10>,
  // which is a dead page when Amazon doesn't stock that edition (common for Indonesian books).
  const amazon: StoreLink = c.ids.amazon
    ? { label: "Amazon", url: `https://www.amazon.com/dp/${c.ids.amazon}`, exact: true }
    : { label: "Amazon", url: `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=stripbooks`, exact: false };
  const gramedia: StoreLink = { label: "Gramedia", url: `https://www.gramedia.com/search?q=${encodeURIComponent(q)}`, exact: false };
  return [gramedia, goodreads, amazon];
}

type GoodreadsHit = { bookId?: string | number; bookUrl?: string; title?: string; author?: { name?: string } };

/** Goodreads' own autocomplete (the search box on their site) returns the book page for an ISBN or title. */
export function parseGoodreadsAutocomplete(hits: GoodreadsHit[] | null): string | null {
  const url = hits?.find((h) => h.bookUrl)?.bookUrl;
  if (!url) return null;
  return new URL(url.split("?")[0], "https://www.goodreads.com").toString();
}

async function resolveGoodreads(f: Fetcher, c: BookCandidate): Promise<StoreLink | null> {
  if (c.ids.goodreads) return null; // already exact
  const q = c.isbn13 || `${c.title} ${c.author}`.trim();
  const url = parseGoodreadsAutocomplete(await getJson<GoodreadsHit[]>(f, `https://www.goodreads.com/book/auto_complete?format=json&q=${encodeURIComponent(q)}`));
  return url ? { label: "Goodreads", url, exact: true } : null;
}

/**
 * Finds a Gramedia product page in a Gramedia search page. Their pages are a Next.js app, so product
 * slugs show up both as /products/<slug> links and as "slug" fields in the embedded page data.
 */
export function parseGramediaSearch(html: string): string | null {
  const href = html.match(/href="(?:https:\/\/www\.gramedia\.com)?\/products\/([a-z0-9][a-z0-9-]*)"/i)?.[1];
  if (href) return `https://www.gramedia.com/products/${href}`;
  const data = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  const slug = data?.match(/"slug"\s*:\s*"([a-z0-9][a-z0-9-]*)"/i)?.[1];
  return slug ? `https://www.gramedia.com/products/${slug}` : null;
}

async function resolveGramedia(f: Fetcher, c: BookCandidate): Promise<StoreLink | null> {
  // An ISBN search only matches the exact edition; a title search may match a different book, so it isn't exact.
  for (const [q, exact] of [
    [c.isbn13, true],
    [`${c.title} ${c.author.split(",")[0] ?? ""}`.trim(), false],
  ] as const) {
    if (!q) continue;
    const html = await getText(f, `https://www.gramedia.com/search?q=${encodeURIComponent(q)}`);
    const url = html && parseGramediaSearch(html);
    if (url) return { label: "Gramedia", url, exact };
  }
  return null;
}

// ---------- Public API ----------

export type LookupOptions = { fetch?: Fetcher; googleApiKey?: string };

/** Suggestions for a title or ISBN, fast: no store scraping, just links we can build from ids. */
export async function searchBooks(query: string, limit = 8, opts: LookupOptions = {}): Promise<BookCandidate[]> {
  const f = opts.fetch ?? fetch;
  const q = query.trim();
  if (q.length < 2) return [];
  const [ol, gb] = await Promise.all([openLibrarySearch(f, q, limit), googleSearch(f, q, limit, opts.googleApiKey)]);
  return dedupe([ol, gb], limit).map((c) => ({ ...c, links: quickLinks(c) }));
}

/**
 * Everything we can find for one book: edition data from both catalogues, a synopsis, and the
 * Goodreads and Gramedia pages resolved by asking those sites. Pass an ISBN, or a title when the
 * book has none (then the first match is used).
 */
export async function lookupBook(query: string, opts: LookupOptions = {}): Promise<BookCandidate | null> {
  const f = opts.fetch ?? fetch;
  const isbn = parseIsbn(query);
  let book: BookCandidate | null;
  if (isbn) {
    const [edition, ol, gb] = await Promise.all([openLibraryEdition(f, isbn), openLibrarySearch(f, isbn, 1), googleSearch(f, isbn, 1, opts.googleApiKey)]);
    const parts = [edition, ol[0], gb[0]].filter((x): x is BookCandidate => !!x);
    book = parts.length ? parts.reduce(mergeCandidates) : null;
    if (book) {
      book.isbn13 = toIsbn13(isbn);
      book.isbn10 = toIsbn10(book.isbn13);
    }
  } else {
    book = (await searchBooks(query, 1, opts))[0] ?? null;
  }
  if (!book) return null;
  if (!book.cover && book.isbn13) book.cover = `https://covers.openlibrary.org/b/isbn/${book.isbn13}-L.jpg`;

  const links = quickLinks(book);
  const [goodreads, gramedia] = await Promise.all([resolveGoodreads(f, book), resolveGramedia(f, book)]);
  book.links = links.map((l) => (l.label === "Goodreads" && goodreads) || (l.label === "Gramedia" && gramedia) || l);
  return book;
}

/** A book's catalogue fields, shaped exactly like a book in data/links.json (minus her own rating, review and status). */
export type BookInfo = Pick<
  Book,
  "title" | "author" | "cover" | "synopsis" | "isbn13" | "isbn10" | "publisher" | "published" | "edition" | "pages" | "language" | "links"
>;

/** Drops the lookup's working fields. Links to a store's search page instead of the book say "(search)". */
export function toBookInfo(c: BookCandidate): BookInfo {
  return {
    title: c.title,
    author: c.author,
    cover: c.cover,
    synopsis: c.synopsis,
    isbn13: c.isbn13,
    isbn10: c.isbn10,
    publisher: c.publisher,
    published: c.published,
    edition: c.edition,
    pages: c.pages,
    language: c.language,
    links: c.links.map((l) => ({ label: l.exact ? l.label : `${l.label} (search)`, url: l.url })),
  };
}
