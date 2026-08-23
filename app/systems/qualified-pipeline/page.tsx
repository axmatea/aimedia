import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check, ShieldCheck } from "lucide-react"

import { AxWordmark } from "@/components/ui/ax-wordmark"

export const metadata: Metadata = {
  title: "Qualified Pipeline System",
  description:
    "An owned, human-controlled operating system that connects buyer signals, evidence, approvals, replies, CRM handoff, and source attribution.",
  alternates: { canonical: "/systems/qualified-pipeline" },
  openGraph: {
    title: "Qualified Pipeline System | AX Media",
    description:
      "Turn disconnected prospecting and follow-up into one accountable workflow your team owns.",
    url: "/systems/qualified-pipeline",
  },
}

const bookingHref = "/?intent=qualified-pipeline#booking"

const architecture = [
  ["01", "Buyer signals", "Define the ICP and permitted signals that deserve attention."],
  ["02", "Evidence", "Store the source and reason behind fit, timing, and every claim."],
  ["03", "Qualification", "Filter accounts and contacts before they enter active work."],
  ["04", "Human approval", "Review the exact consequential action before it can run."],
  ["05", "Conversation", "Route replies, next actions, and booking state into one CRM path."],
  ["06", "Attribution", "Connect the originating source to qualified scope and paid work."],
] as const

const deliverables = [
  "Workflow and bottleneck map",
  "ICP and qualification rules",
  "Evidence-backed research flow",
  "Exact-action approval gates",
  "CRM and reply handoff",
  "Source-to-scope measurement",
] as const

export default function QualifiedPipelinePage() {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Qualified Pipeline System",
    description:
      "An owned, human-controlled operating system that connects buyer signals, evidence, approvals, replies, CRM handoff, and source attribution.",
    url: "https://aimedia.global/systems/qualified-pipeline",
    areaServed: "Worldwide",
    provider: {
      "@type": "Organization",
      name: "AX Media",
      url: "https://aimedia.global",
    },
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050507] text-white grain">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceSchema).replaceAll("<", "\\u003c"),
        }}
      />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050507]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-10">
          <Link href="/" aria-label="AX Media home">
            <AxWordmark className="h-10 md:h-12" />
          </Link>
          <Link
            href={bookingHref}
            className="inline-flex min-h-11 items-center rounded-full border border-[#FF2D55]/70 bg-[#FF2D55]/10 px-5 text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:bg-[#FF2D55]"
          >
            Map the workflow
          </Link>
        </div>
      </header>

      <section className="relative flex min-h-[92svh] items-end px-5 pb-16 pt-36 md:px-10 md:pb-24">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute right-[-16rem] top-[8%] h-[38rem] w-[38rem] rounded-full bg-[#FF2D55]/20 blur-[130px] md:right-[3%] md:h-[48rem] md:w-[48rem]" />
          <div className="absolute right-[7%] top-[22%] h-56 w-56 rounded-full border border-[#FF2D55]/30 shadow-[0_0_120px_rgba(255,45,85,0.24),inset_0_0_80px_rgba(255,45,85,0.12)] md:h-96 md:w-96" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_40%,transparent_0,rgba(5,5,7,.25)_30%,#050507_72%)]" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1.12fr_.58fr] lg:items-end">
          <div>
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.28em] text-[#FF2D55]">
              Qualified pipeline system
            </p>
            <h1
              className="max-w-5xl font-display uppercase leading-[0.82] tracking-wide"
              style={{ fontSize: "clamp(3.2rem, 9.2vw, 8.6rem)" }}
            >
              One system.<br />
              <span className="text-[#FF2D55]">You own it.</span>
            </h1>
          </div>
          <div className="max-w-xl lg:pb-2">
            <p className="text-base leading-relaxed text-white/72 md:text-xl">
              Turn scattered research, manual follow-up, approval gaps, and CRM handoffs into one accountable operating flow built around your team.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={bookingHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#FF2D55] px-7 text-sm font-bold text-white transition-transform hover:scale-[1.02] motion-reduce:hover:scale-100"
              >
                Map the first useful build <ArrowRight size={16} aria-hidden />
              </Link>
              <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 px-6 text-sm font-semibold text-white/65">
                <ShieldCheck size={16} className="text-[#C8FF60]" aria-hidden /> Human-controlled
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025] px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[.7fr_1fr] lg:gap-20">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#FF2D55]">
                Production, not demo
              </p>
              <h2 className="mt-4 max-w-xl font-display text-5xl uppercase leading-[0.9] tracking-wide md:text-7xl">
                The workflow becomes the product.
              </h2>
              <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/58 md:text-base">
                We build working operating systems with visible rules, review gates, durable context, and handover. No autonomous spam. No mystery black box.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2">
              {[
                ["Evidence before copy", "Every personalized claim stays connected to its source."],
                ["Approval before action", "The exact revision is reviewed before any consequential step."],
                ["Conversation over volume", "Qualified scope is the metric, not scraped contacts or clicks."],
                ["Owned after delivery", "The operating layer is documented around your stack and team."],
              ].map(([title, detail]) => (
                <article key={title} className="bg-[#09090d] p-6 md:p-8">
                  <Check size={18} className="mb-7 text-[#C8FF60]" aria-hidden />
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/58">{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#FF2D55]">
            System architecture
          </p>
          <div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <h2 className="max-w-3xl font-display text-5xl uppercase leading-[0.9] tracking-wide md:text-7xl">
              Signal to scope.<br />One accountable path.
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-white/55">
              The exact connectors change with the stack. The operating contract stays visible.
            </p>
          </div>
          <div className="mt-12 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {architecture.map(([index, label, detail]) => (
              <article
                key={index}
                className="min-h-52 rounded-3xl border border-white/10 bg-white/[0.025] p-6 transition-colors hover:border-[#FF2D55]/40 md:p-7"
              >
                <span className="font-mono text-xs text-[#FF2D55]">{index}</span>
                <h3 className="mt-9 text-xl font-bold">{label}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/58">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f2f0eb] px-5 py-20 text-[#08080b] md:px-10 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d3173c]">
              First useful scope
            </p>
            <h2 className="mt-4 font-display text-5xl uppercase leading-[0.9] tracking-wide md:text-7xl">
              Bring one broken workflow.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-black/62">
              We will map the work, constraints, ownership, and acceptance criteria before proposing a build.
            </p>
          </div>
          <ul className="grid gap-0 border-t border-black/15">
            {deliverables.map((item, index) => (
              <li key={item} className="flex min-h-16 items-center gap-5 border-b border-black/15 py-4 text-sm font-semibold md:text-base">
                <span className="font-mono text-[10px] text-[#d3173c]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 rounded-[2rem] border border-[#FF2D55]/25 bg-[linear-gradient(145deg,rgba(255,45,85,.13),rgba(255,255,255,.02))] p-7 md:flex-row md:items-end md:justify-between md:p-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#FF2D55]">
              30-minute workflow fit call
            </p>
            <h2 className="mt-4 max-w-3xl font-display text-5xl uppercase leading-[0.9] tracking-wide md:text-7xl">
              Show us where the work breaks.
            </h2>
          </div>
          <Link
            href={bookingHref}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#FF2D55] px-7 text-sm font-bold text-white"
          >
            Map the workflow <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} AX Media</span>
          <div className="flex gap-5">
            <Link href="/privacy-policy" className="transition-colors hover:text-white">Privacy</Link>
            <Link href="/legal" className="transition-colors hover:text-white">Legal</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
