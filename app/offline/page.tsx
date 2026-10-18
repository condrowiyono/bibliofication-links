import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/** Shown by the service worker when there's no connection and no saved copy of the page yet. */
export default function Offline() {
  return (
    <main className="page" style={{ textAlign: "center", paddingTop: "18vh" }}>
      <h1 className="name">Out of range.</h1>
      <p className="bio">There&apos;s no connection right now. Reconnect and try again.</p>
      <p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full load lets the service worker answer it */}
        <a href="/">Try again</a>
      </p>
    </main>
  );
}
