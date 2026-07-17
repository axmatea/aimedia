"use client"

import { useState, useEffect, useRef, memo } from "react"
import { m, AnimatePresence, useReducedMotion } from "motion/react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { Spotlight } from "@/components/ui/spotlight"
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"
import { Magnetic } from "@/components/ui/magnetic"
import ThemeToggle from "@/components/ui/toggle-theme"
import { LogoCloud } from "@/components/ui/logo-cloud-3"
import { GlowCard } from "@/components/ui/spotlight-card"
import { CountUp } from "@/components/ui/count-up"
import { ProofSection } from "@/components/ui/proof-section"
import { StickyCta } from "@/components/ui/sticky-cta"
import { SERVE_ICONS } from "@/components/ui/serve-icons"
import { AxWordmark } from "@/components/ui/ax-wordmark"

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

// The tool stack our systems actually run on and integrate with. The strip is
// labeled as a stack ("Our systems run on"), never as a client list.
const STACK_LOGOS = [
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
// by the tag chip and index label, not by background color. svc02 carries a
// subtle vertical gradient so the panel melts into the neighboring sections.
// Truth rule (v7): metric slots carry capacity/design statements about what
// the systems are BUILT to do, never invented client outcomes. A real number
// goes back in only when it is traceable to a named engagement.
const SERVICES = [
  {
    id: "01", name: "GO-TO-MARKET\nENGINE", tag: "GROWTH",
    bg: "#050507",
    tagline: "Find and convert your ideal customers, on autopilot.",
    body: "AI maps ideal buyers, enriches CRM, and runs multi-channel outreach at scale. Zero spray-and-pray.",
    metrics: [{ label: "Outreach touches / week, by design", value: "1,000s" }, { label: "Pipeline runtime", value: "24/7" }],
    tools: ["Ideal Buyer Lists", "Outreach on Autopilot", "Booked Meetings", "CRM Always Current"],
  },
  {
    id: "02", name: "CONTENT\nSYSTEM", tag: "CONTENT",
    bg: "linear-gradient(180deg,#050507 0%,#0A0A0F 16%,#0A0A0F 84%,#050507 100%)",
    tagline: "Built to ship hundreds of content pieces a month.",
    body: "AI posts to Instagram, LinkedIn, X, TikTok. On-brand, at scale. Scripts, thumbnails, emails, generated automatically.",
    metrics: [{ label: "Content capacity / month, by design", value: "100s" }, { label: "Channels posting daily", value: "4" }],
    tools: ["Content Engine", "Daily Posting", "Full Creative Dept", "Audience Growth"],
  },
  {
    id: "03", name: "AI OPS\nPIPELINE", tag: "AUTOMATION",
    bg: "#050507",
    tagline: "Your full sales and ops infrastructure, on autopilot.",
    body: "Cold calling, CRM sync, community monitoring, reporting. Manual ops replaced with AI infrastructure, 24/7.",
    metrics: [{ label: "Ops runtime, no manual steps", value: "24/7" }, { label: "Report generation, by design", value: "<30s" }],
    tools: ["Lead Pipeline", "Sales Funnel", "Full Sales Dept", "24/7 Follow-up"],
  },
]

// Outcome renders: brand imagery (2000x1343 webp, optimized, lazy, below the
// fold). Cards without `image` fall back to the abstract OutcomeVisual, so
// removing a file is safe and reversible. No generation-tool attribution is
// rendered on the page (owner decision, v6.1): keep `imageSpec` unset here even
// though ShowcaseMedia still supports a spec chip row for future use.
// Truth rule (v7): no client names and no invented metrics live in this data
// object AT ALL. Even unrendered fields ship in the JS bundle, so the shipped
// data itself must be honest. Cards describe outcome patterns by industry;
// named results and real numbers are shared under NDA on the call.
const CASE_STUDIES = [
  {
    project: "Content Agency", tag: "Content Agency", result: "Booked calls compound week over week. No new headcount.", color: "#0A0A0F", accent: "#FF2D55",
    image: "/generated/outcomes/outcome-content.webp",
    imageAlt: "Content pieces fanning out from a single engine along glowing red distribution lines",
    imageCaption: "One engine, every channel",
  },
  {
    project: "SaaS", tag: "SaaS", result: "A revenue pipeline that runs itself from day one.", color: "#0A0A0F", accent: "#FF2D55",
    image: "/generated/outcomes/outcome-saas.webp",
    imageAlt: "Glass pipeline chambers moving a stream of red signal through each revenue stage",
    imageCaption: "Pipeline running end to end",
  },
  {
    project: "Local Business", tag: "Local Business", result: "Lower acquisition cost, the whole funnel on autopilot.", color: "#050507", accent: "#FF2D55",
    image: "/generated/outcomes/outcome-local.webp",
    imageAlt: "Neon rings of demand radiating from a location pin over a dark city map",
    imageCaption: "Demand radiating from one point",
  },
  {
    project: "Web3", tag: "Web3", result: "A qualified audience contacted and warmed before launch day.", color: "#050507", accent: "#FF2D55",
    image: "/generated/outcomes/outcome-web3.webp",
    imageAlt: "A luminous sphere of connected community nodes orbiting one bright core",
    imageCaption: "Community mapped before launch",
  },
]

// Each node names the deliverables that ship at that step (`ships`), so the map
// reads as a scope-of-work, not just a diagram. Deliverables mirror the three
// SERVICES engines. No client metrics, no guarantees.
const TRACE_SYSTEM_NODES = [
  { id: "signals", label: "Buyer signals", detail: "Inbound, CRM, social, and intent data normalized into one source map.", ships: ["Ideal buyer lists", "Intent signals"], x: "13%", y: "22%", tone: "source" },
  { id: "context", label: "Context graph", detail: "Accounts, offers, objections, and channel history linked before action.", ships: ["Account research", "Offer map"], x: "31%", y: "55%", tone: "inferred" },
  { id: "core", label: "AX operator core", detail: "Routes work to lead gen, content, and ops automations with review gates.", ships: ["Review gates", "Owner routing"], x: "50%", y: "34%", tone: "core" },
  { id: "content", label: "Content engine", detail: "Turns approved positioning into scheduled posts, scripts, and assets.", ships: ["Daily posting", "Creative dept"], x: "70%", y: "20%", tone: "output" },
  { id: "pipeline", label: "Pipeline engine", detail: "Runs outreach, drafts follow-ups, books meetings, and keeps CRM state current.", ships: ["Booked meetings", "CRM sync"], x: "78%", y: "54%", tone: "output" },
  { id: "proof", label: "Proof loop", detail: "Every result routes back into reporting, decisions, and next experiments.", ships: ["24/7 follow-up", "Live reporting"], x: "52%", y: "78%", tone: "review" },
] as const

// Copy-column scope stack: what each engine actually delivers when the map ships.
const TRACE_DELIVERABLES = [
  { label: "GO-TO-MARKET ENGINE", detail: "Ideal buyer lists, outreach automation, booked meetings, and a CRM that stays current on its own." },
  { label: "CONTENT SYSTEM", detail: "A content engine posting daily across your channels, with a full creative department behind it." },
  { label: "AI OPS PIPELINE", detail: "Lead pipeline, sales funnel, and 24/7 follow-up wired into one system you own." },
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

// FAQ (v7): four honest answers in front of the booking ask. No guarantees,
// no invented numbers; pricing and timelines stated the way they are sold.
const FAQS = [
  {
    q: "What happens on the call?",
    a: "A 30 minute systems audit. We walk through your funnel, content, and ops, and you leave with a concrete map of what to automate first, whether we work together or not.",
  },
  {
    q: "Who owns the system?",
    a: "You do. Everything is built in your accounts and on your infrastructure. No vendor lock-in: if we part ways, the system stays with you.",
  },
  {
    q: "How fast is the first system live?",
    a: "Typically weeks, not months. Exact scope and timeline are confirmed in writing before any build starts.",
  },
  {
    q: "What does it cost?",
    a: "Engagements start at $3k per month. Exact scope is priced after the call, in writing, so you only pay for what your business actually needs.",
  },
]

const NAV_LINKS = [
  { label: "Services", href: "#services" },
  { label: "System", href: "#ai-team" },
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

/**
 * AmbientImage: decorative, heavily dimmed and edge-masked fragment of the
 * generated outcome imagery, used as background atmosphere behind sections.
 * Dark theme only (the renders are dark scenes; on the light theme they read
 * as gray smudges, so CSS hides them there). Lazy, below the fold, aria-hidden:
 * never part of LCP and never in the accessibility tree.
 * v7.1: placements point at the tiny pre-blurred 720px variants
 * (public/generated/outcomes/blur/): heavily dimmed + masked atmosphere never
 * needs the full-res renders, and the baked blur costs the GPU nothing.
 */
const AmbientImage = ({ src, className = "" }: { src: string; className?: string }) => (
  <div className={`ambient-image ${className}`.trim()} aria-hidden>
    <Image src={src} alt="" fill sizes="50vw" loading="lazy" className="ambient-image-img" />
  </div>
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
  // The Lightning WebGL layer is display:none below lg anyway (hidden dark:lg:block),
  // so on phones we skip mounting it entirely: no chunk download, no WebGL context.
  const [desktop, setDesktop] = useState(false)
  const reduceMotion = useReducedMotion()
  const riseLine = {
    hidden: { y: reduceMotion ? "0%" : "105%" },
    show: { y: "0%", transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } },
  }

  useEffect(() => {
    const t = setInterval(() => setAudienceIdx((i) => (i + 1) % HERO_AUDIENCES.length), 2600)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const sync = () => setDesktop(mq.matches)
    sync()
    mq.addEventListener?.("change", sync)
    return () => mq.removeEventListener?.("change", sync)
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

      {/* Lightning behind robot: subtle ambient in the brand-red family, hidden in light mode.
          Mounted only on lg+ viewports (it is display:none below that anyway). */}
      <div className="absolute right-0 top-0 w-[75%] h-full pointer-events-none hidden dark:lg:block z-[1] opacity-30 mix-blend-screen">
        {desktop && <Lightning hue={350} xOffset={0.3} speed={1.0} intensity={0.35} size={2.2} />}
      </div>

      {/* Robot */}
      <div
        className="hero-robot-shell robot-mobile absolute right-0 top-0 w-[100%] h-[55svh] lg:bottom-0 lg:w-[65%] lg:h-auto pointer-events-none block z-[2]"
        style={{ transform: "scale(1.35) translate3d(0, -8%, 0)", transformOrigin: "top center", willChange: "transform" }}
      >
        {/* No static poster: while the Spline runtime boots, the hero right side
            shows only the dark ambient background (gradient + red bloom + Lightning).
            The live scene fades and settles in over it when ready. */}
        {/* Scene + runtime wasm are self-hosted (public/spline/): no third-party
            fetches at runtime. Source of truth: Spline export kZDDjO5HuC9GJUM2.
            To update the scene, re-export and replace the files (see splite.tsx). */}
        <SplineScene scene="/spline/robot.splinecode" className="w-full h-full dark:opacity-100 opacity-90 dark:mix-blend-normal mix-blend-normal lg:mix-blend-luminosity" />
        <div className="ai-hero-fade-x absolute inset-y-0 left-0 w-[50%]" />
        <div className="ai-hero-fade-y absolute bottom-0 left-0 right-0 h-56" />
        <div className="ai-hero-fade-x absolute inset-y-0 right-0 w-[15%] rotate-180 block dark:hidden" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1440px] mx-auto w-full">
        <m.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-2 mb-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF2D55] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF2D55]" />
          </span>
          <span className="ai-muted text-xs font-medium tracking-wider">Founder-led · Los Angeles · replies within 24h</span>
        </m.div>

        <m.div initial={false} animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}>
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
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={audienceIdx}
                initial={false}
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
          initial={false} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-8 lg:max-w-[55%]"
        >
          <p className="ai-muted text-sm md:text-base max-w-sm leading-relaxed">
            You imagine it. We make it real. Systems for go-to-market, content, and ops, shipped.
          </p>
          <div className="flex gap-3 flex-shrink-0">
            <LiquidMetalButton label="Start a Project" onClick={openBooking} />
            <button type="button" onClick={() => scrollTo("services")} className="px-8 py-3.5 border-2 border-black/20 dark:border-white/25 text-black/70 dark:text-white/80 text-sm font-semibold rounded-full hover:border-[#FF2D55] hover:text-[#FF2D55] transition-[border-color,color]">
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
    <section id="trace-map" className="trace-map-section">
      <div className="trace-map-layout">
        <m.div {...fadeUp} className="trace-map-copy">
          <Tag>Traceable systems</Tag>
          <Disp className="ai-text mt-4 block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
            MAP THE WORK.<br />SHIP THE<br /><span style={{ color: "var(--red)" }}>SYSTEM.</span>
          </Disp>
          <p className="ai-muted text-sm md:text-base leading-relaxed mt-6 max-w-md">
            We build AI operations as visible maps: sources, decisions, owners, and review gates connected before anything touches a customer. Every node on this map is work we deliver, not a diagram.
          </p>
          <p className="trace-stack-heading">What ships</p>
          <div className="trace-deliverable-stack" role="group" aria-label="What each engine delivers">
            {TRACE_DELIVERABLES.map((row) => (
              <div key={row.label} className="trace-deliverable-row">
                <span>{row.label}</span>
                <p>{row.detail}</p>
              </div>
            ))}
          </div>
          <p className="trace-stack-heading">How it stays traceable</p>
          <div className="trace-confidence-stack" role="group" aria-label="Confidence labels">
            {TRACE_CONFIDENCE_TAGS.map((tag) => (
              <div key={tag.label} className="trace-confidence-row">
                <span>{tag.label}</span>
                <p>{tag.detail}</p>
              </div>
            ))}
          </div>
        </m.div>

        <m.div {...fadeUp} transition={{ duration: 0.9, delay: 0.1, ease: EASE_SWIFT }} className="trace-map-canvas" role="img" aria-label="AX Media traceable AI system map">
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
              <span className="trace-node-ships">
                {node.ships.map((item) => (
                  <em key={item}>{item}</em>
                ))}
              </span>
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
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 border rounded-full border-white/20 text-white/75">Free strategy call</span>
            <Disp className="text-white block mt-4" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
              BOOK A<br /><span style={{ color: "var(--red)" }}>STRATEGY CALL.</span>
            </Disp>
            <p className="text-white/75 text-sm md:text-lg mt-4 max-w-lg mx-auto leading-relaxed">
              Answer three quick filters, then pick a time. We come prepared with the highest-leverage AI systems for your business.
            </p>
            <p className="text-white/55 text-xs md:text-sm mt-2 tracking-wide">30 minutes. A concrete map of what to automate first. No obligation.</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 md:gap-2 mb-6 md:mb-10">
            {["Fit", "Contact", "Time"].map((label, i) => (
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
              <m.div key="step0" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: EASE_SWIFT }} className="max-w-2xl mx-auto space-y-6 md:space-y-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5 md:p-8 shadow-[0_30px_90px_-45px_rgba(255,45,85,0.65)]">

                {/* Project type */}
                <div>
                  <label className="text-white/90 text-base md:text-xl font-black block mb-3">What best describes your project?</label>
                  <div className="flex flex-wrap gap-2">
                    {["Web3 / NFT", "SaaS / Product", "Agency", "Brand", "Startup", "Enterprise"].map(opt => (
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

                {/* Primary goal */}
                <div>
                  <label className="text-white/90 text-base md:text-xl font-black block mb-3">Primary goal?</label>
                  <div className="flex flex-wrap gap-2">
                    {["Lead Generation", "Content Automation", "Community Growth", "Sales Pipeline", "Ops Efficiency", "Other"].map(opt => (
                      <button key={opt} type="button" onClick={() => setQuiz(p => ({ ...p, goal: opt }))}
                        className={`px-4 py-2 rounded-full text-sm font-bold border transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.98] ${
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
                    {/* Hyphen labels by brand rule (no dashes in copy). The API route
                        (app/api/booking/route.ts budgetMap) translates these back to the
                        original en dash Notion select option names, so the CRM select
                        never grows new options. Change both together or leads break. */}
                    {["$3-10k / mo", "$10-20k / mo", "$20k+ / mo"].map(opt => (
                      <button key={opt} type="button" onClick={() => setQuiz(p => ({ ...p, budget: opt }))}
                        className={`px-4 py-2 rounded-full text-sm font-bold border transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.98] ${
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
                {!(quiz.projectType && quiz.goal && quiz.budget) && <p className="text-white/60 text-xs text-center">Select all options to continue</p>}
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
                  <Magnetic className="flex-1"><LiquidMetalButton label={submitting ? "Sending..." : "Continue to Schedule →"} onClick={handleContactContinue} className="w-full justify-center" /></Magnetic>
                </div>
                {!(contact.name && contact.email) && <p className="text-white/60 text-xs text-center">Name and email required</p>}
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
                <p className="text-white/70 text-sm pt-2">Confirmation will be sent to <span className="text-white font-semibold">{contact.email}</span></p>
                <p className="text-white/60 text-xs">We&apos;ll review your answers and come fully prepared.</p>
                <button type="button" onClick={() => { setStep(0); setQuiz({ projectType: "", goal: "", budget: "" }); setContact({ name: "", email: "", phone: "" }); setCalBookingUrl("") }}
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
          {/* Inline wordmark in the real document fonts, themed via currentColor */}
          <AxWordmark className="ax-wordmark h-8 md:h-11 w-auto text-[#050507] dark:text-white" />
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

      {/* 01 HOOK */}
      <HeroSection />

      {/* ── Pink marquee ─────────────────────────────────────────────────── */}
      <div className="marquee-shell marquee-mask py-5 overflow-hidden bg-[#FF2D55]" aria-hidden>
        <div>
        <div className="flex animate-marquee whitespace-nowrap">
          {/* Ink-on-red (was white-on-red): white text on #FF2D55 sits at ~3.6:1
              and fails WCAG AA for this size; near-black ink clears 5.5:1. */}
          {[...TICKER, ...TICKER].map((item, i) => (
            <span key={i} className="text-[#050507] font-bold text-sm uppercase tracking-[0.2em] mx-6 flex items-center gap-6">
              {item} <span className="w-1.5 h-1.5 rounded-full bg-[#050507]/40 flex-shrink-0" />
            </span>
          ))}
        </div>
        </div>
      </div>

      {/* 02 CREDIBILITY */}
      <div className="ai-page py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-center ai-muted text-xs uppercase tracking-[0.3em] font-bold mb-10">
            Our systems run on
          </p>
          <LogoCloud logos={[...STACK_LOGOS, ...FEATURED_LOGOS]} />
        </div>
      </div>

      {/* 03 FOR WHO */}
      <section id="built-for" className="ai-page py-20 px-6 overflow-hidden" style={{ contain: "layout paint" }}>
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
                      <p className="text-white/70 text-sm font-medium uppercase tracking-wider leading-tight">{w.sub}</p>
                    </div>
                  </div>
                </GlowCard>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Team Never Sleeps */}
      <section id="ai-team" className="ai-panel ax-panel-melt py-20 px-6 relative overflow-hidden" style={{ contain: "layout paint" }}>
        {/* Ambient atmosphere: community-sphere render, dimmed + radially masked behind the agent radial */}
        <AmbientImage src="/generated/outcomes/blur/outcome-web3-blur.webp" className="ambient-ai-team" />
        <div className="relative z-[1] max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
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

      {/* Flow bridge: light theme melts paper into the dark services block;
          dark theme gets a faint ambient render bleed instead of a hard seam. */}
      <div aria-hidden className="ax-flow-bridge ax-bridge-into-dark relative h-24 md:h-36 -mb-px">
        <AmbientImage src="/generated/outcomes/blur/outcome-web3-blur.webp" className="ax-ambient-bleed" />
      </div>

      {/* 04 SOLUTION: Services */}
      <div id="services" className="scroll-mt-24">
        {SERVICES.map((svc, i) => (
          <section key={svc.id} className="py-24 px-6 relative overflow-hidden" style={{ background: svc.bg, contain: "layout paint" }}>
            <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center relative z-10">
              <div className={i % 2 === 1 ? "md:order-last" : ""}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border"
                    style={{ borderColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.7)" }}>
                    {svc.tag}
                  </span>
                  <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.66)" }}>{svc.id}</span>
                </div>
                <Disp className="whitespace-pre-line block mb-4" style={{ color: "#fff", fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>{svc.name}</Disp>
                <p className="text-base md:text-lg leading-snug mb-3 font-semibold" style={{ color: "var(--red)" }}>{svc.tagline}</p>
                <p className="text-sm md:text-base leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.7)" }}>{svc.body}</p>
                <div className="flex gap-8 mb-6">
                  {svc.metrics.map((met) => (
                    <div key={met.label}>
                      <Disp className="text-2xl" style={{ color: "#fff" }}><CountUp value={met.value} /></Disp>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>{met.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {svc.tools.map((tool) => (
                    <span key={tool} className="px-3 py-1 text-xs font-medium rounded-full border"
                      style={{ borderColor: "rgba(255,255,255,0.28)", color: "rgba(255,255,255,0.8)" }}>
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
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white/55 text-[10px] font-mono uppercase tracking-widest">AI UGC Creators · Demo</p>
                        <p className="text-white/55 text-[9px] font-mono uppercase tracking-widest">Tap a creator</p>
                      </div>
                      <p className="text-white/70 font-bold text-sm mb-1">Your AI content team</p>
                      <p className="text-white/70 text-xs leading-relaxed">AI-generated personas that post, engage, and grow your audience automatically, 24/7.</p>
                    </div>
                    <AIUGCCreators />
                    <div className="space-y-2 pt-2">
                      {/* Brand hues lightened to clear 4.5:1 on the dark card
                          (#E1306C and #0A66C2 both failed WCAG AA here). */}
                      {[
                        { platform: "Instagram", posts: "3 posts/day", color: "#F26D9C" },
                        { platform: "LinkedIn", posts: "2 posts/day", color: "#5EA9F0" },
                        { platform: "TikTok", posts: "5 videos/week", color: "#fff" },
                        { platform: "X / Twitter", posts: "8 tweets/day", color: "#fff" },
                      ].map((p, pi) => (
                        <div key={p.platform} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                          <span className="text-xs font-bold" style={{ color: p.color }}>{p.platform}</span>
                          <span className="text-[10px] font-mono text-white/65 inline-flex items-center gap-1.5">
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

            </div>

            {/* Soft red bloom keeps svc02/03 from reading empty now that the
                ghost numerals are gone. Decorative, zero layout impact. */}
            {svc.id !== "01" && (
              <div className="absolute right-[-10%] bottom-[-20%] w-[520px] h-[420px] bg-[#FF2D55]/6 rounded-full blur-[120px] pointer-events-none" aria-hidden />
            )}
          </section>
        ))}
      </div>

      {/* Mid-page CTA band (v7): one sentence + the primary CTA while the three
          engines are still fresh, before the canvas leaves the dark block. */}
      {/* containIntrinsicSize inline: this band is far shorter than the 800px
          section default, keep the placeholder honest for smooth glides. */}
      <section className="py-16 md:py-20 px-6 bg-[#050507] relative overflow-hidden" style={{ contain: "layout paint", containIntrinsicSize: "0 280px" }}>
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center gap-6 relative z-10">
          <p className="text-white/85 text-base md:text-xl font-semibold leading-snug max-w-xl">
            Want one of these running in your business? Book the call.
          </p>
          <LiquidMetalButton label="Book the Call" onClick={openBooking} />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[280px] bg-[#FF2D55]/8 rounded-full blur-[110px] pointer-events-none" aria-hidden />
      </section>

      {/* Flow bridge out of the dark services block. No ambient bleed here:
          the proof section already runs its own scroll-linked ambient imagery. */}
      <div aria-hidden className="ax-flow-bridge ax-bridge-out-of-dark relative h-24 md:h-36 -mb-px" />

      {/* 06 PROOF: Outcomes we engineer (anonymized until real case studies confirmed) */}
      <ProofSection items={CASE_STUDIES} />

      {/* 07 SCALE: World Map */}
      <section id="global-reach" className="ai-page py-20 px-6 relative overflow-hidden scroll-mt-20" style={{ contain: "layout paint" }}>
        {/* Ambient atmosphere: demand-rings render behind the heading, fully faded out before the map */}
        <AmbientImage src="/generated/outcomes/blur/outcome-local-blur.webp" className="ambient-global" />
        <div className="relative z-[1] max-w-6xl mx-auto">
          <m.div {...fadeUp} className="text-center mb-10">
            <Tag>Global reach</Tag>
            <Disp className="ai-text mt-4 block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
              BUILT FOR CLIENTS<br /><span style={{ color: "var(--red)" }}>WORLDWIDE.</span>
            </Disp>
            <p className="ai-muted text-sm mt-4 max-w-md mx-auto">
              From New York to Dubai, London to Tokyo: our systems are built to run 24/7 across every timezone.
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

      {/* FAQ: honest objections handled before the booking ask. Native
          <details> accordion, no new dependencies. */}
      <section id="faq" className="ai-page py-20 px-6" style={{ contain: "layout paint", containIntrinsicSize: "0 620px" }}>
        <div className="max-w-3xl mx-auto">
          <m.div {...fadeUp} className="text-center mb-10">
            <Tag>FAQ</Tag>
            <Disp className="ai-text mt-4 block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
              STRAIGHT<br /><span style={{ color: "var(--red)" }}>ANSWERS.</span>
            </Disp>
          </m.div>
          <div className="border-t ai-border">
            {FAQS.map((item) => (
              <details key={item.q} className="group border-b ai-border">
                <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                  <span className="ai-text text-sm md:text-base font-bold">{item.q}</span>
                  <span
                    aria-hidden
                    className="flex-shrink-0 w-7 h-7 rounded-full border ai-border flex items-center justify-center text-[#FF2D55] text-lg leading-none transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="ai-muted text-sm leading-relaxed pb-6 max-w-xl">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Smooth bridge into booking (no hard line) */}
      <div aria-hidden className="ai-booking-bridge h-24 md:h-36 -mb-px" />

      {/* 08 CTA: Booking (inline finale) */}
      <BookingSection />

      {/* Native <dialog> booking modal, opened by the sticky nav CTA + Contact link */}
      <BookingDialog />

      {/* Mobile-only sticky booking pill: appears after the hero, hides around
          the booking section and while the dialog is open */}
      <StickyCta />

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="ai-page py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {/* Inline wordmark in the real document fonts, themed via currentColor.
                Same component as the nav, so parity is automatic. */}
            <AxWordmark className="ax-wordmark h-8 w-auto text-[#050507] dark:text-white" />
            <span className="ai-muted text-xs">© 2026 AX Media · aimedia.global</span>
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
