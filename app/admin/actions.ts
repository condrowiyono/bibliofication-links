"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, logIn, logOut } from "@/lib/auth";
import { getSite, putSite, validateSite, type Book, type LinkItem, type ShopItem, type Site } from "@/lib/site";

export type LoginState = { error: string } | null;

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const ok = await logIn(String(form.get("password") ?? ""));
  if (!ok) return { error: "That password didn't work. Try again." };
  revalidatePath("/admin", "layout");
  return null;
}

export async function logoutAction() {
  await logOut();
  revalidatePath("/admin", "layout");
}

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; errors: string[] };

const SESSION_ENDED = "Your session ended. Reload the page and log in again.";

/**
 * Reads the stored page, applies one change, validates the whole page and writes it back.
 * Each save touches only what it changes, so two open tabs don't overwrite each other's edits.
 */
async function mutate<T extends object>(change: (site: Site) => { site: Site; result?: T } | string): Promise<ActionResult<T>> {
  if (!(await isAdmin())) return { ok: false, errors: [SESSION_ENDED] };
  let current: Site;
  try {
    current = await getSite();
  } catch {
    return { ok: false, errors: ["Couldn't read the saved page. Try again in a moment."] };
  }
  const out = change(current);
  if (typeof out === "string") return { ok: false, errors: [out] };
  const errors = validateSite(out.site);
  if (errors.length) return { ok: false, errors };
  try {
    await putSite(out.site);
  } catch {
    return { ok: false, errors: ["Couldn't write to storage. Nothing was saved, try again in a moment."] };
  }
  revalidatePath("/", "layout");
  return { ok: true, ...(out.result ?? ({} as T)) };
}

// ---------- Lists: links, shop products, books ----------

export type CollectionName = "links" | "shop" | "books";
type ItemOf<C extends CollectionName> = C extends "links" ? LinkItem : C extends "shop" ? ShopItem : Book;

function getList<C extends CollectionName>(site: Site, c: C): ItemOf<C>[] {
  return (c === "links" ? site.links : c === "shop" ? site.shop.items : site.books) as ItemOf<C>[];
}

function setList<C extends CollectionName>(site: Site, c: C, items: ItemOf<C>[]): Site {
  if (c === "links") return { ...site, links: items as LinkItem[] };
  if (c === "shop") return { ...site, shop: { ...site.shop, items: items as ShopItem[] } };
  return { ...site, books: items as Book[] };
}

const NOUN: Record<CollectionName, string> = { links: "link", shop: "product", books: "book" };

/**
 * Creates or updates one item. `originalId` is the id it was opened with (a book's page address can change).
 * New links and products go to the end of the list; new books go first, where the home shelf shows them.
 */
export async function saveItemAction<C extends CollectionName>(c: C, item: ItemOf<C>, originalId?: string) {
  return mutate<{ id: string }>((site) => {
    const list = getList(site, c);
    const index = originalId ? list.findIndex((x) => x.id === originalId) : -1;
    if (originalId && index === -1) return `This ${NOUN[c]} was deleted in another tab. Copy your text, then add it again.`;
    let saved = item;
    if (index === -1 && list.some((x) => x.id === item.id)) {
      // A new item whose id is taken (two books with the same title): add -2, -3…
      let n = 2;
      while (list.some((x) => x.id === `${item.id}-${n}`)) n++;
      saved = { ...item, id: `${item.id}-${n}` };
    }
    const next = index >= 0 ? list.map((x, i) => (i === index ? saved : x)) : c === "books" ? [saved, ...list] : [...list, saved];
    return { site: setList(site, c, next), result: { id: saved.id } };
  });
}

/** Changes a few fields of one item, e.g. the visibility switch in a list. */
export async function patchItemAction<C extends CollectionName>(c: C, id: string, patch: Partial<ItemOf<C>>) {
  return mutate((site) => {
    const list = getList(site, c);
    if (!list.some((x) => x.id === id)) return `This ${NOUN[c]} no longer exists. Reload the list.`;
    return { site: setList(site, c, list.map((x) => (x.id === id ? { ...x, ...patch } : x))) };
  });
}

/** Deletes one item and returns it with its position, so the toast's Undo can put it back. */
export async function deleteItemAction<C extends CollectionName>(c: C, id: string) {
  return mutate<{ item: ItemOf<C>; index: number }>((site) => {
    const list = getList(site, c);
    const index = list.findIndex((x) => x.id === id);
    if (index === -1) return `This ${NOUN[c]} was already deleted.`;
    return { site: setList(site, c, list.filter((x) => x.id !== id)), result: { item: list[index], index } };
  });
}

export async function restoreItemAction<C extends CollectionName>(c: C, item: ItemOf<C>, index: number) {
  return mutate((site) => {
    const list = getList(site, c);
    if (list.some((x) => x.id === item.id)) return { site };
    const next = [...list];
    next.splice(Math.min(index, next.length), 0, item);
    return { site: setList(site, c, next) };
  });
}

/** Puts the list in the given order. Items added elsewhere since the list was loaded keep their place at the end. */
export async function reorderAction(c: CollectionName, ids: string[]) {
  return mutate((site) => {
    const list = getList(site, c);
    const byId = new Map(list.map((x) => [x.id, x]));
    const ordered = ids.map((id) => byId.get(id)).filter((x) => x !== undefined);
    const rest = list.filter((x) => !ids.includes(x.id));
    return { site: setList(site, c, [...ordered, ...rest]) };
  });
}

// ---------- Single sections ----------

export type ProfileData = Pick<Site, "profile" | "socials" | "medium" | "footer">;

export async function saveProfileAction(data: ProfileData) {
  return mutate((site) => ({ site: { ...site, ...data } }));
}

export async function saveShopSettingsAction(data: Pick<Site["shop"], "title" | "stores">) {
  return mutate((site) => ({ site: { ...site, shop: { ...site.shop, ...data } } }));
}

/** The JSON page: replaces everything. */
export async function saveSiteAction(site: Site) {
  return mutate<{ savedAt: string }>(() => ({ site, result: { savedAt: new Date().toISOString() } }));
}
