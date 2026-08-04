"use client"

/**
 * Booking island (v7.2): the 3-step quiz flow, the inline finale section, and
 * the native <dialog> modal. Moved verbatim out of app/page.tsx so the page
 * shell can be a server component. All booking behavior, markup, and the
 * "open-booking" / "booking-closed" window-event contract are unchanged.
 */

import { useState, useEffect, useRef, memo } from "react"
import { m, AnimatePresence } from "motion/react"
import dynamic from "next/dynamic"
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"
import { Magnetic } from "@/components/ui/magnetic"
import { Disp } from "@/components/home/shared"
import { CAL_LINK, CALENDLY_URL, CAL_DEFAULTS, EASE_SWIFT } from "@/components/home/data"

const ShaderAnimation = dynamic(
  () => import("@/components/ui/shader-animation").then((mod) => mod.ShaderAnimation),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#050507]" /> }
)
// Inline Cal.com embed: chunk + third-party embed script load ONLY when a
// visitor reaches booking step 3, never during page load.
const CalInline = dynamic(
  () => import("@/components/ui/cal-inline").then((mod) => mod.CalInline),
  { ssr: false, loading: () => <div className="w-full min-h-[560px] rounded-2xl animate-pulse bg-white/[0.03] border border-white/10" /> }
)

// ── BookingFlow: 3-step quiz + contact + schedule, reused inline and in the modal ──
function BookingFlow() {
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [quiz, setQuiz] = useState({ projectType: "", goal: "" })
  const [contact, setContact] = useState({ name: "", email: "", phone: "" })
  const [emailError, setEmailError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [calBookingUrl, setCalBookingUrl] = useState("")
  // Inline Cal embed failed to boot (blocked / offline / Cal outage): step 2
  // falls back to the prominent external-link CTA it used pre-v7.1.
  const [embedFailed, setEmbedFailed] = useState(false)

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const handleContactContinue = async () => {
    // Phone is optional (v7): name + email are the only gate.
    if (!contact.name || !contact.email) return
    if (!validateEmail(contact.email)) { setEmailError("Please enter a valid email address"); return }
    setEmailError("")

    // Build the prefilled cal.com URL; step 2 presents it as the single primary CTA.
    const params = new URLSearchParams({
      ...CAL_DEFAULTS,
      name: contact.name,
      email: contact.email,
      a1: quiz.projectType,
      a2: quiz.goal,
    })
    const fullCalUrl = `${CALENDLY_URL}?${params.toString()}`
    setCalBookingUrl(fullCalUrl)

    setSubmitting(true)
    try {
      await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          projectType: quiz.projectType,
          goal: quiz.goal,
        }),
      })
    } catch { /* silent: fallback link on step 2 always works */ }
    setSubmitting(false)
    setStep(2)
  }

  return (
    <div className="relative z-10 max-w-2xl md:max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-14">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 border rounded-full border-white/20 text-white/75">Project request</span>
            <Disp className="text-white block mt-4" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
              SHARE THE TASK.<br /><span style={{ color: "var(--red)" }}>WE&apos;LL MAP THE SCOPE.</span>
            </Disp>
            <p className="text-white/75 text-sm md:text-lg mt-4 max-w-lg mx-auto leading-relaxed">
              Send the context. We review the problem, define the scope, and prepare the right proposal.
            </p>
            <p className="text-white/55 text-xs md:text-sm mt-2 tracking-wide">Context first. Scope second. Proposal after analysis.</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 md:gap-2 mb-6 md:mb-10">
            {["Brief", "Contact", "Time"].map((label, i) => (
              <div key={label} className="flex items-center gap-1 md:gap-2">
                <div className="flex items-center gap-1 md:gap-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all" style={{
                    backgroundColor: step > i ? "#FF2D55" : step === i ? "rgba(255,45,85,0.2)" : "rgba(255,255,255,0.06)",
                    border: step === i ? "1px solid #FF2D55" : "1px solid transparent",
                    color: step >= i ? "#FF2D55" : "rgba(255,255,255,0.55)",
                  }}>{i + 1}</div>
                  <span className="hidden sm:inline text-xs font-medium uppercase tracking-wider" style={{ color: step === i ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)" }}>{label}</span>
                </div>
                {i < 2 && <div className="w-10 h-px mx-1" style={{ backgroundColor: step > i ? "#FF2D55" : "rgba(255,255,255,0.12)" }} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <m.div key="step0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease: EASE_SWIFT }} className="max-w-2xl mx-auto space-y-6 md:space-y-7 rounded-3xl border border-white/10 bg-white/[0.035] p-5 md:p-8 shadow-[0_30px_90px_-45px_rgba(255,45,85,0.65)]">

                {/* Project type */}
                <div>
                  <label className="text-white/90 text-base md:text-xl font-black block mb-3">What best describes your project?</label>
                  <div className="flex flex-wrap gap-2">
                    {["Custom Platform", "Client Portal", "Internal Ops", "AI Automation", "Growth System", "Content System", "Other"].map(opt => (
                      <button key={opt} type="button" onClick={() => setQuiz(p => ({ ...p, projectType: opt }))}
                        className={`px-4 py-2 rounded-full text-sm font-bold border transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.98] ${
                          quiz.projectType === opt
                            ? "bg-[#FF2D55] border-[#FF2D55] text-white scale-105"
                            : "bg-white/10 border-white/30 text-white/80 hover:border-[#FF2D55]/60 hover:text-white"
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Context */}
                <div>
                  <label htmlFor="project-context" className="text-white/90 text-base md:text-xl font-black block mb-3">What should change?</label>
                  <textarea
                    id="project-context"
                    value={quiz.goal}
                    onChange={(e) => setQuiz((current) => ({ ...current, goal: e.target.value }))}
                    rows={4}
                    maxLength={1200}
                    placeholder="Describe the problem, current workflow, or outcome you want to create."
                    className="w-full resize-y min-h-28 bg-white/5 border border-white/25 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/45 focus:outline-none focus:border-[#FF2D55]/70 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(255,45,85,0.12)] transition-[border-color,box-shadow,background-color] duration-200"
                  />
                </div>

                <Magnetic className="w-full"><LiquidMetalButton label="Continue to contact →" onClick={() => { if (quiz.projectType && quiz.goal.trim()) setStep(1) }} className="w-full justify-center" /></Magnetic>
                {!(quiz.projectType && quiz.goal.trim()) && <p className="text-white/60 text-xs text-center">Choose a project type and add a short context note</p>}
              </m.div>
            )}

            {step === 1 && (
              <m.div key="step1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: EASE_SWIFT }} className="max-w-md mx-auto space-y-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5 md:p-7 shadow-[0_30px_90px_-45px_rgba(255,45,85,0.65)]">
                {[
                  { field: "name" as const, label: "Your name", type: "text", ph: "First name", autoComplete: "name", inputMode: "text" as const, hint: "" },
                  { field: "email" as const, label: "Email address", type: "email", ph: "you@company.com", autoComplete: "email", inputMode: "email" as const, hint: "" },
                  { field: "phone" as const, label: "Phone number", type: "tel", ph: "+1 (555) 000-0000", autoComplete: "tel", inputMode: "tel" as const, hint: "optional, for WhatsApp follow-up" },
                ].map(({ field, label, type, ph, autoComplete, inputMode, hint }) => (
                  <div key={field}>
                    <label className="text-white/75 text-xs uppercase tracking-widest block mb-2 font-bold">
                      {label}
                      {hint && <span className="normal-case tracking-normal font-normal text-white/60"> · {hint}</span>}
                    </label>
                    <input type={type} placeholder={ph} value={contact[field]} autoComplete={autoComplete} inputMode={inputMode}
                      onChange={e => { setContact(c => ({ ...c, [field]: e.target.value })); if (field === "email") setEmailError("") }}
                      className="w-full bg-white/5 border border-white/25 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#FF2D55]/70 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(255,45,85,0.12)] transition-[border-color,box-shadow,background-color] duration-200" />
                    {field === "email" && emailError && <p className="text-[#FF2D55] text-xs mt-1">{emailError}</p>}
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(0)} className="px-5 py-3 rounded-xl border border-white/30 text-white/75 text-sm hover:border-white/50 hover:text-white transition-colors">← Back</button>
                  <Magnetic className="flex-1"><LiquidMetalButton label={submitting ? "Sending..." : "Send & choose time →"} onClick={handleContactContinue} className="w-full justify-center" /></Magnetic>
                </div>
                {!(contact.name && contact.email) && <p className="text-white/60 text-xs text-center">Name and email required</p>}
              </m.div>
            )}

            {step === 2 && (
              <m.div key="step2" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: EASE_SWIFT }} className="max-w-3xl mx-auto text-center space-y-4">
                <Disp className="text-white text-4xl">PICK YOUR TIME.</Disp>
                <p className="text-white/65 text-base">Choose a slot below and the call is locked.</p>
                {!embedFailed ? (
                  <>
                    {/* Inline Cal.com calendar, prefilled from the quiz + contact.
                        The embed script loads only now (see CalInline). */}
                    <CalInline
                      calLink={CAL_LINK}
                      config={{
                        name: contact.name,
                        email: contact.email,
                        a1: quiz.projectType,
                        a2: quiz.goal,
                        duration: "60",
                      }}
                      onFail={() => setEmbedFailed(true)}
                    />
                    <p className="text-white/60 text-xs">
                      Calendar not loading?{" "}
                      <a href={calBookingUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#FF2D55] transition-colors">
                        Open it in a new tab
                      </a>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-white/65 text-sm">The embedded calendar could not load here, so grab your time directly on Cal.com. Your answers ride along.</p>
                    <Magnetic className="inline-block">
                      <a
                        href={calBookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-10 py-4 mt-2 bg-[#FF2D55] hover:bg-[#FF1745] text-white text-base font-bold rounded-full transition-colors shadow-[0_24px_70px_-20px_rgba(255,45,85,0.7)]"
                      >
                        Pick a time on Cal.com →
                      </a>
                    </Magnetic>
                  </>
                )}
                <p className="text-white/70 text-sm pt-2">Confirmation will be sent to <span className="text-white font-semibold">{contact.email}</span></p>
                <p className="text-white/60 text-xs">We&apos;ll review your answers and come fully prepared.</p>
                <button type="button" onClick={() => { setStep(0); setQuiz({ projectType: "", goal: "" }); setContact({ name: "", email: "", phone: "" }); setCalBookingUrl(""); setEmbedFailed(false) }}
                  className="text-[#FF2D55]/60 text-sm hover:text-[#FF2D55] transition-colors mt-4 block mx-auto">Start over</button>
              </m.div>
            )}
          </AnimatePresence>

          {/* Email escape hatch: always available in both the inline section and the modal */}
          <p className="text-center text-white/65 text-xs mt-8">
            Prefer email?{" "}
            <a href="mailto:info@aimedia.global" className="underline underline-offset-2 hover:text-[#FF2D55] transition-colors">
              info@aimedia.global
            </a>
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
        <BookingFlow />
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
      aria-label="Book a strategy call"
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
            <BookingFlow />
          </div>
        </div>
      )}
    </dialog>
  )
})
