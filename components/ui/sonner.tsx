"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Toasts in the editor's colors. Top-center keeps them clear of the bottom tab bar and save bar on phones. */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      closeButton
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--popover)",
          "--success-text": "var(--popover-foreground)",
          "--success-border": "var(--border)",
          "--error-bg": "var(--popover)",
          "--error-text": "var(--destructive)",
          "--error-border": "var(--destructive)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
