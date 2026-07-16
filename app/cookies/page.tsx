import Link from "next/link"

export default function CookiePreferences() {
  return (
    <main className="min-h-screen bg-[#050507] px-6 py-24 select-text">
      <div className="max-w-3xl mx-auto">
        <p className="text-white/55 text-[10px] uppercase tracking-[0.3em] font-bold mb-4">Legal</p>
        <h1 className="text-white text-4xl md:text-5xl font-black uppercase mb-2" style={{ fontFamily: "var(--font-bebas)" }}>Cookie Preferences</h1>
        <p className="text-white/55 text-sm mb-12">Last updated: June 11, 2026</p>

        <div className="space-y-10 text-white/55 text-sm leading-relaxed">
          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">What Are Cookies?</h2>
            <p>Cookies are small text files placed on your device when you visit our website. They help us provide a better experience and understand how our site is used.</p>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">Cookies We Use</h2>
            <div className="space-y-4">
              {[
                { name: "Strictly Necessary", desc: "Essential for the website to function. Cannot be disabled. Examples: session tokens, security cookies.", required: true },
                { name: "Analytics", desc: "Help us understand how visitors interact with our site (page views, traffic sources). All data is anonymized.", required: false },
                { name: "Functional", desc: "Remember your preferences such as dark/light mode and language settings.", required: false },
                { name: "Third-Party", desc: "Set by services like Cal.com when you interact with booking widgets.", required: false },
              ].map((c) => (
                <div key={c.name} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-white/6 bg-white/[0.02]">
                  <div>
                    <p className="text-white/75 font-bold text-sm mb-1">{c.name}</p>
                    <p className="text-white/55 text-xs">{c.desc}</p>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.required ? "bg-[#C8FF60]/10 text-[#C8FF60]" : "bg-white/10 text-white/60"}`}>
                    {c.required ? "Required" : "Optional"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">Managing Cookies</h2>
            <p>You can control cookies through your browser settings. Note that disabling certain cookies may affect website functionality. Most browsers allow you to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-white/60">
              <li>View cookies stored on your device</li>
              <li>Delete all or specific cookies</li>
              <li>Block third-party cookies</li>
              <li>Set preferences for specific sites</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white/85 font-bold text-base mb-3 uppercase tracking-wider">Contact</h2>
            <p>Questions? Email us at <a href="mailto:info@aimedia.global" className="text-white/70 hover:text-[#FF2D55] transition-colors underline-offset-4 hover:underline">info@aimedia.global</a></p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/6">
          <Link href="/" className="text-[#FF2D55] text-sm hover:underline underline-offset-4">← Back to home</Link>
        </div>
      </div>
    </main>
  )
}
