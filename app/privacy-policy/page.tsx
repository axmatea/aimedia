import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy | AI MEDIA" },
  description:
    "How AX Media collects, uses, and protects your personal information across our website and services, and the rights you have over your data.",
  alternates: { canonical: "https://aimedia.global/privacy-policy" },
}

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#050507] px-6 py-24 select-text">
      <div className="max-w-3xl mx-auto">
        <p className="text-white/55 text-[10px] uppercase tracking-[0.3em] font-bold mb-4">Legal</p>
        <h1 className="text-white text-4xl md:text-5xl font-black uppercase mb-2" style={{ fontFamily: "var(--font-bebas)" }}>Privacy Policy</h1>
        <p className="text-white/55 text-sm mb-12">Last updated: October 15, 2026</p>

        <div className="space-y-10 text-white/55 text-sm leading-relaxed">
          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">1. Who We Are</h2>
            <p>AX Media (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is the AI automation brand of AXMATEA MEDIA CORP, a Florida corporation. Our business contact is <a href="mailto:info@aimedia.global" className="text-white/70 hover:text-[#FF2D55] transition-colors underline underline-offset-4">info@aimedia.global</a>. This Privacy Policy explains how we collect, use, and protect your personal information when you visit our website or engage with our services.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">2. Information We Collect</h2>
            <p className="mb-3">We collect information you submit through our booking process, including:</p>
            <ul className="list-disc list-inside space-y-1 text-white/60">
              <li>Name, email address, and optional phone number</li>
              <li>Company, website, business type, and your role</li>
              <li>Business problem, requested service, budget band, timeline, and preferred contact method</li>
              <li>Booking details and information you choose to add to the scheduling form</li>
            </ul>
            <p className="mt-3">We and our providers may also process technical and attribution information, including IP address and browser or device information, pages and funnel events, referring page, landing path, UTM parameters, Meta click identifiers such as <code>fbclid</code>, existing Meta browser identifiers such as <code>fbc</code> and <code>fbp</code>, and allowlisted campaign, ad set, ad, and creative identifiers.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">3. How We Use and Disclose Information</h2>
            <ul className="list-disc list-inside space-y-1 text-white/60">
              <li>Schedule and prepare for calls and communicate about our services</li>
              <li>Assess service fit and maintain our internal CRM</li>
              <li>Prevent duplicate booking records and conversion events</li>
              <li>Connect a paid campaign visit to a booking and understand campaign performance</li>
              <li>Improve our website and acquisition process</li>
            </ul>
            <p className="mt-3">We do not sell or rent personal information. We disclose limited information to the providers and platforms described below for hosting, scheduling, analytics, CRM administration, duplicate prevention, and conversion measurement.</p>
            <p className="mt-3">For the first accepted booking attributed to an allowlisted Meta ad, we may send Meta a server-side <code>Lead</code> event. It may include SHA-256-hashed email and phone number, if provided, existing <code>fbc</code> and <code>fbp</code> identifiers, event time and identifier, source URL, qualification status, and allowlisted campaign, ad set, ad, and creative identifiers. Hashing contact data does not make it anonymous, and Meta may attempt to match it under Meta&apos;s own terms and privacy policy.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">4. Service Providers and Platforms</h2>
            <p>We currently use:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-white/60">
              <li><span className="text-white/65">Cal.com</span> to display scheduling tools, collect booking details, and carry campaign-attribution metadata with a booking</li>
              <li><span className="text-white/65">Railway</span> for website hosting and our own website and funnel analytics. The analytics store receives page paths, event names, limited source and campaign labels, and a random session identifier; contact details, full URLs, IP addresses, advertising identifiers, and booking references are excluded from these analytics records.</li>
              <li><span className="text-white/65">Notion</span> as our internal CRM for booking, qualification, contact, and attribution information</li>
              <li><span className="text-white/65">Cloudflare Worker and D1</span> as an isolated duplicate-prevention service that receives keyed cryptographic digests of booking UID and normalized email, plus an operation identifier, state, timestamps, and an opaque CRM reference, but not plaintext booking-form content through this service</li>
              <li><span className="text-white/65">Meta Platforms</span> for server-side conversion measurement for verified Meta-attributed bookings, as described above</li>
            </ul>
            <p className="mt-3">These providers process information under their own terms and privacy practices and may process it in jurisdictions other than your own.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">5. Data Retention</h2>
            <p>Retention periods vary by record type and operational need. Our own website analytics events are retained for up to 90 days. We retain booking and CRM information for business administration, follow-up, attribution, security, and legal purposes. Limited cryptographic duplicate-prevention records may be retained to preserve the one-booking-to-one-record mapping and prevent duplicate conversions. We delete or anonymize information when it is no longer reasonably needed, subject to security, dispute, recordkeeping, and legal obligations.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">6. Privacy Requests</h2>
            <p>Depending on where you live and which laws apply, you may have rights to request access, correction, deletion, portability, restriction, or objection concerning your personal information. These rights are not absolute. Email us at <a href="mailto:info@aimedia.global" className="text-white/70 hover:text-[#FF2D55] transition-colors underline underline-offset-4">info@aimedia.global</a>; we may need to verify your request and will respond as required by applicable law.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">7. Security</h2>
            <p>We use reasonable technical and organizational safeguards designed to protect information. No transmission, storage, or processing system can be guaranteed completely secure.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">8. Contact</h2>
            <p>Questions about this policy? Contact us: <a href="mailto:info@aimedia.global" className="text-white/70 hover:text-[#FF2D55] transition-colors underline underline-offset-4">info@aimedia.global</a></p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/6">
          <Link href="/" className="text-[#FF2D55] text-sm hover:underline underline-offset-4">← Back to home</Link>
        </div>
      </div>
    </main>
  )
}
