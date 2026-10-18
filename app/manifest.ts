import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bey (@bibliofication)",
    short_name: "Bey",
    description: "Books, Kindle, Harry Potter, K-pop and matcha. All of Bey's links in one place.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4eedf",
    theme_color: "#f4eedf",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
