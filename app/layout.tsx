import type { Metadata } from "next";
import { Geist_Mono, Space_Grotesk, Bebas_Neue } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { LazyMotion, domAnimation } from "motion/react";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import "./globals.css";

const bebas = Bebas_Neue({ weight: "400", variable: "--font-bebas", subsets: ["latin"], display: "swap", preload: true, adjustFontFallback: true });
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], weight: ["300","400","500","600","700"], display: "swap", preload: true, adjustFontFallback: true });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "AX Media · AI Growth Agency | Web3, Founders & Brands",
    template: "%s | AX Media",
  },
  description:
    "AI growth agency for Web3, Founders & Brands. We build lead gen systems, content automation & AI ops pipelines that compound: leads on autopilot, a content engine that runs while you sleep, and sales ops that never stop.",
  metadataBase: new URL("https://aimedia.global"),
  alternates: { canonical: "https://aimedia.global" },
  keywords: [
    "AI marketing agency",
    "AI lead generation",
    "Web3 marketing agency",
    "AI growth systems",
    "content automation",
    "AI ops pipeline",
    "go-to-market agency",
    "founder marketing",
    "AI agency",
    "aimedia",
  ],
  authors: [{ name: "AX Media", url: "https://aimedia.global" }],
  creator: "AX Media",
  publisher: "AX Media",
  openGraph: {
    title: "AX Media · AI Growth Agency | Web3, Founders & Brands",
    description:
      "AI growth agency for Web3, Founders & Brands. Lead gen systems, content automation, AI ops pipelines that compound: leads on autopilot and a content engine that runs while you sleep.",
    url: "https://aimedia.global",
    siteName: "AX Media",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-ax-media.png",
        width: 1200,
        height: 630,
        alt: "AX Media Company · AI Growth Agency for Web3, Founders & Brands",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@ai.mediaco",
    creator: "@ai.mediaco",
    title: "AX Media · AI Growth Agency",
    description:
      "We build AI systems: lead gen · content · ops automation that compound. Leads on autopilot, content that runs while you sleep. For Web3, Founders & Brands.",
    images: ["/og-ax-media.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AX Media",
  url: "https://aimedia.global",
  logo: "https://aimedia.global/og-ax-media.png",
  description:
    "AI growth agency building lead gen systems, content automation, and AI ops pipelines for Web3 projects, founders, and brands.",
  foundingDate: "2024",
  areaServed: "Worldwide",
  sameAs: [
    "https://instagram.com/ai.mediaco",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "AI Growth Systems",
    itemListElement: [
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Go-to-Market Engine", description: "AI-powered lead generation that fills your pipeline on autopilot with qualified buyers." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Content System", description: "A content engine that runs while you sleep, auto-published across all channels." } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI Ops Pipeline", description: "Sales and ops on autopilot, with automated follow-up that never stops." } },
    ],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bebas.variable} ${space.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#050507] text-white antialiased" style={{ fontFamily: "var(--font-space)" }}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <LazyMotion features={domAnimation}>
            <SmoothScroll />
            {children}
          </LazyMotion>
        </ThemeProvider>
      </body>
    </html>
  );
}
