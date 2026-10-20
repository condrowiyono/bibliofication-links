/** Small fetch helpers for the book lookup: a timeout on every request, and null instead of throwing. */

export type Fetcher = typeof fetch;

export const UA = "Mozilla/5.0 (compatible; BeyLinksBookLookup/1.0; +https://bethanielle.me)";
const TIMEOUT_MS = 7000;

export async function getJson<T>(f: Fetcher, url: string, headers: Record<string, string> = {}): Promise<T | null> {
  try {
    const res = await f(url, { headers: { "user-agent": UA, accept: "application/json", ...headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getText(f: Fetcher, url: string): Promise<string | null> {
  try {
    const res = await f(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml", "accept-language": "id-ID,id;q=0.9,en;q=0.8" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * True when the URL serves a real picture. Rejects errors, non-images, and tiny files: Amazon answers a
 * missing cover with a 1×1 GIF, and most "no cover" placeholders are a few hundred bytes.
 */
export async function isRealImage(f: Fetcher, url: string, minBytes = 2000): Promise<boolean> {
  try {
    const res = await f(url, { headers: { "user-agent": UA, accept: "image/*" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) {
      await res.body?.cancel();
      return false;
    }
    const length = Number(res.headers.get("content-length"));
    if (length > 0) {
      await res.body?.cancel();
      return length >= minBytes;
    }
    return (await res.arrayBuffer()).byteLength >= minBytes;
  } catch {
    return false;
  }
}
