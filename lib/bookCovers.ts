/**
 * Book covers from several places, because no single catalogue has them all (Open Library has few
 * Indonesian editions). Every candidate is downloaded and checked, so placeholders and dead links are
 * dropped, and the list comes back best first.
 */
import { getJson, getText, isRealImage, type Fetcher } from "./http";

export type CoverSource = "Gramedia" | "Goodreads" | "Amazon" | "Apple Books" | "Open Library" | "Google Books" | "Bookcover API";

/** `exact` means matched by ISBN (this edition); false means matched by title, so it may be another edition. */
export type CoverOption = { url: string; source: CoverSource; exact: boolean };

/** What we already know about the book, from the catalogue lookup and the store pages. */
export type CoverInput = {
  title: string;
  author: string;
  isbn13: string;
  isbn10: string;
  /** Covers the catalogues already listed (Open Library, Google Books). */
  known: CoverOption[];
  amazonId?: string;
  goodreadsUrl?: string;
  /** From Goodreads' autocomplete, when that's how the book page was found. */
  goodreadsImage?: string;
  gramediaUrl?: string;
  gramediaExact?: boolean;
};

// Order shown in the picker: store photos of the exact edition first, catalogue scans after.
const RANK: CoverSource[] = ["Gramedia", "Goodreads", "Amazon", "Apple Books", "Open Library", "Google Books", "Bookcover API"];

/** The page's og:image (or twitter:image), which on store pages is the product photo. */
export function parseOgImage(html: string): string | null {
  for (const re of [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ]) {
    const url = html.match(re)?.[1];
    if (url && /^https?:\/\//.test(url)) return url.replace(/&amp;/g, "&").replace(/^http:/, "https:");
  }
  return null;
}

/** Goodreads serves thumbnails like ".../5907._SY75_.jpg"; without the size part it's the full cover. */
export function fullSizeGoodreads(url: string): string {
  return url.replace(/\._S[XY]\d+(_S[XY]\d+)?_(?=\.\w+$)/, "").replace(/\._SX\d+_SY\d+_(?=\.\w+$)/, "");
}

/** Apple's artwork URLs carry their size ("100x100bb.jpg"); any size can be asked for. */
export function largeAppleArtwork(url: string): string {
  return url.replace(/\/\d+x\d+(bb)?\.(jpg|png|webp)$/, "/1000x1000bb.$2");
}

type AppleResult = { artworkUrl100?: string; artworkUrl60?: string; trackName?: string; artistName?: string; kind?: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Apple Books: an exact ISBN lookup first, then a title search that must match the title and author's surname. */
async function appleCovers(f: Fetcher, b: CoverInput): Promise<CoverOption[]> {
  const out: CoverOption[] = [];
  if (b.isbn13) {
    const data = await getJson<{ results?: AppleResult[] }>(f, `https://itunes.apple.com/lookup?isbn=${b.isbn13}&country=id`);
    const art = data?.results?.find((r) => r.artworkUrl100)?.artworkUrl100;
    if (art) out.push({ url: largeAppleArtwork(art), source: "Apple Books", exact: true });
  }
  if (!out.length && b.title) {
    const term = encodeURIComponent(`${b.title} ${b.author.split(",")[0] ?? ""}`.trim());
    const data = await getJson<{ results?: AppleResult[] }>(f, `https://itunes.apple.com/search?term=${term}&media=ebook&entity=ebook&country=id&limit=5`);
    const title = norm(b.title.split(":")[0]);
    const surname = norm(b.author.split(",")[0] ?? "").split(" ").pop() ?? "";
    const hit = data?.results?.find((r) => r.artworkUrl100 && norm(r.trackName ?? "").includes(title) && (!surname || norm(r.artistName ?? "").includes(surname)));
    if (hit?.artworkUrl100) out.push({ url: largeAppleArtwork(hit.artworkUrl100), source: "Apple Books", exact: false });
  }
  return out;
}

async function pageImage(f: Fetcher, url: string | undefined, source: CoverSource, exact: boolean): Promise<CoverOption[]> {
  if (!url) return [];
  const html = await getText(f, url);
  const img = html && parseOgImage(html);
  return img ? [{ url: source === "Goodreads" ? fullSizeGoodreads(img) : img, source, exact }] : [];
}

/** bookcover.longitood.com: a free service that finds a book's Goodreads cover by ISBN. */
async function bookcoverApi(f: Fetcher, isbn13: string): Promise<CoverOption[]> {
  if (!isbn13) return [];
  const data = await getJson<{ url?: string }>(f, `https://bookcover.longitood.com/bookcover/${isbn13}`);
  return data?.url ? [{ url: data.url, source: "Bookcover API", exact: true }] : [];
}

/** Every cover we can find for the book, checked to be a real image, best first. */
export async function findCovers(f: Fetcher, b: CoverInput): Promise<CoverOption[]> {
  const asin = b.amazonId || b.isbn10;
  const direct: CoverOption[] = [
    ...b.known,
    ...(b.goodreadsImage ? [{ url: fullSizeGoodreads(b.goodreadsImage), source: "Goodreads" as const, exact: !!b.isbn13 }] : []),
    // Amazon keeps a cover image per ASIN (a print book's ASIN is its ISBN-10); a missing one is a 1×1 GIF.
    ...(asin ? [{ url: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`, source: "Amazon" as const, exact: true }] : []),
    // default=false makes Open Library answer 404 instead of a blank image when it has no cover.
    ...(b.isbn13 ? [{ url: `https://covers.openlibrary.org/b/isbn/${b.isbn13}-L.jpg?default=false`, source: "Open Library" as const, exact: true }] : []),
  ];

  const found = (
    await Promise.all([
      appleCovers(f, b),
      pageImage(f, b.gramediaUrl, "Gramedia", b.gramediaExact ?? false),
      // The Goodreads page only when autocomplete didn't already give us its image.
      b.goodreadsImage ? Promise.resolve([]) : pageImage(f, b.goodreadsUrl, "Goodreads", !!b.isbn13),
      bookcoverApi(f, b.isbn13),
    ])
  ).flat();

  const unique = [...new Map([...direct, ...found].map((c) => [c.url, c])).values()];
  const checked = await Promise.all(unique.map(async (c) => ((await isRealImage(f, c.url)) ? c : null)));
  return checked
    .filter((c): c is CoverOption => c !== null)
    .sort((a, b2) => Number(b2.exact) - Number(a.exact) || RANK.indexOf(a.source) - RANK.indexOf(b2.source));
}
