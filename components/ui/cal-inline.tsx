"use client"

import { useEffect, useRef, useState } from "react"

/**
 * CalInline (v7.1): lazy inline Cal.com embed for BookingFlow step 2.
 *
 * The embed script (https://app.cal.com/embed/embed.js) is injected only when
 * this component first mounts, which happens only when a visitor reaches the
 * final booking step: zero impact on page-load performance. The loader below
 * is a faithful TypeScript port of Cal.com's official queueing snippet, so
 * calls made before the script arrives are replayed once it loads, and a
 * second mount (modal + inline section, React strict mode) reuses the same
 * script and namespace instead of double-injecting.
 *
 * Failure contract: if no Cal iframe materializes inside the container within
 * EMBED_TIMEOUT_MS (script blocked, offline, Cal outage), `onFail` fires and
 * the caller swaps in the external-link fallback. The fallback anchor also
 * stays under the embed at all times, so there is never a dead end.
 */

type CalFn = {
  (...args: unknown[]): void
  q?: unknown[][]
  ns?: Record<string, CalFn>
  loaded?: boolean
}

const CAL_ORIGIN = "https://app.cal.com"
const EMBED_SRC = `${CAL_ORIGIN}/embed/embed.js`
const NAMESPACE = "call"
const EMBED_TIMEOUT_MS = 4000

function getCal(): CalFn {
  const w = window as unknown as { Cal?: CalFn }
  if (w.Cal) return w.Cal
  const push = (api: CalFn, args: unknown[]) => {
    api.q!.push(args)
  }
  const cal: CalFn = function (...args: unknown[]) {
    const c = w.Cal!
    if (!c.loaded) {
      c.ns = {}
      c.q = c.q ?? []
      const s = document.createElement("script")
      s.src = EMBED_SRC
      document.head.appendChild(s)
      c.loaded = true
    }
    if (args[0] === "init") {
      const api: CalFn = function (...a: unknown[]) {
        push(api, a)
      }
      api.q = api.q ?? []
      const namespace = args[1]
      if (typeof namespace === "string") {
        c.ns![namespace] = c.ns![namespace] ?? api
        push(c.ns![namespace], args)
        push(c, ["initNamespace", namespace])
      } else {
        push(c, args)
      }
      return
    }
    push(c, args)
  }
  cal.q = []
  w.Cal = cal
  return cal
}

export function CalInline({
  calLink,
  config,
  onFail,
}: {
  calLink: string
  /** Prefill passed straight to the embed config (name, email, a1..a3, duration). */
  config: Record<string, string>
  onFail?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  // Latest config/onFail without retriggering the embed effect: the calendar
  // must boot exactly once per mount (prefill is frozen at step entry).
  const configRef = useRef(config)
  const onFailRef = useRef(onFail)
  useEffect(() => {
    configRef.current = config
    onFailRef.current = onFail
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const cal = getCal()
    cal("init", NAMESPACE, { origin: CAL_ORIGIN })
    const ns = (window as unknown as { Cal: CalFn }).Cal.ns![NAMESPACE]
    ns("inline", {
      elementOrSelector: el,
      calLink,
      config: { ...configRef.current, theme: "dark" },
    })
    ns("ui", {
      theme: "dark",
      hideEventTypeDetails: false,
      cssVarsPerTheme: { dark: { "cal-brand": "#FF2D55" } },
    })

    // Success heuristic: the embed inserts its iframe into the container as
    // soon as the script boots. No iframe by the deadline = failed/blocked.
    const deadline = Date.now() + EMBED_TIMEOUT_MS
    const poll = window.setInterval(() => {
      if (el.querySelector("iframe")) {
        setReady(true)
        window.clearInterval(poll)
      } else if (Date.now() > deadline) {
        window.clearInterval(poll)
        onFailRef.current?.()
      }
    }, 200)

    return () => {
      window.clearInterval(poll)
      // Drop the embed DOM on unmount so a remount (or the second BookingFlow
      // instance) starts from a clean container instead of stacking iframes.
      el.replaceChildren()
    }
  }, [calLink])

  return (
    <div className="relative w-full">
      {!ready && (
        <div className="absolute inset-0 rounded-2xl animate-pulse bg-white/[0.03] border border-white/10 flex items-center justify-center" aria-hidden>
          <span className="text-white/50 text-sm">Loading calendar…</span>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full min-h-[560px] overflow-auto rounded-2xl"
        aria-label="Pick a date and time for your call"
      />
    </div>
  )
}
