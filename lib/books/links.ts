/** Where to buy or read about the book: Gramedia, Goodreads, Amazon. Search pages are labelled "(search)". */
import type { BookInfo } from "./types";

export type LinkHints = { gramediaUrl?: string; goodreadsId?: string; goodreadsUrl?: string; amazonId?: string };

export function storeLinks(b: { isbn13: string; title: string; author: string }, h: LinkHints = {}): BookInfo["links"] {
  const q = encodeURIComponent(b.isbn13 || `${b.title} ${b.author}`.trim());
  return [
    h.gramediaUrl ? { label: "Gramedia", url: h.gramediaUrl } : { label: "Gramedia (search)", url: `https://www.gramedia.com/search?q=${q}` },
    h.goodreadsId
      ? { label: "Goodreads", url: `https://www.goodreads.com/book/show/${h.goodreadsId}` }
      : h.goodreadsUrl
        ? { label: "Goodreads", url: h.goodreadsUrl }
        : b.isbn13
          ? // Goodreads redirects /book/isbn/<isbn> to the book's page when it knows the edition.
            { label: "Goodreads (search)", url: `https://www.goodreads.com/book/isbn/${b.isbn13}` }
          : { label: "Goodreads (search)", url: `https://www.goodreads.com/search?q=${q}` },
    // Only a known Amazon id gets a product link: /dp/<isbn10> is a dead page when Amazon doesn't stock that edition.
    h.amazonId ? { label: "Amazon", url: `https://www.amazon.com/dp/${h.amazonId}` } : { label: "Amazon (search)", url: `https://www.amazon.com/s?k=${q}&i=stripbooks` },
  ];
}
