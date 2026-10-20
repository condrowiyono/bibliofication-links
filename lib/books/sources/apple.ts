/** Apple Books' public search API: cover art only (many Indonesian e-books are there). */
import { getJson, type Fetcher } from "../http";
import { norm } from "../text";

type Result = { artworkUrl100?: string; trackName?: string; artistName?: string };

/** Apple's artwork URLs carry their size ("100x100bb.jpg"); any size can be asked for. */
export function largeAppleArtwork(url: string): string {
  return url.replace(/\/\d+x\d+(bb)?\.(jpg|png|webp)$/, "/1000x1000bb.$2");
}

export async function appleByIsbn(f: Fetcher, isbn13: string): Promise<string | undefined> {
  const data = await getJson<{ results?: Result[] }>(f, `https://itunes.apple.com/lookup?isbn=${isbn13}&country=id`);
  const art = data?.results?.find((r) => r.artworkUrl100)?.artworkUrl100;
  return art ? largeAppleArtwork(art) : undefined;
}

/** A title search that must match the title and the author's surname, so a different book isn't picked. */
export async function appleByTitle(f: Fetcher, title: string, author: string): Promise<string | undefined> {
  const term = encodeURIComponent(`${title} ${author}`.trim());
  const data = await getJson<{ results?: Result[] }>(f, `https://itunes.apple.com/search?term=${term}&media=ebook&entity=ebook&country=id&limit=5`);
  const t = norm(title.split(":")[0]);
  const surname = norm(author).split(" ").pop() ?? "";
  const hit = data?.results?.find((r) => r.artworkUrl100 && norm(r.trackName ?? "").includes(t) && (!surname || norm(r.artistName ?? "").includes(surname)));
  return hit?.artworkUrl100 ? largeAppleArtwork(hit.artworkUrl100) : undefined;
}
