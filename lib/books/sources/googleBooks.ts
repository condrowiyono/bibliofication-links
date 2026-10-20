/** Google Books (https://developers.google.com/books). Works without a key; a key lifts the shared quota. */
import { cleanIsbn, isValidIsbn10, isValidIsbn13, toIsbn10, toIsbn13 } from "../../isbn";
import { getJson, type Fetcher } from "../http";
import { joinTitle, languageName, stripHtml, year } from "../text";
import { emptyRecord, type SourceRecord } from "../types";

type ImageLinks = { extraLarge?: string; large?: string; medium?: string; small?: string; thumbnail?: string; smallThumbnail?: string };
type Volume = {
  id?: string;
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
    imageLinks?: ImageLinks;
  };
};

/** Google's image URLs: https, no page-curl effect. */
const tidy = (url: string) => url.replace(/^http:/, "https:").replace("&edge=curl", "");

export const bestGoogleImage = (l?: ImageLinks) => {
  const url = l?.extraLarge ?? l?.large ?? l?.medium ?? l?.small ?? l?.thumbnail ?? l?.smallThumbnail;
  return url ? tidy(url) : undefined;
};

export function fromGoogle(v: Volume, preferredIsbn?: string): SourceRecord {
  const i = v.volumeInfo ?? {};
  const r = emptyRecord("Google Books");
  r.title = joinTitle(i.title, i.subtitle);
  r.authors = i.authors ?? [];
  r.publisher = i.publisher ?? "";
  r.edition = year(i.publishedDate);
  r.pages = i.pageCount ?? 0;
  r.language = languageName(i.language);
  r.synopsis = i.description ? stripHtml(i.description) : "";
  const isbns = (i.industryIdentifiers ?? []).filter((x) => x.type.startsWith("ISBN")).map((x) => cleanIsbn(x.identifier));
  const pick = preferredIsbn ?? isbns.find(isValidIsbn13) ?? isbns.find(isValidIsbn10);
  if (pick) {
    r.isbn13 = toIsbn13(pick);
    r.isbn10 = isbns.find((s) => s.length === 10 && toIsbn13(s) === r.isbn13) ?? toIsbn10(r.isbn13);
  }
  r.cover = bestGoogleImage(i.imageLinks);
  r.ids = { google: v.id };
  return r;
}

const keyParam = (key?: string) => (key ? `&key=${encodeURIComponent(key)}` : "");

/** Same query as the reference ISBN-Lookup: volumes?q=isbn:<isbn>. */
export async function googleByIsbn(f: Fetcher, isbn: string, key?: string): Promise<SourceRecord | null> {
  const data = await getJson<{ items?: Volume[] }>(f, `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${keyParam(key)}`);
  const v = data?.items?.[0];
  return v ? fromGoogle(v, isbn) : null;
}

export async function googleSearch(f: Fetcher, q: string, limit: number, key?: string): Promise<SourceRecord[]> {
  const data = await getJson<{ items?: Volume[] }>(
    f,
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${limit}&printType=books${keyParam(key)}`,
  );
  return (data?.items ?? []).map((v) => fromGoogle(v));
}

/** The search result only carries a thumbnail; the volume itself lists the larger sizes. */
export async function googleLargeCover(f: Fetcher, volumeId: string, key?: string): Promise<string | undefined> {
  const data = await getJson<Volume>(f, `https://www.googleapis.com/books/v1/volumes/${volumeId}?fields=volumeInfo/imageLinks${keyParam(key)}`);
  return bestGoogleImage(data?.volumeInfo?.imageLinks);
}
