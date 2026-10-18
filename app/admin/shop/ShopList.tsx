"use client";

import * as React from "react";
import { ChevronDown, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { STORE_NAMES, STORES, type Shop } from "@/lib/site";
import { saveShopSettingsAction } from "../actions";
import { FormField } from "../_components/FormField";
import { EmptyState, ListRow, ListSearch, Thumb } from "../_components/ListRow";
import { PageHeader } from "../_components/PageHeader";
import { SortableList } from "../_components/SortableList";
import { useGuardedNavigate } from "../_components/UnsavedGuard";
import { errorToast, useCollection } from "../_components/useCollection";

export function ShopList({ shop }: { shop: Shop }) {
  const { items, reorder, move, setVisible, remove } = useCollection("shop", shop.items, "product");
  const [query, setQuery] = React.useState("");
  const navigate = useGuardedNavigate();
  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((it) => `${it.title} ${STORE_NAMES[it.store]}`.toLowerCase().includes(q)) : items;

  return (
    <>
      <PageHeader
        title="Shop picks"
        description="Affiliate products from Shopee and TikTok Shop, shown as a photo grid near the top of the page."
        actions={
          <Button onClick={() => navigate("/admin/shop/new")}>
            <Plus /> New
          </Button>
        }
      />
      <ShopSettings shop={shop} />
      {items.length > 4 && (
        <div className="mb-3">
          <ListSearch value={query} onChange={setQuery} placeholder="Search products" />
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState title="No products yet">
          <Button onClick={() => navigate("/admin/shop/new")}>
            <Plus /> Add a product
          </Button>
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState title={`Nothing matches "${query}"`} />
      ) : (
        <SortableList
          items={shown}
          disabled={!!q}
          onReorder={reorder}
          itemLabel={(it) => it.title}
          renderItem={(it, handle, dragging) => (
            <ListRow
              href={`/admin/shop/${it.id}`}
              handle={handle}
              dragging={dragging}
              leading={<Thumb src={it.image} fallback={<ShoppingBag className="size-5" />} />}
              title={it.title}
              subtitle={[STORE_NAMES[it.store], it.price].filter(Boolean).join(" · ")}
              badges={
                (!it.url || !it.visible) && (
                  <>
                    {!it.url && <Badge variant="warning">Needs a link</Badge>}
                    {!it.visible && <Badge variant="outline">Hidden</Badge>}
                  </>
                )
              }
              externalUrl={it.url || undefined}
              visible={it.visible}
              onVisibleChange={(v) => setVisible(it.id, v)}
              onMove={(where) => move(it.id, where)}
              onDelete={() => remove(it)}
            />
          )}
        />
      )}
    </>
  );
}

/** Section title and the "See everything on …" store buttons, folded away by default. */
function ShopSettings({ shop }: { shop: Shop }) {
  const [title, setTitle] = React.useState(shop.title);
  const [stores, setStores] = React.useState(shop.stores);
  const [saving, setSaving] = React.useState(false);
  const dirty = title !== shop.title || JSON.stringify(stores) !== JSON.stringify(shop.stores);

  const save = async () => {
    setSaving(true);
    const res = await saveShopSettingsAction({ title, stores });
    setSaving(false);
    if (res.ok) toast.success("Shop settings saved");
    else errorToast(res.errors);
  };

  return (
    <Collapsible className="mb-4">
      <Card className="gap-0 py-0">
        <CollapsibleTrigger className="group flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-medium md:px-5">
          <span>
            Section title and store buttons
            <span className="block text-xs font-normal text-muted-foreground">&ldquo;{shop.title}&rdquo;</span>
          </span>
          <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="grid gap-4 pb-5">
            <FormField id="shop-title" label="Section title">
              <Input id="shop-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </FormField>
            {STORES.map((st) => (
              <FormField key={st} id={`store-${st}`} label={`${STORE_NAMES[st]} store link`} hint="Optional. Adds a green “See everything on …” button under the grid.">
                <Input
                  id={`store-${st}`}
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  placeholder="https://…"
                  value={stores[st]}
                  onChange={(e) => setStores({ ...stores, [st]: e.target.value.trim() })}
                />
              </FormField>
            ))}
            <Button onClick={save} disabled={!dirty || saving} className="justify-self-end">
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
