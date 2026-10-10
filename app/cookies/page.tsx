import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: { absolute: "Cookie and Storage Notice | AI MEDIA" },
  description:
    "How AX Media uses cookies, browser storage, campaign attribution, analytics, and provider storage.",
  alternates: { canonical: "https://aimedia.global/cookies" },
}

export default function CookiePreferences() {
  return (
    <main className="min-h-screen bg-[#050507] px-6 py-24 select-text">
      <div className="max-w-3xl mx-auto">
        <p className="text-white/55 text-[10px] uppercase tracking-[0.3em] font-bold mb-4">Legal</p>
        <h1 className="text-white text-4xl md:text-5xl font-black uppercase mb-2" style={{ fontFamily: "var(--font-bebas)" }}>Cookie and Storage Notice</h1>
        <p className="text-white/55 text-sm mb-12">Last updated: August 23, 2026</p>

        <div className="space-y-10 text-white/55 text-sm leading-relaxed">
          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">What Are Cookies?</h2>
            <p>Cookies are small text files placed on your device when you visit our website. They help us provide a better experience and understand how our site is used.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">Storage and Processing We Use</h2>
            <div className="space-y-4">
              {[
                { name: "First-touch campaign attribution", desc: "For campaign visits, we store the first touch in browser session storage, including UTM values, landing and referrer information, Meta click identifiers, and allowlisted ad identifiers. It remains for the browser session or until site data is cleared.", status: "Active for campaign visits" },
                { name: "Existing Meta identifiers", desc: "Our attribution code may read existing _fbc and _fbp cookies. When a current fbclid exists, it derives an fbc value in memory. Our attribution code does not create or extend a Meta browser cookie solely for this handoff.", status: "Read when present" },
                { name: "Vercel Analytics", desc: "Vercel Analytics receives page and funnel-event data with first-touch source and campaign values. Identifying contact and advertising parameters are removed from the URL sent to analytics.", status: "Active" },
                { name: "Cal.com", desc: "The embedded or external scheduler may use cookies or browser storage under Cal.com’s own privacy and cookie practices.", status: "On booking interaction" },
                { name: "Interface preferences", desc: "Browser storage may remember interface preferences such as the selected visual theme.", status: "When used" },
                { name: "Essential provider storage", desc: "Hosting, security, and scheduling providers may use storage necessary to deliver or protect their services.", status: "As applicable" },
              ].map((c) => (
                <div key={c.name} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-white/6 bg-white/[0.02]">
                  <div>
                    <p className="text-white/75 font-bold text-sm mb-1">{c.name}</p>
                    <p className="text-white/55 text-xs">{c.desc}</p>
                  </div>
                  <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">Browser Controls and Server Records</h2>
            <p>You can inspect, block, or delete cookies and browser storage through your browser settings. Clearing site data also removes our stored first-touch attribution. Blocking storage or third-party content may affect attribution or prevent the Cal.com booking interface from working. Most browsers allow you to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-white/60">
              <li>View cookies stored on your device</li>
              <li>Delete all or specific cookies</li>
              <li>Block third-party cookies</li>
              <li>Set preferences for specific sites</li>
            </ul>
            <p className="mt-3">Browser controls do not delete booking, CRM, duplicate-prevention, or conversion records already processed on our servers or by our providers. To submit a privacy request, email <a href="mailto:info@aimedia.global" className="text-white/70 hover:text-[#FF2D55] transition-colors underline underline-offset-4">info@aimedia.global</a>.</p>
            <p className="mt-3">This page describes current behavior; it is not an interactive consent or preference manager.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">Contact</h2>
            <p>Questions? Email us at <a href="mailto:info@aimedia.global" className="text-white/70 hover:text-[#FF2D55] transition-colors underline underline-offset-4">info@aimedia.global</a></p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/6">
          <Link href="/" className="text-[#FF2D55] text-sm hover:underline underline-offset-4">← Back to home</Link>
        </div>
      </div>
    </main>
  )
}
