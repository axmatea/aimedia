"use client"

/**
 * Booking island (v7.3): direct calendar booking, the inline finale section, and
 * the native <dialog> modal. Moved verbatim out of app/page.tsx so the page
 * shell can be a server component. All booking behavior, markup, and the
 * "open-booking" / "booking-closed" window-event contract are unchanged.
 */

import { useState, useEffect, useRef, useMemo, memo } from "react"
import dynamic from "next/dynamic"
import { Disp } from "@/components/home/shared"
import { CAL_LINK, CALENDLY_URL } from "@/components/home/data"
import type { CalBookingCompletion } from "@/components/ui/cal-inline"
import {
  attributedCalUrl,
  calAttributionConfig,
  captureAttribution,
  type FunnelAttribution,
} from "@/lib/conversion/attribution"
import { trackFunnel } from "@/lib/conversion/track"

const ShaderAnimation = dynamic(
  () => import("@/components/ui/shader-animation").then((mod) => mod.ShaderAnimation),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#050507]" /> }
)
// Inline Cal.com embed: chunk + third-party embed script load only when this
// booking surface is actually rendered.
const CalInline = dynamic(
  () => import("@/components/ui/cal-inline").then((mod) => mod.CalInline),
  { ssr: false, loading: () => <div className="w-full min-h-[560px] rounded-2xl animate-pulse bg-white/[0.03] border border-white/10" /> }
)

// ── BookingFlow: calendar-first path, reused inline and in the modal ─────────
function BookingFlow({ surface }: { surface: "inline" | "dialog" }) {
  const [embedFailed, setEmbedFailed] = useState(false)
  const [calendarActive, setCalendarActive] = useState(false)
  const [attribution] = useState<FunnelAttribution>(() => captureAttribution())
  const flowRef = useRef<HTMLDivElement>(null)
  const startedTracked = useRef(false)
  const completedUid = useRef("")

  useEffect(() => {
    const element = flowRef.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      setCalendarActive(true)
      observer.disconnect()
    }, { rootMargin: "400px 0px" })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const calConfig = useMemo(() => ({
    duration: "30",
    ...calAttributionConfig(attribution),
  }), [attribution])
  const fallbackUrl = useMemo(
    () => attributedCalUrl(CALENDLY_URL, attribution),
    [attribution],
  )

  const handleStarted = () => {
    if (startedTracked.current) return
    startedTracked.current = true
    trackFunnel("booking_started")
  }

  const handleCompleted = (booking: CalBookingCompletion) => {
    const uid = booking.uid || "unknown"
    if (completedUid.current === uid) return
    completedUid.current = uid
    trackFunnel("booking_completed")
  }

  return (
    <div ref={flowRef} className="relative z-10 mx-auto max-w-4xl">
      <div className="mb-7 text-center md:mb-10">
        <span className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/75">Book a Call</span>
        <Disp className="mt-4 block text-white" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
          CHOOSE A TIME.<br /><span style={{ color: "var(--red)" }}>TELL US WHAT YOU NEED.</span>
        </Disp>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/70 md:text-base">
          Choose a time for a focused 30-minute strategy call. The booking form collects the context we need to prepare.
        </p>
      </div>

      {calendarActive && !embedFailed ? (
        <>
          <CalInline
            calLink={CAL_LINK}
            namespace={`call-${surface}`}
            config={calConfig}
            onFail={() => setEmbedFailed(true)}
            onStarted={handleStarted}
            onCompleted={handleCompleted}
          />
          <p className="mt-4 text-center text-xs text-white/60">
            Calendar not loading?{" "}
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-[#FF2D55]">
              Open it in a new tab
            </a>
          </p>
        </>
      ) : embedFailed ? (
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-center md:p-9">
          <p className="text-sm text-white/70">The calendar could not load here. Continue directly on Cal.com.</p>
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[#FF2D55] px-8 text-sm font-bold text-white transition-colors hover:bg-[#FF1745]"
          >
            Choose a time →
          </a>
        </div>
      ) : (
        <div className="flex min-h-[560px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025]" aria-hidden>
          <span className="text-sm text-white/45">Calendar ready when you arrive</span>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-white/60">
        Prefer email?{" "}
        <a href="mailto:info@aimedia.global" className="underline underline-offset-2 transition-colors hover:text-[#FF2D55]">info@aimedia.global</a>
      </p>
    </div>
  )
}

// ── BookingSection: inline finale on the page, shader background + booking flow ──
export const BookingSection = memo(function BookingSection() {
  return (
    <div id="booking">
      <div className="relative py-16 md:py-24 px-4 md:px-6 overflow-hidden bg-[#050507]">
        <ShaderAnimation className="absolute inset-0 w-full h-full opacity-80 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050507] via-[#050507]/10 to-[#050507]/50 pointer-events-none" />
        <BookingFlow surface="inline" />
      </div>
    </div>
  )
})

// ── BookingDialog: native <dialog> modal opened by the sticky nav CTA + Contact ──
// showModal() provides the focus trap, Esc-to-close, and background inerting natively,
// so no manual inert on <main> is needed (that would also inert this dialog).
export const BookingDialog = memo(function BookingDialog() {
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onOpen = () => {
      const dlg = ref.current
      if (!dlg || dlg.open) return
      trackFunnel("booking_opened")
      setOpen(true)
      dlg.showModal()
    }
    window.addEventListener("open-booking", onOpen)
    return () => window.removeEventListener("open-booking", onOpen)
  }, [])

  const close = () => ref.current?.close()

  return (
    <dialog
      ref={ref}
      aria-label="Book a Call"
      className="booking-dialog"
      onClose={() => {
        setOpen(false)
        // Companion to "open-booking": lets decoupled UI (StickyCta) know the
        // modal is gone without reaching into dialog internals.
        window.dispatchEvent(new Event("booking-closed"))
      }}
      onClick={(e) => { if (e.target === ref.current) close() }}
    >
      {open && (
        <div className="relative bg-[#050507]">
          {/* Sheet grab handle (phones only, styled in globals.css): the visual
              cue that this modal is presented as a bottom sheet. Decorative. */}
          <span className="booking-sheet-grip" aria-hidden />
          <button
            type="button"
            onClick={close}
            aria-label="Close booking"
            className="absolute right-4 top-4 z-20 w-9 h-9 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center"
          >
            ✕
          </button>
          <div className="px-4 md:px-8 py-12 md:py-14">
            <BookingFlow surface="dialog" />
          </div>
        </div>
      )}
    </dialog>
  )
})
