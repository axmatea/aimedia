/**
 * Home page (v7.2): SERVER component shell.
 *
 * Everything static on this page (headings, copy, section wrappers, services,
 * FAQ, footer, the LCP hero text) renders on the server and ships ZERO
 * hydration JS. Interactivity lives in explicit client islands:
 *
 *   SiteNav                     theme toggle, Lenis glides, booking triggers
 *   HeroVisual/HeroCtas         Spline robot + Lightning, hero buttons
 *   Spotlight                   pointer-follow hero glow (lg+)
 *   Reveal                      whileInView fadeUp wrapper; children stay
 *                               server-rendered (children-as-props pattern)
 *   CountUp / LogoCloud         service metrics and the integration strip
 *   lazy-islands                AgentRadial, LeadFunnel, N8nWorkflowBlock,
 *                               AIUGCCreators, WorldMap (ssr:false, unchanged)
 *   BookingSection/Dialog/      the whole booking stack
 *
 * Rule for future edits: static content stays OUT of "use client" files; a
 * new widget gets its own island (or lives in lazy-islands if it should stay
 * off the critical path). Function props never cross into islands.
 */

import { Spotlight } from "@/components/ui/spotlight"
import { LogoCloud } from "@/components/ui/logo-cloud-3"
import { GlowCard } from "@/components/ui/spotlight-card"
import { CountUp } from "@/components/ui/count-up"
import { AxWordmark } from "@/components/ui/ax-wordmark"
import { SERVE_ICONS } from "@/components/ui/serve-icons"

import { Disp, Tag, AmbientImage } from "@/components/home/shared"
import { BookingSection, BookingDialog } from "@/components/home/booking"
import { SiteNav } from "@/components/home/nav"
import { HeroVisual, HeroCtas, HeroRotator } from "@/components/home/hero-islands"
import { Reveal } from "@/components/home/reveal"
import {
  N8nWorkflowBlock, AIUGCCreators, AgentRadial, LeadFunnel, WorldMap,
} from "@/components/home/lazy-islands"
import {
  STACK_LOGOS, FEATURED_LOGOS, MAP_DOTS, SERVICES, FAQS, TICKER, WHO_WE_SERVE,
  SELECTED_SYSTEMS, PROCESS_STEPS,
} from "@/components/home/data"

// ── Page ────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="w-full ai-page grain">

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
          <h1>
            <span className="block overflow-hidden py-[0.04em] -my-[0.04em]">
              <span className="block">
                <Disp className="block ai-text" style={{ fontSize: "var(--fs-mega)", lineHeight: "var(--lh-mega)" }}>WE BUILD</Disp>
              </span>
            </span>
            <span className="block overflow-hidden py-[0.04em] -my-[0.04em]">
              <span className="block">
                <Disp className="block" style={{ color: "var(--red)", fontSize: "var(--fs-mega)", lineHeight: "var(--lh-mega)" }}>AI SYSTEMS</Disp>
              </span>
            </span>
            <HeroRotator />
          </h1>

          <div className="mt-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-8 lg:max-w-[55%]">
            <p className="ai-muted text-sm md:text-base max-w-sm leading-relaxed">
              You imagine it. We make it real. Systems for go-to-market, content, and ops, shipped.
            </p>
            <HeroCtas />
          </div>

        </div>
      </section>

      {/* Fast capability signal directly after the hero. The content is
          duplicated only to create a seamless marquee loop. */}
      <section className="marquee-shell marquee-mask overflow-hidden bg-[#FF2D55] py-4 md:py-5" aria-label="AI Media capabilities">
        <div className="animate-marquee flex w-max whitespace-nowrap">
          {[...TICKER, ...TICKER].map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="mx-5 flex items-center gap-5 text-xs font-bold uppercase tracking-[0.2em] text-[#050507] md:mx-6 md:gap-6 md:text-sm"
              aria-hidden={index >= TICKER.length}
            >
              {item}
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#050507]/45" aria-hidden />
            </span>
          ))}
        </div>
      </section>

      {/* Integration proof belongs high in the story: the offer, then the
          systems it can plug into, then the orchestrated AI team. */}
      <section className="ai-page py-12 md:py-16 px-5 md:px-10" aria-labelledby="stack-heading">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-8 md:mb-10">
            <p id="stack-heading" className="ai-muted text-xs uppercase tracking-[0.3em] font-bold">
              Built to work with your stack
            </p>
          </Reveal>
          <LogoCloud logos={[...STACK_LOGOS, ...FEATURED_LOGOS]} />
        </div>
      </section>

      {/* Cursor-reactive audience cards: a clear bridge between capability
          proof and the operating system that powers it. */}
      <section id="built-for" className="ai-page py-20 md:py-28 px-5 md:px-10 overflow-hidden scroll-mt-24" style={{ contain: "layout paint" }}>
        <div className="max-w-7xl mx-auto">
          <Reveal className="flex items-end justify-between mb-10 md:mb-14 gap-6 flex-wrap">
            <div>
              <Tag>Who we build for</Tag>
              <Disp className="ai-text mt-4 block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
                BUILT FOR<br />AMBITIOUS<br /><span style={{ color: "var(--red)" }}>OPERATORS.</span>
              </Disp>
            </div>
            <p className="ai-muted text-sm md:text-base max-w-sm leading-relaxed">
              From focused founders to global teams, we build systems around the way the business needs to move.
            </p>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {WHO_WE_SERVE.map((audience, index) => (
              <Reveal key={audience.label} delay={index * 0.055}>
                <GlowCard glowColor={audience.glowColor} customSize className="w-full h-full min-h-[190px] sm:min-h-[230px] md:min-h-[260px]">
                  <div className="flex flex-col justify-between h-full py-2 sm:py-3">
                    <span style={{ color: audience.color }}>{SERVE_ICONS[audience.icon]()}</span>
                    <div>
                      <Disp className="text-white text-2xl sm:text-3xl md:text-4xl block mb-2">{audience.label}</Disp>
                      <p className="text-white/65 text-[10px] sm:text-xs font-medium uppercase tracking-[0.12em] leading-snug">{audience.sub}</p>
                    </div>
                  </div>
                </GlowCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* AI Team Never Sleeps */}
      <section id="ai-team" className="ai-panel ax-panel-melt ai-team-section py-20 md:py-28 px-5 md:px-10 relative overflow-hidden" style={{ contain: "layout paint" }}>
        {/* Ambient atmosphere: community-sphere render, dimmed + radially masked behind the agent radial */}
        <AmbientImage src="/generated/outcomes/blur/outcome-web3-blur.webp" className="ambient-ai-team" />
        <div className="relative z-[1] max-w-7xl mx-auto grid lg:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)] gap-12 lg:gap-16 items-center">
          <div className="relative z-10">
            <Tag>The Intelligence</Tag>
            <Reveal duration={0.6} easeDefault className="mt-6">
              <Disp className="ai-text block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
                YOUR AI TEAM<br />NEVER<br /><span style={{ color: "var(--red)" }}>SLEEPS.</span>
              </Disp>
            </Reveal>
            <p className="ai-muted text-sm md:text-base leading-relaxed mt-6 mb-8 max-w-md">
              Specialized agents coordinate lead generation, content, analytics, outreach, and strategy around one orchestrator, with human review where it matters.
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
          <div className="flex items-center justify-center py-4 md:py-8 min-w-0">
            <AgentRadial />
          </div>
        </div>
      </section>

      {/* 04 SOLUTION: Services */}
      <div id="services" className="scroll-mt-24">
        {SERVICES.map((svc, i) => (
          <section id={`service-${svc.id}`} key={svc.id} className={`service-section service-${svc.id} py-20 md:py-28 px-5 md:px-10 relative overflow-hidden scroll-mt-24`} style={{ background: svc.bg, contain: "layout paint" }}>
            <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 md:gap-14 lg:gap-20 items-center relative z-10">
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
                <p className="text-[15px] md:text-base leading-relaxed mb-8 max-w-xl" style={{ color: "rgba(255,255,255,0.76)" }}>{svc.body}</p>
                <div className="grid grid-cols-2 gap-5 md:gap-8 mb-7 max-w-lg">
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

      {/* Selected system architectures. These are transparent capability
          studies, not disguised client case studies or invented outcomes. */}
      <section id="selected-systems" className="ai-page py-20 md:py-28 px-5 md:px-10 scroll-mt-24" style={{ contain: "layout paint" }}>
        <div className="max-w-7xl mx-auto">
          <Reveal className="flex items-end justify-between mb-10 md:mb-14 gap-6 flex-wrap">
            <div>
              <Tag>Selected systems</Tag>
              <Disp className="ai-text mt-4 block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
                DESIGNED AROUND<br /><span style={{ color: "var(--red)" }}>REAL WORK.</span>
              </Disp>
            </div>
            <p className="ai-muted text-sm md:text-base max-w-md leading-relaxed">
              Three system architectures that show how fragmented work becomes one coordinated operating layer.
            </p>
          </Reveal>

          <div className="grid gap-4 lg:grid-cols-3">
            {SELECTED_SYSTEMS.map((system, systemIndex) => (
              <Reveal key={system.index} delay={systemIndex * 0.06} className="h-full">
                <article className="ai-card group relative h-full min-h-[330px] overflow-hidden rounded-3xl border ai-border p-6 md:p-7">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF2D55]/80 to-transparent" aria-hidden />
                  <div className="mb-10 flex items-center justify-between gap-4">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF2D55]">Architecture study {system.index}</span>
                    <span className="ai-muted text-[10px] font-bold uppercase tracking-[0.18em]">{system.label}</span>
                  </div>
                  <div className="mb-8 flex items-center gap-1.5" aria-hidden>
                    {system.stages.map((stage, stageIndex) => (
                      <div key={stage} className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full border ${stageIndex === system.stages.length - 1 ? "border-[#FF2D55] bg-[#FF2D55] shadow-[0_0_16px_rgba(255,45,85,0.7)]" : "border-white/25 bg-white/[0.05]"}`} />
                        {stageIndex < system.stages.length - 1 && <span className="h-px min-w-0 flex-1 bg-white/15" />}
                      </div>
                    ))}
                  </div>
                  <Disp className="ai-text mb-4 block text-3xl md:text-4xl">{system.name}</Disp>
                  <p className="ai-muted text-sm leading-relaxed">{system.detail}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {system.stages.map((stage) => (
                      <span key={stage} className="rounded-full border ai-border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/55">{stage}</span>
                    ))}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* A concise process band keeps the commercial homepage clear while
          giving the navigation a truthful, useful destination. */}
      <section id="process" className="ai-panel py-20 md:py-24 px-5 md:px-10 scroll-mt-24" style={{ contain: "layout paint" }}>
        <div className="max-w-7xl mx-auto">
          <Reveal className="mb-10 md:mb-12">
            <Tag>Process</Tag>
            <Disp className="ai-text mt-4 block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
              FROM CONTEXT<br /><span style={{ color: "var(--red)" }}>TO SYSTEM.</span>
            </Disp>
          </Reveal>
          <div className="grid gap-px overflow-hidden rounded-3xl border ai-border bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((step) => (
              <article key={step.index} className="ai-card min-h-[230px] p-6 md:p-7">
                <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#FF2D55]">{step.index}</span>
                <Disp className="ai-text mt-14 block text-3xl">{step.label}</Disp>
                <p className="ai-muted mt-3 text-sm leading-relaxed">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 07 SCALE: World Map */}
      <section id="global-reach" className="ai-page py-20 px-6 relative overflow-hidden scroll-mt-20" style={{ contain: "layout paint" }}>
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
          <WorldMap dots={MAP_DOTS} lineColor="#FF2D55" showLabels loop={false} />
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
          <div className="ai-faq-list">
            {FAQS.map((item) => (
              <details key={item.q} className="group ai-faq-row">
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

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="ai-page py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {/* Same canonical prepared mark as the header. */}
            <AxWordmark className="h-9" />
            <span className="ai-muted text-xs">© 2026 AX Media · aimedia.global</span>
          </div>
          {/* On phones the links become real 44px rows in a 2-up grid,
              the way an installed app lists its About / Legal entries, instead
              of a squeezed line of 12px text. From md up it collapses back to
              the inline link row the desktop footer has always had. Layout and
              press feedback live in globals.css under .ai-footer-rail. */}
          <nav aria-label="Contact and legal" className="ai-footer-rail md:flex md:gap-6 md:flex-wrap md:justify-center">
            <a href="mailto:info@aimedia.global" className="ai-footer-link ai-footer-link-wide ai-muted text-xs hover:text-[#FF2D55] transition-colors">info@aimedia.global</a>
            <a href="/privacy-policy" className="ai-footer-link ai-muted text-xs hover:text-[#FF2D55] transition-colors">Privacy</a>
            <a href="/cookies" className="ai-footer-link ai-muted text-xs hover:text-[#FF2D55] transition-colors">Cookies</a>
            <a href="/legal" className="ai-footer-link ai-muted text-xs hover:text-[#FF2D55] transition-colors">Legal</a>
          </nav>
        </div>
      </footer>

    </main>
  )
}
