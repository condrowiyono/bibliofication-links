/** Goodreads: no public API any more, but the search box's autocomplete still answers JSON. */
import { getJson, type Fetcher } from "../http";

type Hit = { bookId?: string | number; bookUrl?: string; imageUrl?: string; title?: string; author?: { name?: string } };

/** Goodreads serves thumbnails like ".../5907._SY75_.jpg"; without the size part it's the full cover. */
export function fullSizeGoodreads(url: string): string {
  return url.replace(/\._S[XY]\d+(_S[XY]\d+)?_(?=\.\w+$)/, "");
}

/** The book page and its cover, from the first autocomplete hit. Goodreads' "no photo" placeholder is skipped. */
export function parseGoodreadsAutocomplete(hits: Hit[] | null): { url: string; image?: string } | null {
  const hit = hits?.find((h) => h.bookUrl);
  if (!hit?.bookUrl) return null;
  const image = hit.imageUrl && !/nophoto/i.test(hit.imageUrl) ? fullSizeGoodreads(hit.imageUrl) : undefined;
  return { url: new URL(hit.bookUrl.split("?")[0], "https://www.goodreads.com").toString(), image };
}

export async function goodreads(f: Fetcher, query: string) {
  return parseGoodreadsAutocomplete(await getJson<Hit[]>(f, `https://www.goodreads.com/book/auto_complete?format=json&q=${encodeURIComponent(query)}`));
}
