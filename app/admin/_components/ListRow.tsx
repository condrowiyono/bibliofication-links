"use client";

import * as React from "react";
import { ArrowDownToLine, ArrowUpToLine, ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { GuardedLink, useGuardedNavigate } from "./UnsavedGuard";

/** One row in a list page: grip, picture, text (tap to open), a show/hide switch and a ⋮ menu. */
export function ListRow({
  href,
  handle,
  leading,
  title,
  subtitle,
  badges,
  visible,
  onVisibleChange,
  onMove,
  onDelete,
  externalUrl,
  dragging,
  tone = "default",
}: {
  href: string;
  handle: React.ReactNode;
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  visible: boolean;
  onVisibleChange: (v: boolean) => void;
  onMove: (where: "top" | "bottom") => void;
  onDelete: () => void;
  externalUrl?: string;
  dragging?: boolean;
  tone?: "default" | "section";
}) {
  const navigate = useGuardedNavigate();
  return (
    <div
      className={cn(
        "flex min-h-16 items-stretch rounded-xl border bg-card shadow-xs transition-shadow",
        tone === "section" && "bg-secondary",
        !visible && "opacity-70",
        dragging && "shadow-lg ring-2 ring-primary/40",
      )}
    >
      {handle}
      <GuardedLink href={href} className="flex min-w-0 flex-1 items-center gap-3 py-2 pr-1">
        {leading}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={cn("truncate font-medium", tone === "section" && "font-display text-lg")}>{title}</span>
          {subtitle && <span className="truncate text-sm text-muted-foreground">{subtitle}</span>}
          {badges && <span className="mt-0.5 flex flex-wrap gap-1">{badges}</span>}
        </span>
      </GuardedLink>
      <div className="flex shrink-0 items-center gap-1 pr-1">
        <Switch checked={visible} onCheckedChange={onVisibleChange} aria-label={visible ? "Showing on the page. Hide it" : "Hidden. Show it on the page"} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => navigate(href)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            {externalUrl && (
              <DropdownMenuItem asChild>
                <a href={externalUrl} target="_blank" rel="noopener">
                  <ExternalLink /> Open link
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => onMove("top")}>
              <ArrowUpToLine /> Move to top
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMove("bottom")}>
              <ArrowDownToLine /> Move to bottom
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** A square (or book-shaped) picture for a row, with a fallback letter or icon. */
export function Thumb({ src, fallback, shape = "square" }: { src?: string; fallback: React.ReactNode; shape?: "square" | "book" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-accent text-sm font-semibold text-accent-foreground",
        shape === "book" ? "h-14 w-10" : "size-11",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote URLs pasted in the editor */}
      {src ? <img src={src} alt="" className="size-full object-cover" loading="lazy" /> : fallback}
    </span>
  );
}

/** Search box above a list. */
export function ListSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="h-11 w-full rounded-md border border-input bg-card px-3 text-base shadow-xs placeholder:text-muted-foreground md:h-9 md:text-sm"
    />
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}
