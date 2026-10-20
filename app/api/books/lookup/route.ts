import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isAdmin } from "@/lib/auth";
import { findCovers, lookupBook, lookupIsbn, searchBooks } from "@/lib/books";
import { parseIsbn, toIsbn13 } from "@/lib/isbn";

/**
 * The book lookup, admin only (so the Worker can't be used as a free scraper by anyone else):
 *
 *   ?isbn=<ISBN>                      step 1: details from ISBNdb, Google Books, Gramedia and Open Library
 *                                     → { book, records } (records = each source's own answer)
 *   ?covers=<ISBN or title>&title=&author=   step 2: covers from Gramedia, Goodreads, Amazon, Apple Books,
 *                                     Google Books, Open Library and the Bookcover API → { covers }
 *   ?book=<ISBN or title>             both steps → { book, covers }
 *   ?q=<title or ISBN>                suggestions while typing → { results }
 *
 * `book` is shaped like a book in data/links.json. Results are cached in KV for a week; empty ones for an hour.
 * ISBNdb is used only when ISBNDB_API_KEY is set (npx wrangler secret put ISBNDB_API_KEY).
 */
const WEEK = 60 * 60 * 24 * 7;
const HOUR = 60 * 60;

type Env = { ISBNDB_API_KEY?: string; GOOGLE_BOOKS_API_KEY?: string };

export async function GET(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Log in to the editor first." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const get = (k: string) => params.get(k)?.trim() || undefined;
  const [isbnParam, covers, book, q] = [get("isbn"), get("covers"), get("book"), get("q")];

  const isbn = isbnParam ? parseIsbn(isbnParam) : null;
  if (isbnParam && !isbn) return Response.json({ error: "That isn't a valid ISBN. Check the digits on the back cover." }, { status: 400 });
  if (!isbn && !covers && !book && !q) return Response.json({ error: "Pass ?isbn=, ?covers=, ?book= or ?q=." }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });
  const e = env as Env;
  const opts = {
    isbndbKey: e.ISBNDB_API_KEY || process.env.ISBNDB_API_KEY,
    googleApiKey: e.GOOGLE_BOOKS_API_KEY || process.env.GOOGLE_BOOKS_API_KEY,
  };

  const author = get("author") ?? "";
  const title = get("title") ?? "";
  const [mode, key] = isbn ? ["isbn", isbn] : covers ? ["covers", `${covers}|${title}|${author}`] : book ? ["book", book] : ["q", q!];
  const cacheKey = `lookup:v5:${mode}:${key.toLowerCase().slice(0, 200)}`;
  const cached = await env.LINKS_KV.get(cacheKey, "json");
  if (cached) return Response.json(cached);

  let result: object;
  let empty: boolean;
  if (isbn) {
    const r = await lookupIsbn(isbn, opts);
    result = { book: r?.book ?? null, records: r?.records ?? [] };
    empty = !r;
  } else if (covers) {
    const coverIsbn = parseIsbn(covers);
    // With an ISBN, the title (when given) lets step 2 check that store results are this book.
    const query = coverIsbn ? { isbn13: toIsbn13(coverIsbn), title: title || undefined, author } : { title: covers, author };
    const list = await findCovers(query, opts);
    result = { covers: list };
    empty = !list.length;
  } else if (book) {
    const r = await lookupBook(book, opts);
    result = { book: r?.book ?? null, covers: r?.covers ?? [] };
    empty = !r;
  } else {
    const results = await searchBooks(q!, 8, opts);
    result = { results };
    empty = !results.length;
  }
  await env.LINKS_KV.put(cacheKey, JSON.stringify(result), { expirationTtl: empty ? HOUR : WEEK });
  return Response.json(result);
}
