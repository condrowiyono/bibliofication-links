# Bey's links

A link-in-bio page for Bey (@bibliofication), in the spirit of Linktree and lynk.id, with a small editor to manage it. Next.js on Cloudflare Workers.

- `/`: the page. Bookplate header, her "shelf" of loves as book spines, her Shopee picks, links grouped into sections, and her latest Medium essays.
- `/books` and `/books/<id>`: her library and one page per book with her review.
- `/admin`: the editor, behind a password. Edit with a form, or edit the raw JSON directly.

## The data is one JSON document

`data/links.json` is the starting content. After the first save from `/admin`, the page reads its copy from Cloudflare KV (key `site`), so edits go live without a redeploy. "Download JSON" in the editor gives you a backup you can paste back into this file.

Rules the editor enforces:

- A link with an empty `url` is hidden from the page and flagged "Hidden: needs a URL" in the editor.
- `shop.items` is the list of affiliate products: `store` (`"shopee"` or `"tiktok"` for TikTok Shop), `title`, `url` (the affiliate link), optional `image` (photo URL) and `price` (text, e.g. `Rp 89.000`), and `visible`. Products show as a two-column photo grid labelled with their store; one without a link stays hidden. `shop.stores.shopee` / `shop.stores.tiktok` (optional) each add a green "See everything on ..." button under the grid. With no products and no store links, the section doesn't appear.
- `books` is her library: `status` (`reading`, `read`, `want`), `rating` (cups of matcha, 0 to 5, 0 = not rated), `review` (blank line between paragraphs), `quote`, `finished` (YYYY-MM-DD), plus edition details from the public listing (`isbn13`, `isbn10`, `publisher`, `published`, `edition`, `pages`, `language`, `synopsis`) and `links` (where to buy). `id` is the page address, `/books/<id>`. The first three show on the home shelf; all are at `/books`. Covers for the starting books are in `public/covers/`; "Cover from ISBN" in the editor uses Open Library.
- **Book lookup.** In the editor's Books section, type a title or ISBN in "Find a book": suggestions come from Open Library and Google Books, and picking one adds a book with the edition details, cover, synopsis and store links filled in. On an existing book, "Fill in details and store links" fills only the empty fields. The same lookup is an admin-only endpoint: `GET /api/books/lookup?q=<title or ISBN>` for suggestions, `GET /api/books/lookup?book=<ISBN or title>` for one book with its Gramedia, Goodreads and Amazon links. Links found on the store itself are exact; when a store blocks the Worker or has no match, the link is a search page on that store and is labelled "(search)". Results are cached in KV for a week. Google Books' keyless quota is shared and often used up; for reliable results, add a key with `npx wrangler secret put GOOGLE_BOOKS_API_KEY`.
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
