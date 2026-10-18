"use client";

import { ExternalLink, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** The ⋮ menu at the top of a detail page. */
export function DetailActions({ onDelete, openUrl, openLabel = "Open link", isNew }: { onDelete: () => void; openUrl?: string; openLabel?: string; isNew: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="More actions">
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {openUrl && (
          <DropdownMenuItem asChild>
            <a href={openUrl} target="_blank" rel="noopener">
              <ExternalLink /> {openLabel}
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 /> {isNew ? "Discard" : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Save problems listed above the form, in addition to the toast. */
export function FormErrors({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div role="alert" className="mb-4 rounded-xl border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
      <p className="font-medium">Not saved yet:</p>
      <ul className="mt-1 list-disc pl-5">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
