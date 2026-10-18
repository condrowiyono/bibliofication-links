"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Book } from "@/lib/site";
import { BookCover } from "./BookCover";
import { TeaCup } from "./TeaCup";

export type ShelfBook = Pick<Book, "id" | "title" | "author" | "cover" | "status">;

const PER_ROW = 3;
const BULBS = 9;

/** Bulbs hang along the same sagging curve the wire is drawn with: high at the ends, lowest in the middle. */
const bulbY = (t: number) => 6 * (1 - t) ** 2 + 2 * 26 * (1 - t) * t + 6 * t ** 2;

function Garland({ row }: { row: number }) {
  return (
    <div className="garland" aria-hidden="true">
      <svg className="garland-wire" viewBox="0 0 100 24" preserveAspectRatio="none">
        <path d="M0 6 Q50 26 100 6" />
      </svg>
      {Array.from({ length: BULBS }, (_, i) => {
        const t = (i + 0.5) / BULBS;
        return (
          <span
            key={i}
            className="bulb"
            style={{
              left: `${t * 100}%`,
              top: `${bulbY(t) * 0.92}px`,
              ["--b" as string]: row * BULBS + i,
              // Uneven twinkle timing so the string never pulses in unison.
              ["--tw" as string]: `${((i * 7 + row * 3) % 5) * 0.45}s`,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Face-out books on shelves under fairy lights. When the shelf scrolls into view the lights come on one by one
 * and the books drop into place; after that the lights twinkle slowly. Reduced motion skips straight to the end.
 */
export function BookShelf({ books, cup }: { books: ShelfBook[]; cup?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"pending" | "run">("pending");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("run");
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const rows: ShelfBook[][] = [];
  for (let i = 0; i < books.length; i += PER_ROW) rows.push(books.slice(i, i + PER_ROW));
  if (rows.length === 0) rows.push([]);

  return (
    <div ref={ref} className="bshelf" data-anim={state}>
      {rows.map((row, r) => (
        <div className="bshelf-row" key={r}>
          <Garland row={r} />
          <ul className="bshelf-books">
            {row.map((b, i) => (
              <li key={b.id} className="bbook-slot" style={{ ["--i" as string]: r * PER_ROW + i }}>
                <Link href={`/books/${b.id}`} className="bbook" data-status={b.status}>
                  <BookCover src={b.cover} title={b.title} author={b.author} tone={r * PER_ROW + i} />
                  <span className="sr-only">
                    {b.title} by {b.author}
                    {b.status === "reading" ? ", reading now" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {/* A cup set down on the front edge of the bottom shelf, in front of the last book */}
          {cup && r === rows.length - 1 && (
            <div className="bshelf-cup" aria-hidden="true">
              <TeaCup label="" />
            </div>
          )}
          <div className="bshelf-plank" />
        </div>
      ))}
      {books.length === 0 && <p className="bshelf-empty">No books here yet.</p>}
    </div>
  );
}
