import Link from "next/link"

export default function Legal() {
  return (
    <main className="min-h-screen bg-[#050507] px-6 py-24 select-text">
      <div className="max-w-3xl mx-auto">
        <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-bold mb-4">Legal</p>
        <h1 className="text-white text-4xl md:text-5xl font-black uppercase mb-2" style={{ fontFamily: "var(--font-bebas)" }}>Terms of Service</h1>
        <p className="text-white/30 text-sm mb-12">Last updated: June 11, 2026</p>

        <div className="space-y-10 text-white/55 text-sm leading-relaxed">
          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">1. Agreement</h2>
            <p>By accessing or using the website and services of AX Media (the AI automation brand of AXMATEA MEDIA CORP, a Florida corporation), you agree to be bound by these Terms of Service. If you do not agree, do not use our services.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">2. Services</h2>
            <p>AX Media provides AI automation services including lead generation systems, content automation, and operations infrastructure. Specific deliverables, timelines, and payment terms are governed by individual service agreements.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">3. Intellectual Property</h2>
            <p>Upon full payment, clients receive full ownership of custom-built systems and code. AX Media retains the right to use anonymized performance data for internal research and marketing.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">4. Confidentiality</h2>
            <p>Both parties agree to keep confidential all proprietary information shared during the engagement. This includes business data, system architecture, and client lists.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">5. Limitation of Liability</h2>
            <p>The total liability of AX Media for any claim shall not exceed the total fees paid in the three months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">6. Acceptable Use</h2>
            <p>You may not use our services for:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-white/45">
              <li>Spam or unsolicited communications in violation of applicable law</li>
              <li>Deceptive, fraudulent, or illegal activities</li>
              <li>Violating third-party rights or platform terms of service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">7. Termination</h2>
            <p>Either party may terminate a service agreement with 30 days written notice. AX Media may terminate immediately for material breach or non-payment.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">8. Governing Law</h2>
            <p>These Terms are governed by applicable law. Disputes shall be resolved through binding arbitration before pursuing litigation.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">9. Contact</h2>
            <p>Legal inquiries: <a href="mailto:info@aimedia.global" className="text-white/70 hover:text-[#FF2D55] transition-colors underline-offset-4 hover:underline">info@aimedia.global</a></p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/6">
          <Link href="/" className="text-[#FF2D55] text-sm hover:underline underline-offset-4">← Back to home</Link>
        </div>
      </div>
    </main>
  )
}
