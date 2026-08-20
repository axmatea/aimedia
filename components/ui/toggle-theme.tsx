"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "lucide-react"

import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false)
  const isDark = !mounted || theme !== "light"
  const nextTheme = isDark ? "light" : "dark"
  const label = `Switch to ${nextTheme} mode`

  return (
    <LiquidMetalButton
      viewMode="icon"
      label={label}
      title={label}
      pressed={isDark}
      onClick={() => setTheme(nextTheme)}
      className="nav-theme-metal"
      icon={isDark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
    />
  )
}
