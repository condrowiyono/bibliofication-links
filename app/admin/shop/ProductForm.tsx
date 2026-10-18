"use client";

import { ShoppingBag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { STORE_NAMES, STORES, type ShopItem, type Store } from "@/lib/site";
import { DetailActions, FormErrors } from "../_components/DetailActions";
import { FormField, SwitchRow } from "../_components/FormField";
import { PageHeader } from "../_components/PageHeader";
import { SaveBar } from "../_components/SaveBar";
import { useItemForm } from "../_components/useItemForm";

const LINK_PLACEHOLDER: Record<Store, string> = { shopee: "https://s.shopee.co.id/…", tiktok: "https://vt.tokopedia.com/…" };

export function ProductForm({ item, isNew }: { item: ShopItem; isNew: boolean }) {
  const f = useItemForm("shop", item, { isNew, noun: "product", listHref: "/admin/shop" });
  const it = f.value;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/shop", label: "Shop" }}
        title={isNew ? "New product" : it.title || "Untitled"}
        actions={<DetailActions isNew={isNew} onDelete={f.remove} openUrl={it.url || undefined} openLabel={`Open in ${STORE_NAMES[it.store]}`} />}
      />
      <FormErrors errors={f.errors} />

      <div className="grid gap-4">
        <Card>
          <CardContent className="flex gap-4">
            <span className="flex aspect-square w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-accent md:w-36">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview of a pasted URL */}
              {it.image ? <img src={it.image} alt="" className="size-full object-cover" /> : <ShoppingBag className="size-8 text-muted-foreground" />}
            </span>
            <div className="grid min-w-0 flex-1 content-start gap-1">
              <p className="line-clamp-3 font-medium">{it.title || "Product name"}</p>
              {it.price && <p className="text-sm">{it.price}</p>}
              <p className="text-xs text-muted-foreground">{STORE_NAMES[it.store]}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product</CardTitle>
            <CardDescription>A product without its affiliate link stays hidden from the page.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ToggleGroup type="single" value={it.store} onValueChange={(v) => v && f.set({ store: v as Store })} aria-label="Store">
              {STORES.map((st) => (
                <ToggleGroupItem key={st} value={st}>
                  {STORE_NAMES[st]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FormField id="title" label="Product name">
              <Input id="title" value={it.title} onChange={(e) => f.set({ title: e.target.value })} autoFocus={isNew} />
            </FormField>
            <FormField id="url" label="Affiliate link">
              <Input
                id="url"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                placeholder={LINK_PLACEHOLDER[it.store]}
                value={it.url}
                onChange={(e) => f.set({ url: e.target.value.trim() })}
              />
            </FormField>
            <FormField id="image" label="Photo URL" hint="Open the product in the store, long-press (or right-click) the main photo and copy its address.">
              <Input id="image" type="url" inputMode="url" autoCapitalize="none" placeholder="https://…" value={it.image ?? ""} onChange={(e) => f.set({ image: e.target.value.trim() })} />
            </FormField>
            <FormField id="price" label="Price" hint="Optional, as text.">
              <Input id="price" placeholder="Rp 89.000" value={it.price ?? ""} onChange={(e) => f.set({ price: e.target.value })} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SwitchRow id="visible" label="Show on page">
              <Switch id="visible" checked={it.visible} onCheckedChange={(v) => f.set({ visible: v })} />
            </SwitchRow>
          </CardContent>
        </Card>
      </div>

      <SaveBar dirty={f.dirty} saving={f.saving} onSave={f.save} onDiscard={isNew ? undefined : f.discard} label={isNew ? "Add" : "Save"} />
    </>
  );
}
