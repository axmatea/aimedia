"use client"

import { useEffect, useState, type ReactElement } from "react"
import { scrollToId, openBooking } from "@/components/home/actions"

/**
 * AppTabBar: app-style bottom action bar, phones only (hidden lg+).
 *
 * Evolves the old floating "Book a call" pill (StickyCta) into a native-feel
 * tab bar: an elevated, blurred, safe-area-aware surface pinned to the bottom
 * with three primary actions (Services, Work, Book). Services/Work glide to
 * their sections via Lenis; Book opens the same booking <dialog> as the nav CTA.
 *
 * Visibility mirrors the old pill so it never competes with the hero LCP or the
 * real booking UI:
 * - appears only after the hero has scrolled out of view;
 * - hides while the inline #booking section is on screen and while the booking
 *   <dialog> is open (open-booking / booking-closed window events);
 * - desktop never renders it and it is inert (out of the tab / a11y tree) while
 *   hidden. A scroll-spy observer lights the active tab.
 *
 * No new dependencies, no per-frame work: three IntersectionObservers and two
 * listeners. Entrance and tap feedback are CSS transitions, disabled under
 * prefers-reduced-motion.
 *
 * Each tab is an icon-over-label stack, the shape every installed iOS/Android
 * app uses, which also lifts each target past the 44px minimum tap size.
 */

type TabId = "services" | "proof"

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
  "aria-hidden": true,
}

function ServicesIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z" />
      <path d="m3 12.5 9 4.5 9-4.5" />
      <path d="m3 17 9 4.5 9-4.5" />
    </svg>
  )
}

function WorkIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="m3 15.5 4.5-4a2 2 0 0 1 2.7 0L15 16" />
      <circle cx="15.5" cy="9" r="1.5" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  )
}

const TABS: { id: TabId; label: string; target: string; Icon: () => ReactElement }[] = [
  { id: "services", label: "Services", target: "services", Icon: ServicesIcon },
  { id: "proof", label: "Work", target: "proof", Icon: WorkIcon },
]

export function AppTabBar() {
  const [heroPassed, setHeroPassed] = useState(false)
  const [bookingInView, setBookingInView] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [active, setActive] = useState<TabId | null>(null)

  useEffect(() => {
    const hero = document.querySelector(".hero-section")
    const booking = document.getElementById("booking")

    const heroObs = new IntersectionObserver(([entry]) => setHeroPassed(!entry.isIntersecting))
    if (hero) heroObs.observe(hero)

    const bookingObs = new IntersectionObserver(([entry]) => setBookingInView(entry.isIntersecting))
    if (booking) bookingObs.observe(booking)

    // Scroll-spy: highlight whichever mapped section owns the viewport middle.
    const sections = TABS
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null)
    const spy = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting)
        if (hit) setActive(hit.target.id as TabId)
      },
      { rootMargin: "-45% 0px -45% 0px" },
    )
    sections.forEach((el) => spy.observe(el))

    const onOpen = () => setDialogOpen(true)
    const onClosed = () => setDialogOpen(false)
    window.addEventListener("open-booking", onOpen)
    window.addEventListener("booking-closed", onClosed)

    return () => {
      heroObs.disconnect()
      bookingObs.disconnect()
      spy.disconnect()
      window.removeEventListener("open-booking", onOpen)
      window.removeEventListener("booking-closed", onClosed)
    }
  }, [])

  const show = heroPassed && !bookingInView && !dialogOpen
  const activeIndex = TABS.findIndex((t) => t.id === active)

  return (
    <nav
      aria-label="Quick navigation"
      inert={!show}
      className={`app-tabbar-shell lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
      }`}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.5rem)" }}
    >
      <div className="relative mx-3 mb-2 flex items-stretch gap-1 rounded-2xl border border-white/12 bg-[#050507]/85 p-1.5 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        {/* Sliding selection pill: the signature native tab-bar move. One shared
            surface glides between tabs on a spring curve instead of each tab
            fading its own background in and out. Transform-only, so it stays on
            the compositor; it fades out when no mapped section owns the
            viewport. Track width mirrors the three flex-1 tabs inside p-1.5
            with gap-1 (0.25rem). */}
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 rounded-xl bg-white/10 ring-1 ring-inset ring-white/10 transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none ${
            activeIndex >= 0 ? "opacity-100" : "opacity-0"
          }`}
          style={{
            width: "calc((100% - 1.25rem) / 3)",
            transform: `translateX(calc(${Math.max(activeIndex, 0)} * (100% + 0.25rem)))`,
          }}
        />
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => scrollToId(tab.target)}
            aria-current={active === tab.id ? "true" : undefined}
            className={`relative z-10 flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-[color,transform] duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
              active === tab.id
                ? "text-white [&>svg]:-translate-y-px [&>svg]:scale-105"
                : "text-white/60 [@media(hover:hover)]:hover:text-white"
            } [&>svg]:transition-transform [&>svg]:duration-300 [&>svg]:ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:[&>svg]:transition-none`}
          >
            <tab.Icon />
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          onClick={openBooking}
          className="relative z-10 flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-[#FF2D55]/70 bg-[#FF2D55]/15 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-transform duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <span className="relative">
            <BookIcon />
            <span className="absolute -right-1 -top-0.5 flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF2D55] opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF2D55]" />
            </span>
          </span>
          Book
        </button>
      </div>
    </nav>
  )
}
