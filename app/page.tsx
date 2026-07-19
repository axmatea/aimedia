/**
 * Home page (v7.2): SERVER component shell.
 *
 * Everything static on this page (headings, copy, section wrappers, services,
 * FAQ, footer, the LCP hero text) renders on the server and ships ZERO
 * hydration JS. Interactivity lives in explicit client islands:
 *
 *   SiteNav                     theme toggle, Lenis glides, booking triggers
 *   HeroVisual/HeroRotator/     Spline robot + Lightning, rotating audience
 *   HeroCtas                    line, hero buttons
 *   Spotlight                   pointer-follow hero glow (lg+)
 *   Reveal                      whileInView fadeUp wrapper; children stay
 *                               server-rendered (children-as-props pattern)
 *   GlowCard / CountUp /        hover glow, count-up numbers, logo marquee
 *   LogoCloud(InfiniteSlider)
 *   lazy-islands                AgentRadial, LeadFunnel, N8nWorkflowBlock,
 *                               AIUGCCreators, WorldMap (ssr:false, unchanged)
 *   BookingSection/Dialog/      the whole booking stack + sticky mobile pill
 *   BookingButton/StickyCta
 *
 * Rule for future edits: static content stays OUT of "use client" files; a
 * new widget gets its own island (or lives in lazy-islands if it should stay
 * off the critical path). Function props never cross into islands.
 */

import { Spotlight } from "@/components/ui/spotlight"
import { LogoCloud } from "@/components/ui/logo-cloud-3"
import { GlowCard } from "@/components/ui/spotlight-card"
import { CountUp } from "@/components/ui/count-up"
import { ProofSection } from "@/components/ui/proof-section"
import { StickyCta } from "@/components/ui/sticky-cta"
import { SERVE_ICONS } from "@/components/ui/serve-icons"
import { AxWordmark } from "@/components/ui/ax-wordmark"

import { Disp, Tag, AmbientImage } from "@/components/home/shared"
import { BookingSection, BookingDialog } from "@/components/home/booking"
import { BookingButton } from "@/components/home/booking-button"
import { SiteNav } from "@/components/home/nav"
import { HeroVisual, HeroRotator, HeroCtas } from "@/components/home/hero-islands"
import { Reveal } from "@/components/home/reveal"
import {
  N8nWorkflowBlock, AIUGCCreators, AgentRadial, LeadFunnel, WorldMap,
} from "@/components/home/lazy-islands"
import {
  TICKER, WHO_WE_SERVE, STACK_LOGOS, FEATURED_LOGOS, MAP_DOTS,
  SERVICES, CASE_STUDIES, TRACE_SYSTEM_NODES, TRACE_DELIVERABLES,
  TRACE_SYSTEM_EDGES, TRACE_CONFIDENCE_TAGS, FAQS,
} from "@/components/home/data"

// Server-rendered section: only the two Reveal wrappers hydrate.
function TraceableSystemMap() {
  return (
    <section id="trace-map" className="trace-map-section">
      <div className="trace-map-layout">
        <Reveal className="trace-map-copy">
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
        </Reveal>

        <Reveal delay={0.1} className="trace-map-canvas" role="img" ariaLabel="AX Media traceable AI system map">
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
        </Reveal>
      </div>
    </section>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="w-full ai-page overflow-hidden grain">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <SiteNav />

      {/* 01 HOOK */}
      <section className="hero-section min-h-[100svh] relative overflow-hidden flex flex-col justify-end pb-16 pt-32 px-6 md:px-10">
        <div className="hidden lg:block"><Spotlight size={500} /></div>

        {/* Backgrounds: stronger red bloom, softer grid. Avoid visible line artifacts. */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-16 right-0 w-[680px] h-[620px] bg-[#FF2D55]/12 rounded-full blur-[110px]" />
          <div className="absolute bottom-0 left-0 w-[520px] h-[380px] bg-[#7B2FFF]/8 rounded-full blur-[120px]" />
          <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:88px_88px]" />
        </div>

        {/* Lightning + robot: interactive visual layers hydrate as one island */}
        <HeroVisual />

        {/* Content: static server-rendered text. The pre-v7.2 m.div wrappers all
            ran with initial={false} (final state, no mount animation), so plain
            markup here is pixel-identical, and the LCP paragraph no longer waits
            for any hydration. */}
        <div className="relative z-10 max-w-[1440px] mx-auto w-full">
          <div>
            <div className="overflow-hidden py-[0.04em] -my-[0.04em]">
              <div>
                <Disp className="block ai-text" style={{ fontSize: "var(--fs-mega)", lineHeight: "var(--lh-mega)" }}>WE BUILD</Disp>
              </div>
            </div>
            <div className="overflow-hidden py-[0.04em] -my-[0.04em]">
              <div>
                <Disp className="block" style={{ color: "var(--red)", fontSize: "var(--fs-mega)", lineHeight: "var(--lh-mega)" }}>AI SYSTEMS</Disp>
              </div>
            </div>
            {/* Rotating audience line: the only headline part that hydrates */}
            <HeroRotator />
          </div>

          <div className="mt-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-8 lg:max-w-[55%]">
            <p className="ai-muted text-sm md:text-base max-w-sm leading-relaxed">
              You imagine it. We make it real. Systems for go-to-market, content, and ops, shipped.
            </p>
            <HeroCtas />
          </div>

        </div>
      </section>

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
              <Reveal key={w.label} delay={i * 0.07}
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
              </Reveal>
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
            <Reveal duration={0.6} easeDefault className="mt-6">
              <Disp className="ai-text block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
                YOUR AI TEAM<br />NEVER<br /><span style={{ color: "var(--red)" }}>SLEEPS.</span>
              </Disp>
            </Reveal>
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
          <p className="text-white/90 text-lg md:text-2xl font-semibold leading-snug max-w-xl">
            Want one of these running in your business? Book the call.
          </p>
          <BookingButton label="Book the Call" magnetic />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[300px] bg-[#FF2D55]/14 rounded-full blur-[130px] pointer-events-none" aria-hidden />
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
          <Reveal className="text-center mb-10">
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
          </Reveal>
          <WorldMap dots={MAP_DOTS} lineColor="#FF2D55" showLabels />
        </div>
      </section>

      {/* FAQ: honest objections handled before the booking ask. Native
          <details> accordion, no new dependencies. */}
      <section id="faq" className="ai-page py-20 px-6" style={{ contain: "layout paint", containIntrinsicSize: "0 620px" }}>
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-10">
            <Tag>FAQ</Tag>
            <Disp className="ai-text mt-4 block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
              STRAIGHT<br /><span style={{ color: "var(--red)" }}>ANSWERS.</span>
            </Disp>
          </Reveal>
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
