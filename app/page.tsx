"use client"

import { useState, useEffect, useRef, memo } from "react"
import { m, AnimatePresence, useReducedMotion } from "motion/react"
import dynamic from "next/dynamic"
import { Spotlight } from "@/components/ui/spotlight"
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"
import { Magnetic } from "@/components/ui/magnetic"
import ThemeToggle from "@/components/ui/toggle-theme"
import { LogoCloud } from "@/components/ui/logo-cloud-3"
import { GlowCard } from "@/components/ui/spotlight-card"
import { CountUp } from "@/components/ui/count-up"
import { ProofSection } from "@/components/ui/proof-section"
import { SERVE_ICONS } from "@/components/ui/serve-icons"

import { lenisScrollTo } from "@/components/providers/SmoothScroll"
// ── Below-fold heavy components: lazy loaded for faster LCP ──────────────────
const N8nWorkflowBlock = dynamic(
  () => import("@/components/ui/n8n-workflow-block-shadcnui").then((mod) => mod.N8nWorkflowBlock),
  { ssr: false, loading: () => <div className="h-[460px] rounded-2xl animate-pulse bg-white/[0.02] border border-white/5" /> }
)
const AIUGCCreators = dynamic(
  () => import("@/components/ui/animated-tooltip").then((mod) => mod.AIUGCCreators),
  { ssr: false }
)
const Lightning = dynamic(
  () => import("@/components/ui/lightning").then((mod) => mod.Lightning),
  { ssr: false }
)
const AgentRadial = dynamic(
  () => import("@/components/ui/agent-radial").then((mod) => mod.AgentRadial),
  { ssr: false, loading: () => <div className="h-[320px] rounded-xl animate-pulse bg-white/[0.02]" /> }
)
const LeadFunnel = dynamic(
  () => import("@/components/ui/lead-funnel").then((mod) => mod.LeadFunnel),
  { ssr: false, loading: () => <div className="h-[400px] rounded-2xl animate-pulse bg-white/[0.02] border border-white/5" /> }
)

// ── All heavy/below-fold components: dynamically loaded ─────────────────────
const SplineScene = dynamic(
  () => import("@/components/ui/splite").then((mod) => mod.SplineScene),
  { ssr: false }
)
const ShaderAnimation = dynamic(
  () => import("@/components/ui/shader-animation").then((mod) => mod.ShaderAnimation),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#050507]" /> }
)
const WorldMap = dynamic(
  () => import("@/components/ui/map").then((mod) => mod.WorldMap),
  { ssr: false, loading: () => <div className="h-[420px] rounded-xl animate-pulse bg-white/[0.02]" /> }
)

// ── Config ──────────────────────────────────────────────────────────────────
const CALENDLY_URL = "https://cal.com/axmedia/call"
const CAL_DEFAULTS: Record<string, string> = { duration: "60", overlayCalendar: "true" }

// ── Shared viewport config for whileInView ──────────────────────────────────
const VP = { once: true, margin: "0px 0px -80px 0px" } as const
const EASE_SWIFT: [number, number, number, number] = [0.2, 0.8, 0.2, 1]
const fadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: VP, transition: { duration: 0.9, ease: EASE_SWIFT } }

// ── Data ────────────────────────────────────────────────────────────────────
const HERO_AUDIENCES = ["WEB3.", "FOUNDERS.", "AGENCIES.", "BRANDS.", "BUILDERS."]

const TICKER = ["GO-TO-MARKET","LEAD GENERATION","CONTENT AT SCALE","AI AUTOMATION","COMMUNITY GROWTH","SOCIAL MEDIA","BUSINESS DEVELOPMENT","NFT LAUNCHES","DAO TOOLING","WEB3 NATIVE"]

// Monochrome animated stroke icons, single red accent each. Distinction is shape + label, not hue.
const WHO_WE_SERVE = [
  { label: "Web3 Projects", sub: "DAOs, NFT Studios, DeFi Protocols", color: "#F5F4F0", glowColor: "red" as const, icon: "web3" as const },
  { label: "Founders", sub: "Pre-seed to Series B", color: "#F5F4F0", glowColor: "red" as const, icon: "founders" as const },
  { label: "Agencies", sub: "Marketing & Creative Studios", color: "#F5F4F0", glowColor: "red" as const, icon: "agencies" as const },
  { label: "DTC Brands", sub: "Fashion, Wellness, Premium", color: "#F5F4F0", glowColor: "red" as const, icon: "dtc" as const },
  { label: "Enterprise", sub: "Sales & Ops Automation at Scale", color: "#F5F4F0", glowColor: "red" as const, icon: "enterprise" as const },
  { label: "SaaS & Products", sub: "B2B Tools, Platforms & Apps", color: "#F5F4F0", glowColor: "red" as const, icon: "saas" as const },
]

// Tools we actually use and integrate with
const TRUSTED_LOGOS = [
  { src: "/logos/openai.svg", alt: "OpenAI" },
  { src: "/logos/notion.svg", alt: "Notion" },
  { src: "/logos/slack.svg", alt: "Slack" },
  { src: "/logos/hubspot.svg", alt: "HubSpot" },
  { src: "/logos/zapier.svg", alt: "Zapier" },
  { src: "/logos/stripe.svg", alt: "Stripe" },
  { src: "/logos/airtable.svg", alt: "Airtable" },
  { src: "/logos/n8n.svg", alt: "n8n" },
]

const FEATURED_LOGOS = [
  { src: "/logos/instagram.svg", alt: "Instagram" },
  { src: "/logos/linkedin.svg", alt: "LinkedIn" },
  { src: "/logos/tiktok.svg", alt: "TikTok" },
  { src: "/logos/youtube.svg", alt: "YouTube" },
  { src: "/logos/figma.svg", alt: "Figma" },
  { src: "/logos/google.svg", alt: "Google" },
]

const MAP_DOTS = [
  { start: { lat: 40.7128, lng: -74.006, label: "New York" }, end: { lat: 51.5074, lng: -0.1278, label: "London" } },
  { start: { lat: 25.2048, lng: 55.2708, label: "Dubai" }, end: { lat: 1.3521, lng: 103.8198, label: "Singapore" } },
  { start: { lat: 34.0522, lng: -118.2437, label: "Los Angeles" }, end: { lat: 35.6762, lng: 139.6503, label: "Tokyo" } },
  { start: { lat: 48.8566, lng: 2.3522, label: "Paris" }, end: { lat: -23.5505, lng: -46.6333, label: "São Paulo" } },
  { start: { lat: 55.7558, lng: 37.6176, label: "Moscow" }, end: { lat: 25.2048, lng: 55.2708, label: "Dubai" } },
]

// Monochrome + red: all three services live on the dark canvas, differentiated
// by the red index slash and the ghost number, not by background color.
const SERVICES = [
  {
    id: "01", name: "GO-TO-MARKET\nENGINE", tag: "GROWTH",
    bg: "#050507",
    tagline: "Find and convert your ideal customers, on autopilot.",
    body: "AI maps ideal buyers, enriches CRM, and runs multi-channel outreach at scale. Zero spray-and-pray.",
    metrics: [{ label: "Leads generated / week", value: "2,400+" }, { label: "Pipeline conversion lift", value: "6.8×" }],
    tools: ["Ideal Buyer Lists", "Outreach on Autopilot", "Booked Meetings", "CRM Always Current"],
  },
  {
    id: "02", name: "CONTENT\nSYSTEM", tag: "CONTENT",
    bg: "#0A0A0F",
    tagline: "500+ content pieces a month. Zero manual work.",
    body: "AI posts to Instagram, LinkedIn, X, TikTok. On-brand, at scale. Scripts, thumbnails, emails, generated automatically.",
    metrics: [{ label: "Content pieces / month", value: "500+" }, { label: "Time saved vs in-house", value: "80 hrs" }],
    tools: ["Content Engine", "Daily Posting", "Full Creative Dept", "Audience Growth"],
  },
  {
    id: "03", name: "AI OPS\nPIPELINE", tag: "AUTOMATION",
    bg: "#050507",
    tagline: "Your full sales and ops infrastructure, on autopilot.",
    body: "Cold calling, CRM sync, community monitoring, reporting. Manual ops replaced with AI infrastructure, 24/7.",
    metrics: [{ label: "Automated actions / day", value: "1.2M+" }, { label: "Report delivery", value: "<30s" }],
    tools: ["Lead Pipeline", "Sales Funnel", "Full Sales Dept", "24/7 Follow-up"],
  },
]

const CASE_STUDIES = [
  { project: "1SecondCopy", tag: "Content Agency", result: "3× more booked calls per week without adding headcount.", color: "#0A0A0F", accent: "#FF2D55" },
  { project: "AfterCall", tag: "SaaS", result: "$180k ARR in the first 90 days from automated pipeline.", color: "#0A0A0F", accent: "#FF2D55" },
  { project: "Dad's Printing", tag: "Local Business", result: "CAC dropped 67%. AI handles the full pipeline.", color: "#050507", accent: "#FF2D55" },
  { project: "XWECAN", tag: "Web3", result: "2,200 qualified leads contacted before launch day.", color: "#050507", accent: "#FF2D55" },
]

const TRACE_SYSTEM_NODES = [
  { id: "signals", label: "Buyer signals", detail: "Inbound, CRM, social, and intent data normalized into one source map.", x: "13%", y: "22%", tone: "source" },
  { id: "context", label: "Context graph", detail: "Accounts, offers, objections, and channel history linked before action.", x: "31%", y: "55%", tone: "inferred" },
  { id: "core", label: "AX operator core", detail: "Routes work to lead gen, content, and ops automations with review gates.", x: "50%", y: "34%", tone: "core" },
  { id: "content", label: "Content engine", detail: "Turns approved positioning into scheduled posts, scripts, and assets.", x: "70%", y: "20%", tone: "output" },
  { id: "pipeline", label: "Pipeline engine", detail: "Scores accounts, drafts follow-ups, and keeps CRM state current.", x: "78%", y: "54%", tone: "output" },
  { id: "proof", label: "Proof loop", detail: "Every result routes back into reporting, decisions, and next experiments.", x: "52%", y: "78%", tone: "review" },
] as const

const TRACE_SYSTEM_EDGES = [
  { id: "signals-context", d: "M 106 116 C 164 146 198 206 250 234", tone: "extracted", delay: "0s" },
  { id: "context-core", d: "M 250 234 C 308 212 342 164 392 150", tone: "inferred", delay: "-1.4s" },
  { id: "core-content", d: "M 392 150 C 452 108 500 92 548 96", tone: "extracted", delay: "-2.6s" },
  { id: "core-pipeline", d: "M 406 166 C 478 194 536 222 610 250", tone: "extracted", delay: "-3.8s" },
  { id: "pipeline-proof", d: "M 610 250 C 574 312 502 350 410 346", tone: "inferred", delay: "-5s" },
  { id: "proof-context", d: "M 410 346 C 326 346 270 306 250 234", tone: "ambiguous", delay: "-6.2s" },
] as const

const TRACE_CONFIDENCE_TAGS = [
  { label: "EXTRACTED", detail: "Direct source events, CRM facts, and logged actions." },
  { label: "INFERRED", detail: "Model-assisted fit, priority, and next-step suggestions." },
  { label: "AMBIGUOUS", detail: "Human review before client-facing output or spend." },
] as const

const NAV_LINKS = [
  { label: "Services", href: "#services" },
  { label: "Work", href: "#ai-team" },
  { label: "Solutions", href: "#built-for" },
  { label: "Contact", href: "#booking" },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
const scrollTo = (id: string) => lenisScrollTo(`#${id}`)
// Opens the native <dialog> booking modal from anywhere (decoupled from memo trees)
const openBooking = () => window.dispatchEvent(new Event("open-booking"))

const Disp = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <span className={`font-display leading-none tracking-wide uppercase ${className}`} style={{ fontFamily: "var(--font-bebas)", ...style }}>
    {children}
  </span>
)

// Eyebrow pill: plain section label, no per-section slash (the wordmark carries the motif)
const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 border rounded-full ai-tag">
    {children}
  </span>
)

// ── HeroSection: isolated so its interval doesn't re-render the whole page ──
const HeroSection = memo(function HeroSection() {
  const [audienceIdx, setAudienceIdx] = useState(0)
  const reduceMotion = useReducedMotion()
  const riseLine = {
    hidden: { y: reduceMotion ? "0%" : "105%" },
    show: { y: "0%", transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } },
  }

  useEffect(() => {
    const t = setInterval(() => setAudienceIdx((i) => (i + 1) % HERO_AUDIENCES.length), 2600)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="hero-section min-h-[100svh] relative overflow-hidden flex flex-col justify-end pb-16 pt-32 px-6 md:px-10">
      <div className="hidden lg:block"><Spotlight size={500} /></div>

      {/* Backgrounds: stronger red bloom, softer grid. Avoid visible line artifacts. */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-16 right-0 w-[680px] h-[620px] bg-[#FF2D55]/12 rounded-full blur-[110px]" />
        <div className="absolute bottom-0 left-0 w-[520px] h-[380px] bg-[#7B2FFF]/8 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:88px_88px]" />
      </div>

      {/* Lightning behind robot: subtle ambient in the brand-red family, hidden in light mode */}
      <div className="absolute right-0 top-0 w-[75%] h-full pointer-events-none hidden dark:lg:block z-[1] opacity-30 mix-blend-screen">
        <Lightning hue={350} xOffset={0.3} speed={1.0} intensity={0.35} size={2.2} />
      </div>

      {/* Robot */}
      <div
        className="hero-robot-shell robot-mobile absolute right-0 top-0 w-[100%] h-[55svh] lg:bottom-0 lg:w-[65%] lg:h-auto pointer-events-none block z-[2]"
        style={{ transform: "scale(1.35) translate3d(0, -8%, 0)", transformOrigin: "top center", willChange: "transform" }}
      >
        <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" mobileFallback="/robot-poster.webp" className="w-full h-full dark:opacity-100 opacity-90 dark:mix-blend-normal mix-blend-screen lg:mix-blend-luminosity" />
        <div className="ai-hero-fade-x absolute inset-y-0 left-0 w-[50%]" />
        <div className="ai-hero-fade-y absolute bottom-0 left-0 right-0 h-56" />
        <div className="ai-hero-fade-x absolute inset-y-0 right-0 w-[15%] rotate-180 block dark:hidden" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1440px] mx-auto w-full">
        <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-2 mb-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF2D55] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF2D55]" />
          </span>
          <span className="ai-muted text-xs font-medium tracking-wider">12 active projects · 2 slots remaining</span>
        </m.div>

        <m.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}>
          <div className="overflow-hidden py-[0.04em] -my-[0.04em]">
            <m.div variants={riseLine}>
              <Disp className="block ai-text" style={{ fontSize: "var(--fs-mega)", lineHeight: "var(--lh-mega)" }}>WE BUILD</Disp>
            </m.div>
          </div>
          <div className="overflow-hidden py-[0.04em] -my-[0.04em]">
            <m.div variants={riseLine}>
              <Disp className="block" style={{ color: "var(--red)", fontSize: "var(--fs-mega)", lineHeight: "var(--lh-mega)" }}>AI SYSTEMS</Disp>
            </m.div>
          </div>
          <div className="overflow-hidden" style={{ height: "var(--fs-mega)" }}>
            <AnimatePresence mode="wait">
              <m.div
                key={audienceIdx}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              >
                <Disp className="block ai-muted" style={{ fontSize: "var(--fs-mega)", lineHeight: "var(--lh-mega)" }}>
                  FOR {HERO_AUDIENCES[audienceIdx]}
                </Disp>
              </m.div>
            </AnimatePresence>
          </div>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-8 lg:max-w-[55%]"
        >
          <p className="ai-muted text-sm md:text-base max-w-sm leading-relaxed">
            Systems for go-to-market, content, and ops. Built for Web3 projects, founders, agencies, and ambitious brands.
          </p>
          <div className="flex gap-3 flex-shrink-0">
            <LiquidMetalButton label="Start a Project" onClick={openBooking} />
            <button onClick={() => scrollTo("services")} className="px-8 py-3.5 border-2 border-black/20 dark:border-white/25 text-black/70 dark:text-white/80 text-sm font-semibold rounded-full hover:border-[#FF2D55] hover:text-[#FF2D55] transition-[border-color,color]">
              See Services →
            </button>
          </div>
        </m.div>

      </div>
    </section>
  )
})

const TraceableSystemMap = memo(function TraceableSystemMap() {
  return (
    <section id="trace-map" className="trace-map-section border-b ai-border">
      <div className="trace-map-layout">
        <m.div {...fadeUp} className="trace-map-copy">
          <Tag>Traceable systems</Tag>
          <Disp className="ai-text mt-4 block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
            MAP THE WORK.<br />SHIP THE<br /><span style={{ color: "var(--red)" }}>SYSTEM.</span>
          </Disp>
          <p className="ai-muted text-sm md:text-base leading-relaxed mt-6 max-w-md">
            We build AI operations as visible maps: sources, decisions, owners, and review gates connected before anything touches a customer.
          </p>
          <div className="trace-confidence-stack" aria-label="Confidence labels">
            {TRACE_CONFIDENCE_TAGS.map((tag) => (
              <div key={tag.label} className="trace-confidence-row">
                <span>{tag.label}</span>
                <p>{tag.detail}</p>
              </div>
            ))}
          </div>
        </m.div>

        <m.div {...fadeUp} transition={{ duration: 0.9, delay: 0.1, ease: EASE_SWIFT }} className="trace-map-canvas" aria-label="AX Media traceable AI system map">
          <svg className="trace-map-svg" viewBox="0 0 720 420" preserveAspectRatio="none" aria-hidden>
            <defs>
              <filter id="traceGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {TRACE_SYSTEM_EDGES.map((edge) => (
              <path
                key={edge.id}
                className={`trace-edge trace-edge-${edge.tone}`}
                d={edge.d}
                style={{ "--edge-delay": edge.delay } as React.CSSProperties}
              />
            ))}
          </svg>

          <div className="trace-map-grid" aria-hidden />
          {TRACE_SYSTEM_NODES.map((node, index) => (
            <article
              key={node.id}
              className={`trace-node trace-node-${node.tone}`}
              style={{ "--x": node.x, "--y": node.y, "--node-index": index } as React.CSSProperties}
            >
              <span>{node.label}</span>
              <p>{node.detail}</p>
            </article>
          ))}
        </m.div>
      </div>
    </section>
  )
})

// ── BookingFlow: 3-step quiz + contact + schedule, reused inline and in the modal ──
function BookingFlow() {
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [quiz, setQuiz] = useState({ projectType: "", goal: "", budget: "" })
  const [contact, setContact] = useState({ name: "", email: "", phone: "" })
  const [emailError, setEmailError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [calBookingUrl, setCalBookingUrl] = useState("")

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const handleContactContinue = async () => {
    if (!contact.name || !contact.email || !contact.phone) return
    if (!validateEmail(contact.email)) { setEmailError("Please enter a valid email address"); return }
    setEmailError("")

    // Build the prefilled cal.com URL; step 2 presents it as the single primary CTA.
    const params = new URLSearchParams({
      ...CAL_DEFAULTS,
      name: contact.name,
      email: contact.email,
      a1: quiz.projectType,
      a2: quiz.goal,
      a3: quiz.budget,
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
          budget: quiz.budget,
        }),
      })
    } catch { /* silent: fallback link on step 2 always works */ }
    setSubmitting(false)
    setStep(2)
  }

  return (
    <div className="relative z-10 max-w-2xl md:max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-14">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 border rounded-full border-white/20 text-white/60">Free strategy call</span>
            <Disp className="text-white block mt-4" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
              BOOK A<br /><span style={{ color: "var(--red)" }}>STRATEGY CALL.</span>
            </Disp>
            <p className="text-white/65 text-sm md:text-lg mt-4 max-w-lg mx-auto leading-relaxed">
              Answer three quick filters, then pick a time. We come prepared with the highest-leverage AI systems for your business.
            </p>
            <p className="text-white/25 text-xs md:text-sm mt-2 italic tracking-wide">The fabric of digital reality.</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 md:gap-2 mb-6 md:mb-10">
            {["Fit", "Contact", "Time"].map((label, i) => (
              <div key={label} className="flex items-center gap-1 md:gap-2">
                <div className="flex items-center gap-1 md:gap-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all" style={{
                    backgroundColor: step > i ? "#FF2D55" : step === i ? "rgba(255,45,85,0.2)" : "rgba(255,255,255,0.06)",
                    border: step === i ? "1px solid #FF2D55" : "1px solid transparent",
                    color: step >= i ? "#FF2D55" : "rgba(255,255,255,0.25)",
                  }}>{i + 1}</div>
                  <span className="hidden sm:inline text-xs font-medium uppercase tracking-wider" style={{ color: step === i ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.3)" }}>{label}</span>
                </div>
                {i < 2 && <div className="w-10 h-px mx-1" style={{ backgroundColor: step > i ? "#FF2D55" : "rgba(255,255,255,0.12)" }} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <m.div key="step0" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: EASE_SWIFT }} className="max-w-2xl mx-auto space-y-6 md:space-y-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5 md:p-8 shadow-[0_30px_90px_-45px_rgba(255,45,85,0.65)]">

                {/* Project type */}
                <div>
                  <label className="text-white/90 text-base md:text-xl font-black block mb-3">What best describes your project?</label>
                  <div className="flex flex-wrap gap-2">
                    {["Web3 / NFT", "SaaS / Product", "Agency", "Brand", "Startup", "Enterprise"].map(opt => (
                      <button key={opt} onClick={() => setQuiz(p => ({ ...p, projectType: opt }))}
                        className={`px-4 py-2 rounded-full text-sm font-bold border transition-[background-color,border-color,color,transform] duration-200 ${
                          quiz.projectType === opt
                            ? "bg-[#FF2D55] border-[#FF2D55] text-white scale-105"
                            : "bg-white/10 border-white/30 text-white/80 hover:border-[#FF2D55]/60 hover:text-white"
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary goal */}
                <div>
                  <label className="text-white/90 text-base md:text-xl font-black block mb-3">Primary goal?</label>
                  <div className="flex flex-wrap gap-2">
                    {["Lead Generation", "Content Automation", "Community Growth", "Sales Pipeline", "Ops Efficiency", "Other"].map(opt => (
                      <button key={opt} onClick={() => setQuiz(p => ({ ...p, goal: opt }))}
                        className={`px-4 py-2 rounded-full text-sm font-bold border transition-[background-color,border-color,color,transform] duration-200 ${
                          quiz.goal === opt
                            ? "bg-[#FF2D55] border-[#FF2D55] text-white scale-105"
                            : "bg-white/10 border-white/30 text-white/80 hover:border-[#FF2D55]/60 hover:text-white"
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monthly budget */}
                <div>
                  <label className="text-white/90 text-base md:text-xl font-black block mb-3">Monthly budget?</label>
                  <div className="flex flex-wrap gap-2">
                    {["$3–10k / mo", "$10–20k / mo", "$20k+ / mo"].map(opt => (
                      <button key={opt} onClick={() => setQuiz(p => ({ ...p, budget: opt }))}
                        className={`px-4 py-2 rounded-full text-sm font-bold border transition-[background-color,border-color,color,transform] duration-200 ${
                          quiz.budget === opt
                            ? "bg-[#FF2D55] border-[#FF2D55] text-white scale-105"
                            : "bg-white/10 border-white/30 text-white/80 hover:border-[#FF2D55]/60 hover:text-white"
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <Magnetic className="w-full"><LiquidMetalButton label="Continue to contact →" onClick={() => { if (quiz.projectType && quiz.goal && quiz.budget) setStep(1) }} className="w-full justify-center" /></Magnetic>
                {!(quiz.projectType && quiz.goal && quiz.budget) && <p className="text-white/40 text-xs text-center">Select all options to continue</p>}
              </m.div>
            )}

            {step === 1 && (
              <m.div key="step1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: EASE_SWIFT }} className="max-w-md mx-auto space-y-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5 md:p-7 shadow-[0_30px_90px_-45px_rgba(255,45,85,0.65)]">
                {[
                  { field: "name" as const, label: "Your name", type: "text", ph: "First name" },
                  { field: "email" as const, label: "Email address", type: "email", ph: "you@company.com" },
                  { field: "phone" as const, label: "Phone number", type: "tel", ph: "+1 (555) 000-0000" },
                ].map(({ field, label, type, ph }) => (
                  <div key={field}>
                    <label className="text-white/65 text-xs uppercase tracking-widest block mb-2 font-bold">{label}</label>
                    <input type={type} placeholder={ph} value={contact[field]}
                      onChange={e => { setContact(c => ({ ...c, [field]: e.target.value })); if (field === "email") setEmailError("") }}
                      className="w-full bg-white/5 border border-white/25 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#FF2D55]/70 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(255,45,85,0.12)] transition-[border-color,box-shadow,background-color] duration-200" />
                    {field === "email" && emailError && <p className="text-[#FF2D55] text-xs mt-1">{emailError}</p>}
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(0)} className="px-5 py-3 rounded-xl border border-white/30 text-white/75 text-sm hover:border-white/50 hover:text-white transition-colors">← Back</button>
                  <Magnetic className="flex-1"><LiquidMetalButton label={submitting ? "Sending..." : "Continue to Schedule →"} onClick={handleContactContinue} className="w-full justify-center" /></Magnetic>
                </div>
                {!(contact.name && contact.email && contact.phone) && <p className="text-white/35 text-xs text-center">All fields required</p>}
              </m.div>
            )}

            {step === 2 && (
              <m.div key="step2" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: EASE_SWIFT }} className="max-w-md mx-auto text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#FF2D55]/15 border border-[#FF2D55]/30 flex items-center justify-center mx-auto text-3xl">✓</div>
                <Disp className="text-white text-4xl">ONE LAST STEP.</Disp>
                <p className="text-white/65 text-base">You are one click away. Pick a time on Cal.com and the call is locked.</p>
                <Magnetic className="inline-block">
                  <a
                    href={calBookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    autoFocus
                    className="inline-flex items-center justify-center gap-2 px-10 py-4 mt-2 bg-[#FF2D55] hover:bg-[#FF1745] text-white text-base font-bold rounded-full transition-colors shadow-[0_24px_70px_-20px_rgba(255,45,85,0.7)]"
                  >
                    Pick a time on Cal.com →
                  </a>
                </Magnetic>
                <p className="text-white/45 text-sm pt-2">Confirmation will be sent to <span className="text-white/80 font-semibold">{contact.email}</span></p>
                <p className="text-white/30 text-xs">We&apos;ll review your answers and come fully prepared.</p>
                <button onClick={() => { setStep(0); setQuiz({ projectType: "", goal: "", budget: "" }); setContact({ name: "", email: "", phone: "" }); setCalBookingUrl("") }}
                  className="text-[#FF2D55]/60 text-sm hover:text-[#FF2D55] transition-colors mt-4 block mx-auto">Start over</button>
              </m.div>
            )}
          </AnimatePresence>

          {/* Email escape hatch: always available in both the inline section and the modal */}
          <p className="text-center text-white/40 text-xs mt-8">
            Prefer email?{" "}
            <a href="mailto:info@aimedia.global" className="underline underline-offset-2 hover:text-[#FF2D55] transition-colors">
              info@aimedia.global
            </a>
          </p>
    </div>
  )
}

// ── BookingSection: inline finale on the page, shader background + booking flow ──
const BookingSection = memo(function BookingSection() {
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
const BookingDialog = memo(function BookingDialog() {
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
      onClose={() => setOpen(false)}
      onClick={(e) => { if (e.target === ref.current) close() }}
    >
      {open && (
        <div className="relative bg-[#050507]">
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

// ── Page ────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="w-full ai-page overflow-hidden grain">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="ai-nav fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-10 py-4 md:py-5 backdrop-blur-md border-b ai-border">
        <a href="#" className="flex items-center flex-shrink-0">
          {/* Theme-aware wordmark: light variant on light theme, dark variant on dark theme */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ax-logo-light.svg" alt="AX Media Company" decoding="async" fetchPriority="high" className="ax-wordmark h-8 md:h-11 w-auto block dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ax-logo-dark.svg" alt="AX Media Company" decoding="async" fetchPriority="high" className="ax-wordmark h-8 md:h-11 w-auto hidden dark:block" />
        </a>
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((item) => (
            <a key={item.label} href={item.href}
              onClick={(e) => { e.preventDefault(); if (item.href === "#booking") openBooking(); else scrollTo(item.href.slice(1)) }}
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

      {/* 01 HOOK */}
      <HeroSection />

      {/* ── Pink marquee ─────────────────────────────────────────────────── */}
      <div className="marquee-shell marquee-mask py-5 border-y ai-border overflow-hidden bg-[#FF2D55]" aria-hidden>
        <div>
        <div className="flex animate-marquee whitespace-nowrap">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span key={i} className="text-white font-bold text-sm uppercase tracking-[0.2em] mx-6 flex items-center gap-6">
              {item} <span className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0" />
            </span>
          ))}
        </div>
        </div>
      </div>

      {/* 02 CREDIBILITY */}
      <div className="ai-page border-b ai-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-center ai-muted text-xs uppercase tracking-[0.3em] font-bold mb-10">
            Trusted by fast-moving teams worldwide
          </p>
          <LogoCloud logos={[...TRUSTED_LOGOS, ...FEATURED_LOGOS]} />
        </div>
      </div>

      {/* 03 FOR WHO */}
      <section id="built-for" className="ai-page py-20 px-6 border-b ai-border overflow-hidden" style={{ contain: "layout paint" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-12 gap-4 flex-wrap">
            <div>
              <Tag>Who we build for</Tag>
              <Disp className="ai-text mt-4 block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
                BUILT FOR<br />EVERY AMBITIOUS<br /><span style={{ color: "var(--red)" }}>PROJECT.</span>
              </Disp>
            </div>
            <p className="ai-muted text-sm max-w-xs leading-relaxed">
              From early-stage founders to Web3 protocols, we build AI systems that scale with your ambitions.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {WHO_WE_SERVE.map((w, i) => (
              <m.div key={w.label} {...fadeUp} transition={{ delay: i * 0.07, duration: 0.9, ease: EASE_SWIFT }}
                className="w-[calc(50%-8px)] sm:w-[200px] md:w-[210px]">
                <GlowCard glowColor={w.glowColor} customSize className="w-full h-full min-h-[220px] sm:min-h-[280px]">
                  <div className="flex flex-col justify-between h-full py-3">
                    <span style={{ color: w.color }}>{SERVE_ICONS[w.icon]()}</span>
                    <div>
                      <Disp className="text-white text-3xl block mb-2 leading-tight">{w.label}</Disp>
                      <p className="text-white/45 text-sm font-medium uppercase tracking-wider leading-tight">{w.sub}</p>
                    </div>
                  </div>
                </GlowCard>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Team Never Sleeps */}
      <section id="ai-team" className="ai-panel py-20 px-6 border-b ai-border relative overflow-hidden" style={{ contain: "layout paint" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            <Tag>The Intelligence</Tag>
            <m.div {...fadeUp} transition={{ duration: 0.6 }} className="mt-6">
              <Disp className="ai-text block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
                YOUR AI TEAM<br />NEVER<br /><span style={{ color: "var(--red)" }}>SLEEPS.</span>
              </Disp>
            </m.div>
            <p className="ai-muted text-sm leading-relaxed mt-6 mb-8 max-w-sm">
              Autonomous agents that run lead gen, create content, and monitor data. 24/7, without errors or delays.
            </p>
            <div className="flex flex-col gap-3">
              {["Deploys in 7 days", "You own the code", "Production-grade infra", "No vendor lock-in"].map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D55] flex-shrink-0" />
                  <span className="ai-muted text-sm">{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center py-8">
            <AgentRadial />
          </div>
        </div>
      </section>

      {/* Traceable Graph System */}
      <TraceableSystemMap />

      {/* 04 SOLUTION — Services */}
      <div id="services" className="scroll-mt-24">
        {SERVICES.map((svc, i) => (
          <section key={svc.id} className="py-24 px-6 border-b ai-border relative overflow-hidden" style={{ backgroundColor: svc.bg, contain: "layout paint" }}>
            <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center relative z-10">
              <div className={i % 2 === 1 ? "md:order-last" : ""}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border"
                    style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)" }}>
                    {svc.tag}
                  </span>
                  <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.2)" }}>{svc.id}</span>
                </div>
                <Disp className="whitespace-pre-line block mb-4" style={{ color: "#fff", fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>{svc.name}</Disp>
                <p className="text-base md:text-lg leading-snug mb-3 font-semibold" style={{ color: "var(--red)" }}>{svc.tagline}</p>
                <p className="text-sm md:text-base leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.7)" }}>{svc.body}</p>
                <div className="flex gap-8 mb-6">
                  {svc.metrics.map((met) => (
                    <div key={met.label}>
                      <Disp className="text-2xl" style={{ color: "#fff" }}><CountUp value={met.value} /></Disp>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{met.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {svc.tools.map((tool) => (
                    <span key={tool} className="px-3 py-1 text-xs font-medium rounded-full border"
                      style={{ borderColor: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.65)" }}>
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Service-specific data-viz panel: multi-color lives only inside .ax-dataviz */}
              <div className="ax-dataviz">
                {svc.id === "01" ? (
                  <LeadFunnel />
                ) : svc.id === "03" ? (
                  <N8nWorkflowBlock />
                ) : (
                  <div className="rounded-3xl overflow-hidden border border-white/8 bg-[#0C0C0F] p-8 space-y-6">
                    <div>
                      <p className="text-white/30 text-[10px] font-mono uppercase tracking-widest mb-2">AI UGC Creators</p>
                      <p className="text-white/70 font-bold text-sm mb-1">Your AI content team</p>
                      <p className="text-white/35 text-xs leading-relaxed">AI-generated personas that post, engage, and grow your audience automatically, 24/7.</p>
                    </div>
                    <AIUGCCreators />
                    <div className="space-y-2 pt-2">
                      {[
                        { platform: "Instagram", posts: "3 posts/day", color: "#E1306C" },
                        { platform: "LinkedIn", posts: "2 posts/day", color: "#0A66C2" },
                        { platform: "TikTok", posts: "5 videos/week", color: "#fff" },
                        { platform: "X / Twitter", posts: "8 tweets/day", color: "#fff" },
                      ].map((p, pi) => (
                        <div key={p.platform} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                          <span className="text-xs font-bold" style={{ color: p.color }}>{p.platform}</span>
                          <span className="text-[10px] font-mono text-white/45 inline-flex items-center gap-1.5">
                            {p.posts}
                            <span className="relative inline-flex h-1.5 w-1.5" style={{ ["--i" as string]: pi }} aria-hidden>
                              <span className="ugc-ping absolute inline-flex h-full w-full rounded-full bg-white/35" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white/30" />
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {svc.id !== "01" && (
                <div className="absolute right-0 bottom-0 pointer-events-none select-none overflow-hidden" aria-hidden>
                  <Disp className="text-[300px] leading-none" style={{ color: "rgba(255,255,255,0.03)" }}>{svc.id}</Disp>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* 06 PROOF — Outcomes we engineer (anonymized until real case studies confirmed) */}
      <ProofSection items={CASE_STUDIES} />

      {/* 07 SCALE — World Map */}
      <section className="ai-page py-20 px-6 overflow-hidden" style={{ contain: "layout paint" }}>
        <div className="max-w-6xl mx-auto">
          <m.div {...fadeUp} className="text-center mb-10">
            <Tag>Global reach</Tag>
            <Disp className="ai-text mt-4 block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
              CLIENTS ACROSS<br /><span style={{ color: "var(--red)" }}>18+ COUNTRIES.</span>
            </Disp>
            <p className="ai-muted text-sm mt-4 max-w-md mx-auto">
              From New York to Dubai, London to Tokyo. Our AI systems run 24/7 across every timezone.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 mt-6">
              {["24/7 across every timezone", "Reports in under 30 seconds", "Systems you fully own"].map((chip) => (
                <span key={chip} className="ai-card text-[11px] font-medium px-3.5 py-1.5 rounded-full border ai-border">{chip}</span>
              ))}
            </div>
          </m.div>
          <WorldMap dots={MAP_DOTS} lineColor="#FF2D55" showLabels />
        </div>
      </section>

      {/* Smooth bridge into booking (no hard line) */}
      <div aria-hidden className="ai-booking-bridge h-24 md:h-36 -mb-px" />

      {/* 08 CTA — Booking (inline finale) */}
      <BookingSection />

      {/* Native <dialog> booking modal, opened by the sticky nav CTA + Contact link */}
      <BookingDialog />

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="ai-page py-10 px-6 border-t ai-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {/* Theme-aware wordmark: light variant on light theme, dark variant on dark theme */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ax-logo-light.svg" alt="AX Media Company" className="ax-wordmark h-8 w-auto block dark:hidden" loading="lazy" decoding="async" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ax-logo-dark.svg" alt="AX Media Company" className="ax-wordmark h-8 w-auto hidden dark:block" loading="lazy" decoding="async" />
            <span className="ai-muted text-xs">© 2026 AI Media · aimedia.global</span>
          </div>
          <div className="flex gap-6 flex-wrap justify-center">
            <a href="mailto:info@aimedia.global" className="ai-muted text-xs hover:text-[#FF2D55] transition-colors">info@aimedia.global</a>
            <a href="/privacy-policy" className="ai-muted text-xs hover:text-[#FF2D55] transition-colors">Privacy</a>
            <a href="/cookies" className="ai-muted text-xs hover:text-[#FF2D55] transition-colors">Cookies</a>
            <a href="/legal" className="ai-muted text-xs hover:text-[#FF2D55] transition-colors">Legal</a>
          </div>
        </div>
      </footer>

    </main>
  )
}
