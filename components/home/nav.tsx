"use client"

/**
 * SiteNav island (v7.2): the fixed top nav. Client because of the theme
 * toggle, the Lenis anchor glides, and the booking dialog triggers. Markup
 * moved verbatim from app/page.tsx.
 */

import ThemeToggle from "@/components/ui/toggle-theme"
import { AxWordmark } from "@/components/ui/ax-wordmark"
import { NAV_LINKS } from "@/components/home/data"
import { scrollToId, openBooking } from "@/components/home/actions"

export function SiteNav() {
  return (
    <nav className="ai-nav fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-10 py-4 md:py-5 backdrop-blur-md border-b ai-border">
      <a href="#" className="flex items-center flex-shrink-0">
        {/* Inline wordmark in the real document fonts, themed via currentColor */}
        <AxWordmark className="ax-wordmark h-8 md:h-11 w-auto text-[#050507] dark:text-white" />
      </a>
      <div className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map((item) => (
          <a key={item.label} href={item.href}
            onClick={(e) => { e.preventDefault(); if (item.href === "#booking") openBooking(); else scrollToId(item.href.slice(1)) }}
            className="px-5 py-2.5 ai-muted text-base font-bold hover:!text-black dark:hover:!text-white hover:bg-black/10 dark:hover:bg-white/12 hover:scale-105 rounded-full transition-[color,background-color,transform] duration-200">
            {item.label}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <a
          href="mailto:info@aimedia.global"
          className="hidden lg:inline-flex items-center gap-1.5 ai-muted text-xs font-medium hover:text-[#FF2D55] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 6L2 7" />
          </svg>
          info@aimedia.global
        </a>
        <ThemeToggle />
        <button
          type="button"
          onClick={openBooking}
          className="group relative px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-bold tracking-wider uppercase overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-95 border-2 border-[#FF2D55] dark:border-[#FF2D55]/60 hover:border-[#FF2D55] text-[#FF2D55] dark:text-white"
        >
          <span className="absolute inset-0 bg-[#FF2D55]/20 dark:bg-[#FF2D55]/15 group-hover:bg-[#FF2D55]/30 transition-colors duration-300" />
          <span className="relative z-10 flex items-center gap-1.5 md:gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D55] group-hover:animate-ping" />
            Book a Call
          </span>
        </button>
      </div>
    </nav>
  )
}
