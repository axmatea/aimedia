"use client"

import { useState, useEffect, memo } from "react"
import { m, AnimatePresence, useReducedMotion } from "motion/react"
import dynamic from "next/dynamic"
import { Spotlight } from "@/components/ui/spotlight"
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"
import ThemeToggle from "@/components/ui/toggle-theme"
import { LogoCloud } from "@/components/ui/logo-cloud-3"
import { GlowCard } from "@/components/ui/spotlight-card"
import { CountUp } from "@/components/ui/count-up"
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

const WHO_WE_SERVE = [
  { label: "Web3 Projects", sub: "DAOs, NFT Studios, DeFi Protocols", color: "#7B2FFF", glowColor: "purple" as const, icon: "⬡" },
  { label: "Founders", sub: "Pre-seed to Series B", color: "#FF2D55", glowColor: "red" as const, icon: "◈" },
  { label: "Agencies", sub: "Marketing & Creative Studios", color: "#C8FF60", glowColor: "green" as const, icon: "◉" },
  { label: "DTC Brands", sub: "Fashion, Wellness, Premium", color: "#0ACDCD", glowColor: "blue" as const, icon: "◈" },
  { label: "Enterprise", sub: "Sales & Ops Automation at Scale", color: "#FF8C42", glowColor: "orange" as const, icon: "◎" },
  { label: "SaaS & Products", sub: "B2B Tools, Platforms & Apps", color: "#2D8CFF", glowColor: "blue" as const, icon: "◇" },
]

// Tools we actually use and integrate with
const TRUSTED_LOGOS = [
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/openai.svg", alt: "OpenAI" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/notion.svg", alt: "Notion" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/slack.svg", alt: "Slack" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/hubspot.svg", alt: "HubSpot" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/zapier.svg", alt: "Zapier" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/stripe.svg", alt: "Stripe" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/airtable.svg", alt: "Airtable" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/n8n.svg", alt: "n8n" },
]

const FEATURED_LOGOS = [
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/instagram.svg", alt: "Instagram" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/linkedin.svg", alt: "LinkedIn" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/tiktok.svg", alt: "TikTok" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/youtube.svg", alt: "YouTube" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/figma.svg", alt: "Figma" },
  { src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/google.svg", alt: "Google" },
]

const MAP_DOTS = [
  { start: { lat: 40.7128, lng: -74.006, label: "New York" }, end: { lat: 51.5074, lng: -0.1278, label: "London" } },
  { start: { lat: 25.2048, lng: 55.2708, label: "Dubai" }, end: { lat: 1.3521, lng: 103.8198, label: "Singapore" } },
  { start: { lat: 34.0522, lng: -118.2437, label: "Los Angeles" }, end: { lat: 35.6762, lng: 139.6503, label: "Tokyo" } },
  { start: { lat: 48.8566, lng: 2.3522, label: "Paris" }, end: { lat: -23.5505, lng: -46.6333, label: "São Paulo" } },
  { start: { lat: 55.7558, lng: 37.6176, label: "Moscow" }, end: { lat: 25.2048, lng: 55.2708, label: "Dubai" } },
]

const SERVICES = [
  {
    id: "01", name: "GO-TO-MARKET\nENGINE", tag: "GROWTH",
    bg: "#0E0718", accent: "#7B2FFF", textDark: false,
    tagline: "Find and convert your ideal customers — on autopilot.",
    body: "AI maps ideal buyers, enriches CRM, and runs multi-channel outreach at scale. Zero spray-and-pray.",
    metrics: [{ label: "Leads generated / week", value: "2,400+" }, { label: "Pipeline conversion lift", value: "6.8×" }],
    tools: ["Ideal Buyer Lists", "Outreach on Autopilot", "Booked Meetings", "CRM Always Current"],
    steps: ["Mapping ideal customer profile...","Enriching and scoring leads...","Launching outreach sequences...","Monitoring conversion metrics..."],
  },
  {
    id: "02", name: "CONTENT\nSYSTEM", tag: "CONTENT",
    bg: "#0A0A0F", accent: "#A78BFA", textDark: false,
    tagline: "500+ content pieces a month. Zero manual work.",
    body: "AI posts to Instagram, LinkedIn, X, TikTok — on-brand, at scale. Scripts, thumbnails, emails, generated automatically.",
    metrics: [{ label: "Content pieces / month", value: "500+" }, { label: "Time saved vs in-house", value: "80 hrs" }],
    tools: ["Content Engine", "Daily Posting", "Full Creative Dept", "Audience Growth"],
    steps: ["Defining brand voice & tone...","Creating multi-format content...","Scheduling to social channels...","Analyzing performance & iterating..."],
  },
  {
    id: "03", name: "AI OPS\nPIPELINE", tag: "AUTOMATION",
    bg: "#C8FF60", accent: "#050507", textDark: true,
    tagline: "Your full sales & ops infrastructure — on autopilot.",
    body: "Cold calling, CRM sync, community monitoring, reporting. Manual ops replaced with AI infrastructure, 24/7.",
    metrics: [{ label: "Automated actions / day", value: "1.2M+" }, { label: "Report delivery", value: "<30s" }],
    tools: ["Lead Pipeline", "Sales Funnel", "Full Sales Dept", "24/7 Follow-up"],
    steps: ["Auditing existing workflows...","Building AI cold-call sequences...","Connecting CRM & data sources...","Deploying to production..."],
  },
]

const CASE_STUDIES = [
  { project: "1SecondCopy", tag: "Content Agency", result: "3× more booked calls per week without adding headcount.", color: "#1A0A2E", accent: "#7B2FFF" },
  { project: "AfterCall", tag: "SaaS", result: "$180k ARR in the first 90 days from automated pipeline.", color: "#1A0005", accent: "#FF2D55" },
  { project: "Dad's Printing", tag: "Local Business", result: "CAC dropped 67%. AI handles the full pipeline.", color: "#050507", accent: "#C8FF60" },
  { project: "XWECAN", tag: "Web3", result: "2,200 qualified leads contacted before launch day.", color: "#030B03", accent: "#C8FF60" },
]

const PROCESS = [
  { num: "01", title: "AUDIT", body: "We map your stack, audience health, and content gaps against where the top projects in your niche operate." },
  { num: "02", title: "BUILD", body: "Our team deploys AI pipelines against real data before handoff. No demo environments. Production-grade only." },
  { num: "03", title: "LAUNCH", body: "Systems go live. You own everything. We monitor and optimize. Most clients see 3–5× growth inside 60 days." },
]

const NAV_LINKS = [
  { label: "Services", href: "#built-for" },
  { label: "Work", href: "#ai-team" },
  { label: "Solutions", href: "#services" },
  { label: "Contact", href: "#booking" },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

const Disp = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <span className={`font-display leading-none tracking-wide uppercase ${className}`} style={{ fontFamily: "var(--font-bebas)", ...style }}>
    {children}
  </span>
)

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
    <section className="hero-section min-h-[100svh] relative overflow-hidden flex flex-col justify-end pb-16 pt-32 px-6 md:px-10 snap-start">
      <div className="hidden lg:block"><Spotlight size={500} /></div>

      {/* Backgrounds — reduced blur for GPU perf */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#7B2FFF]/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[350px] bg-[#FF2D55]/7 rounded-full blur-[60px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>

      {/* Lightning behind robot — subtle ambient, hidden in light mode (black canvas) */}
      <div className="absolute right-0 top-0 w-[75%] h-full pointer-events-none hidden dark:lg:block z-[1] opacity-30 mix-blend-screen">
        <Lightning hue={260} xOffset={0.3} speed={1.0} intensity={0.35} size={2.2} />
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
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8FF60] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C8FF60]" />
          </span>
          <span className="ai-muted text-xs font-medium tracking-wider">12 active projects — 2 slots remaining</span>
        </m.div>

        <m.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}>
          <div className="overflow-hidden py-[0.04em] -my-[0.04em]">
            <m.div variants={riseLine}>
              <Disp className="block ai-text text-[clamp(2.8rem,12vw,180px)] leading-[0.85]">WE BUILD</Disp>
            </m.div>
          </div>
          <div className="overflow-hidden py-[0.04em] -my-[0.04em]">
            <m.div variants={riseLine}>
              <Disp className="block text-[#FF2D55] text-[clamp(2.8rem,12vw,180px)] leading-[0.85]">AI SYSTEMS</Disp>
            </m.div>
          </div>
          <div className="overflow-hidden" style={{ height: "clamp(2.8rem,12vw,180px)" }}>
            <AnimatePresence mode="wait">
              <m.div
                key={audienceIdx}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              >
                <Disp className="block ai-muted text-[clamp(2.8rem,12vw,180px)] leading-[0.85]">
                  FOR {HERO_AUDIENCES[audienceIdx]}
                </Disp>
              </m.div>
            </AnimatePresence>
          </div>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-12 flex flex-col md:flex-row items-start md:items-end justify-between gap-8 lg:max-w-[55%]"
        >
          <p className="ai-muted text-sm md:text-base max-w-sm leading-relaxed">
            Systems for go-to-market, content, and ops — built for Web3 projects, founders, agencies, and ambitious brands.
          </p>
          <div className="flex gap-3 flex-shrink-0">
            <LiquidMetalButton label="Start a Project" onClick={() => scrollTo("booking")} />
            <button onClick={() => scrollTo("services")} className="px-8 py-3.5 border-2 border-black/20 dark:border-white/25 text-black/70 dark:text-white/80 text-sm font-semibold rounded-full hover:border-[#FF2D55] hover:text-[#FF2D55] transition-all">
              See Services →
            </button>
          </div>
        </m.div>

      </div>
    </section>
  )
})

// ── BookingSection ───────────────────────────────────────────────────────────
const BookingSection = memo(function BookingSection() {
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

    // Build cal.com URL and open synchronously BEFORE any await,
    // so the browser treats it as a user-initiated action (not blocked as a popup).
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
    window.open(fullCalUrl, "_blank", "noopener,noreferrer")

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
    } catch (_) { /* silent — fallback link on step 2 always works */ }
    setSubmitting(false)
    setStep(2)
  }

  return (
    <div id="booking">
      <div className="relative py-16 md:py-24 px-4 md:px-6 overflow-hidden bg-[#050507]">
        <ShaderAnimation className="absolute inset-0 w-full h-full opacity-80 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050507] via-[#050507]/10 to-[#050507]/50 pointer-events-none" />

        <div className="relative z-10 max-w-2xl md:max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-14">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 border rounded-full border-white/20 text-white/60">Free strategy call</span>
            <Disp className="text-white text-[clamp(2.5rem,8vw,88px)] block mt-4 leading-[0.88]">
              BOOK YOUR<br /><span style={{ color: "#FF2D55" }}>30 MINUTES.</span>
            </Disp>
            <p className="text-white/65 text-sm md:text-lg mt-4 max-w-lg mx-auto leading-relaxed">
              We audit your stack and show you exactly which AI systems will move the needle — no fluff, just outcomes.
            </p>
            <p className="text-white/25 text-xs md:text-sm mt-2 italic tracking-wide">The fabric of digital reality.</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 md:gap-2 mb-6 md:mb-10">
            {["Your Project", "Contact", "Schedule"].map((label, i) => (
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
              <m.div key="step0" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="max-w-2xl mx-auto space-y-6 md:space-y-8">

                {/* Project type */}
                <div>
                  <label className="text-white/90 text-base md:text-xl font-black block mb-3">What best describes your project?</label>
                  <div className="flex flex-wrap gap-2">
                    {["Web3 / NFT", "SaaS / Product", "Agency", "Brand", "Startup", "Enterprise"].map(opt => (
                      <button key={opt} onClick={() => setQuiz(p => ({ ...p, projectType: opt }))}
                        className={`px-4 py-2 rounded-full text-sm font-bold border transition-all duration-200 ${
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
                        className={`px-4 py-2 rounded-full text-sm font-bold border transition-all duration-200 ${
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
                        className={`px-4 py-2 rounded-full text-sm font-bold border transition-all duration-200 ${
                          quiz.budget === opt
                            ? "bg-[#FF2D55] border-[#FF2D55] text-white scale-105"
                            : "bg-white/10 border-white/30 text-white/80 hover:border-[#FF2D55]/60 hover:text-white"
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <LiquidMetalButton label="Continue →" onClick={() => { if (quiz.projectType && quiz.goal && quiz.budget) setStep(1) }} className="w-full justify-center" />
                {!(quiz.projectType && quiz.goal && quiz.budget) && <p className="text-white/40 text-xs text-center">Select all options to continue</p>}
              </m.div>
            )}

            {step === 1 && (
              <m.div key="step1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="max-w-md mx-auto space-y-4">
                {[
                  { field: "name" as const, label: "Your name", type: "text", ph: "First name" },
                  { field: "email" as const, label: "Email address", type: "email", ph: "you@company.com" },
                  { field: "phone" as const, label: "Phone number", type: "tel", ph: "+1 (555) 000-0000" },
                ].map(({ field, label, type, ph }) => (
                  <div key={field}>
                    <label className="text-white/65 text-xs uppercase tracking-widest block mb-2 font-bold">{label}</label>
                    <input type={type} placeholder={ph} value={contact[field]}
                      onChange={e => { setContact(c => ({ ...c, [field]: e.target.value })); if (field === "email") setEmailError("") }}
                      className="w-full bg-white/5 border border-white/25 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#FF2D55]/60 transition-colors" />
                    {field === "email" && emailError && <p className="text-[#FF2D55] text-xs mt-1">{emailError}</p>}
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(0)} className="px-5 py-3 rounded-xl border border-white/30 text-white/75 text-sm hover:border-white/50 hover:text-white transition-colors">← Back</button>
                  <LiquidMetalButton label={submitting ? "Sending..." : "Continue to Schedule →"} onClick={handleContactContinue} className="flex-1 justify-center" />
                </div>
                {!(contact.name && contact.email && contact.phone) && <p className="text-white/35 text-xs text-center">All fields required</p>}
              </m.div>
            )}

            {step === 2 && (
              <m.div key="step2" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }} className="max-w-md mx-auto text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#FF2D55]/15 border border-[#FF2D55]/30 flex items-center justify-center mx-auto text-3xl">✓</div>
                <Disp className="text-white text-4xl">ONE LAST STEP.</Disp>
                <p className="text-white/65 text-base">Pick a time slot on Cal.com to lock in your call.</p>
                <a
                  href={calBookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 mt-2 bg-[#FF2D55] hover:bg-[#FF1745] text-white text-sm font-bold rounded-full transition-colors"
                >
                  Pick your time slot →
                </a>
                <p className="text-white/45 text-sm pt-2">Confirmation will be sent to <span className="text-white/80 font-semibold">{contact.email}</span></p>
                <p className="text-white/30 text-xs">We&apos;ll review your answers and come fully prepared.</p>
                <button onClick={() => { setStep(0); setQuiz({ projectType: "", goal: "", budget: "" }); setContact({ name: "", email: "", phone: "" }); setCalBookingUrl("") }}
                  className="text-[#FF2D55]/60 text-sm hover:text-[#FF2D55] transition-colors mt-4 block mx-auto">Start over</button>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
})

// ── Page ────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="w-full ai-page overflow-hidden grain">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="ai-nav fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-10 py-4 md:py-5 backdrop-blur-md border-b ai-border">
        <a href="#" className="flex items-center flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-gen/v2-01-clean.png" alt="AX Media" className="h-8 md:h-11 w-auto invert dark:invert-0" />
        </a>
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((item) => (
            <a key={item.label} href={item.href}
              onClick={(e) => { e.preventDefault(); scrollTo(item.href.slice(1)) }}
              className="px-5 py-2.5 ai-muted text-base font-bold hover:!text-black dark:hover:!text-white hover:bg-black/10 dark:hover:bg-white/12 hover:scale-105 rounded-full transition-all duration-200">
              {item.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <ThemeToggle />
          <button
            onClick={() => scrollTo("booking")}
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
        <div className="flex animate-marquee whitespace-nowrap">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span key={i} className="text-white font-bold text-sm uppercase tracking-[0.2em] mx-6 flex items-center gap-6">
              {item} <span className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0" />
            </span>
          ))}
        </div>
      </div>

      {/* 02 CREDIBILITY — Unified carousel */}
      <div className="ai-page border-b ai-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-center ai-muted text-xs uppercase tracking-[0.3em] font-bold mb-10">
            Trusted by fast-moving teams worldwide
          </p>
          <LogoCloud logos={[...TRUSTED_LOGOS, ...FEATURED_LOGOS]} />
        </div>
      </div>

      {/* 03 FOR WHO */}
      <section id="built-for" className="ai-page py-20 px-6 border-b ai-border overflow-hidden snap-start" style={{ contain: "layout paint" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-12 gap-4 flex-wrap">
            <div>
              <Tag>Who we build for</Tag>
              <Disp className="ai-text text-[clamp(2rem,5vw,64px)] mt-4 block leading-[0.9]">
                BUILT FOR<br />EVERY AMBITIOUS<br /><span style={{ color: "#FF2D55" }}>PROJECT.</span>
              </Disp>
            </div>
            <p className="ai-muted text-sm max-w-xs leading-relaxed">
              From early-stage founders to Web3 protocols — we build AI systems that scale with your ambitions.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {WHO_WE_SERVE.map((w, i) => (
              <m.div key={w.label} {...fadeUp} transition={{ delay: i * 0.07, duration: 0.9, ease: EASE_SWIFT }}
                className="w-[calc(50%-8px)] sm:w-[200px] md:w-[210px]">
                <GlowCard glowColor={w.glowColor} customSize className="w-full h-full min-h-[220px] sm:min-h-[280px]">
                  <div className="flex flex-col justify-between h-full py-3">
                    <span className="text-5xl" style={{ color: w.color }}>{w.icon}</span>
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
      <section id="ai-team" className="ai-panel py-20 px-6 border-b ai-border relative overflow-hidden snap-start" style={{ contain: "layout paint" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            <Tag>The Intelligence</Tag>
            <m.div {...fadeUp} transition={{ duration: 0.6 }} className="mt-6">
              <Disp className="ai-text text-[clamp(2.5rem,6vw,72px)] block leading-[0.9]">
                YOUR AI TEAM<br />NEVER<br /><span style={{ color: "#FF2D55" }}>SLEEPS.</span>
              </Disp>
            </m.div>
            <p className="ai-muted text-sm leading-relaxed mt-6 mb-8 max-w-sm">
              Autonomous agents that run lead gen, create content, and monitor data — 24/7, without errors or delays.
            </p>
            <div className="flex flex-col gap-3">
              {["Deploys in 7 days", "You own the code", "Production-grade infra", "No vendor lock-in"].map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] dark:bg-[#C8FF60] flex-shrink-0" />
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

      {/* 04 SOLUTION — Services */}
      <div id="services">
        {SERVICES.map((svc, i) => (
          <section key={svc.id} className="py-24 px-6 border-b ai-border relative overflow-hidden snap-start" style={{ backgroundColor: svc.bg, contain: "layout paint" }}>
            <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center relative z-10">
              <div className={i % 2 === 1 ? "md:order-last" : ""}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border"
                    style={{ borderColor: svc.textDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)", color: svc.textDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" }}>
                    {svc.tag}
                  </span>
                  <span className="text-xs font-bold" style={{ color: svc.textDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.2)" }}>{svc.id}</span>
                </div>
                <Disp className="text-[clamp(2.5rem,6vw,72px)] leading-[0.88] whitespace-pre-line block mb-4" style={{ color: svc.textDark ? "#050507" : "#fff" }}>{svc.name}</Disp>
                <p className="text-base md:text-lg leading-snug mb-3 font-semibold" style={{ color: svc.accent }}>{svc.tagline}</p>
                <p className="text-sm md:text-base leading-relaxed mb-8" style={{ color: svc.textDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.7)" }}>{svc.body}</p>
                <div className="flex gap-8 mb-6">
                  {svc.metrics.map((met) => (
                    <div key={met.label}>
                      <Disp className="text-2xl" style={{ color: svc.textDark ? "#050507" : "#fff" }}><CountUp value={met.value} /></Disp>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: svc.textDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.55)" }}>{met.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {svc.tools.map((tool) => (
                    <span key={tool} className="px-3 py-1 text-xs font-medium rounded-full border"
                      style={{ borderColor: svc.textDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.18)", color: svc.textDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.65)" }}>
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Service-specific right panel */}
              {svc.id === "01" ? (
                <LeadFunnel />
              ) : svc.id === "03" ? (
                <N8nWorkflowBlock />
              ) : svc.id === "02" ? (
                <div className="rounded-3xl overflow-hidden border border-white/8 bg-[#0C0C0F] p-8 space-y-6">
                  <div>
                    <p className="text-white/30 text-[10px] font-mono uppercase tracking-widest mb-2">AI UGC Creators</p>
                    <p className="text-white/70 font-bold text-sm mb-1">Your AI content team</p>
                    <p className="text-white/35 text-xs leading-relaxed">AI-generated personas that post, engage, and grow your audience — automatically, 24/7.</p>
                  </div>
                  <AIUGCCreators />
                  <div className="space-y-2 pt-2">
                    {[
                      { platform: "Instagram", posts: "3 posts/day", color: "#E1306C" },
                      { platform: "LinkedIn", posts: "2 posts/day", color: "#0A66C2" },
                      { platform: "TikTok", posts: "5 videos/week", color: "#fff" },
                      { platform: "X / Twitter", posts: "8 tweets/day", color: "#fff" },
                    ].map((p) => (
                      <div key={p.platform} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                        <span className="text-xs font-bold" style={{ color: p.color }}>{p.platform}</span>
                        <span className="text-[10px] font-mono text-[#C8FF60]">{p.posts} ✓</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl overflow-hidden border" style={{ borderColor: svc.textDark ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-2 px-5 py-4 border-b"
                    style={{ backgroundColor: svc.textDark ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)", borderColor: svc.textDark ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)" }}>
                    {[0, 1, 2].map((j) => <div key={j} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: svc.textDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.1)" }} />)}
                    <span className="ml-2 text-xs font-mono" style={{ color: svc.textDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.2)" }}>pipeline.{svc.id}.py</span>
                  </div>
                  <div className="p-6 space-y-3" style={{ backgroundColor: svc.textDark ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.2)" }}>
                    {svc.steps.map((step, j) => (
                      <div key={j} className="flex items-center justify-between py-2 border-b last:border-0"
                        style={{ borderColor: svc.textDark ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: svc.textDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.15)" }} />
                          <span className="text-xs font-mono" style={{ color: svc.textDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)" }}>{step}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                          backgroundColor: j < 2 ? (svc.textDark ? "rgba(0,180,0,0.12)" : "rgba(200,255,96,0.15)") : j === 2 ? "rgba(123,47,255,0.2)" : (svc.textDark ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"),
                          color: j < 2 ? (svc.textDark ? "rgb(0,140,0)" : "#C8FF60") : j === 2 ? "#a78bfa" : (svc.textDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.25)"),
                        }}>{j < 2 ? "Done" : j === 2 ? "Running" : "Queued"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {svc.id !== "01" && (
                <div className="absolute right-0 bottom-0 pointer-events-none select-none overflow-hidden" aria-hidden>
                  <Disp className="text-[300px] leading-none" style={{ color: svc.textDark ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.03)" }}>{svc.id}</Disp>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Process section removed per user request */}

      {/* 07 SCALE — World Map */}
      <section className="ai-page py-20 px-6 overflow-hidden snap-start" style={{ contain: "layout paint" }}>
        <div className="max-w-6xl mx-auto">
          <m.div {...fadeUp} className="text-center mb-10">
            <Tag>Global reach</Tag>
            <Disp className="ai-text text-[clamp(2rem,5vw,56px)] mt-4 block leading-[0.9]">
              CLIENTS ACROSS<br /><span style={{ color: "#FF2D55" }}>18+ COUNTRIES.</span>
            </Disp>
            <p className="ai-muted text-sm mt-4 max-w-md mx-auto">
              From New York to Dubai, London to Tokyo — our AI systems run 24/7 across every timezone.
            </p>
          </m.div>
          <WorldMap dots={MAP_DOTS} lineColor="#FF2D55" showLabels />
        </div>
      </section>

      {/* Smooth bridge into booking (no hard line) */}
      <div aria-hidden className="ai-booking-bridge h-24 md:h-36 -mb-px" />

      {/* 08 CTA — Booking */}
      <BookingSection />

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="ai-page py-10 px-6 border-t ai-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-gen/v2-01-clean.png" alt="AI Media" className="h-8 w-auto invert dark:invert-0" loading="lazy" />
            <span className="ai-muted text-xs">© 2026 AI Media · aimedia.global</span>
          </div>
          <div className="flex gap-6">
            <a href="/privacy-policy" className="ai-muted text-xs hover:text-[#FF2D55] transition-colors">Privacy</a>
            <a href="/cookies" className="ai-muted text-xs hover:text-[#FF2D55] transition-colors">Cookies</a>
            <a href="/legal" className="ai-muted text-xs hover:text-[#FF2D55] transition-colors">Legal</a>
          </div>
        </div>
      </footer>

    </main>
  )
}
