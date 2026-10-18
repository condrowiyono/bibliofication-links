"use client";

import * as React from "react";
import { toast } from "sonner";
import { deleteItemAction, patchItemAction, reorderAction, restoreItemAction, type CollectionName } from "../actions";
import { useConfirm } from "./Confirm";

type Item = { id: string; title: string; visible: boolean };

const errorToast = (errors: string[]) => toast.error(errors[0], { description: errors.slice(1, 3).join(" ") || undefined });

/**
 * A list page's working copy: changes show at once and save in the background. When a save fails,
 * the list goes back to how it was and a toast says why. New data from the server replaces the copy.
 */
export function useCollection<T extends Item>(c: CollectionName, serverItems: T[], noun: string) {
  const [items, setItems] = React.useState(serverItems);
  const [prevServer, setPrevServer] = React.useState(serverItems);
  if (serverItems !== prevServer) {
    setPrevServer(serverItems);
    setItems(serverItems);
  }
  const confirm = useConfirm();

  const reorder = async (next: T[]) => {
    const before = items;
    setItems(next);
    const res = await reorderAction(c, next.map((x) => x.id));
    if (!res.ok) {
      setItems(before);
      errorToast(res.errors);
    }
  };

  const move = (id: string, where: "top" | "bottom") => {
    const item = items.find((x) => x.id === id);
    if (!item) return;
    const rest = items.filter((x) => x.id !== id);
    void reorder(where === "top" ? [item, ...rest] : [...rest, item]);
  };

  const setVisible = async (id: string, visible: boolean) => {
    const before = items;
    setItems(items.map((x) => (x.id === id ? { ...x, visible } : x)));
    const res = await patchItemAction(c, id, { visible } as never);
    if (!res.ok) {
      setItems(before);
      errorToast(res.errors);
    } else toast.success(visible ? "Showing on the page" : "Hidden from the page");
  };

  const remove = async (item: T) => {
    const ok = await confirm({
      title: `Delete this ${noun}?`,
      description: `"${item.title}" will be removed from the page. You can undo right after.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return false;
    const before = items;
    setItems(items.filter((x) => x.id !== item.id));
    const res = await deleteItemAction(c, item.id);
    if (!res.ok) {
      setItems(before);
      errorToast(res.errors);
      return false;
    }
    toast.success(`Deleted "${item.title}"`, {
      duration: 8000,
      action: {
        label: "Undo",
        onClick: async () => {
          const back = await restoreItemAction(c, res.item, res.index);
          if (back.ok) toast.success(`Restored "${item.title}"`);
          else errorToast(back.errors);
        },
      },
    });
    return true;
  };

  return { items, reorder, move, setVisible, remove };
}

export { errorToast };
