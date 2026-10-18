"use client";

import * as React from "react";
import { BookOpen, Plus } from "lucide-react";
import { CupRating } from "@/components/CupRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BOOK_STATUSES, STATUS_LABEL, type Book, type BookStatus } from "@/lib/site";
import { EmptyState, ListRow, ListSearch, Thumb } from "../_components/ListRow";
import { PageHeader } from "../_components/PageHeader";
import { SortableList } from "../_components/SortableList";
import { useGuardedNavigate } from "../_components/UnsavedGuard";
import { useCollection } from "../_components/useCollection";

const SHORT: Record<BookStatus, string> = { reading: "Reading", read: "Read", want: "Want" };

export function BooksList({ books }: { books: Book[] }) {
  const { items, reorder, move, setVisible, remove } = useCollection("books", books, "book");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<BookStatus | "all">("all");
  const navigate = useGuardedNavigate();

  const q = query.trim().toLowerCase();
  const shown = items.filter(
    (b) => (status === "all" || b.status === status) && (!q || `${b.title} ${b.author} ${b.isbn13}`.toLowerCase().includes(q)),
  );
  const filtered = !!q || status !== "all";
  // The home page shows the first three visible books.
  const onShelf = new Set(items.filter((b) => b.visible).slice(0, 3).map((b) => b.id));
  const count = (s: BookStatus) => items.filter((b) => b.status === s).length;

  return (
    <>
      <PageHeader
        title="Books"
        description="Her library at /books. The first three visible books sit on the home page shelf: drag to choose them."
        actions={
          <Button onClick={() => navigate("/admin/books/new")}>
            <Plus /> New
          </Button>
        }
      />
      {items.length > 0 && (
        <div className="mb-3 grid gap-2">
          <ToggleGroup type="single" value={status} onValueChange={(v) => setStatus((v || "all") as BookStatus | "all")} aria-label="Filter by status">
            <ToggleGroupItem value="all">All {items.length}</ToggleGroupItem>
            {BOOK_STATUSES.map((s) => (
              <ToggleGroupItem key={s} value={s}>
                {SHORT[s]} {count(s)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {items.length > 4 && <ListSearch value={query} onChange={setQuery} placeholder="Search title, author or ISBN" />}
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState title="No books yet">
          <Button onClick={() => navigate("/admin/books/new")}>
            <Plus /> Add the one you&apos;re reading
          </Button>
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState title="No books match" />
      ) : (
        <SortableList
          items={shown}
          disabled={filtered}
          onReorder={reorder}
          itemLabel={(b) => b.title}
          renderItem={(b, handle, dragging) => (
            <ListRow
              href={`/admin/books/${b.id}`}
              handle={handle}
              dragging={dragging}
              leading={<Thumb shape="book" src={b.cover} fallback={<BookOpen className="size-4" />} />}
              title={b.title}
              subtitle={b.author}
              badges={
                <>
                  <Badge variant={b.status === "reading" ? "default" : "secondary"}>{STATUS_LABEL[b.status]}</Badge>
                  {onShelf.has(b.id) && <Badge variant="outline">Home shelf</Badge>}
                  {b.rating > 0 && <CupRating value={b.rating} size={14} />}
                  {!b.visible && <Badge variant="outline">Hidden</Badge>}
                </>
              }
              externalUrl={`/books/${b.id}`}
              visible={b.visible}
              onVisibleChange={(v) => setVisible(b.id, v)}
              onMove={(where) => move(b.id, where)}
              onDelete={() => remove(b)}
            />
          )}
        />
      )}
      {filtered && shown.length > 0 && <p className="mt-3 text-center text-xs text-muted-foreground">Show all books with no search to drag and reorder.</p>}
    </>
  );
}
