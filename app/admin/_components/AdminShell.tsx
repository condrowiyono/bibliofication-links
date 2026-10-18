"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Braces, ExternalLink, LogOut, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { logoutAction } from "../actions";
import { ConfirmProvider } from "./Confirm";
import { isDetailPath, NAV } from "./nav";
import { GuardedLink, UnsavedGuardProvider, useGuardedNavigate } from "./UnsavedGuard";

export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      <UnsavedGuardProvider>
        <Frame name={name}>{children}</Frame>
        <Toaster />
      </UnsavedGuardProvider>
    </ConfirmProvider>
  );
}

function Frame({ name, children }: { name: string; children: React.ReactNode }) {
  const path = usePathname();
  const detail = isDetailPath(path);
  const active = (href: string) => path === href || path.startsWith(`${href}/`);
  const navigate = useGuardedNavigate();

  return (
    <div className="md:grid md:min-h-dvh md:grid-cols-[15rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r bg-card md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:gap-1 md:p-3">
        <div className="px-2 pt-2 pb-4">
          <p className="font-display text-2xl leading-tight">{name}&apos;s editor</p>
          <p className="text-xs text-muted-foreground">Changes go live when you save.</p>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Sections">
          {NAV.map((n) => (
            <GuardedLink
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-3 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                active(n.href) && "bg-accent text-foreground",
              )}
            >
              <n.icon className="size-4" />
              {n.label}
            </GuardedLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <Button variant="ghost" className="justify-start" asChild>
            <a href="/" target="_blank" rel="noopener">
              <ExternalLink /> View page
            </a>
          </Button>
          <form action={logoutAction}>
            <Button variant="ghost" type="submit" className="w-full justify-start">
              <LogOut /> Log out
            </Button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Phone top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <p className="font-display text-xl">{name}&apos;s editor</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href="/" target="_blank" rel="noopener">
                  <ExternalLink /> View page
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/admin/json")}>
                <Braces /> Edit as JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => logoutAction()}>
                <LogOut /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className={"mx-auto w-full max-w-3xl px-4 pt-4 pb-32 md:px-8 md:pt-8 md:pb-16"}>{children}</main>

        {/* Phone bottom tabs; detail pages show their save bar here instead. */}
        {!detail && (
          <nav
            aria-label="Sections"
            className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card/95 pb-safe backdrop-blur md:hidden"
          >
            {NAV.filter((n) => n.mobile).map((n) => (
              <GuardedLink
                key={n.href}
                href={n.href}
                aria-current={active(n.href) ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted-foreground",
                  active(n.href) && "text-primary",
                )}
              >
                <n.icon className="size-5" />
                {n.label}
              </GuardedLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
