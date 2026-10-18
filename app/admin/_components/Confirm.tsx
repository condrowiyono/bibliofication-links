"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "./ResponsiveDialog";

export type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = React.createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

/** `const confirm = useConfirm(); if (await confirm({ title: "Delete?" })) …` */
export const useConfirm = () => React.useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<Pending | null>(null);
  const confirm = React.useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })), []);
  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ResponsiveDialog
        open={pending !== null}
        onOpenChange={(open) => !open && close(false)}
        title={pending?.title ?? ""}
        description={pending?.description}
        footer={
          <>
            <Button variant="outline" onClick={() => close(false)}>
              {pending?.cancelLabel ?? "Cancel"}
            </Button>
            <Button variant={pending?.destructive ? "destructive" : "default"} onClick={() => close(true)} autoFocus>
              {pending?.confirmLabel ?? "OK"}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}
