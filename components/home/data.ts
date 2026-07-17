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
export const CAL_DEFAULTS: Record<string, string> = { duration: "60", overlayCalendar: "true" }

// ── Shared viewport config for whileInView reveals ──────────────────────────
export const VP = { once: true, margin: "0px 0px -80px 0px" } as const
export const EASE_SWIFT: [number, number, number, number] = [0.2, 0.8, 0.2, 1]

// ── Data ────────────────────────────────────────────────────────────────────
export const HERO_AUDIENCES = ["WEB3.", "FOUNDERS.", "AGENCIES.", "BRANDS.", "BUILDERS."]

export const TICKER = ["GO-TO-MARKET","LEAD GENERATION","CONTENT AT SCALE","AI AUTOMATION","COMMUNITY GROWTH","SOCIAL MEDIA","BUSINESS DEVELOPMENT","NFT LAUNCHES","DAO TOOLING","WEB3 NATIVE"]

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
export const CASE_STUDIES = [
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
export const TRACE_SYSTEM_NODES = [
  { id: "signals", label: "Buyer signals", detail: "Inbound, CRM, social, and intent data normalized into one source map.", ships: ["Ideal buyer lists", "Intent signals"], x: "13%", y: "22%", tone: "source" },
  { id: "context", label: "Context graph", detail: "Accounts, offers, objections, and channel history linked before action.", ships: ["Account research", "Offer map"], x: "31%", y: "55%", tone: "inferred" },
  { id: "core", label: "AX operator core", detail: "Routes work to lead gen, content, and ops automations with review gates.", ships: ["Review gates", "Owner routing"], x: "50%", y: "34%", tone: "core" },
  { id: "content", label: "Content engine", detail: "Turns approved positioning into scheduled posts, scripts, and assets.", ships: ["Daily posting", "Creative dept"], x: "70%", y: "20%", tone: "output" },
  { id: "pipeline", label: "Pipeline engine", detail: "Runs outreach, drafts follow-ups, books meetings, and keeps CRM state current.", ships: ["Booked meetings", "CRM sync"], x: "78%", y: "54%", tone: "output" },
  { id: "proof", label: "Proof loop", detail: "Every result routes back into reporting, decisions, and next experiments.", ships: ["24/7 follow-up", "Live reporting"], x: "52%", y: "78%", tone: "review" },
] as const

// Copy-column scope stack: what each engine actually delivers when the map ships.
export const TRACE_DELIVERABLES = [
  { label: "GO-TO-MARKET ENGINE", detail: "Ideal buyer lists, outreach automation, booked meetings, and a CRM that stays current on its own." },
  { label: "CONTENT SYSTEM", detail: "A content engine posting daily across your channels, with a full creative department behind it." },
  { label: "AI OPS PIPELINE", detail: "Lead pipeline, sales funnel, and 24/7 follow-up wired into one system you own." },
] as const

export const TRACE_SYSTEM_EDGES = [
  { id: "signals-context", d: "M 106 116 C 164 146 198 206 250 234", tone: "extracted", delay: "0s" },
  { id: "context-core", d: "M 250 234 C 308 212 342 164 392 150", tone: "inferred", delay: "-1.4s" },
  { id: "core-content", d: "M 392 150 C 452 108 500 92 548 96", tone: "extracted", delay: "-2.6s" },
  { id: "core-pipeline", d: "M 406 166 C 478 194 536 222 610 250", tone: "extracted", delay: "-3.8s" },
  { id: "pipeline-proof", d: "M 610 250 C 574 312 502 350 410 346", tone: "inferred", delay: "-5s" },
  { id: "proof-context", d: "M 410 346 C 326 346 270 306 250 234", tone: "ambiguous", delay: "-6.2s" },
] as const

export const TRACE_CONFIDENCE_TAGS = [
  { label: "EXTRACTED", detail: "Direct source events, CRM facts, and logged actions." },
  { label: "INFERRED", detail: "Model-assisted fit, priority, and next-step suggestions." },
  { label: "AMBIGUOUS", detail: "Human review before client-facing output or spend." },
] as const

// FAQ (v7): four honest answers in front of the booking ask. No guarantees,
// no invented numbers; pricing and timelines stated the way they are sold.
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
    a: "Engagements start at $3k per month. Exact scope is priced after the call, in writing, so you only pay for what your business actually needs.",
  },
]

export const NAV_LINKS = [
  { label: "Services", href: "#services" },
  { label: "System", href: "#ai-team" },
  { label: "Solutions", href: "#built-for" },
  { label: "Contact", href: "#booking" },
]
