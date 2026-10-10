import type { Metadata } from "next"
import Link from "next/link"
import { WorkflowDemo } from "./workflow-demo"
import s from "./preview.module.css"

export const metadata: Metadata = {
  title: "Design preview",
  description: "An isolated AX Media interface study. AI systems for the way your business works.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/design-preview" },
}

const Arrow = () => <span aria-hidden="true">↗</span>
const systems = [
  { no: "01", name: "Go-to-market", detail: "A clearer path from buyer signal to qualified conversation.", flow: ["Research", "Enrich", "Review", "CRM"], href: "/systems/qualified-pipeline" },
  { no: "02", name: "Content systems", detail: "Research, creation, approvals and distribution. One connected workflow.", flow: ["Brief", "Create", "Approve", "Publish"], href: "#workflow" },
  { no: "03", name: "Business platforms", detail: "Client portals and operations tools, built around how your team works.", flow: ["Connect", "Coordinate", "Deliver"], href: "#workflow" },
]

export default function DesignPreview() {
  return (
    <main className={s.page}>
      <a className={s.skip} href="#main-content">Skip to content</a>
      <header className={s.header}>
        <Link href="/" className={s.wordmark} aria-label="AX Media home">AX<span>MEDIA</span><i aria-hidden="true" /></Link>
        <nav aria-label="Main navigation" className={s.nav}>
          <a href="#systems">Systems</a><a href="#workflow">How it works</a><a href="#questions">Questions</a>
        </nav>
        <Link prefetch={false} href="/#booking" className={s.navCta}>Let’s talk <Arrow /></Link>
      </header>

      <section id="main-content" className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroTopline}><span><i /> AI SYSTEMS. BUILT FOR BUSINESS.</span><span className={s.edition}>AX / 001</span></div>
        <div className={s.heroGrid}>
          <div className={s.heroCopy}>
            <h1 id="hero-title">Intelligence,<br /><span>put to work.</span></h1>
            <p>We build AI systems that connect your tools, move work forward, and keep your team in control.</p>
            <div className={s.heroActions}>
              <Link prefetch={false} href="/#booking" className={s.button}>Book a call <Arrow /></Link>
              <a href="#systems" className={s.textLink}>Explore the systems <span aria-hidden="true">↓</span></a>
            </div>
            <div className={s.heroFootnote}>For founders, ambitious teams<br />and businesses ready to move.</div>
          </div>
          <WorkflowDemo />
        </div>
        <div className={s.heroBottom}><span>YOUR STACK. YOUR WORKFLOW. YOUR SYSTEM.</span><a href="#systems" aria-label="Scroll to systems">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></a></div>
      </section>

      <section className={s.integrations} aria-label="Tools we connect">
        <p>Connected to the<br />tools you already use</p>
        <ul><li>OpenAI</li><li>n8n</li><li>HubSpot</li><li>Notion</li><li>Slack</li><li>Airtable</li></ul>
      </section>

      <section id="systems" className={s.systems} aria-labelledby="systems-title">
        <div className={s.sectionLabel}><span>01 / WHAT WE BUILD</span><span>FOCUSED SYSTEMS. CONNECTED WORK.</span></div>
        <div className={s.sectionIntro}><h2 id="systems-title">Less busywork.<br />More business.</h2><p>Start with the work that slows you down.<br />Build the system that moves it forward.</p></div>
        <div className={s.systemRows}>
          {systems.map((item) => <article key={item.no} className={s.systemRow}>
            <span className={s.systemNumber}>{item.no}</span>
            <div><h3>{item.name}</h3><p>{item.detail}</p><ol className={s.miniFlow}>{item.flow.map((step) => <li key={step}>{step}</li>)}</ol></div>
            <Link href={item.href} prefetch={false} className={s.circleLink} aria-label={`Explore ${item.name.toLowerCase()}`}><Arrow /></Link>
          </article>)}
        </div>
      </section>

      <section id="workflow" className={s.method} aria-labelledby="method-title">
        <div className={s.sectionLabel}><span>02 / HOW IT WORKS</span><span>HUMAN DIRECTION. AI EXECUTION.</span></div>
        <div className={s.methodGrid}>
          <div><h2 id="method-title">A system that fits.<br /><span>A team in control.</span></h2><p>AI works best when it has a clear job. We connect the right capabilities to your existing tools, with explicit handoffs and review where it matters.</p><Link prefetch={false} href="/#booking" className={s.textLink}>Talk through your workflow <Arrow /></Link></div>
          <ol className={s.principles}>
            <li><span>01</span><div><h3>Designed around the work</h3><p>Map the workflow, find the friction, and define what a useful outcome looks like.</p></div></li>
            <li><span>02</span><div><h3>Connected to your stack</h3><p>Bring tools, data and handoffs together without adding another disconnected process.</p></div></li>
            <li><span>03</span><div><h3>Built for human oversight</h3><p>Review queues and clear approval points keep consequential decisions with your team.</p></div></li>
          </ol>
        </div>
      </section>

      <section id="questions" className={s.questions} aria-labelledby="questions-title">
        <div><span className={s.eyebrow}>03 / A FEW ANSWERS</span><h2 id="questions-title">Good questions.</h2></div>
        <div className={s.faqs}>
          <details><summary>What should we automate first?<span aria-hidden="true">+</span></summary><p>Start with a repeated workflow that has clear inputs, a measurable outcome and someone responsible for reviewing the result. We’ll use the first conversation to identify the right starting point.</p></details>
          <details><summary>Can you work with our existing tools?<span aria-hidden="true">+</span></summary><p>Yes. We design around the tools your team already uses. Available integrations, data access and constraints are checked before the build is scoped.</p></details>
          <details><summary>Where does our team stay involved?<span aria-hidden="true">+</span></summary><p>At the points that need judgment, review or approval. The system can prepare and coordinate work while your team retains control over consequential actions.</p></details>
        </div>
      </section>

      <section className={s.contact} aria-labelledby="contact-title"><span className={s.eyebrow}>A BETTER WAY TO WORK STARTS HERE.</span><div><h2 id="contact-title">What could your<br />business do next?</h2><Link prefetch={false} href="/#booking" className={s.button}>Let’s find out <Arrow /></Link></div></section>
      <footer className={s.footer}><Link href="/" className={s.wordmark} aria-label="AX Media home">AX<span>MEDIA</span><i aria-hidden="true" /></Link><span>AI SYSTEMS FOR AMBITIOUS BUSINESSES.</span><nav aria-label="Legal"><Link href="/privacy-policy">Privacy</Link><Link href="/legal">Legal</Link></nav></footer>
      <div className={s.previewNote}>Isolated design preview · Booking links use the existing site flow</div>
    </main>
  )
}
