import type { Metadata } from "next";
import { loadSite } from "../../_lib";
import { ProductForm } from "../ProductForm";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  if (!(await loadSite())) return null;
  return (
    <ProductForm item={{ id: crypto.randomUUID().slice(0, 8), store: "shopee", title: "", url: "", image: "", price: "", visible: true }} isNew />
  );
}
