"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "lucide-react"

import { themeControlClassName } from "@/components/ui/action-button"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false)
  const isDark = !mounted || theme !== "light"
  const nextTheme = isDark ? "light" : "dark"
  const label = `Switch to ${nextTheme} mode`

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      onClick={() => setTheme(nextTheme)}
      className={themeControlClassName}
    >
      {isDark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
    </button>
  )
}
