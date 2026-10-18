import { getCloudflareContext } from "@opennextjs/cloudflare";

export type Essay = { title: string; url: string; date: string };
type Cached = { fetchedAt: number; items: Essay[] };

const FRESH_MS = 60 * 60 * 1000;

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .trim();
}

function parseFeed(xml: string): Essay[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => ({
    title: decode(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
    url: decode(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").split("?")[0],
    date: new Date(decode(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "")).toISOString(),
  })).filter((e) => e.title && e.url);
}

/**
 * Latest essays from the Medium RSS feed, cached in KV for an hour.
 * When Medium is unreachable, a stale copy is better than nothing; with no copy at all, this throws.
 */
export async function getEssays(username: string): Promise<Essay[]> {
  const { env } = await getCloudflareContext({ async: true });
  const key = `medium:${username}`;
  const cached = await env.LINKS_KV.get<Cached>(key, "json");
  if (cached && Date.now() - cached.fetchedAt < FRESH_MS) return cached.items;

  try {
    const res = await fetch(`https://medium.com/feed/@${encodeURIComponent(username)}`, {
      headers: { "user-agent": "Mozilla/5.0 (link page RSS reader)" },
    });
    if (!res.ok) throw new Error(`Medium answered ${res.status}`);
    const items = parseFeed(await res.text());
    await env.LINKS_KV.put(key, JSON.stringify({ fetchedAt: Date.now(), items } satisfies Cached));
    return items;
  } catch (err) {
    if (cached) return cached.items;
    throw err;
  }
}
