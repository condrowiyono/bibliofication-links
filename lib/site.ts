import { getCloudflareContext } from "@opennextjs/cloudflare";
import seed from "@/data/links.json";

export const PLATFORMS = ["instagram", "tiktok", "threads", "x", "medium", "shopee", "goodreads", "spotify"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type Social = { platform: Platform; url: string };

export type LinkItem = {
  id: string;
  type: "link" | "header";
  title: string;
  subtitle?: string;
  url?: string;
  icon?: Platform | "";
  featured?: boolean;
  visible: boolean;
};

export const STORES = ["shopee", "tiktok"] as const;
export type Store = (typeof STORES)[number];
export const STORE_NAMES: Record<Store, string> = { shopee: "Shopee", tiktok: "TikTok Shop" };

export type ShopItem = {
  id: string;
  store: Store;
  title: string;
  url: string;
  image?: string;
  price?: string;
  visible: boolean;
};

/** `stores` holds the optional "see everything" link per store; empty means no button. */
export type Shop = { title: string; stores: Record<Store, string>; items: ShopItem[] };

export const BOOK_STATUSES = ["reading", "read", "want"] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];
export const STATUS_LABEL: Record<BookStatus, string> = { reading: "Reading now", read: "Read", want: "Want to read" };

export type BookLink = { label: string; url: string };

/** One book on her shelf. Bibliographic fields come from public listings; rating, review and quote are hers. */
export type Book = {
  id: string;
  title: string;
  author: string;
  cover: string;
  status: BookStatus;
  /** 1 to 5 cups of matcha; 0 means not rated yet. */
  rating: number;
  /** Date finished, YYYY-MM-DD, or empty. */
  finished: string;
  review: string;
  quote: string;
  synopsis: string;
  isbn13: string;
  isbn10: string;
  publisher: string;
  /** Year the work first came out. */
  published: string;
  /** Year of the edition the ISBN belongs to. */
  edition: string;
  pages: number;
  language: string;
  links: BookLink[];
  visible: boolean;
};

export type Site = {
  profile: { name: string; handle: string; avatar: string; bio: string; shelf: string[] };
  socials: Social[];
  shop: Shop;
  links: LinkItem[];
  books: Book[];
  medium: { username: string; show: boolean; count: number };
  footer: string;
};

const SITE_KEY = "site";

async function kv() {
  const { env } = await getCloudflareContext({ async: true });
  return env.LINKS_KV;
}

type LegacyShop = Partial<Shop> & { storeUrl?: string; items?: (Omit<ShopItem, "store"> & { store?: Store })[] };

/** Brings older saved shapes up to date: no shop yet, or the Shopee-only shop with a single `storeUrl`. */
function upgradeShop(shop: LegacyShop | undefined): Shop {
  return {
    title: shop?.title ?? "Shop my picks",
    stores: shop?.stores ?? { shopee: shop?.storeUrl ?? "", tiktok: "" },
    items: (shop?.items ?? []).map((it) => ({ ...it, store: it.store ?? "shopee" })),
  };
}

/** The page as stored in KV, or the seed file until the first save. */
export async function getSite(): Promise<Site> {
  const stored = await (await kv()).get<Site>(SITE_KEY, "json");
  const site = stored ?? (seed as Site);
  // Data saved before the library existed starts with the seed books.
  return { ...site, shop: upgradeShop(site.shop), books: site.books ?? (seed as Site).books };
}

export async function putSite(site: Site) {
  await (await kv()).put(SITE_KEY, JSON.stringify(site, null, 2));
}

export function getSeed(): Site {
  return seed as Site;
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isUrl = (v: string) => /^https?:\/\/\S+$/i.test(v);

/** Returns a list of human-readable problems; empty means the JSON is safe to save. */
export function validateSite(input: unknown): string[] {
  const errors: string[] = [];
  const s = input as Partial<Site> | null;
  if (!s || typeof s !== "object") return ["The data must be a JSON object."];

  const p = s.profile;
  if (!p || !isStr(p.name) || !p.name.trim()) errors.push("Profile name is required.");
  if (p && !isStr(p.handle)) errors.push("Profile handle must be text.");
  if (p && !isStr(p.bio)) errors.push("Bio must be text.");
  if (p && p.avatar && !isUrl(p.avatar) && !p.avatar.startsWith("/")) errors.push("Avatar must be a full https:// URL or a /path.");
  if (p && (!Array.isArray(p.shelf) || !p.shelf.every(isStr))) errors.push("Shelf must be a list of words.");

  if (!Array.isArray(s.socials)) errors.push("Socials must be a list.");
  else
    s.socials.forEach((so, i) => {
      if (!PLATFORMS.includes(so?.platform)) errors.push(`Social #${i + 1}: unknown platform "${so?.platform}".`);
      if (!isStr(so?.url) || !isUrl(so.url)) errors.push(`Social #${i + 1}: URL must start with https://.`);
    });

  const shop = s.shop;
  if (!shop || typeof shop !== "object") errors.push("Shop is missing.");
  else {
    if (!isStr(shop.title) || !shop.title.trim()) errors.push("Shop section needs a title.");
    if (!shop.stores || typeof shop.stores !== "object") errors.push("Shop needs a stores object with shopee and tiktok links.");
    else
      STORES.forEach((st) => {
        const url = shop.stores[st];
        if (!isStr(url) || (url && !isUrl(url))) errors.push(`${STORE_NAMES[st]} store link must start with https:// (or be empty).`);
      });
    if (!Array.isArray(shop.items)) errors.push("Shop items must be a list.");
    else {
      const ids = new Set<string>();
      shop.items.forEach((it, i) => {
        const label = `Product #${i + 1}${it?.title ? ` ("${it.title}")` : ""}`;
        if (!isStr(it?.id) || !it.id) errors.push(`${label}: missing id.`);
        else if (ids.has(it.id)) errors.push(`${label}: id "${it.id}" is used twice.`);
        else ids.add(it.id);
        if (!STORES.includes(it?.store)) errors.push(`${label}: store must be "shopee" or "tiktok".`);
        if (!isStr(it?.title) || !it.title.trim()) errors.push(`${label}: name is required.`);
        if (!isStr(it?.url) || (it.url && !isUrl(it.url))) errors.push(`${label}: link must start with https://.`);
        if (it?.image && !isUrl(it.image)) errors.push(`${label}: image must be a full https:// URL.`);
        if (it?.price !== undefined && !isStr(it.price)) errors.push(`${label}: price must be text.`);
        if (typeof it?.visible !== "boolean") errors.push(`${label}: visible must be true or false.`);
      });
    }
  }

  if (!Array.isArray(s.links)) errors.push("Links must be a list.");
  else {
    const ids = new Set<string>();
    s.links.forEach((l, i) => {
      const label = `Link #${i + 1}${l?.title ? ` ("${l.title}")` : ""}`;
      if (!isStr(l?.id) || !l.id) errors.push(`${label}: missing id.`);
      else if (ids.has(l.id)) errors.push(`${label}: id "${l.id}" is used twice.`);
      else ids.add(l.id);
      if (l?.type !== "link" && l?.type !== "header") errors.push(`${label}: type must be "link" or "header".`);
      if (!isStr(l?.title) || !l.title.trim()) errors.push(`${label}: title is required.`);
      if (l?.type === "link" && l.url && !isUrl(l.url)) errors.push(`${label}: URL must start with https://.`);
      if (l?.icon && !PLATFORMS.includes(l.icon)) errors.push(`${label}: unknown icon "${l.icon}".`);
      if (typeof l?.visible !== "boolean") errors.push(`${label}: visible must be true or false.`);
    });
  }

  if (!Array.isArray(s.books)) errors.push("Books must be a list.");
  else {
    const ids = new Set<string>();
    s.books.forEach((b, i) => {
      const label = `Book #${i + 1}${b?.title ? ` ("${b.title}")` : ""}`;
      if (!isStr(b?.id) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.id)) errors.push(`${label}: page address must be lowercase words joined by dashes.`);
      else if (ids.has(b.id)) errors.push(`${label}: page address "${b.id}" is used twice.`);
      else ids.add(b.id);
      if (!isStr(b?.title) || !b.title.trim()) errors.push(`${label}: title is required.`);
      if (!isStr(b?.author)) errors.push(`${label}: author must be text.`);
      if (!BOOK_STATUSES.includes(b?.status)) errors.push(`${label}: status must be reading, read or want.`);
      if (!Number.isInteger(b?.rating) || b.rating < 0 || b.rating > 5) errors.push(`${label}: rating must be 0 to 5.`);
      if (b?.cover && !isUrl(b.cover) && !b.cover.startsWith("/")) errors.push(`${label}: cover must be a full https:// URL or a /path.`);
      if (b?.finished && !/^\d{4}-\d{2}-\d{2}$/.test(b.finished)) errors.push(`${label}: finished date must look like 2026-10-18.`);
      if (b?.isbn13 && !/^97[89]\d{10}$/.test(b.isbn13)) errors.push(`${label}: ISBN-13 must be 13 digits starting with 978 or 979.`);
      if (b?.isbn10 && !/^\d{9}[\dX]$/.test(b.isbn10)) errors.push(`${label}: ISBN-10 must be 10 characters (digits, last may be X).`);
      if (typeof b?.pages !== "number" || b.pages < 0) errors.push(`${label}: pages must be a number (0 if unknown).`);
      for (const f of ["review", "quote", "synopsis", "publisher", "published", "edition", "language"] as const)
        if (!isStr(b?.[f])) errors.push(`${label}: ${f} must be text.`);
      if (!Array.isArray(b?.links)) errors.push(`${label}: links must be a list.`);
      else
        b.links.forEach((l, j) => {
          if (!isStr(l?.label) || !l.label.trim()) errors.push(`${label}, link #${j + 1}: needs a label.`);
          if (!isStr(l?.url) || !isUrl(l.url)) errors.push(`${label}, link #${j + 1}: URL must start with https://.`);
        });
      if (typeof b?.visible !== "boolean") errors.push(`${label}: visible must be true or false.`);
    });
  }

  const m = s.medium;
  if (!m || !isStr(m.username) || typeof m.show !== "boolean" || typeof m.count !== "number" || m.count < 1 || m.count > 10)
    errors.push("Medium needs a username, show (true/false) and a count from 1 to 10.");
  if (!isStr(s.footer)) errors.push("Footer must be text.");
  return errors;
}

/** Same rule as links: a product shows only when visible and linked. */
export function publicShopItems(site: Site) {
  return site.shop.items.filter((it) => it.visible && it.url);
}

/** A link is shown publicly only when it is visible and, for real links, has a URL. */
export function publicLinks(site: Site) {
  return site.links.filter((l) => l.visible && (l.type === "header" || Boolean(l.url)));
}

export function publicBooks(site: Site) {
  return site.books.filter((b) => b.visible);
}
