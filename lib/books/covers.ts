/**
 * Step 2: search cover images.
 *
 * Asks Gramedia, Goodreads, Amazon, Apple Books, Google Books, Open Library and the Bookcover API,
 * downloads every candidate to check it's a real picture (dropping dead links and placeholders such
 * as Amazon's 1×1 GIF), and returns them best first: this exact edition before title matches, then
 * store photos before catalogue scans.
 *
 * Works on its own from an ISBN (or a title and author), or takes step 1's hints to skip repeat requests.
 */
import { toIsbn10 } from "../isbn";
import { getJson, getText, isRealImage, type Fetcher } from "./http";
import type { Hints } from "./metadata";
import { appleByIsbn, appleByTitle } from "./sources/apple";
import { fullSizeGoodreads, goodreads } from "./sources/goodreads";
import { googleByIsbn, googleLargeCover } from "./sources/googleBooks";
import { gramedia } from "./sources/gramedia";
import { openLibraryCoverUrl } from "./sources/openLibrary";
import { parseOgImage, sameTitle } from "./text";
import type { CoverOption, CoverSource, LookupOptions } from "./types";

export type CoverQuery = { isbn13?: string; isbn10?: string; title?: string; author?: string };

const RANK: CoverSource[] = ["Gramedia", "Goodreads", "Amazon", "Apple Books", "Google Books", "Open Library", "Bookcover API"];

type Maybe = Promise<CoverOption[]>;
const one = (url: string | undefined | null, source: CoverSource, exact: boolean): CoverOption[] => (url ? [{ url, source, exact }] : []);

async function fromGramedia(f: Fetcher, q: CoverQuery, h: Hints): Maybe {
  if (h.gramediaCover) return one(h.gramediaCover, "Gramedia", true);
  if (h.gramediaUrl !== undefined) return []; // step 1 already checked Gramedia: no photo, or another book
  const query = q.isbn13 || `${q.title ?? ""} ${q.author ?? ""}`.trim();
  if (!query) return [];
  const r = await gramedia(f, query);
  if (!r?.cover) return [];
  // Gramedia's search can return another product. Same ISBN: this edition. No ISBN on the page: only with a matching title.
  if (q.isbn13 && r.isbn13) return r.isbn13 === q.isbn13 ? one(r.cover, "Gramedia", true) : [];
  // No ISBN to compare: keep it only when the titles match, as a possible other edition.
  return q.title && r.title && sameTitle(q.title, r.title) ? one(r.cover, "Gramedia", false) : [];
}

async function fromGoodreads(f: Fetcher, q: CoverQuery, h: Hints): Maybe {
  if (h.goodreadsImage) return one(h.goodreadsImage, "Goodreads", !!q.isbn13);
  if (h.goodreadsUrl === "") return []; // step 1 already checked Goodreads: another book
  let url = h.goodreadsUrl;
  if (!url) {
    const query = q.isbn13 || `${q.title ?? ""} ${q.author ?? ""}`.trim();
    let hit = query ? await goodreads(f, query) : null;
    if (hit && q.title && hit.title && !sameTitle(q.title, hit.title)) hit = null;
    if (hit?.image) return one(hit.image, "Goodreads", !!q.isbn13);
    url = hit?.url;
  }
  // Fall back to the book page's og:image.
  const html = url ? await getText(f, url) : null;
  const img = html && parseOgImage(html);
  return one(img && fullSizeGoodreads(img), "Goodreads", !!q.isbn13);
}

function fromAmazon(q: CoverQuery, h: Hints): CoverOption[] {
  // Amazon keeps a cover per ASIN; a print book's ASIN is its ISBN-10. A missing one is a 1×1 GIF, caught by the check.
  const asin = h.amazonId || q.isbn10 || (q.isbn13 ? toIsbn10(q.isbn13) : "");
  return one(asin && `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`, "Amazon", true);
}

async function fromApple(f: Fetcher, q: CoverQuery): Maybe {
  const byIsbn = q.isbn13 ? await appleByIsbn(f, q.isbn13) : undefined;
  if (byIsbn) return one(byIsbn, "Apple Books", true);
  return q.title ? one(await appleByTitle(f, q.title, (q.author ?? "").split(",")[0]), "Apple Books", false) : [];
}

async function fromGoogle(f: Fetcher, q: CoverQuery, h: Hints, key?: string): Maybe {
  let id = h.googleId;
  let thumb = h.googleCover;
  if (!id && q.isbn13) {
    const r = await googleByIsbn(f, q.isbn13, key);
    id = r?.ids?.google;
    thumb = r?.cover;
  }
  const large = id ? await googleLargeCover(f, id, key) : undefined;
  return [...one(large, "Google Books", !!q.isbn13), ...(thumb && thumb !== large ? one(thumb, "Google Books", !!q.isbn13) : [])];
}

function fromOpenLibrary(q: CoverQuery, h: Hints): CoverOption[] {
  return [...one(q.isbn13 && openLibraryCoverUrl(q.isbn13), "Open Library", true), ...one(h.openLibraryCover, "Open Library", true)];
}

/** bookcover.longitood.com: a free service that finds a book's Goodreads cover by ISBN. */
async function fromBookcoverApi(f: Fetcher, q: CoverQuery): Maybe {
  if (!q.isbn13) return [];
  const data = await getJson<{ url?: string }>(f, `https://bookcover.longitood.com/bookcover/${q.isbn13}`);
  return one(data?.url, "Bookcover API", true);
}

export async function findCovers(q: CoverQuery, opts: LookupOptions = {}, hints: Hints = {}): Promise<CoverOption[]> {
  const f: Fetcher = opts.fetch ?? fetch;
  const candidates = (
    await Promise.all([
      fromGramedia(f, q, hints),
      fromGoodreads(f, q, hints),
      fromAmazon(q, hints),
      fromApple(f, q),
      fromGoogle(f, q, hints, opts.googleApiKey),
      fromOpenLibrary(q, hints),
      fromBookcoverApi(f, q),
    ])
  ).flat();

  const unique = [...new Map(candidates.map((c) => [c.url, c])).values()];
  const checked = await Promise.all(unique.map(async (c) => ((await isRealImage(f, c.url)) ? c : null)));
  return checked
    .filter((c): c is CoverOption => c !== null)
    .sort((a, b) => Number(b.exact) - Number(a.exact) || RANK.indexOf(a.source) - RANK.indexOf(b.source));
}
