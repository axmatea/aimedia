"use client"

/**
 * SiteNav island (v7.2): the fixed top nav. Client because of the theme
 * toggle, the Lenis anchor glides, and the booking dialog triggers. Markup
 * moved verbatim from app/page.tsx.
 *
 * Condensing bar (app-shell behaviour): at the very top the bar is fully
 * transparent so the hero reads edge to edge, the way a native app opens on a
 * full-bleed large-title screen. Past ~12px it materialises into a compact
 * blurred bar with a hairline, and the wordmark scales down a touch. Styling
 * lives in globals.css under .ai-nav.is-top / .is-scrolled; this only flips
 * the class from a passive, rAF-coalesced scroll listener.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import ThemeToggle from "@/components/ui/toggle-theme"
import { AxWordmark } from "@/components/ui/ax-wordmark"
import { NAV_LINKS } from "@/components/home/data"
import { scrollToId, openBooking } from "@/components/home/actions"

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let frame = 0
    const read = () => {
      frame = 0
      setScrolled(window.scrollY > 12)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read)
    }
    read()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [menuOpen])

  const handleAnchor = (href: string) => {
    setMenuOpen(false)
    scrollToId(href.slice(1))
  }

  return (
    <nav aria-label="Primary" className={`ai-nav ${scrolled ? "is-scrolled" : "is-top"} fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-4 md:px-10 py-4 md:py-5 backdrop-blur-md border-b ai-border`}>
      <Link href="/" aria-label="AX Media home" className="flex items-center flex-shrink-0">
        {/* Inline wordmark in the real document fonts, themed via currentColor */}
        <AxWordmark className="h-9 md:h-12" />
      </Link>
      <div className="hidden xl:flex items-center gap-0.5">
        {NAV_LINKS.map((item) => (
          item.href.startsWith("/") ? (
            <Link
              key={item.label}
              href={item.href}
              prefetch={false}
              className="px-3.5 py-2.5 text-[#FF2D55] text-sm font-bold rounded-full transition-[color,background-color,transform] duration-200 active:scale-95 motion-reduce:active:scale-100 [@media(hover:hover)]:hover:bg-[#FF2D55]/10 [@media(hover:hover)]:hover:scale-105"
            >
              {item.label}
            </Link>
          ) : (
            <a
              key={item.label}
              href={item.href}
              onClick={(event) => { event.preventDefault(); handleAnchor(item.href) }}
              className="px-3.5 py-2.5 ai-muted text-sm font-bold hover:!text-black dark:hover:!text-white rounded-full transition-[color,background-color,transform] duration-200 active:scale-95 motion-reduce:active:scale-100 [@media(hover:hover)]:hover:bg-black/10 [@media(hover:hover)]:dark:hover:bg-white/12 [@media(hover:hover)]:hover:scale-105"
            >
              {item.label}
            </a>
          )
        ))}
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <ThemeToggle />
        <button
          type="button"
          onClick={openBooking}
          className="group relative px-3 sm:px-4 md:px-6 py-2 md:py-2.5 rounded-full text-[11px] md:text-sm font-bold tracking-wider uppercase overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-95 border-2 border-[#FF2D55] dark:border-[#FF2D55]/60 hover:border-[#FF2D55] text-[#FF2D55] dark:text-white"
        >
          <span className="absolute inset-0 bg-[#FF2D55]/20 dark:bg-[#FF2D55]/15 group-hover:bg-[#FF2D55]/30 transition-colors duration-300" />
          <span className="relative z-10 flex items-center gap-1.5 md:gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D55] group-hover:animate-ping" />
            <span className="hidden min-[520px]:inline">Book a Strategy Call</span>
            <span className="min-[430px]:hidden">Book</span>
            <span className="hidden min-[430px]:inline min-[520px]:hidden">Strategy Call</span>
          </span>
        </button>
        <button
          type="button"
          className="xl:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border ai-border ai-muted transition-colors hover:text-[#FF2D55]"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
        </button>
      </div>

      <div
        id="mobile-navigation"
        className={`absolute left-3 right-3 top-[calc(100%+0.5rem)] xl:hidden rounded-2xl border ai-border bg-[#07070a]/95 p-2 shadow-2xl backdrop-blur-xl transition-[opacity,transform,visibility] duration-200 ${menuOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}
      >
        <div className="grid gap-1">
          {NAV_LINKS.map((item) => (
            item.href.startsWith("/") ? (
              <Link
                key={item.label}
                href={item.href}
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center rounded-xl px-4 text-sm font-bold text-[#FF2D55] hover:bg-white/[0.06]"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                onClick={(event) => { event.preventDefault(); handleAnchor(item.href) }}
                className="ai-muted flex min-h-11 items-center rounded-xl px-4 text-sm font-bold hover:bg-white/[0.06] hover:!text-white"
              >
                {item.label}
              </a>
            )
          ))}
          <button
            type="button"
            onClick={() => { setMenuOpen(false); openBooking() }}
            className="mt-1 flex min-h-11 items-center justify-center rounded-xl bg-[#FF2D55] px-4 text-sm font-bold text-white"
          >
            Book a Strategy Call
          </button>
        </div>
      </div>
    </nav>
  )
}
