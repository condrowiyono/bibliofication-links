import type { Metadata } from "next";
import type { Book } from "@/lib/site";
import { loadSite } from "../../_lib";
import { BookForm } from "../BookForm";

export const metadata: Metadata = { title: "New book" };

const blankBook = (): Book => ({
  id: "",
  title: "",
  author: "",
  cover: "",
  status: "reading",
  rating: 0,
  finished: "",
  review: "",
  quote: "",
  synopsis: "",
  isbn13: "",
  isbn10: "",
  publisher: "",
  published: "",
  edition: "",
  pages: 0,
  language: "",
  links: [],
  visible: true,
});

export default async function NewBookPage() {
  if (!(await loadSite())) return null;
  return <BookForm book={blankBook()} isNew />;
}
