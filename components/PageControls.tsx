"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener("themechange", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener("themechange", onChange);
  };
}

/** Kindle calls its two modes paper and night, so the toggle does too. */
export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);

  const toggle = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    window.dispatchEvent(new Event("themechange"));
  };

  return (
    <button type="button" className="chip-btn" onClick={toggle} aria-label={theme === "dark" ? "Switch to paper mode" : "Switch to night mode"}>
      {theme === "dark" ? "Paper" : "Night"}
    </button>
  );
}

export function ShareButton({ title }: { title: string }) {
  const [note, setNote] = useState("");

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote("Link copied");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setNote("Couldn't copy, use the address bar");
    }
    setTimeout(() => setNote(""), 2500);
  };

  return (
    <>
      <button type="button" className="chip-btn" onClick={share}>
        Share
      </button>
      <span className="toast" role="status" aria-live="polite">
        {note}
      </span>
    </>
  );
}

/** Catches images that already failed during server-rendered load, before React attached onError. */
const checkLoaded = (fail: () => void) => (img: HTMLImageElement | null) => {
  if (img?.complete && img.naturalWidth === 0) fail();
};

export function Avatar({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(!src);
  return (
    <div className="avatar">
      {failed ? (
        <span className="avatar-initial" aria-hidden="true">
          {name.trim().charAt(0).toUpperCase()}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- the URL is user-editable, any host
        <img
          ref={checkLoaded(() => setFailed(true))}
          src={src}
          alt={`Photo of ${name}`}
          width={112}
          height={112}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

/** Product photo; a missing or broken image falls back to the store's mark so the grid stays even. */
export function ProductImage({ src, fallback }: { src?: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(!src);
  return (
    <span className="product-img">
      {failed ? (
        <span aria-hidden="true">{fallback}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- product images come from the stores' CDNs, any URL
        <img ref={checkLoaded(() => setFailed(true))} src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      )}
    </span>
  );
}
