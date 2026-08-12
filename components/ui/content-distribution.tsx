"use client"

import { m, useReducedMotion } from "motion/react"
import Image from "next/image"
import { FileText, Sparkles } from "lucide-react"
import { AIUGCCreators } from "@/components/ui/animated-tooltip"
import { CountUp } from "@/components/ui/count-up"

const CHANNELS = [
  { icon: "/logos/linkedin.svg", name: "LinkedIn", cadence: "3 posts", detail: "Founder POV + carousel" },
  { icon: null, name: "X", cadence: "5 posts", detail: "Thread + short-form" },
  { icon: "/logos/instagram.svg", name: "Instagram", cadence: "3 posts", detail: "Carousel + reel" },
  { icon: "/logos/youtube.svg", name: "YouTube Shorts", cadence: "2 shorts", detail: "Vertical video" },
] as const

export function ContentDistribution() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="content-engine" aria-label="Illustrative cross-platform content workflow">
      <div className="content-engine__header">
        <div>
          <p className="content-engine__kicker">Content operating system</p>
          <p className="content-engine__title">Illustrative weekly run</p>
        </div>
        <span className="content-engine__total"><strong><CountUp value="13" duration={900} /></strong> scheduled</span>
      </div>

      <div className="content-engine__path">
        <m.div
          className="content-engine__node content-engine__source"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <span className="content-engine__node-icon"><FileText size={16} /></span>
          <span><small>One source</small><strong>Strategy brief</strong></span>
          <em>01</em>
        </m.div>

        <span className="content-engine__connector" aria-hidden><i /></span>

        <m.div
          className="content-engine__node content-engine__transform"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <span className="content-engine__node-icon"><Sparkles size={16} /></span>
          <span><small>Transformation</small><strong>Channel-ready formats</strong></span>
          <span className="content-engine__processing"><i aria-hidden /> Adapting</span>
        </m.div>
      </div>

      <div className="content-engine__distribution" aria-hidden><i /></div>

      <div className="content-engine__channels" role="list" aria-label="Scheduled channels">
        {CHANNELS.map((channel, index) => {
          return (
            <m.div
              key={channel.name}
              role="listitem"
              className="content-engine__channel"
              style={{ "--channel-delay": `${index * 0.55}s` } as React.CSSProperties}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: 0.2 + index * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <span className="content-engine__channel-icon">
                {channel.icon ? <Image src={channel.icon} width={15} height={15} alt="" aria-hidden /> : <b aria-hidden>𝕏</b>}
              </span>
              <span className="content-engine__channel-copy">
                <strong>{channel.name}</strong>
                <small>{channel.detail}</small>
              </span>
              <span className="content-engine__cadence"><i aria-hidden />{channel.cadence}</span>
            </m.div>
          )
        })}
      </div>

      <div className="content-engine__team">
        <div className="content-engine__team-copy">
          <small>Format team</small>
          <strong>Five illustrative AI personas</strong>
        </div>
        <AIUGCCreators compact />
      </div>
    </div>
  )
}
