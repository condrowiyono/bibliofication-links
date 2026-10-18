"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteItemAction, restoreItemAction, saveItemAction, type CollectionName } from "../actions";
import { useConfirm } from "./Confirm";
import { useUnsavedChanges } from "./UnsavedGuard";
import { errorToast } from "./useCollection";

/**
 * State for one item's detail page: edits, dirty flag, Save, Discard and Delete.
 * A new item gets its own address after the first save, so a reload keeps you on it.
 */
export function useItemForm<T extends { id: string; title: string }>(c: CollectionName, initial: T, opts: { isNew: boolean; noun: string; listHref: string }) {
  const [value, setValue] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const dirty = opts.isNew || JSON.stringify(value) !== JSON.stringify(saved);
  const { markSaved } = useUnsavedChanges(dirty && !saving);
  const router = useRouter();
  const confirm = useConfirm();

  const set = (patch: Partial<T>) => setValue((v) => ({ ...v, ...patch }));

  const save = async () => {
    setSaving(true);
    const res = await saveItemAction(c, value as never, opts.isNew ? undefined : initial.id);
    setSaving(false);
    if (!res.ok) {
      setErrors(res.errors);
      errorToast(res.errors);
      return;
    }
    setErrors([]);
    const next = { ...value, id: res.id };
    setValue(next);
    setSaved(next);
    markSaved();
    toast.success(opts.isNew ? `Added "${value.title}"` : "Saved. It's live on the page.");
    if (opts.isNew || res.id !== initial.id) router.replace(`${opts.listHref}/${res.id}`);
  };

  const discard = () => {
    setValue(saved);
    setErrors([]);
  };

  const remove = async () => {
    if (opts.isNew) return router.push(opts.listHref);
    const ok = await confirm({
      title: `Delete this ${opts.noun}?`,
      description: `"${saved.title}" will be removed from the page. You can undo right after.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const res = await deleteItemAction(c, initial.id);
    if (!res.ok) return errorToast(res.errors);
    markSaved();
    router.push(opts.listHref);
    toast.success(`Deleted "${saved.title}"`, {
      duration: 8000,
      action: {
        label: "Undo",
        onClick: async () => {
          const back = await restoreItemAction(c, res.item, res.index);
          if (back.ok) toast.success(`Restored "${saved.title}"`);
          else errorToast(back.errors);
        },
      },
    });
  };

  return { value, set, setValue, dirty, saving, errors, save, discard, remove };
}
