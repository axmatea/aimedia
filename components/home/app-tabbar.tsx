"use client"

import { useEffect, useState } from "react"
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
 */

type TabId = "services" | "proof"

const TABS: { id: TabId; label: string; target: string }[] = [
  { id: "services", label: "Services", target: "services" },
  { id: "proof", label: "Work", target: "proof" },
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

  return (
    <nav
      aria-label="Quick navigation"
      inert={!show}
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
      }`}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.5rem)" }}
    >
      <div className="mx-3 mb-2 flex items-stretch gap-1 rounded-2xl border border-white/12 bg-[#050507]/85 p-1.5 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => scrollToId(tab.target)}
            aria-current={active === tab.id ? "true" : undefined}
            className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-[color,background-color,transform] duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
              active === tab.id
                ? "bg-white/10 text-white"
                : "text-white/60 [@media(hover:hover)]:hover:text-white [@media(hover:hover)]:hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          onClick={openBooking}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#FF2D55]/70 bg-[#FF2D55]/15 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-transform duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF2D55] opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF2D55]" />
          </span>
          Book
        </button>
      </div>
    </nav>
  )
}
