"use client";

import * as React from "react";
import { BookOpen, ChevronDown, Loader2, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { CupRating } from "@/components/CupRating";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BookInfo } from "@/lib/bookLookup";
import { BOOK_STATUSES, STATUS_LABEL, type Book, type BookStatus } from "@/lib/site";
import { DetailActions, FormErrors } from "../_components/DetailActions";
import { FormField, SwitchRow } from "../_components/FormField";
import { PageHeader } from "../_components/PageHeader";
import { SaveBar } from "../_components/SaveBar";
import { useItemForm } from "../_components/useItemForm";
import { BookFinder, fetchBookDetails, fillMissing } from "./BookFinder";
import { CoverPicker } from "./CoverPicker";

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "book";

export function BookForm({ book, isNew }: { book: Book; isNew: boolean }) {
  const f = useItemForm("books", book, { isNew, noun: "book", listHref: "/admin/books" });
  const b = f.value;
  // A new book's page address follows its title until it's edited by hand.
  const [autoId, setAutoId] = React.useState(isNew);
  const [step, setStep] = React.useState<"search" | "form">(isNew ? "search" : "form");
  const [filling, setFilling] = React.useState(false);

  const setTitle = (title: string) => f.set(autoId ? { title, id: slugify(title) } : { title });

  const fromSearch = (found: BookInfo) => {
    f.set({ ...found, id: autoId ? slugify(found.title) : b.id });
    setStep("form");
    toast.success(`Filled in "${found.title}". Add your rating and review, then save.`);
  };

  const fill = async () => {
    setFilling(true);
    try {
      const found = await fetchBookDetails(b);
      if (!found) return void toast.error("Couldn't find this book. Check the ISBN or title.");
      const patch = fillMissing(b, found);
      f.set(patch);
      const n = Object.keys(patch).length;
      if (n) toast.success(`Filled ${n} empty field${n === 1 ? "" : "s"}`, { description: "Check them before saving." });
      else toast("Nothing new", { description: "Every field already has a value." });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setFilling(false);
    }
  };

  if (step === "search")
    return (
      <>
        <PageHeader back={{ href: "/admin/books", label: "Books" }} title="New book" description="Find it first: the cover, edition details and store links fill in for you." />
        <Card>
          <CardContent className="grid gap-4">
            <BookFinder onPick={fromSearch} />
            <Button variant="ghost" className="justify-self-center" onClick={() => setStep("form")}>
              Skip, I&apos;ll fill it in myself
            </Button>
          </CardContent>
        </Card>
      </>
    );

  const links = b.links;
  const setLink = (j: number, patch: Partial<Book["links"][number]>) => f.set({ links: links.map((l, k) => (k === j ? { ...l, ...patch } : l)) });

  return (
    <>
      <PageHeader
        back={{ href: "/admin/books", label: "Books" }}
        title={isNew ? "New book" : b.title || "Untitled"}
        description={!isNew && b.author ? b.author : undefined}
        actions={<DetailActions isNew={isNew} onDelete={f.remove} openUrl={isNew ? undefined : `/books/${book.id}`} openLabel="View book page" />}
      />
      <FormErrors errors={f.errors} />

      <div className="grid gap-4">
        <Card>
          <CardContent className="flex gap-4">
            <div className="grid shrink-0 content-start gap-2">
              <span className="flex h-36 w-24 items-center justify-center overflow-hidden rounded-md border bg-accent shadow-sm md:h-44 md:w-30">
                {/* eslint-disable-next-line @next/next/no-img-element -- preview of a pasted URL */}
                {b.cover ? <img src={b.cover} alt="" className="size-full object-cover" /> : <BookOpen className="size-6 text-muted-foreground" />}
              </span>
              <CoverPicker book={b} current={b.cover} onPick={(cover) => f.set({ cover })} />
            </div>
            <div className="grid min-w-0 flex-1 content-start gap-3">
              <FormField id="title" label="Title">
                <Input id="title" value={b.title} onChange={(e) => setTitle(e.target.value)} />
              </FormField>
              <FormField id="author" label="Author">
                <Input id="author" value={b.author} onChange={(e) => f.set({ author: e.target.value })} />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Her shelf</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ToggleGroup type="single" value={b.status} onValueChange={(v) => v && f.set({ status: v as BookStatus })} aria-label="Status">
              {BOOK_STATUSES.map((s) => (
                <ToggleGroupItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Rating</span>
              <ToggleGroup type="single" value={String(b.rating)} onValueChange={(v) => v && f.set({ rating: Number(v) })} aria-label="Rating in cups of matcha">
                <ToggleGroupItem value="0" aria-label="Not rated">
                  –
                </ToggleGroupItem>
                {[1, 2, 3, 4, 5].map((n) => (
                  <ToggleGroupItem key={n} value={String(n)} aria-label={`${n} of 5 cups`}>
                    {n}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {b.rating ? <CupRating value={b.rating} size={16} /> : "Not rated yet"}
              </span>
            </div>
            <FormField id="finished" label="Finished on">
              <Input id="finished" type="date" value={b.finished} onChange={(e) => f.set({ finished: e.target.value })} className="w-full md:w-48" />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Her words</CardTitle>
            <CardDescription>Shown on the book&apos;s page.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField id="review" label="Review" hint="Leave a blank line between paragraphs.">
              <Textarea id="review" value={b.review} onChange={(e) => f.set({ review: e.target.value })} className="min-h-40" />
            </FormField>
            <FormField id="quote" label="Highlighted passage" hint="Optional.">
              <Textarea id="quote" value={b.quote} onChange={(e) => f.set({ quote: e.target.value })} />
            </FormField>
          </CardContent>
        </Card>

        <Collapsible defaultOpen={isNew || !b.isbn13}>
          <Card className="gap-0">
            <CardHeader>
              <CardTitle>Edition details</CardTitle>
              <CardDescription>From the book&apos;s public listing.</CardDescription>
              <CardAction>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Show or hide edition details" className="group">
                    <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
              </CardAction>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="grid gap-4 pt-5">
                <Button variant="secondary" onClick={fill} disabled={filling || !(b.isbn13 || b.title.trim())}>
                  {filling ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {filling ? "Looking it up…" : "Fill empty fields and store links"}
                </Button>
                <FormField id="isbn13" label="ISBN-13">
                  <Input id="isbn13" inputMode="numeric" value={b.isbn13} onChange={(e) => f.set({ isbn13: e.target.value.replace(/[^0-9]/g, "") })} />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField id="isbn10" label="ISBN-10">
                    <Input id="isbn10" value={b.isbn10} onChange={(e) => f.set({ isbn10: e.target.value.toUpperCase().replace(/[^0-9X]/g, "") })} />
                  </FormField>
                  <FormField id="pages" label="Pages">
                    <Input
                      id="pages"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={b.pages || ""}
                      onChange={(e) => f.set({ pages: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </FormField>
                </div>
                <FormField id="publisher" label="Publisher">
                  <Input id="publisher" value={b.publisher} onChange={(e) => f.set({ publisher: e.target.value })} />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField id="published" label="First published">
                    <Input id="published" inputMode="numeric" value={b.published} onChange={(e) => f.set({ published: e.target.value })} />
                  </FormField>
                  <FormField id="edition" label="Edition year">
                    <Input id="edition" inputMode="numeric" value={b.edition} onChange={(e) => f.set({ edition: e.target.value })} />
                  </FormField>
                </div>
                <FormField id="language" label="Language">
                  <Input id="language" value={b.language} onChange={(e) => f.set({ language: e.target.value })} />
                </FormField>
                <FormField id="synopsis" label="What it's about" hint="A short synopsis.">
                  <Textarea id="synopsis" value={b.synopsis} onChange={(e) => f.set({ synopsis: e.target.value })} />
                </FormField>
                <FormField id="cover" label="Cover image URL">
                  <div className="flex gap-2">
                    <Input id="cover" type="url" inputMode="url" autoCapitalize="none" placeholder="https://…" value={b.cover} onChange={(e) => f.set({ cover: e.target.value.trim() })} />
                  </div>
                </FormField>
                <FormField id="book-id" label="Page address" hint={`bethanielle.me/books/${b.id || "…"}`}>
                  <div className="flex gap-2">
                    <Input
                      id="book-id"
                      autoCapitalize="none"
                      value={b.id}
                      onChange={(e) => {
                        setAutoId(false);
                        f.set({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") });
                      }}
                    />
                    <Button variant="outline" onClick={() => f.set({ id: slugify(b.title) })}>
                      Use title
                    </Button>
                  </div>
                </FormField>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Card>
          <CardHeader>
            <CardTitle>Where to find it</CardTitle>
            <CardDescription>Gramedia, Goodreads, Amazon… Links labelled “(search)” open a search on that store.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {links.map((l, j) => (
              <div key={j} className="grid gap-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Input aria-label="Label" placeholder="Store" value={l.label} onChange={(e) => setLink(j, { label: e.target.value })} />
                  <Button variant="ghost" size="icon" aria-label={`Remove ${l.label || "link"}`} onClick={() => f.set({ links: links.filter((_, k) => k !== j) })}>
                    <X />
                  </Button>
                </div>
                <Input aria-label="URL" type="url" inputMode="url" autoCapitalize="none" placeholder="https://…" value={l.url} onChange={(e) => setLink(j, { url: e.target.value.trim() })} />
              </div>
            ))}
            <Button variant="outline" onClick={() => f.set({ links: [...links, { label: "", url: "" }] })}>
              <Plus /> Add store link
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SwitchRow id="visible" label="Show on page" hint="Hidden books stay here but not in the library.">
              <Switch id="visible" checked={b.visible} onCheckedChange={(v) => f.set({ visible: v })} />
            </SwitchRow>
          </CardContent>
        </Card>
      </div>

      <SaveBar dirty={f.dirty} saving={f.saving} onSave={f.save} onDiscard={isNew ? undefined : f.discard} label={isNew ? "Add book" : "Save"} />
    </>
  );
}
