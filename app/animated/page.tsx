import type { Metadata } from "next"

import { AnimatedExperience } from "./animated-experience"

export const metadata: Metadata = {
  title: "Animated Experience",
  description: "A cinematic, scroll-driven journey through the AI systems AX Media designs and builds.",
  alternates: { canonical: "/animated" },
  openGraph: {
    title: "AX Media · Animated Experience",
    description: "Enter the system: AI entities, orchestration, workflows, and business platforms.",
    url: "/animated",
    type: "website",
    images: [{
      url: "/animated/posters/entity.webp",
      width: 1600,
      height: 900,
      alt: "AX Media evolving AI entity",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AX Media · Animated Experience",
    description: "A cinematic scroll-driven journey through the systems AX Media builds.",
    images: ["/animated/posters/entity.webp"],
  },
}

export default function AnimatedPage() {
  return <AnimatedExperience />
}
