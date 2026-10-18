import type { Metadata } from "next";
import { loadSite } from "../_lib";
import { ShopList } from "./ShopList";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage() {
  const site = await loadSite();
  return site && <ShopList shop={site.shop} />;
}
