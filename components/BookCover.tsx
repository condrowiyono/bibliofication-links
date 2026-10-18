"use client";

import { useState } from "react";

/** Catches images that already failed during server-rendered load, before React attached onError. */
const checkLoaded = (fail: () => void) => (img: HTMLImageElement | null) => {
  if (img?.complete && img.naturalWidth === 0) fail();
};

/**
 * A book's front cover. Without a usable image it prints a cloth-bound cover instead:
 * title and author set in the old-press type, like a library rebind.
 */
export function BookCover({ src, title, author, tone = 0 }: { src: string; title: string; author: string; tone?: number }) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    return (
      <span className={`cover-plain cover-tone-${tone % 3}`}>
        <span className="cover-plain-title">{title}</span>
        <span className="cover-plain-author">{author}</span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- covers are user-editable URLs on any host
    <img ref={checkLoaded(() => setFailed(true))} className="cover-img" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
  );
}
