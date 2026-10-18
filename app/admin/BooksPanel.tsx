"use client";

import { BOOK_STATUSES, STATUS_LABEL, type Book, type BookStatus } from "@/lib/site";
import { Field } from "./Field";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "book";

const blankBook = (): Book => ({
  id: `new-book-${Math.random().toString(36).slice(2, 6)}`,
  title: "New book",
  author: "",
  cover: "",
  status: "read",
  rating: 0,
  finished: "",
  review: "",
  quote: "",
  synopsis: "",
  isbn13: "",
  isbn10: "",
  publisher: "",
  published: "",
  edition: "",
  pages: 0,
  language: "",
  links: [],
  visible: true,
});

export function BooksPanel({ books, onChange }: { books: Book[]; onChange: (books: Book[]) => void }) {
  const set = (i: number, patch: Partial<Book>) => onChange(books.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...books];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  return (
    <section className="panel" aria-labelledby="h-books">
      <h2 id="h-books">Books</h2>
      <p className="admin-note">
        The first three appear on the home shelf; all of them are in the library at /books. Rating, review and highlighted passage are yours; the
        edition details come from the book&apos;s public listing.
      </p>
      {books.length === 0 && <p className="admin-note">No books yet. Add the one you&apos;re reading.</p>}
      <ol className="link-list">
        {books.map((b, i) => (
          <li key={i} className="link-item book-item">
            <div className="link-item-top">
              <strong>{b.title || "Untitled"}</strong>
              {!b.visible && <span className="flag">Hidden</span>}
              <span className="spacer" />
              <button type="button" className="btn btn-quiet" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move "${b.title}" up`}>
                Up
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => move(i, 1)} disabled={i === books.length - 1} aria-label={`Move "${b.title}" down`}>
                Down
              </button>
              <button
                type="button"
                className="btn btn-quiet btn-danger"
                onClick={() => onChange(books.filter((_, j) => j !== i))}
                aria-label={`Delete "${b.title}"`}
              >
                Delete
              </button>
            </div>

            <div className="product-edit">
              <span className="thumb thumb-book">
                {b.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- preview of a pasted URL
                  <img src={b.cover} alt="" />
                ) : (
                  <span>No cover</span>
                )}
              </span>
              <div className="product-fields">
                <Field label="Title" value={b.title} onChange={(v) => set(i, { title: v })} />
                <Field label="Author" value={b.author} onChange={(v) => set(i, { author: v })} />
                <div className="row">
                  <label className="field">
                    <span>Status</span>
                    <select value={b.status} onChange={(e) => set(i, { status: e.target.value as BookStatus })}>
                      {BOOK_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {STATUS_LABEL[st]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Rating (cups of matcha)</span>
                    <select value={b.rating} onChange={(e) => set(i, { rating: Number(e.target.value) })}>
                      <option value={0}>Not rated</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} of 5
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Finished on</span>
                    <input type="date" value={b.finished} onChange={(e) => set(i, { finished: e.target.value })} />
                  </label>
                </div>
              </div>
            </div>

            <Field label="Your review (blank line between paragraphs)" value={b.review} onChange={(v) => set(i, { review: v })} multiline />
            <Field label="Highlighted passage (optional)" value={b.quote} onChange={(v) => set(i, { quote: v })} multiline />

            <details className="book-more">
              <summary>Edition details, cover and where to buy</summary>
              <div className="row">
                <Field label="Page address (/books/…)" value={b.id} onChange={(v) => set(i, { id: v.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
                <button type="button" className="btn" onClick={() => set(i, { id: slugify(b.title) })}>
                  Use title
                </button>
              </div>
              <div className="row">
                <Field label="Cover image URL" value={b.cover} placeholder="https://…" onChange={(v) => set(i, { cover: v })} />
                <button
                  type="button"
                  className="btn"
                  disabled={!b.isbn13}
                  title={b.isbn13 ? undefined : "Add the ISBN-13 first"}
                  onClick={() => set(i, { cover: `https://covers.openlibrary.org/b/isbn/${b.isbn13}-L.jpg` })}
                >
                  Cover from ISBN
                </button>
              </div>
              <div className="row">
                <Field label="ISBN-13" value={b.isbn13} onChange={(v) => set(i, { isbn13: v.replace(/[^0-9]/g, "") })} />
                <Field label="ISBN-10" value={b.isbn10} onChange={(v) => set(i, { isbn10: v.toUpperCase().replace(/[^0-9X]/g, "") })} />
              </div>
              <div className="row">
                <Field label="Publisher" value={b.publisher} onChange={(v) => set(i, { publisher: v })} />
                <Field label="Edition year" value={b.edition} onChange={(v) => set(i, { edition: v })} />
              </div>
              <div className="row">
                <Field label="First published" value={b.published} onChange={(v) => set(i, { published: v })} />
                <label className="field">
                  <span>Pages</span>
                  <input type="number" min={0} value={b.pages} onChange={(e) => set(i, { pages: Math.max(0, Number(e.target.value) || 0) })} />
                </label>
                <Field label="Language" value={b.language} onChange={(v) => set(i, { language: v })} />
              </div>
              <Field label="What it's about (short synopsis)" value={b.synopsis} onChange={(v) => set(i, { synopsis: v })} multiline />

              <p className="admin-note">Where to find it (Amazon, Goodreads, Gramedia…)</p>
              {b.links.map((l, j) => (
                <div className="row" key={j}>
                  <label className="field field-narrow">
                    <span>Label</span>
                    <input
                      type="text"
                      value={l.label}
                      onChange={(e) => set(i, { links: b.links.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)) })}
                    />
                  </label>
                  <Field
                    label="URL"
                    value={l.url}
                    placeholder="https://…"
                    onChange={(v) => set(i, { links: b.links.map((x, k) => (k === j ? { ...x, url: v } : x)) })}
                  />
                  <button type="button" className="btn btn-quiet" onClick={() => set(i, { links: b.links.filter((_, k) => k !== j) })}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="btn" onClick={() => set(i, { links: [...b.links, { label: "", url: "" }] })}>
                Add store link
              </button>
            </details>

            <div className="checks">
              <label>
                <input type="checkbox" checked={b.visible} onChange={(e) => set(i, { visible: e.target.checked })} /> Show on page
              </label>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="btn" onClick={() => onChange([blankBook(), ...books])}>
        Add book
      </button>
    </section>
  );
}
