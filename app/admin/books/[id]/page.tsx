import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadSite } from "../../_lib";
import { BookForm } from "../BookForm";

export const metadata: Metadata = { title: "Edit book" };

export default async function EditBookPage(props: PageProps<"/admin/books/[id]">) {
  const { id } = await props.params;
  const site = await loadSite();
  if (!site) return null;
  const book = site.books.find((b) => b.id === id);
  if (!book) notFound();
  return <BookForm key={book.id} book={book} isNew={false} />;
}
