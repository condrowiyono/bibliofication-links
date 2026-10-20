/**
 * Gramedia (gramedia.com), Indonesia's largest bookstore. No public API, so this reads their pages:
 * the search page gives the product page, and the product page gives the details and photo.
 * Searching by ISBN only matches that edition; a title search may match another book, so it isn't exact.
 */
import { cleanIsbn, isValidIsbn10, isValidIsbn13, toIsbn10, toIsbn13 } from "../../isbn";
import { getText, type Fetcher } from "../http";
import { decodeEntities, languageName, parseMeta, parseOgImage, stripHtml, year } from "../text";
import { emptyRecord, type SourceRecord } from "../types";

/** The first product page in a Gramedia search page: /products/<slug> links, or "slug" fields in the embedded page data. */
export function parseGramediaSearch(html: string): string | null {
  const href = html.match(/href="(?:https:\/\/www\.gramedia\.com)?\/products\/([a-z0-9][a-z0-9-]*)"/i)?.[1];
  if (href) return `https://www.gramedia.com/products/${href}`;
  const data = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  const slug = data?.match(/"slug"\s*:\s*"([a-z0-9][a-z0-9-]*)"/i)?.[1];
  return slug ? `https://www.gramedia.com/products/${slug}` : null;
}

type Ld = Record<string, unknown>;

/** Every JSON-LD object on the page, flattening arrays and @graph. */
function jsonLd(html: string): Ld[] {
  const out: Ld[] = [];
  for (const [, body] of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (v: unknown) => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") {
          out.push(v as Ld);
          if ("@graph" in (v as Ld)) walk((v as Ld)["@graph"]);
        }
      };
      walk(JSON.parse(body));
    } catch {
      // A broken block on their page shouldn't stop the others.
    }
  }
  return out;
}

const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const names = (v: unknown): string[] =>
  (Array.isArray(v) ? v : v ? [v] : []).map((a) => (typeof a === "string" ? a : str((a as Ld)?.name))).map((s) => s.trim()).filter(Boolean);
const image = (v: unknown): string => (Array.isArray(v) ? image(v[0]) : typeof v === "string" ? v : str((v as Ld)?.url));

/** A value for one of several keys in the page's embedded data (the Next.js __NEXT_DATA__ blob). */
function dataField(data: string, keys: string[]): string {
  for (const k of keys) {
    const m = data.match(new RegExp(`"${k}"\\s*:\\s*("((?:[^"\\\\]|\\\\.)*)"|\\d+)`, "i"));
    if (m) return m[2] !== undefined ? decodeEntities(JSON.parse(`"${m[2]}"`)) : m[1];
  }
  return "";
}

/** Book details from a Gramedia product page: JSON-LD first, then the embedded page data, then the meta tags. */
export function parseGramediaProduct(html: string, url: string): SourceRecord | null {
  const r = emptyRecord("Gramedia");
  r.url = url;
  const ld = jsonLd(html).find((o) => /^(Product|Book)$/i.test(str(o["@type"]))) ?? {};
  const data = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? "";

  r.title = str(ld.name) || dataField(data, ["name", "title"]) || parseMeta(html, "og:title").replace(/\s*[|-]\s*Gramedia.*$/i, "");
  r.authors = names(ld.author);
  if (!r.authors.length) {
    const a = dataField(data, ["author", "author_name", "authors"]);
    if (a) r.authors = a.split(/\s*[,;&]\s*/).filter(Boolean);
  }
  r.publisher = names(ld.publisher)[0] || names(ld.brand)[0] || dataField(data, ["publisher", "publisher_name", "brand"]);
  r.edition = year(str(ld.datePublished) || dataField(data, ["publish_date", "published_date", "release_date", "date_published"]));
  r.pages = Number(str(ld.numberOfPages) || dataField(data, ["number_of_pages", "pages", "total_pages", "page"])) || 0;
  r.language = languageName(str(ld.inLanguage) || dataField(data, ["language", "bahasa"]));
  r.synopsis = stripHtml(str(ld.description) || dataField(data, ["description", "synopsis", "sinopsis"]) || parseMeta(html, "og:description"));

  const isbn = cleanIsbn(str(ld.isbn) || str(ld.gtin13) || dataField(data, ["isbn", "isbn13", "isbn_13", "isbn10"]));
  if (isValidIsbn13(isbn) || isValidIsbn10(isbn)) {
    r.isbn13 = toIsbn13(isbn);
    r.isbn10 = toIsbn10(r.isbn13);
  }
  const img = image(ld.image) || parseOgImage(html) || "";
  r.cover = img ? img.replace(/^http:/, "https:") : undefined;
  return r.title ? r : null;
}

/** Finds the product page for an ISBN (or a title), then reads it. */
export async function gramedia(f: Fetcher, query: string): Promise<SourceRecord | null> {
  const search = await getText(f, `https://www.gramedia.com/search?q=${encodeURIComponent(query)}`);
  const url = search && parseGramediaSearch(search);
  if (!url) return null;
  const page = await getText(f, url);
  // Even when the product page can't be read, the product URL is worth keeping for the store link.
  return (page ? parseGramediaProduct(page, url) : null) ?? { ...emptyRecord("Gramedia"), url };
}
