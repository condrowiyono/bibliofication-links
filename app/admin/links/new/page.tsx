import type { Metadata } from "next";
import { loadSite } from "../../_lib";
import { LinkForm } from "../LinkForm";

export const metadata: Metadata = { title: "New link" };

const newId = () => crypto.randomUUID().slice(0, 8);

export default async function NewLinkPage(props: PageProps<"/admin/links/new">) {
  const { type } = await props.searchParams;
  if (!(await loadSite())) return null;
  const link =
    type === "header"
      ? { id: newId(), type: "header" as const, title: "", visible: true }
      : { id: newId(), type: "link" as const, title: "", subtitle: "", url: "", icon: "" as const, featured: false, visible: true };
  return <LinkForm link={link} isNew />;
}
