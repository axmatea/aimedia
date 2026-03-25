"use client"

import { useId } from "react"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { MoonIcon, SunIcon } from "lucide-react"

export default function ThemeToggle() {
  const id = useId()
  const { theme, setTheme } = useTheme()
  const isDark = theme !== "light"

  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/20 bg-white/8 hover:border-white/40 hover:bg-white/12 transition-all shadow-lg shadow-black/20">
      <SunIcon
        className={cn("size-4 cursor-pointer transition-colors", isDark ? "text-white/40" : "text-yellow-300")}
        onClick={() => setTheme("light")}
        aria-hidden="true"
      />
      <Switch
        id={id}
        checked={isDark}
        onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
      <MoonIcon
        className={cn("size-4 cursor-pointer transition-colors", isDark ? "text-white" : "text-white/40")}
        onClick={() => setTheme("dark")}
        aria-hidden="true"
      />
    </div>
  )
}
