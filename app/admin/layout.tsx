import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { isAdmin, isPasswordConfigured } from "@/lib/auth";
import { getSite } from "@/lib/site";
import { AdminShell } from "./_components/AdminShell";
import { LoginForm } from "./LoginForm";
import "./admin.css";

export const metadata: Metadata = { title: { default: "Editor", template: "%s · Editor" }, robots: { index: false, follow: false } };
export const viewport: Viewport = { viewportFit: "cover" };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="admin-root min-h-dvh bg-background">
      <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Opening the map…</p>}>
        <Gate>{children}</Gate>
      </Suspense>
    </div>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  if (!(await isPasswordConfigured())) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="font-display text-3xl">Editor</h1>
        <p className="mt-3 text-sm text-destructive" role="alert">
          No admin password is set. Locally, add <code>ADMIN_PASSWORD=…</code> to <code>.dev.vars</code>. On Cloudflare, run{" "}
          <code>npx wrangler secret put ADMIN_PASSWORD</code>.
        </p>
      </div>
    );
  }
  if (!(await isAdmin())) return <LoginForm />;
  const site = await getSite().catch(() => null);
  if (!site)
    return (
      <p className="p-6 text-sm text-destructive" role="alert">
        Couldn&apos;t read the saved page from storage. Reload to try again.
      </p>
    );
  return <AdminShell name={site.profile.name}>{children}</AdminShell>;
}
