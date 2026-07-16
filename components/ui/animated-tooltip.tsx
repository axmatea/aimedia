"use client"
import { useEffect, useState } from "react"
import { motion, useTransform, useMotionValue, useSpring, useReducedMotion } from "motion/react"

type AICreator = {
  id: number
  name: string
  niche: string
  image: string
  followers: string
  /** Illustrative activity loop for the "now creating" line (demo personas). */
  creating: string[]
}

// 256px source for crisp rendering at 56px on 2-3x retina displays
const CREATORS: AICreator[] = [
  { id: 1, name: "Zara.AI", niche: "Lifestyle & Wellness", image: "/creators/zara.jpg", followers: "284K", creating: ["morning routine reel", "7-day wellness carousel", "story poll for launch week"] },
  { id: 2, name: "Marcus.AI", niche: "Tech & Startups", image: "/creators/marcus.jpg", followers: "512K", creating: ["product teardown thread", "founder story script", "launch-day recap post"] },
  { id: 3, name: "Aria.AI", niche: "Fashion & Beauty", image: "/creators/aria.jpg", followers: "1.2M", creating: ["lookbook carousel", "get-ready-with-me script", "trend react short"] },
  { id: 4, name: "Dev.AI", niche: "Finance & Crypto", image: "/creators/dev.jpg", followers: "389K", creating: ["market recap thread", "explainer short: staking", "chart breakdown post"] },
  { id: 5, name: "Luna.AI", niche: "Travel & Food", image: "/creators/luna.jpg", followers: "741K", creating: ["street food mini-vlog", "hidden gems carousel", "recipe hook variants"] },
]

const TooltipItem = ({
  item,
  index,
  active,
  onToggle,
}: {
  item: AICreator
  index: number
  active: boolean
  onToggle: () => void
}) => {
  const reduceMotion = useReducedMotion()
  const x = useMotionValue(0)
  const rotate = useSpring(useTransform(x, [-100, 100], [-20, 20]), { stiffness: 120, damping: 18 })
  const translateX = useSpring(useTransform(x, [-100, 100], [-40, 40]), { stiffness: 120, damping: 18 })

  return (
    <motion.div
      className="group relative creator-float"
      style={{ "--i": index } as React.CSSProperties}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.6, y: 10 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <motion.div
        style={{ translateX, rotate }}
        className="pointer-events-none absolute -top-20 left-1/2 hidden -translate-x-1/2 flex-col items-center rounded-xl border border-white/10 bg-[#0C0C0F] px-4 py-2.5 shadow-2xl group-hover:flex z-50"
      >
        <p className="whitespace-nowrap text-xs font-bold text-white">{item.name}</p>
        <p className="whitespace-nowrap text-[10px] text-white/65 mt-0.5">{item.niche}</p>
        <p className="whitespace-nowrap text-[10px] text-[#C8FF60] font-mono mt-1">{item.followers} followers</p>
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#0C0C0F] border-r border-b border-white/10" />
      </motion.div>
      {/* Tap/click selects the creator: pulse ring + pinned "now creating" line */}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        aria-label={`${item.name}, ${item.niche}`}
        className="relative block rounded-full focus-visible:outline-2 focus-visible:outline-[#FF2D55] focus-visible:outline-offset-2 cursor-pointer"
      >
        {active && (
          <span
            aria-hidden
            className="absolute -inset-1 rounded-full border-2 border-[#FF2D55]/70 animate-[ping_2.2s_ease-in-out_infinite]"
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          onMouseMove={(e) => x.set(e.nativeEvent.offsetX - e.currentTarget.offsetWidth / 2)}
          onMouseLeave={() => x.set(0)}
          src={item.image}
          alt={item.name}
          width={56}
          height={56}
          loading="lazy"
          className={`h-14 w-14 rounded-full object-cover object-top border-2 transition duration-300 group-hover:z-30 group-hover:scale-110 group-hover:border-[#FF2D55]/60 ${
            active ? "z-30 scale-110 border-[#FF2D55]" : "border-white/10"
          }`}
        />
        <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#C8FF60] border-2 border-[#0C0C0F] flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite]">
          <span className="text-[6px] font-black text-[#050507]">AI</span>
        </span>
      </button>
    </motion.div>
  )
}

export function AIUGCCreators() {
  const reduceMotion = useReducedMotion()
  // null = auto-cycle through the team; a tap pins one creator (tap again to unpin)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const t = setInterval(() => setTick((v) => v + 1), 3200)
    return () => clearInterval(t)
  }, [reduceMotion])

  const activeCreator =
    selectedId !== null
      ? CREATORS.find((c) => c.id === selectedId) ?? CREATORS[0]
      : CREATORS[tick % CREATORS.length]
  const task = activeCreator.creating[tick % activeCreator.creating.length]

  return (
    <div>
      <div className="flex items-center -space-x-3">
        {CREATORS.map((item, index) => (
          <TooltipItem
            key={item.id}
            item={item}
            index={index}
            active={selectedId === item.id}
            onToggle={() => setSelectedId((cur) => (cur === item.id ? null : item.id))}
          />
        ))}
        <div className="relative ml-2 h-14 w-14 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
          <span className="text-white/50 text-lg font-light">+</span>
        </div>
      </div>
      {/* Live micro-line: auto-cycles the team, or pins to the tapped creator */}
      <div className="mt-4 flex items-center gap-2 min-h-[18px]" aria-live="off">
        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF2D55] opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF2D55]" />
        </span>
        <motion.p
          key={`${activeCreator.id}-${task}`}
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          className="text-[10px] font-mono text-white/65 truncate"
        >
          <span className="text-white/90 font-bold">{activeCreator.name}</span>
          {" · now creating: "}
          {task}
        </motion.p>
      </div>
    </div>
  )
}

export default AIUGCCreators
