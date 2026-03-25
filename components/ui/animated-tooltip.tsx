"use client"
import { motion, useTransform, useMotionValue, useSpring } from "motion/react"

type AICreator = {
  id: number
  name: string
  niche: string
  image: string
  followers: string
}

const TooltipItem = ({ item }: { item: AICreator }) => {
  const x = useMotionValue(0)
  const rotate = useSpring(useTransform(x, [-100, 100], [-20, 20]), { stiffness: 120, damping: 18 })
  const translateX = useSpring(useTransform(x, [-100, 100], [-40, 40]), { stiffness: 120, damping: 18 })

  return (
    <div className="group relative">
      <motion.div
        style={{ translateX, rotate }}
        className="pointer-events-none absolute -top-20 left-1/2 hidden -translate-x-1/2 flex-col items-center rounded-xl border border-white/10 bg-[#0C0C0F] px-4 py-2.5 shadow-2xl group-hover:flex z-50"
      >
        <p className="whitespace-nowrap text-xs font-bold text-white">{item.name}</p>
        <p className="whitespace-nowrap text-[10px] text-white/50 mt-0.5">{item.niche}</p>
        <p className="whitespace-nowrap text-[10px] text-[#C8FF60] font-mono mt-1">{item.followers} followers</p>
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#0C0C0F] border-r border-b border-white/10" />
      </motion.div>
      <img
        onMouseMove={(e) => x.set(e.nativeEvent.offsetX - e.currentTarget.offsetWidth / 2)}
        onMouseLeave={() => x.set(0)}
        src={item.image}
        alt={item.name}
        width={48}
        height={48}
        className="h-12 w-12 rounded-full object-cover object-top border-2 border-white/10 transition duration-300 group-hover:z-30 group-hover:scale-110 group-hover:border-[#FF2D55]/60"
      />
      <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#C8FF60] border-2 border-[#0C0C0F] flex items-center justify-center">
        <span className="text-[6px] font-black text-[#050507]">AI</span>
      </span>
    </div>
  )
}

export function AIUGCCreators() {
  const creators: AICreator[] = [
    { id: 1, name: "Zara.AI", niche: "Lifestyle & Wellness", image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80", followers: "284K" },
    { id: 2, name: "Marcus.AI", niche: "Tech & Startups", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80", followers: "512K" },
    { id: 3, name: "Aria.AI", niche: "Fashion & Beauty", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80", followers: "1.2M" },
    { id: 4, name: "Dev.AI", niche: "Finance & Crypto", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80", followers: "389K" },
    { id: 5, name: "Luna.AI", niche: "Travel & Food", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80", followers: "741K" },
  ]

  return (
    <div className="flex items-center -space-x-3">
      {creators.map((item) => (
        <TooltipItem key={item.id} item={item} />
      ))}
      <div className="relative ml-2 h-12 w-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
        <span className="text-white/30 text-lg font-light">+</span>
      </div>
    </div>
  )
}

export default AIUGCCreators
