# Bey's links

A link-in-bio page for Bey (@bibliofication), in the spirit of Linktree and lynk.id, with a small editor to manage it. Next.js on Cloudflare Workers.

- `/`: the page. Bookplate header, her "shelf" of loves as book spines, her Shopee picks, links grouped into sections, and her latest Medium essays.
- `/admin`: the editor, behind a password. Edit with a form, or edit the raw JSON directly.

## The data is one JSON document

`data/links.json` is the starting content. After the first save from `/admin`, the page reads its copy from Cloudflare KV (key `site`), so edits go live without a redeploy. "Download JSON" in the editor gives you a backup you can paste back into this file.

Rules the editor enforces:

- A link with an empty `url` is hidden from the page and flagged "Hidden: needs a URL" in the editor.
- `shop.items` is the list of affiliate products: `store` (`"shopee"` or `"tiktok"` for TikTok Shop), `title`, `url` (the affiliate link), optional `image` (photo URL) and `price` (text, e.g. `Rp 89.000`), and `visible`. Products show as a two-column photo grid labelled with their store; one without a link stays hidden. `shop.stores.shopee` / `shop.stores.tiktok` (optional) each add a green "See everything on ..." button under the grid. With no products and no store links, the section doesn't appear.
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

The first deploy creates the KV namespace for you. To serve it at `bethanielle.me` (or `links.bethanielle.me`), add a custom domain to the `bey-links` Worker in the Cloudflare dashboard, or add a `routes` entry to `wrangler.jsonc`.
