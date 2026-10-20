/** Small text helpers shared by the sources. */

const LANGS: Record<string, string> = {
  ind: "Indonesian",
  id: "Indonesian",
  indonesia: "Indonesian",
  "bahasa indonesia": "Indonesian",
  eng: "English",
  en: "English",
  inggris: "English",
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

/** "ind", "id", "Indonesia" → "Indonesian"; unknown values come back with a capital letter. */
export function languageName(code?: string): string {
  const c = code?.trim();
  if (!c) return "";
  return LANGS[c.toLowerCase()] ?? c.charAt(0).toUpperCase() + c.slice(1);
}

export const year = (s?: string | number | null) => String(s ?? "").match(/\d{4}/)?.[0] ?? "";

export const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

export const stripHtml = (s: string) =>
  decodeEntities(
    s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .trim();

/** Lowercase, no accents or punctuation: for comparing titles and names. */
export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const joinTitle = (title?: string, subtitle?: string) => [title?.trim(), subtitle?.trim()].filter(Boolean).join(": ");

/** The page's og:image (or twitter:image), which on store pages is the product photo. */
export function parseOgImage(html: string): string | null {
  for (const re of [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ]) {
    const url = html.match(re)?.[1];
    if (url && /^https?:\/\//.test(url)) return decodeEntities(url).replace(/^http:/, "https:");
  }
  return null;
}

export function parseMeta(html: string, property: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, "i");
  return decodeEntities(html.match(re)?.[1] ?? html.match(re2)?.[1] ?? "").trim();
}

// Words too common to tell two titles apart (English and Indonesian).
const STOP = new Set(["the", "a", "an", "of", "and", "to", "in", "on", "for", "dan", "di", "ke", "dari", "yang", "sang", "si", "edisi", "cover", "baru", "new", "edition"]);
const words = (s: string) => norm(s.split(/[:(]/)[0]).split(" ").filter((w) => w && !STOP.has(w));

/**
 * True when two titles name the same book: most words of the shorter title appear in the longer.
 * "Ronggeng Dukuh Paruk (Cover Baru)" matches "Ronggeng dukuh paruk"; "Laut Bercerita" doesn't match "Pulang".
 */
export function sameTitle(a: string, b: string): boolean {
  const [x, y] = [words(a), words(b)];
  if (!x.length || !y.length) return false;
  const [short, long] = x.length <= y.length ? [x, new Set(y)] : [y, new Set(x)];
  return short.filter((w) => long.has(w)).length / short.length >= 0.6;
}
