"use client";

import { Heading, Link2 } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PLATFORMS, type LinkItem, type Platform } from "@/lib/site";
import { cn } from "@/lib/utils";
import { DetailActions, FormErrors } from "../_components/DetailActions";
import { FormField, SwitchRow } from "../_components/FormField";
import { PageHeader } from "../_components/PageHeader";
import { SaveBar } from "../_components/SaveBar";
import { useItemForm } from "../_components/useItemForm";

const label = (p: Platform) => p.charAt(0).toUpperCase() + p.slice(1);

export function LinkForm({ link, isNew }: { link: LinkItem; isNew: boolean }) {
  const f = useItemForm("links", link, { isNew, noun: "link", listHref: "/admin/links" });
  const l = f.value;
  const isHeader = l.type === "header";

  return (
    <>
      <PageHeader
        back={{ href: "/admin/links", label: "Links" }}
        title={isNew ? (isHeader ? "New section heading" : "New link") : l.title || "Untitled"}
        actions={<DetailActions isNew={isNew} onDelete={f.remove} openUrl={!isHeader && l.url ? l.url : undefined} />}
      />
      <FormErrors errors={f.errors} />

      <div className="grid gap-4">
        {isNew && (
          <ToggleGroup
            type="single"
            value={l.type}
            onValueChange={(v) => v && f.set({ type: v as LinkItem["type"] })}
            aria-label="Kind"
          >
            <ToggleGroupItem value="link">
              <Link2 /> Link
            </ToggleGroupItem>
            <ToggleGroupItem value="header">
              <Heading /> Section heading
            </ToggleGroupItem>
          </ToggleGroup>
        )}

        {/* Preview: roughly how the row will look on the page. */}
        <div aria-hidden className={cn("rounded-xl border p-4", isHeader ? "border-dashed text-center" : l.featured ? "bg-primary text-primary-foreground" : "bg-card")}>
          {isHeader ? (
            <p className="font-display text-xl">{l.title || "Section"}</p>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-current/30 text-sm font-semibold">
                {l.icon ? <BrandIcon platform={l.icon} size={18} /> : (l.title.charAt(0) || "?").toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{l.title || "Title"}</span>
                {l.subtitle && <span className="block truncate text-sm opacity-80">{l.subtitle}</span>}
              </span>
            </div>
          )}
          <p className="mt-2 text-center text-xs opacity-70">Preview</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isHeader ? "Heading" : "Link"}</CardTitle>
            {!isHeader && <CardDescription>A link without a URL stays hidden from the page until you add one.</CardDescription>}
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField id="title" label="Title">
              <Input id="title" value={l.title} onChange={(e) => f.set({ title: e.target.value })} autoFocus={isNew} />
            </FormField>
            {!isHeader && (
              <>
                <FormField id="subtitle" label="Subtitle" hint="Optional second line.">
                  <Input id="subtitle" value={l.subtitle ?? ""} onChange={(e) => f.set({ subtitle: e.target.value })} />
                </FormField>
                <FormField id="url" label="URL">
                  <Input
                    id="url"
                    type="url"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="https://…"
                    value={l.url ?? ""}
                    onChange={(e) => f.set({ url: e.target.value.trim() })}
                  />
                </FormField>
                <FormField id="icon" label="Icon">
                  <NativeSelect id="icon" value={l.icon ?? ""} onChange={(e) => f.set({ icon: e.target.value as Platform | "" })}>
                    <option value="">First letter of the title</option>
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {label(p)}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-3">
            <SwitchRow id="visible" label="Show on page" hint="Turn off to keep it here without showing it.">
              <Switch id="visible" checked={l.visible} onCheckedChange={(v) => f.set({ visible: v })} />
            </SwitchRow>
            {!isHeader && (
              <SwitchRow id="featured" label="Featured" hint="The green card that stands out.">
                <Switch id="featured" checked={!!l.featured} onCheckedChange={(v) => f.set({ featured: v })} />
              </SwitchRow>
            )}
          </CardContent>
        </Card>
      </div>

      <SaveBar dirty={f.dirty} saving={f.saving} onSave={f.save} onDiscard={isNew ? undefined : f.discard} label={isNew ? "Add" : "Save"} />
    </>
  );
}
