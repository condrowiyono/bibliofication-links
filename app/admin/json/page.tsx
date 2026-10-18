import type { Metadata } from "next";
import { loadSite } from "../_lib";
import { JsonEditor } from "./JsonEditor";

export const metadata: Metadata = { title: "JSON" };

export default async function JsonPage() {
  const site = await loadSite();
  return site && <JsonEditor site={site} />;
}
