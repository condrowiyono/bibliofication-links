"use client";

import * as React from "react";
import { Check, ImageIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CoverOption } from "@/lib/bookCovers";
import { cn } from "@/lib/utils";
import { ResponsiveDialog } from "../_components/ResponsiveDialog";
import { fetchBookAndCovers } from "./BookFinder";

/**
 * "Choose cover": looks the book up and shows every cover found (Gramedia, Goodreads, Amazon,
 * Apple Books, Open Library, Google Books…) as a grid. Tapping one uses it.
 */
export function CoverPicker({
  book,
  current,
  onPick,
}: {
  book: { isbn13: string; title: string; author: string };
  current: string;
  onPick: (url: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<{ status: "idle" | "loading" | "done" | "error"; covers: CoverOption[]; error?: string }>({
    status: "idle",
    covers: [],
  });
  const canSearch = !!(book.isbn13 || book.title.trim());

  const load = async () => {
    setOpen(true);
    setState({ status: "loading", covers: [] });
    try {
      const { covers } = await fetchBookAndCovers(book);
      setState({ status: "done", covers });
    } catch (e) {
      setState({ status: "error", covers: [], error: (e as Error).message });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full px-2"
        onClick={load}
        disabled={!canSearch}
        title={canSearch ? "Choose from the covers found online" : "Add the title or ISBN first"}
      >
        <ImageIcon /> {current ? "Change" : "Find"}
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title="Choose a cover"
        description={book.isbn13 ? `Covers found for ISBN ${book.isbn13}.` : `Covers found for “${book.title}”. Without an ISBN some may be other editions.`}
      >
        {state.status === "loading" && (
          <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking Gramedia, Goodreads, Amazon, Apple Books and the catalogues…
          </p>
        )}
        {state.status === "error" && <p className="py-6 text-sm text-destructive">{state.error}</p>}
        {state.status === "done" && state.covers.length === 0 && (
          <p className="py-6 text-sm text-muted-foreground">No covers found. Paste an image URL in the cover field instead.</p>
        )}
        {state.covers.length > 0 && (
          <ul className="grid grid-cols-3 gap-3 pb-2 sm:grid-cols-4">
            {state.covers.map((c) => {
              const selected = c.url === current;
              return (
                <li key={c.url}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(c.url);
                      setOpen(false);
                    }}
                    aria-label={`Use the ${c.source} cover${c.exact ? "" : " (may be another edition)"}`}
                    aria-pressed={selected}
                    className={cn("group grid w-full gap-1.5 text-left", selected && "text-primary")}
                  >
                    <span
                      className={cn(
                        "relative block aspect-[2/3] overflow-hidden rounded-md border bg-accent shadow-xs transition group-hover:shadow-md",
                        selected && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- covers from many hosts */}
                      <img src={c.url} alt="" loading="lazy" className="size-full object-cover" />
                      {selected && (
                        <span className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-4" />
                        </span>
                      )}
                    </span>
                    <span className="truncate text-xs font-medium">{c.source}</span>
                    {!c.exact && (
                      <Badge variant="outline" className="text-[10px]">
                        Maybe other edition
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ResponsiveDialog>
    </>
  );
}
