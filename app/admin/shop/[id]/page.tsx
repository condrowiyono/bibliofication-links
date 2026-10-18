import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadSite } from "../../_lib";
import { ProductForm } from "../ProductForm";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage(props: PageProps<"/admin/shop/[id]">) {
  const { id } = await props.params;
  const site = await loadSite();
  if (!site) return null;
  const item = site.shop.items.find((it) => it.id === id);
  if (!item) notFound();
  return <ProductForm key={item.id} item={item} isNew={false} />;
}
