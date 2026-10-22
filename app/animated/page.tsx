import type { Metadata } from "next"

import Link from "next/link"

import { CinematicExperience } from "@/components/animated-cinema/cinematic-experience"

export const metadata: Metadata = {
  title: "Animated Experience",
  robots: { index: false, follow: true },
  description: "A cinematic, scroll-driven journey through the AI systems AX Media designs and builds.",
  alternates: { canonical: "/animated" },
  openGraph: {
    title: "AX Media · Animated Experience",
    description: "Enter the system: AI entities, orchestration, workflows, and business platforms.",
    url: "/animated",
    type: "website",
    images: [{
      url: "/animated/neural-return/entity.webp",
      width: 1920,
      height: 1080,
      alt: "AX Media's obsidian AI entity with an illuminated white-red core",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AX Media · Animated Experience",
    description: "A cinematic scroll-driven journey through the systems AX Media builds.",
    images: ["/animated/neural-return/entity.webp"],
  },
}

export default function AnimatedPage() {
  return <>
    <h1 className="sr-only">AX Media Animated Experience</h1>
    <CinematicExperience resolution={<>
      <h2>Build the system<br />your business is missing.</h2>
      <nav aria-label="Next steps">
        <Link href="/#booking" prefetch={false}>Book a Strategy Call</Link>
        <Link href="/systems/qualified-pipeline" prefetch={false}>View Selected Systems</Link>
        <Link href="/" prefetch={false}>Return to Standard Site</Link>
      </nav>
    </>} />
  </>
}
