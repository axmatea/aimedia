"use client"

import { useEffect, useState } from "react"

/**
 * StickyCta (v7.1): bottom-center "Book a call" pill, mobile only (<lg).
 *
 * Visibility contract:
 * - appears only after the hero section has fully scrolled out of view
 *   (IntersectionObserver on .hero-section), so it never competes with the
 *   hero CTAs or the LCP moment;
 * - hides while the inline booking section (#booking) is on screen and while
 *   the booking <dialog> is open ("open-booking" / "booking-closed" window
 *   events), so it never overlaps or duplicates the real booking UI;
 * - desktop never sees it (lg:hidden), and the booking dialog lives in the
 *   browser top layer anyway, so overlap is impossible by construction.
 *
 * Tapping dispatches the existing "open-booking" event (same path as the nav
 * CTA). Entrance/exit is translateY + opacity via CSS transitions, disabled
 * under prefers-reduced-motion (motion-reduce:transition-none). While hidden
 * the pill is inert: out of the tab order and the accessibility tree.
 * No new dependencies, no per-frame work: two observers and two listeners.
 */
export function StickyCta() {
  const [heroPassed, setHeroPassed] = useState(false)
  const [bookingInView, setBookingInView] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    const hero = document.querySelector(".hero-section")
    const booking = document.getElementById("booking")

    const heroObs = new IntersectionObserver(([entry]) => setHeroPassed(!entry.isIntersecting))
    if (hero) heroObs.observe(hero)

    const bookingObs = new IntersectionObserver(([entry]) => setBookingInView(entry.isIntersecting))
    if (booking) bookingObs.observe(booking)

    const onOpen = () => setDialogOpen(true)
    const onClosed = () => setDialogOpen(false)
    window.addEventListener("open-booking", onOpen)
    window.addEventListener("booking-closed", onClosed)

    return () => {
      heroObs.disconnect()
      bookingObs.disconnect()
      window.removeEventListener("open-booking", onOpen)
      window.removeEventListener("booking-closed", onClosed)
    }
  }, [])

  const show = heroPassed && !bookingInView && !dialogOpen

  return (
    <div
      inert={!show}
      className={`lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 z-40 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
      }`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
    >
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("open-booking"))}
        className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold tracking-wider uppercase text-white bg-[#050507]/85 backdrop-blur-md border-2 border-[#FF2D55]/70 shadow-[0_10px_40px_-8px_rgba(255,45,85,0.55)] active:scale-95 transition-transform motion-reduce:transition-none"
      >
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF2D55] opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF2D55]" />
        </span>
        Book a call
      </button>
    </div>
  )
}
