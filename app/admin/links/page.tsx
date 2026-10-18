import type { Metadata } from "next";
import { loadSite } from "../_lib";
import { LinksList } from "./LinksList";

export const metadata: Metadata = { title: "Links" };

export default async function LinksPage() {
  const site = await loadSite();
  return site && <LinksList links={site.links} />;
}
