# Bey's links

A link-in-bio page for Bey (@bibliofication), in the spirit of Linktree and lynk.id, with a small editor to manage it. Next.js on Cloudflare Workers.

- `/`: the page. Bookplate header, her "shelf" of loves as book spines, her Shopee picks, links grouped into sections, and her latest Medium essays.
- `/books` and `/books/<id>`: her library and one page per book with her review.
- `/admin`: the editor, behind a password. Built with shadcn/ui (Tailwind, loaded only on `/admin`) and made for phones first:
  - **Links**, **Shop**, **Books** and **Profile** tabs (a bottom tab bar on phones, a sidebar on desktop), plus **JSON** for the raw document.
  - Each list can be reordered by dragging the grip on a row (touch, mouse or keyboard), and has a show/hide switch and a ⋮ menu (move to top/bottom, delete). Tap a row to edit it on its own page; **New** opens `/admin/<tab>/new`.
  - Everything saves per item: a detail page has its own Save bar, and drag, show/hide and delete save immediately. The server changes only that item, so two open tabs don't overwrite each other.
  - Deleting asks first (a bottom sheet on phones, a dialog on desktop) and the toast offers Undo. Leaving a page with unsaved edits asks first too.
  - New books start with a search by title or ISBN that fills in the cover, edition details and store links.

## The data is one JSON document

`data/links.json` is the starting content. After the first save from `/admin`, the page reads its copy from Cloudflare KV (key `site`), so edits go live without a redeploy. "Download JSON" in the editor gives you a backup you can paste back into this file.

Rules the editor enforces:

- A link with an empty `url` is hidden from the page and flagged "Hidden: needs a URL" in the editor.
- `shop.items` is the list of affiliate products: `store` (`"shopee"` or `"tiktok"` for TikTok Shop), `title`, `url` (the affiliate link), optional `image` (photo URL) and `price` (text, e.g. `Rp 89.000`), and `visible`. Products show as a two-column photo grid labelled with their store; one without a link stays hidden. `shop.stores.shopee` / `shop.stores.tiktok` (optional) each add a green "See everything on ..." button under the grid. With no products and no store links, the section doesn't appear.
- `books` is her library: `status` (`reading`, `read`, `want`), `rating` (cups of matcha, 0 to 5, 0 = not rated), `review` (blank line between paragraphs), `quote`, `finished` (YYYY-MM-DD), plus edition details from the public listing (`isbn13`, `isbn10`, `publisher`, `published`, `edition`, `pages`, `language`, `synopsis`) and `links` (where to buy). `id` is the page address, `/books/<id>`. The first three show on the home shelf; all are at `/books`. Covers for the starting books are in `public/covers/`; "Cover from ISBN" in the editor uses Open Library.
- **Book lookup** (`lib/books/`, modelled on [ISBN-Lookup](https://github.com/ImranR98/ISBN-Lookup)) works in two steps:
  1. **ISBN → details** (`metadata.ts`): with an `ISBNDB_API_KEY`, **ISBNdb only**: search results and book details come from ISBNdb alone (Gramedia and Goodreads are read just for store links and covers, when they show the same book). Without a key, Google Books, Gramedia and Open Library answer instead, as in ISBN-Lookup: answers about a different book are dropped and the longest title wins.
  2. **Covers** (`covers.ts`): Gramedia, Goodreads, Amazon, Apple Books, Google Books, Open Library and the Bookcover API. Each candidate is downloaded to check it's a real image (no placeholders), and the list comes back best first: this exact edition before title matches.

  In the editor, "Find a book" (title or ISBN) lists ISBNdb's matches (Google Books and Open Library when there's no ISBNdb key; Open Library hits carry one consistent edition, English first), each with a flag for its edition (from its language, or from the ISBN's country group: 978-602 is Indonesian, 978-0 English…), and picking one runs both steps and fills in a new book (the details are used only when they're the same book as the one tapped); "Change" under a cover runs step 2 and shows every cover to pick from. The admin-only endpoint `GET /api/books/lookup` takes `?isbn=` (step 1, with each source's own answer in `records`), `?covers=<ISBN or title>&author=` (step 2), `?book=` (both) or `?q=` (suggestions while typing). Books come back in the same fields as `data/links.json`; store links that open a search page instead of the book are labelled "(search)". Results are cached in KV for a week. Add `&debug=1` to any lookup to skip the cache and see each outside request's status and error (keys hidden): that shows which source is failing. Optional secrets: `npx wrangler secret put ISBNDB_API_KEY` (ISBNdb is paid; on a Premium or Pro plan also set `ISBNDB_API_HOST` to `api.premium.isbndb.com` or `api.pro.isbndb.com`) and `GOOGLE_BOOKS_API_KEY` (Google's keyless quota is shared and often used up).
- `icon` is one of `instagram`, `tiktok`, `threads`, `x`, `medium`, `shopee`, `goodreads`, `spotify`, or `""` to show the title's first letter.
- `featured: true` makes the green card. `type: "header"` makes a section heading.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000, admin password comes from .dev.vars
npm run preview        # the real Worker build, in workerd, on http://localhost:8787
```

`.dev.vars` holds the local password (`ADMIN_PASSWORD=change-me`). Local KV lives in `.wrangler/state`; to reset to the seed file run `npx wrangler kv key delete site --binding LINKS_KV --local`.

## Deploy to Cloudflare

```bash
npx wrangler login
npx wrangler secret put ADMIN_PASSWORD   # pick a real password
npm run deploy
```

The first deploy creates the KV namespace for you. To serve it at `bethanielle.me` (or `links.bethanielle.me`), add a custom domain to the `bibliofication-links` Worker in the Cloudflare dashboard, or add a `routes` entry to `wrangler.jsonc`.

## Installable app (PWA)

The page installs to a phone's home screen (Add to Home Screen on iOS, Install app on Android/Chrome) with her photo as the icon. `app/manifest.ts` holds the name and colors; the icons in `app/` and `public/icons/` were cut from her Medium photo. `public/sw.js` keeps the last-seen page for offline visits and shows `/offline` otherwise; `/admin` always needs a connection. If you change the caching logic in `sw.js`, bump `VERSION` at its top so phones drop the old caches.
