/**
 * Home page data + shared animation constants (v7.2 islands refactor).
 *
 * Plain module with NO "use client" directive on purpose: the server page
 * shell and the client islands both import from here, and each side compiles
 * it into its own graph. Only serializable data and type-level constants live
 * here; anything with hooks or browser APIs belongs in a client island.
 */

// ── Booking config ───────────────────────────────────────────────────────────
export const CAL_LINK = "axmedia/call"
export const CALENDLY_URL = `https://cal.com/${CAL_LINK}`

// ── Shared viewport config for whileInView reveals ──────────────────────────
export const VP = { once: true, margin: "0px 0px -40px 0px" } as const
export const EASE_SWIFT: [number, number, number, number] = [0.2, 0.8, 0.2, 1]

// ── Data ────────────────────────────────────────────────────────────────────
export const HERO_AUDIENCES = ["FOUNDERS", "BUILDERS", "WEB3", "BUSINESSES"]

export const TICKER = [
  "AI AGENTS + ORCHESTRATION",
  "WORKFLOW AUTOMATION",
  "CLIENT PLATFORMS",
  "GO-TO-MARKET SYSTEMS",
  "CONTENT SYSTEMS",
  "AI INTEGRATIONS",
]

// Monochrome animated stroke icons, single red accent each. Distinction is shape + label, not hue.
export const WHO_WE_SERVE = [
  { label: "Web3 Projects", sub: "DAOs, NFT Studios, DeFi Protocols", color: "#F5F4F0", glowColor: "red" as const, icon: "web3" as const },
  { label: "Founders", sub: "Pre-seed to Series B", color: "#F5F4F0", glowColor: "red" as const, icon: "founders" as const },
  { label: "Agencies", sub: "Marketing & Creative Studios", color: "#F5F4F0", glowColor: "red" as const, icon: "agencies" as const },
  { label: "DTC Brands", sub: "Fashion, Wellness, Premium", color: "#F5F4F0", glowColor: "red" as const, icon: "dtc" as const },
  { label: "Enterprise", sub: "Sales & Ops Automation at Scale", color: "#F5F4F0", glowColor: "red" as const, icon: "enterprise" as const },
  { label: "SaaS & Products", sub: "B2B Tools, Platforms & Apps", color: "#F5F4F0", glowColor: "red" as const, icon: "saas" as const },
]

// The tool stack our systems actually run on and integrate with. The strip is
// labeled as a stack ("Our systems run on"), never as a client list.
export const STACK_LOGOS = [
  { src: "/logos/openai.svg", alt: "OpenAI" },
  { src: "/logos/notion.svg", alt: "Notion" },
  { src: "/logos/slack.svg", alt: "Slack" },
  { src: "/logos/hubspot.svg", alt: "HubSpot" },
  { src: "/logos/zapier.svg", alt: "Zapier" },
  { src: "/logos/stripe.svg", alt: "Stripe" },
  { src: "/logos/airtable.svg", alt: "Airtable" },
  { src: "/logos/n8n.svg", alt: "n8n" },
]

export const FEATURED_LOGOS = [
  { src: "/logos/instagram.svg", alt: "Instagram" },
  { src: "/logos/linkedin.svg", alt: "LinkedIn" },
  { src: "/logos/tiktok.svg", alt: "TikTok" },
  { src: "/logos/youtube.svg", alt: "YouTube" },
  { src: "/logos/figma.svg", alt: "Figma" },
  { src: "/logos/google.svg", alt: "Google" },
]

export const MAP_DOTS = [
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
export const SERVICES = [
  {
    id: "01", name: "GO-TO-MARKET\nENGINE", tag: "GO-TO-MARKET",
    bg: "#050507",
    tagline: "Turn buyer signals into a reviewed, traceable pipeline.",
    body: "AI researches accounts, enriches context, prepares outreach, and coordinates CRM state. Human approval stays in the loop before consequential actions.",
    metrics: [{ label: "Approval model", value: "HUMAN" }, { label: "System location", value: "YOUR STACK" }],
    tools: ["Buyer Research", "Context Enrichment", "Approval Gates", "CRM Coordination"],
  },
  {
    id: "02", name: "CONTENT\nSYSTEM", tag: "CONTENT SYSTEM",
    bg: "linear-gradient(180deg,#050507 0%,#0A0A0F 16%,#0A0A0F 84%,#050507 100%)",
    tagline: "One governed workflow from positioning to distribution.",
    body: "Research, briefs, scripts, creative production, review, and publishing stay connected across the channels your team actually uses.",
    metrics: [{ label: "Review model", value: "HUMAN" }, { label: "Distribution", value: "MULTI-CHANNEL" }],
    tools: ["Content Research", "Production Workflow", "Review Queue", "Distribution"],
  },
  {
    id: "03", name: "BUSINESS\nPLATFORMS", tag: "CLIENT DELIVERY",
    bg: "#050507",
    tagline: "Custom software for the way your business actually runs.",
    body: "We build custom business platforms, client portals, internal operations systems, and AI-enabled workflows that connect teams, data, approvals, and client delivery in one operating layer.",
    metrics: [{ label: "Ownership", value: "YOURS" }, { label: "System model", value: "CONNECTED" }],
    tools: ["Custom Platforms", "Client Portals", "Internal Ops", "AI Workflows"],
  },
]

// FAQ: honest answers in front of the booking ask. No guarantees, invented
// numbers, or pricing before the work has been scoped.
export const FAQS = [
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
    a: "We first analyze the task and current systems, then define the scope, responsibilities, and delivery plan. Once that is clear, we prepare a written proposal with the appropriate cost.",
  },
]

export const NAV_LINKS = [
  { label: "Systems", href: "#services" },
  { label: "AI Team", href: "#ai-team" },
  { label: "FAQ", href: "#faq" },
  { label: "Animated Experience", href: "/animated" },
]
