"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { BrandIcon } from "@/components/BrandIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, type Platform, type Social } from "@/lib/site";
import { saveProfileAction, type ProfileData } from "../actions";
import { FormErrors } from "../_components/DetailActions";
import { FormField, SwitchRow } from "../_components/FormField";
import { PageHeader } from "../_components/PageHeader";
import { SaveBar } from "../_components/SaveBar";
import { SortableList } from "../_components/SortableList";
import { useUnsavedChanges } from "../_components/UnsavedGuard";
import { errorToast } from "../_components/useCollection";

const label = (p: Platform) => p.charAt(0).toUpperCase() + p.slice(1);
type Row = Social & { id: string };
// Keys from position, so the server and the browser agree; rows added later get a counter.
const withKeys = (socials: Social[]): Row[] => socials.map((s, i) => ({ ...s, id: `social-${i}` }));
let nextKey = 0;

export function ProfileForm({ data }: { data: ProfileData }) {
  const [saved, setSaved] = React.useState(data);
  const [value, setValue] = React.useState(data);
  // Social rows need stable keys for dragging; they're dropped again on save.
  const [rows, setRows] = React.useState(() => withKeys(data.socials));
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);

  const current: ProfileData = { ...value, socials: rows.map(({ platform, url }) => ({ platform, url })) };
  const dirty = JSON.stringify(current) !== JSON.stringify(saved);
  const { markSaved } = useUnsavedChanges(dirty && !saving);

  const setProfile = (patch: Partial<ProfileData["profile"]>) => setValue((v) => ({ ...v, profile: { ...v.profile, ...patch } }));
  const setMedium = (patch: Partial<ProfileData["medium"]>) => setValue((v) => ({ ...v, medium: { ...v.medium, ...patch } }));
  const setRow = (id: string, patch: Partial<Social>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const save = async () => {
    setSaving(true);
    const res = await saveProfileAction(current);
    setSaving(false);
    if (!res.ok) {
      setErrors(res.errors);
      return errorToast(res.errors);
    }
    setErrors([]);
    setSaved(current);
    markSaved();
    toast.success("Profile saved. It's live on the page.");
  };

  const discard = () => {
    setValue(saved);
    setRows(withKeys(saved.socials));
    setErrors([]);
  };

  const p = value.profile;
  return (
    <>
      <PageHeader title="Profile" description="The bookplate at the top of the page, the icon row, essays and footer." />
      <FormErrors errors={errors} />

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Bookplate</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4">
              <span className="size-16 shrink-0 overflow-hidden rounded-full border bg-accent">
                {/* eslint-disable-next-line @next/next/no-img-element -- preview of a pasted URL */}
                {p.avatar && <img src={p.avatar} alt="" className="size-full object-cover" />}
              </span>
              <div className="grid flex-1 gap-3 md:grid-cols-2">
                <FormField id="name" label="Name">
                  <Input id="name" value={p.name} onChange={(e) => setProfile({ name: e.target.value })} />
                </FormField>
                <FormField id="handle" label="Handle">
                  <Input id="handle" autoCapitalize="none" value={p.handle} onChange={(e) => setProfile({ handle: e.target.value })} />
                </FormField>
              </div>
            </div>
            <FormField id="avatar" label="Photo URL">
              <Input id="avatar" type="url" inputMode="url" autoCapitalize="none" placeholder="https://…" value={p.avatar} onChange={(e) => setProfile({ avatar: e.target.value.trim() })} />
            </FormField>
            <FormField id="bio" label="Bio">
              <Textarea id="bio" value={p.bio} onChange={(e) => setProfile({ bio: e.target.value })} />
            </FormField>
            <ShelfInput words={p.shelf} onChange={(shelf) => setProfile({ shelf })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Icon row</CardTitle>
            <CardDescription>The round icons under the bio, in this order.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <SortableList
              items={rows}
              onReorder={setRows}
              itemLabel={(r) => label(r.platform)}
              renderItem={(r, handle, dragging) => (
                <div className={`flex items-center gap-2 rounded-lg border bg-background py-2 pr-2 ${dragging ? "shadow-lg" : ""}`}>
                  {handle}
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border">
                    <BrandIcon platform={r.platform} size={16} />
                  </span>
                  <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-[9rem_1fr]">
                    <NativeSelect aria-label="Platform" value={r.platform} onChange={(e) => setRow(r.id, { platform: e.target.value as Platform })}>
                      {PLATFORMS.map((pl) => (
                        <option key={pl} value={pl}>
                          {label(pl)}
                        </option>
                      ))}
                    </NativeSelect>
                    <Input aria-label="URL" type="url" inputMode="url" autoCapitalize="none" placeholder="https://…" value={r.url} onChange={(e) => setRow(r.id, { url: e.target.value.trim() })} />
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Remove ${label(r.platform)}`} onClick={() => setRows(rows.filter((x) => x.id !== r.id))}>
                    <X />
                  </Button>
                </div>
              )}
            />
            <Button variant="outline" onClick={() => setRows([...rows, { id: `new-${nextKey++}`, platform: "instagram", url: "" }])}>
              <Plus /> Add icon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest essays from Medium</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <SwitchRow id="medium-show" label="Show on page">
              <Switch id="medium-show" checked={value.medium.show} onCheckedChange={(show) => setMedium({ show })} />
            </SwitchRow>
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <FormField id="medium-user" label="Medium username" hint="Without the @.">
                <Input id="medium-user" autoCapitalize="none" value={value.medium.username} onChange={(e) => setMedium({ username: e.target.value.replace(/^@/, "") })} />
              </FormField>
              <FormField id="medium-count" label="How many">
                <Input
                  id="medium-count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10}
                  value={value.medium.count}
                  onChange={(e) => setMedium({ count: Number(e.target.value) })}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <FormField id="footer" label="Footer line">
              <Input id="footer" value={value.footer} onChange={(e) => setValue((v) => ({ ...v, footer: e.target.value }))} />
            </FormField>
          </CardContent>
        </Card>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={discard} />
    </>
  );
}

/** Shelf words as removable chips. Type a word and press Enter or comma to add it. */
function ShelfInput({ words, onChange }: { words: string[]; onChange: (w: string[]) => void }) {
  const [draft, setDraft] = React.useState("");
  const add = (text = draft) => {
    const w = text.trim().replace(/,+$/, "").trim();
    if (w && !words.includes(w)) onChange([...words, w]);
    setDraft("");
  };
  return (
    <FormField id="shelf" label="Shelf" hint="One book spine per word; drinks like Matcha or Tea become a cup.">
      <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-2">
        {words.map((w) => (
          <span key={w} className="inline-flex h-8 items-center gap-1 rounded-full bg-secondary pr-1 pl-3 text-sm">
            {w}
            <button type="button" aria-label={`Remove ${w}`} onClick={() => onChange(words.filter((x) => x !== w))} className="flex size-6 items-center justify-center rounded-full hover:bg-accent">
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id="shelf"
          value={draft}
          placeholder={words.length ? "Add…" : "Books, Kindle, Matcha…"}
          enterKeyHint="done"
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && words.length) onChange(words.slice(0, -1));
          }}
          onBlur={() => add()}
          className="h-8 min-w-24 flex-1 bg-transparent px-1 text-base outline-none md:text-sm"
        />
      </div>
    </FormField>
  );
}
