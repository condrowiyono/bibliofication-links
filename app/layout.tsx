import type { Metadata, Viewport } from "next";
import { IM_Fell_English, Literata } from "next/font/google";
import "./globals.css";

// IM Fell is a 17th-century press type: the old-book, Hogwarts-letter voice for names and headings.
const fell = IM_Fell_English({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-fell" });
// Literata was drawn for long reading on e-readers, which suits a Kindle reader's page.
const literata = Literata({ subsets: ["latin"], variable: "--font-literata" });

export const metadata: Metadata = {
  title: "Bey",
  description: "Books, Kindle, Harry Potter, K-pop and matcha. All of Bey's links in one place.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4eedf" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1a17" },
  ],
};

// Applies the saved Paper/Night choice before first paint so the page never flashes the wrong theme.
const themeScript = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fell.variable} ${literata.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
