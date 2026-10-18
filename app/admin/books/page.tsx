import type { Metadata } from "next";
import { loadSite } from "../_lib";
import { BooksList } from "./BooksList";

export const metadata: Metadata = { title: "Books" };

export default async function BooksPage() {
  const site = await loadSite();
  return site && <BooksList books={site.books} />;
}
