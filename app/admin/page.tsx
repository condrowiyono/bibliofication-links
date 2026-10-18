import type { Metadata } from "next";
import { Suspense } from "react";
import { isAdmin, isPasswordConfigured } from "@/lib/auth";
import { getSite } from "@/lib/site";
import { Editor } from "./Editor";
import { LoginForm } from "./LoginForm";
import "./admin.css";

export const metadata: Metadata = { title: "Manage links", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <div className="admin">
      <Suspense fallback={<p className="admin-note">Opening the map…</p>}>
        <Gate />
      </Suspense>
    </div>
  );
}

async function Gate() {
  if (!(await isPasswordConfigured())) {
    return (
      <div className="login">
        <h1>Manage links</h1>
        <p className="admin-error" role="alert">
          No admin password is set. Locally, add <code>ADMIN_PASSWORD=…</code> to <code>.dev.vars</code>. On Cloudflare, run{" "}
          <code>npx wrangler secret put ADMIN_PASSWORD</code>.
        </p>
      </div>
    );
  }
  if (!(await isAdmin())) return <LoginForm />;

  const site = await getSite().catch(() => null);
  if (!site) {
    return (
      <p className="admin-error" role="alert">
        Couldn&apos;t read the saved links from storage. Reload to try again.
      </p>
    );
  }
  return <Editor initial={site} />;
}
