import type { MetadataRoute } from "next"

/**
 * Web App Manifest (App Router). Emitted at /manifest.webmanifest.
 *
 * Makes aimedia.global installable as a standalone, app-like experience:
 * launched from the home screen it opens full-bleed (no browser chrome) on a
 * portrait, near-black (#050507) shell that matches the site's dark editorial
 * brand. Icons reuse the AX mark; the maskable 512 is padded on a solid brand
 * background so Android adaptive-icon masks never clip the logo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI MEDIA",
    short_name: "AI MEDIA",
    description:
      "AI growth agency for Web3, Founders & Brands. Lead gen systems, content automation, and AI ops pipelines that compound.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050507",
    theme_color: "#050507",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
