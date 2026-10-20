"use client";

import * as React from "react";
import { BookOpen, Loader2, Search } from "lucide-react";
import type { BookInfo, CoverOption } from "@/lib/books/types";
import { sameTitle } from "@/lib/books/text";
import { editionFlag } from "@/lib/editionFlag";
import type { Book } from "@/lib/site";
import { Input } from "@/components/ui/input";

async function api<T>(params: Record<string, string>): Promise<T> {
  const res = await fetch(`/api/books/lookup?${new URLSearchParams(params)}`);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Lookup failed (${res.status}).`);
  return data as T;
}

type Details = { book: BookInfo | null; covers: CoverOption[] };

/** Full details for one book, with every cover found: by ISBN when we have one, otherwise by title and author. */
export async function fetchBookAndCovers(c: { isbn13?: string; title: string; author?: string }): Promise<Details> {
  const book = c.isbn13 || `${c.title} ${c.author ?? ""}`.trim();
  return api<Details>({ book });
}

/** Step 2 only: every cover found for the book's ISBN, or for its title and author when it has none. */
export async function fetchCovers(c: { isbn13?: string; title: string; author?: string }): Promise<CoverOption[]> {
  const params: Record<string, string> = c.isbn13
    ? { covers: c.isbn13, title: c.title.trim(), author: c.author ?? "" }
    : { covers: c.title.trim(), author: c.author ?? "" };
  return (await api<{ covers: CoverOption[] }>(params)).covers;
}

export async function fetchBookDetails(c: { isbn13?: string; title: string; author?: string }): Promise<BookInfo | null> {
  return (await fetchBookAndCovers(c)).book;
}

/** Fills only what's empty, so her own edits are never overwritten. Adds store links she doesn't have yet. */
export function fillMissing(book: Book, found: BookInfo): Partial<Book> {
  const patch: Partial<Book> = {};
  for (const k of ["title", "author", "cover", "synopsis", "isbn13", "isbn10", "publisher", "published", "edition", "language"] as const)
    if (!book[k] && found[k]) patch[k] = found[k];
  if (!book.pages && found.pages) patch.pages = found.pages;
  const have = new Set(book.links.map((l) => l.label.split(" ")[0].toLowerCase()));
  const extra = found.links.filter((l) => !have.has(l.label.split(" ")[0].toLowerCase()));
  if (extra.length) patch.links = [...book.links.filter((l) => l.url), ...extra];
  return patch;
}

/**
 * The full details when they're about the book she tapped (same ISBN, or the same title when the
 * suggestion had no ISBN), with the suggestion filling anything they lack. Otherwise the suggestion
 * as it was, so tapping one book never fills in another.
 */
export function sameBookOrPicked(picked: BookInfo, found: BookInfo | null): BookInfo {
  if (!found) return picked;
  const same = picked.isbn13 ? found.isbn13 === picked.isbn13 : sameTitle(picked.title, found.title);
  if (!same) return picked;
  const out = { ...found };
  for (const k of ["title", "author", "cover", "synopsis", "isbn10", "publisher", "published", "edition", "language"] as const) out[k] ||= picked[k];
  out.pages ||= picked.pages;
  if (!out.links.length) out.links = picked.links;
  return out;
}

/** Search box with suggestions as you type. Picking one fetches the full details and hands them to onPick. */
export function BookFinder({ onPick }: { onPick: (b: BookInfo) => void }) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<BookInfo[]>([]);
  const [status, setStatus] = React.useState<"idle" | "searching" | "loading" | "error">("idle");
  const [message, setMessage] = React.useState("");
  const seq = React.useRef(0);
  const short = query.trim().length < 3;
  const shown = short ? [] : results;

  React.useEffect(() => {
    const q = query.trim();
    const id = ++seq.current;
    if (q.length < 3) return;
    const t = setTimeout(async () => {
      setStatus("searching");
      try {
        const { results } = await api<{ results: BookInfo[] }>({ q });
        if (id !== seq.current) return;
        setResults(results);
        setStatus("idle");
        setMessage(results.length ? "" : "Nothing found. Try the ISBN from the back cover.");
      } catch (e) {
        if (id !== seq.current) return;
        setStatus("error");
        setMessage((e as Error).message);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [query]);

  const pick = async (b: BookInfo) => {
    setStatus("loading");
    setMessage(`Getting details and store links for "${b.title}"…`);
    try {
      onPick(sameBookOrPicked(b, await fetchBookDetails(b)));
      setStatus("idle");
      setMessage("");
    } catch (e) {
      setStatus("error");
      setMessage((e as Error).message);
    }
  };

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          placeholder="Title or ISBN, e.g. Laut Bercerita"
          aria-label="Find a book by title or ISBN"
          onChange={(e) => setQuery(e.target.value)}
          disabled={status === "loading"}
          autoComplete="off"
          className="pl-9"
          autoFocus
        />
        {(status === "searching" || status === "loading") && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Loading" />
        )}
      </div>
      {message && !short && <p className={status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</p>}
      {shown.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {shown.map((r, i) => (
            <li key={`${r.isbn13}-${i}`}>
              <button
                type="button"
                onClick={() => pick(r)}
                disabled={status === "loading"}
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent disabled:opacity-50"
              >
                <span className="flex h-16 w-11 shrink-0 items-center justify-center overflow-hidden rounded border bg-accent">
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote cover preview */}
                  {r.cover ? <img src={r.cover} alt="" loading="lazy" className="size-full object-cover" /> : <BookOpen className="size-4 text-muted-foreground" />}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5 text-sm">
                  <strong className="line-clamp-2 font-medium">{r.title}</strong>
                  <span className="truncate text-muted-foreground">{[r.author, r.publisher, r.edition || r.published].filter(Boolean).join(" · ")}</span>
                  <EditionLine book={r} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "🇮🇩 Indonesian · ISBN 978…": which edition this is, so translations and originals are easy to tell apart. */
function EditionLine({ book }: { book: BookInfo }) {
  const ed = editionFlag(book);
  if (!ed && !book.isbn13) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      {ed && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span role="img" aria-label={`${ed.label} edition`} className="text-sm leading-none">
            {ed.flag}
          </span>
          {ed.label}
        </span>
      )}
      {ed && book.isbn13 && <span aria-hidden>·</span>}
      {book.isbn13 && <span className="whitespace-nowrap">ISBN {book.isbn13}</span>}
    </span>
  );
}
