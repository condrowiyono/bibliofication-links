import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadSite } from "../../_lib";
import { LinkForm } from "../LinkForm";

export const metadata: Metadata = { title: "Edit link" };

export default async function EditLinkPage(props: PageProps<"/admin/links/[id]">) {
  const { id } = await props.params;
  const site = await loadSite();
  if (!site) return null;
  const link = site.links.find((l) => l.id === id);
  if (!link) notFound();
  return <LinkForm key={link.id} link={link} isNew={false} />;
}
