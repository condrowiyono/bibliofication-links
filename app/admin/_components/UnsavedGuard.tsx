"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConfirm } from "./Confirm";

type Guard = { isDirty: () => boolean; setDirty: (d: boolean) => void; leave: (href: string) => Promise<void> };

const GuardContext = React.createContext<Guard | null>(null);

/** Tracks whether the open form has unsaved edits, and asks before leaving it. */
export function UnsavedGuardProvider({ children }: { children: React.ReactNode }) {
  const dirtyRef = React.useRef(false);
  const router = useRouter();
  const confirm = useConfirm();

  const leave = React.useCallback(
    async (href: string) => {
      if (
        dirtyRef.current &&
        !(await confirm({
          title: "Leave without saving?",
          description: "Your changes on this page will be lost.",
          confirmLabel: "Leave",
          cancelLabel: "Keep editing",
          destructive: true,
        }))
      )
        return;
      dirtyRef.current = false;
      router.push(href);
    },
    [confirm, router],
  );

  const value = React.useMemo<Guard>(
    () => ({ isDirty: () => dirtyRef.current, setDirty: (d) => void (dirtyRef.current = d), leave }),
    [leave],
  );
  return <GuardContext.Provider value={value}>{children}</GuardContext.Provider>;
}

const useGuard = () => {
  const g = React.useContext(GuardContext);
  if (!g) throw new Error("UnsavedGuardProvider is missing");
  return g;
};

/** Call in a form with its dirty flag. Also warns on reload and closing the tab. */
export function useUnsavedChanges(isDirty: boolean) {
  const { setDirty } = useGuard();
  React.useEffect(() => {
    setDirty(isDirty);
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      setDirty(false);
    };
  }, [isDirty, setDirty]);
  return { markSaved: () => setDirty(false) };
}

export const useGuardedNavigate = () => useGuard().leave;

/** A next/link that asks before leaving a form with unsaved edits. */
export function GuardedLink({ href, onClick, ...props }: React.ComponentProps<typeof Link> & { href: string }) {
  const { isDirty, leave } = useGuard();
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !isDirty() || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        void leave(href);
      }}
      {...props}
    />
  );
}
