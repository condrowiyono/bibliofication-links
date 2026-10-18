"use client";

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isDetailPath } from "./nav";

/**
 * The form's Save button. Phones: fixed to the bottom of the screen (above the tab bar on pages that
 * have one). Desktop: sticks to the bottom of the content while scrolling.
 */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  label = "Save",
  status,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  label?: string;
  status?: string;
}) {
  const overTabs = !isDetailPath(usePathname());
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-30 border-t bg-card/95 px-4 pt-2 backdrop-blur md:sticky md:bottom-4 md:mt-6 md:rounded-xl md:border md:pb-2 md:shadow-md",
        overTabs ? "bottom-[calc(3.5rem+max(0.5rem,env(safe-area-inset-bottom)))] pb-2" : "bottom-0 pb-safe",
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground" role="status" aria-live="polite">
          {status ?? (dirty ? "Unsaved changes" : "All changes saved")}
        </p>
        {onDiscard && dirty && (
          <Button variant="ghost" onClick={onDiscard} disabled={saving}>
            Discard
          </Button>
        )}
        <Button onClick={onSave} disabled={!dirty || saving} className="min-w-24">
          {saving && <Loader2 className="animate-spin" />}
          {saving ? "Saving…" : label}
        </Button>
      </div>
    </div>
  );
}
