"use client";

import { useEffect, useRef, useState } from "react";
import type { Book } from "@/lib/site";
import type { BookInfo } from "@/lib/bookLookup";

async function api<T>(params: Record<string, string>): Promise<T> {
  const res = await fetch(`/api/books/lookup?${new URLSearchParams(params)}`);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Lookup failed (${res.status}).`);
  return data as T;
}

/** Full details for one book: by ISBN when we have one, otherwise by title and author. */
export async function fetchBookDetails(c: { isbn13?: string; title: string; author?: string }): Promise<BookInfo | null> {
  const book = c.isbn13 || `${c.title} ${c.author ?? ""}`.trim();
  return (await api<{ book: BookInfo | null }>({ book })).book;
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

/** Search box with suggestions as you type. Picking one fetches the full details and hands them to onPick. */
export function BookFinder({ onPick }: { onPick: (c: BookInfo) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookInfo[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const seq = useRef(0);
  // Short queries show nothing, without clearing state from inside the effect.
  const shown = query.trim().length >= 3 ? results : [];

  useEffect(() => {
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

  const pick = async (c: BookInfo) => {
    setStatus("loading");
    setMessage(`Getting details and store links for "${c.title}"…`);
    try {
      onPick((await fetchBookDetails(c)) ?? c);
      setQuery("");
      setResults([]);
      setMessage("");
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setMessage((e as Error).message);
    }
  };

  return (
    <div className="book-finder">
      <label className="field">
        <span>Find a book by title or ISBN</span>
        <input
          type="text"
          value={query}
          placeholder="e.g. Laut Bercerita or 9786024246945"
          onChange={(e) => setQuery(e.target.value)}
          disabled={status === "loading"}
          autoComplete="off"
        />
      </label>
      {status === "searching" && <p className="admin-note">Searching…</p>}
      {message && <p className={status === "error" ? "admin-error" : "admin-note"}>{message}</p>}
      {shown.length > 0 && (
        <ul className="finder-results">
          {shown.map((r, i) => (
            <li key={`${r.isbn13}-${i}`}>
              <button type="button" onClick={() => pick(r)} disabled={status === "loading"}>
                <span className="thumb thumb-finder">
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote cover preview */}
                  {r.cover ? <img src={r.cover} alt="" loading="lazy" /> : <span>?</span>}
                </span>
                <span className="finder-text">
                  <strong>{r.title}</strong>
                  <span>{[r.author, r.publisher, r.edition || r.published].filter(Boolean).join(" · ")}</span>
                  {r.isbn13 && <span className="finder-isbn">ISBN {r.isbn13}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
