import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isAdmin } from "@/lib/auth";
import { lookupBook, searchBooks, toBookInfo } from "@/lib/bookLookup";

/**
 * GET /api/books/lookup?q=<title or ISBN>   suggestions for the editor's autocomplete
 * GET /api/books/lookup?book=<ISBN or title> one book in full, with Gramedia, Goodreads and Amazon links
 *
 * Books come back in the same shape as data/links.json: title, author, cover, synopsis, isbn13, isbn10,
 * publisher, published, edition, pages, language, links [{ label, url }].
 *
 * Admin only, so the Worker can't be used as a free scraper by anyone else.
 * Results are cached in KV for a week; empty results for an hour.
 */
const WEEK = 60 * 60 * 24 * 7;
const HOUR = 60 * 60;

export async function GET(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Log in to the editor first." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const book = params.get("book")?.trim();
  const q = params.get("q")?.trim();
  if (!book && !q) return Response.json({ error: "Pass ?q= for suggestions or ?book= for one book." }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });
  const opts = { googleApiKey: (env as { GOOGLE_BOOKS_API_KEY?: string }).GOOGLE_BOOKS_API_KEY || process.env.GOOGLE_BOOKS_API_KEY };
  const cacheKey = `lookup:v2:${book ? "book" : "q"}:${(book ?? q)!.toLowerCase().slice(0, 200)}`;

  const cached = await env.LINKS_KV.get(cacheKey, "json");
  if (cached) return Response.json(cached);

  const result = book
    ? { book: await lookupBook(book, opts).then((b) => (b ? toBookInfo(b) : null)) }
    : { results: (await searchBooks(q!, 8, opts)).map(toBookInfo) };
  const empty = "book" in result ? !result.book : !result.results.length;
  await env.LINKS_KV.put(cacheKey, JSON.stringify(result), { expirationTtl: empty ? HOUR : WEEK });
  return Response.json(result);
}
