"use client"

import { m, useReducedMotion } from "motion/react"
import { CalendarCheck, Mail, MessageCircleReply, Send, Users } from "lucide-react"
import { CountUp } from "@/components/ui/count-up"

const FUNNEL_STAGES = [
  { icon: Users, label: "Prospects identified", value: "12,847", width: "100%" },
  { icon: Mail, label: "Prospect emails", value: "3,216", width: "76%" },
  { icon: Send, label: "Contacted", value: "1,840", width: "57%" },
  { icon: MessageCircleReply, label: "Replies", value: "634", width: "35%" },
  { icon: CalendarCheck, label: "Meetings booked", value: "187", width: "19%" },
] as const

export function LeadFunnel() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="gtm-engine" aria-label="Illustrative go-to-market pipeline">
      <div className="gtm-engine__header">
        <div>
          <p className="gtm-engine__kicker">Outbound engine</p>
          <p className="gtm-engine__title">Illustrative pipeline</p>
        </div>
        <span className="gtm-engine__state"><i aria-hidden /> System running</span>
      </div>

      <div className="gtm-engine__flow" role="list">
        {FUNNEL_STAGES.map((stage, index) => {
          const Icon = stage.icon

          return (
            <m.div
              key={stage.label}
              role="listitem"
              className="gtm-engine__stage"
              style={{ "--stage-delay": `${index * 0.13}s` } as React.CSSProperties}
              initial={reduceMotion ? false : { opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 0.48, delay: index * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <span className="gtm-engine__icon"><Icon size={15} strokeWidth={1.8} /></span>
              <span className="gtm-engine__copy">
                <span className="gtm-engine__label">{stage.label}</span>
                <span className="gtm-engine__bar" aria-hidden>
                  <m.span
                    initial={reduceMotion ? { width: stage.width } : { width: 0 }}
                    whileInView={{ width: stage.width }}
                    viewport={{ once: true, amount: 0.45 }}
                    transition={{ duration: 0.95, delay: 0.2 + index * 0.11, ease: [0.16, 1, 0.3, 1] }}
                  />
                </span>
              </span>
              <strong className="gtm-engine__value"><CountUp value={stage.value} duration={1200} /></strong>
            </m.div>
          )
        })}
      </div>

      <div className="gtm-engine__footer">
        <span><i aria-hidden /> Representative operating state</span>
        <span>Human approval before send</span>
      </div>
    </div>
  )
}
