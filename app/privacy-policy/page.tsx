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
        <p className="text-white/55 text-sm mb-12">Last updated: June 11, 2026</p>

        <div className="space-y-10 text-white/55 text-sm leading-relaxed">
          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">1. Who We Are</h2>
            <p>AX Media (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is the AI automation brand of AXMATEA MEDIA CORP, a Florida corporation. Our business contact is <a href="mailto:info@aimedia.global" className="text-white/70 hover:text-[#FF2D55] transition-colors underline underline-offset-4">info@aimedia.global</a>. This Privacy Policy explains how we collect, use, and protect your personal information when you visit our website or engage with our services.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">2. Information We Collect</h2>
            <p className="mb-3">We collect information you provide directly, including:</p>
            <ul className="list-disc list-inside space-y-1 text-white/60">
              <li>Name and email address (via booking forms)</li>
              <li>Phone number (optional, for call scheduling)</li>
              <li>Project details and budget (provided voluntarily)</li>
              <li>Technical data: IP address, browser type, pages visited</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 text-white/60">
              <li>To schedule and conduct strategy calls</li>
              <li>To communicate about our services</li>
              <li>To improve our website and user experience</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p className="mt-3">We do <span className="text-white/70">not</span> sell, rent, or share your personal data with third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">4. Third-Party Services</h2>
            <p>We use the following third-party tools that may process your data:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-white/60">
              <li><span className="text-white/65">Cal.com</span> for call scheduling (governed by the Cal.com Privacy Policy)</li>
              <li><span className="text-white/65">Vercel</span> for website hosting and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">5. Data Retention</h2>
            <p>We retain your data for as long as necessary to fulfill the purposes outlined in this policy, or as required by law. You may request deletion at any time.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">6. Your Rights</h2>
            <p>Under applicable law (GDPR, CCPA), you have the right to access, correct, delete, or port your personal data. To exercise these rights, email us at <a href="mailto:info@aimedia.global" className="text-white/70 hover:text-[#FF2D55] transition-colors underline underline-offset-4">info@aimedia.global</a>.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">7. Security</h2>
            <p>We implement industry-standard security measures. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
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
