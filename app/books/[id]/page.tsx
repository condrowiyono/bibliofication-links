import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BookCover } from "@/components/BookCover";
import { BrandIcon } from "@/components/BrandIcon";
import { CopyButton } from "@/components/CopyButton";
import { CupRating } from "@/components/CupRating";
import { ThemeToggle } from "@/components/PageControls";
import { getSite, publicBooks, STATUS_LABEL, type Book } from "@/lib/site";

async function findBook(id: string) {
  await connection();
  const site = await getSite();
  const books = publicBooks(site);
  const index = books.findIndex((b) => b.id === id);
  return { site, books, index, book: books[index] as Book | undefined };
}

export async function generateMetadata(props: PageProps<"/books/[id]">): Promise<Metadata> {
  const { book, site } = await findBook((await props.params).id);
  if (!book) return { title: "Book not found" };
  const title = `${book.title} by ${book.author}`;
  const description = book.review.trim()
    ? `${site.profile.name}'s review: ${book.review.trim().slice(0, 150)}`
    : book.synopsis || `${book.title} on ${site.profile.name}'s shelf.`;
  return { title, description, openGraph: { title, description, images: book.cover ? [book.cover] : [] } };
}

const fmtDate = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${d}T00:00:00`));
const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");

export default async function BookPage(props: PageProps<"/books/[id]">) {
  const { site, books, index, book } = await findBook((await props.params).id);
  if (!book) notFound();

  const prev = books[index - 1];
  const next = books[index + 1];
  const paragraphs = book.review.trim() ? book.review.trim().split(/\n\s*\n/) : [];

  // schema.org Book, so search engines can match the page to the right edition; the review is included only when written.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    author: book.author.split(/\s*&\s*|\s*,\s*/).map((name) => ({ "@type": "Person", name })),
    ...(book.isbn13 && { isbn: book.isbn13 }),
    ...(book.pages > 0 && { numberOfPages: book.pages }),
    ...(book.publisher && { publisher: { "@type": "Organization", name: book.publisher } }),
    ...(book.published && { datePublished: book.published }),
    ...(book.cover && { image: book.cover }),
    ...(paragraphs.length > 0 && {
      review: {
        "@type": "Review",
        author: { "@type": "Person", name: site.profile.name },
        reviewBody: book.review.trim(),
        ...(book.rating > 0 && { reviewRating: { "@type": "Rating", ratingValue: book.rating, bestRating: 5 } }),
      },
    }),
  };

  const details: [string, string][] = [
    ["First published", book.published],
    ["This edition", [book.publisher, book.edition].filter(Boolean).join(", ")],
    ["Pages", book.pages > 0 ? String(book.pages) : ""],
    ["Language", book.language],
    ["ISBN-13", book.isbn13],
    ["ISBN-10", book.isbn10],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <div className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="topbar" aria-label="Page controls">
        <Link href="/books" className="chip-btn back-link">
          <span aria-hidden="true">←</span> Library
        </Link>
        <ThemeToggle />
      </nav>

      <div className="book-stage">
        {/* The fade lives on the wrapper: animating opacity on the 3D element itself would flatten it */}
        <div className="book3d-fade">
          <div className="book3d" data-status={book.status}>
            <div className="book3d-back" />
            <div className="book3d-pages" />
            <div className="book3d-cover">
              <BookCover src={book.cover} title={book.title} author={book.author} tone={index} />
            </div>
          </div>
        </div>
      </div>

      <header className="book-head">
        <p className="review-status">{STATUS_LABEL[book.status]}</p>
        <h1 className="book-title">{book.title}</h1>
        <p className="book-author">{book.author}</p>
        {book.rating > 0 && <CupRating value={book.rating} size={32} />}
        {book.finished && <p className="handle">Finished {fmtDate(book.finished)}</p>}
      </header>

      {book.quote.trim() && (
        <figure className="highlight">
          <figcaption>Highlighted passage</figcaption>
          <blockquote>
            <p>
              <mark>{book.quote.trim()}</mark>
            </p>
          </blockquote>
        </figure>
      )}

      <section aria-labelledby="review-title">
        <h2 id="review-title" className="chapter">
          {site.profile.name}&apos;s review
        </h2>
        {paragraphs.length > 0 ? (
          <div className="review-body">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          <p className="essays-note">This review is still steeping. Check back soon.</p>
        )}
      </section>

      {book.synopsis && (
        <section aria-labelledby="about-title">
          <h2 id="about-title" className="chapter">
            What it&apos;s about
          </h2>
          <p className="synopsis">{book.synopsis}</p>
        </section>
      )}

      {details.length > 0 && (
        <section aria-labelledby="details-title">
          <h2 id="details-title" className="chapter">
            The edition
          </h2>
          <dl className="book-details">
            {details.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>
                  {v}
                  {k.startsWith("ISBN") && <CopyButton value={v} label={k} />}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {book.links.length > 0 && (
        <section aria-labelledby="find-title">
          <h2 id="find-title" className="chapter">
            Find it
          </h2>
          {book.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="card">
              <span className="card-mark" aria-hidden="true">
                {host(l.url).includes("goodreads.") ? <BrandIcon platform="goodreads" size={22} /> : <span className="card-letter">{l.label.charAt(0)}</span>}
              </span>
              <span className="card-text">
                <span className="card-title">{l.label}</span>
                <span className="card-sub">{host(l.url)}</span>
              </span>
            </a>
          ))}
        </section>
      )}

      {(prev || next) && (
        <nav className="book-nav" aria-label="More books">
          {prev ? (
            <Link href={`/books/${prev.id}`} className="card">
              <span className="card-text">
                <span className="card-sub">Previous book</span>
                <span className="card-title">{prev.title}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/books/${next.id}`} className="card book-nav-next">
              <span className="card-text">
                <span className="card-sub">Next book</span>
                <span className="card-title">{next.title}</span>
              </span>
            </Link>
          )}
        </nav>
      )}

      {site.footer && <footer className="footer">{site.footer}</footer>}
    </div>
  );
}
