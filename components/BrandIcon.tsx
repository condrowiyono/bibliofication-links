import { siGoodreads, siInstagram, siMedium, siShopee, siSpotify, siThreads, siTiktok, siX } from "simple-icons";
import type { Platform } from "@/lib/site";

const ICONS: Record<Platform, { title: string; path: string }> = {
  instagram: siInstagram,
  tiktok: siTiktok,
  x: siX,
  threads: siThreads,
  medium: siMedium,
  shopee: siShopee,
  goodreads: siGoodreads,
  spotify: siSpotify,
};

export const platformName = (p: Platform) => ICONS[p].title;

export function BrandIcon({ platform, size = 20 }: { platform: Platform; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d={ICONS[platform].path} />
    </svg>
  );
}
