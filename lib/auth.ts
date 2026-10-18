import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const COOKIE = "bey_session";

async function adminPassword() {
  const { env } = await getCloudflareContext({ async: true });
  return env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
}

/** Session token = HMAC of a fixed label keyed by the password, so changing the password logs everyone out. */
async function sessionToken(password: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("bey-admin-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isPasswordConfigured() {
  return (await adminPassword()).length > 0;
}

export async function isAdmin() {
  const password = await adminPassword();
  const value = (await cookies()).get(COOKIE)?.value;
  if (!password || !value) return false;
  return safeEqual(value, await sessionToken(password));
}

export async function logIn(attempt: string) {
  const password = await adminPassword();
  if (!password || !safeEqual(attempt, password)) return false;
  (await cookies()).set(COOKIE, await sessionToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function logOut() {
  (await cookies()).delete(COOKIE);
}
