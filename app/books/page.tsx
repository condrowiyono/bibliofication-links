import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { BookCover } from "@/components/BookCover";
import { CupRating } from "@/components/CupRating";
import { ThemeToggle } from "@/components/PageControls";
import { getSite, publicBooks, STATUS_LABEL } from "@/lib/site";
import { LibraryView } from "./LibraryView";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { profile } = await getSite();
  return {
    title: `${profile.name}'s Library`,
    description: `Books ${profile.name} has read, is reading and wants to read, with her reviews.`,
  };
}

export default async function LibraryPage() {
  await connection();
  const site = await getSite();
  const books = publicBooks(site);
  const reviewed = books.filter((b) => b.review.trim()).length;

  return (
    <div className="page">
      <nav className="topbar" aria-label="Page controls">
        <Link href="/" className="chip-btn back-link">
          <span aria-hidden="true">←</span> {site.profile.name}&apos;s links
        </Link>
        <ThemeToggle />
      </nav>

      <header className="library-head">
        <p className="ex-libris">Ex Libris</p>
        <h1 className="name">{site.profile.name}&apos;s Library</h1>
        <p className="handle">
          {books.length} {books.length === 1 ? "book" : "books"} on the shelf
          {reviewed > 0 && ` · ${reviewed} ${reviewed === 1 ? "review" : "reviews"}`}
        </p>
      </header>

      <LibraryView books={books.map(({ id, title, author, cover, status }) => ({ id, title, author, cover, status }))} />

      {books.length > 0 && (
        <section aria-labelledby="reviews-title">
          <h2 id="reviews-title" className="chapter">
            Reviews
          </h2>
          <ul className="review-list">
            {books.map((b, i) => (
              <li key={b.id}>
                <Link href={`/books/${b.id}`} className="review-card">
                  <span className="review-thumb">
                    <BookCover src={b.cover} title={b.title} author={b.author} tone={i} />
                  </span>
                  <span className="review-text">
                    <span className="review-status">{STATUS_LABEL[b.status]}</span>
                    <span className="card-title">{b.title}</span>
                    <span className="card-sub">{b.author}</span>
                    {b.rating > 0 && <CupRating value={b.rating} size={18} />}
                    <span className="review-excerpt">{b.review.trim() ? b.review.trim().split(/\n\s*\n/)[0] : "Review still steeping."}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {site.footer && <footer className="footer">{site.footer}</footer>}
    </div>
  );
}
