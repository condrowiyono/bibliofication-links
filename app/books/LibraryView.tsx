"use client";

import { useState } from "react";
import { BookShelf, type ShelfBook } from "@/components/BookShelf";
import { BOOK_STATUSES, STATUS_LABEL, type BookStatus } from "@/lib/site";

/** The library shelf with status filters. Switching filters restocks the shelf, so the books drop in again. */
export function LibraryView({ books }: { books: ShelfBook[] }) {
  const [filter, setFilter] = useState<BookStatus | "all">("all");
  const present = BOOK_STATUSES.filter((st) => books.some((b) => b.status === st));
  const shown = filter === "all" ? books : books.filter((b) => b.status === filter);

  return (
    <>
      {present.length > 1 && (
        <div className="filters" role="group" aria-label="Show books">
          {(["all", ...present] as const).map((f) => (
            <button key={f} type="button" className="filter" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : STATUS_LABEL[f]} <span className="filter-count">{f === "all" ? books.length : books.filter((b) => b.status === f).length}</span>
            </button>
          ))}
        </div>
      )}
      <BookShelf key={filter} books={shown} cup />
    </>
  );
}
