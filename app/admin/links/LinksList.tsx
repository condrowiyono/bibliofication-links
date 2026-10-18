"use client";

import * as React from "react";
import { Heading, Link2, Plus, Star } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { LinkItem } from "@/lib/site";
import { EmptyState, ListRow, ListSearch, Thumb } from "../_components/ListRow";
import { PageHeader } from "../_components/PageHeader";
import { SortableList } from "../_components/SortableList";
import { useGuardedNavigate } from "../_components/UnsavedGuard";
import { useCollection } from "../_components/useCollection";

export function LinksList({ links }: { links: LinkItem[] }) {
  const { items, reorder, move, setVisible, remove } = useCollection("links", links, "link");
  const [query, setQuery] = React.useState("");
  const navigate = useGuardedNavigate();
  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((l) => `${l.title} ${l.subtitle ?? ""} ${l.url ?? ""}`.toLowerCase().includes(q)) : items;

  return (
    <>
      <PageHeader
        title="Links"
        description="Shown top to bottom. Drag the grip to reorder; section headings group the links under them."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus /> New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => navigate("/admin/links/new")}>
                <Link2 /> Link
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/admin/links/new?type=header")}>
                <Heading /> Section heading
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      {items.length > 4 && (
        <div className="mb-3">
          <ListSearch value={query} onChange={setQuery} placeholder="Search links" />
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState title="No links yet">
          <Button onClick={() => navigate("/admin/links/new")}>
            <Plus /> Add your first link
          </Button>
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState title={`Nothing matches "${query}"`} />
      ) : (
        <SortableList
          items={shown}
          disabled={!!q}
          onReorder={reorder}
          itemLabel={(l) => l.title}
          renderItem={(l, handle, dragging) => (
            <ListRow
              href={`/admin/links/${l.id}`}
              handle={handle}
              dragging={dragging}
              tone={l.type === "header" ? "section" : "default"}
              leading={
                l.type === "link" ? (
                  <Thumb fallback={l.icon ? <BrandIcon platform={l.icon} /> : l.title.charAt(0).toUpperCase()} />
                ) : undefined
              }
              title={l.title}
              subtitle={l.type === "header" ? "Section heading" : l.subtitle || l.url}
              badges={
                (l.featured || (l.type === "link" && !l.url) || !l.visible) && (
                  <>
                    {l.featured && (
                      <Badge>
                        <Star /> Featured
                      </Badge>
                    )}
                    {l.type === "link" && !l.url && <Badge variant="warning">Needs a URL</Badge>}
                    {!l.visible && <Badge variant="outline">Hidden</Badge>}
                  </>
                )
              }
              externalUrl={l.url || undefined}
              visible={l.visible}
              onVisibleChange={(v) => setVisible(l.id, v)}
              onMove={(where) => move(l.id, where)}
              onDelete={() => remove(l)}
            />
          )}
        />
      )}
      {q && shown.length > 0 && <p className="mt-3 text-center text-xs text-muted-foreground">Clear the search to drag and reorder.</p>}
    </>
  );
}
