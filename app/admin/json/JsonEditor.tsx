"use client";

import * as React from "react";
import { Copy, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Site } from "@/lib/site";
import { saveSiteAction } from "../actions";
import { useConfirm } from "../_components/Confirm";
import { FormErrors } from "../_components/DetailActions";
import { PageHeader } from "../_components/PageHeader";
import { SaveBar } from "../_components/SaveBar";
import { useUnsavedChanges } from "../_components/UnsavedGuard";
import { errorToast } from "../_components/useCollection";

/** The whole page as one JSON document: for backups, bulk edits and pasting a saved copy back. */
export function JsonEditor({ site }: { site: Site }) {
  const initial = JSON.stringify(site, null, 2);
  const [saved, setSaved] = React.useState(initial);
  const [raw, setRaw] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const dirty = raw !== saved;
  const { markSaved } = useUnsavedChanges(dirty && !saving);
  const confirm = useConfirm();
  const fileInput = React.useRef<HTMLInputElement>(null);

  const save = async () => {
    let parsed: Site;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      setErrors([`That isn't valid JSON yet: ${(e as Error).message}`]);
      return;
    }
    const ok = await confirm({
      title: "Replace the whole page?",
      description: "Everything (links, shop, books and profile) becomes what's in this text. Download a backup first if unsure.",
      confirmLabel: "Replace",
      destructive: true,
    });
    if (!ok) return;
    setSaving(true);
    const res = await saveSiteAction(parsed);
    setSaving(false);
    if (!res.ok) {
      setErrors(res.errors);
      return errorToast(res.errors);
    }
    const pretty = JSON.stringify(parsed, null, 2);
    setErrors([]);
    setRaw(pretty);
    setSaved(pretty);
    markSaved();
    toast.success("Saved. Mischief managed.");
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    a.download = `links-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      toast.success("Copied to the clipboard");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it by hand.");
    }
  };

  const load = async (file: File) => {
    setRaw(await file.text());
    toast("Loaded the file", { description: "Check it, then save to replace the page." });
  };

  return (
    <>
      <PageHeader
        title="JSON"
        description="The whole page is this one document. Download it as a backup, or paste a saved copy back."
        actions={
          <>
            <Button variant="outline" size="icon" onClick={copy} aria-label="Copy JSON">
              <Copy />
            </Button>
            <Button variant="outline" size="icon" onClick={() => fileInput.current?.click()} aria-label="Load a JSON file">
              <Upload />
            </Button>
            <Button variant="outline" size="icon" onClick={download} aria-label="Download JSON">
              <Download />
            </Button>
          </>
        }
      />
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
      <FormErrors errors={errors} />
      <Textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        aria-label="Page JSON"
        className="field-sizing-fixed min-h-[65dvh] font-mono text-xs leading-relaxed whitespace-pre md:text-xs"
      />
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => (setRaw(saved), setErrors([]))} label="Save all" />
    </>
  );
}
