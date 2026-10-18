import { BookOpen, Braces, Link2, ShoppingBag, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; mobile: boolean };

export const NAV: NavItem[] = [
  { href: "/admin/links", label: "Links", icon: Link2, mobile: true },
  { href: "/admin/shop", label: "Shop", icon: ShoppingBag, mobile: true },
  { href: "/admin/books", label: "Books", icon: BookOpen, mobile: true },
  { href: "/admin/profile", label: "Profile", icon: UserRound, mobile: true },
  { href: "/admin/json", label: "JSON", icon: Braces, mobile: false },
];

/** Detail and "new" pages (/admin/books/xyz) trade the bottom tab bar for their save bar on phones. */
export const isDetailPath = (path: string) => /^\/admin\/(links|shop|books)\/[^/]+/.test(path);
