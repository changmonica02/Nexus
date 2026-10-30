import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nexus",
    short_name: "Nexus",
    description: "Local-first knowledge workspace",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/nexus-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/nexus-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/nexus-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon", purpose: "any" },
    ],
  };
}
