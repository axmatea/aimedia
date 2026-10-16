"use client"

import type { ButtonHTMLAttributes, ComponentProps } from "react"
import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import styles from "./action-button.module.css"

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  compact?: boolean
  showArrow?: boolean
}

/** Native, CSS-only booking action. No decorative rendering loop or GPU context. */
export function ActionButton({
  label,
  compact = false,
  showArrow = true,
  className,
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      className={cn(styles.action, styles.primary, compact && styles.compact, className)}
      {...props}
    >
      <span>{label}</span>
      {showArrow ? <ArrowRight size={16} className={styles.arrow} aria-hidden="true" /> : null}
    </button>
  )
}

type ExperienceLinkProps = Omit<ComponentProps<typeof Link>, "children"> & {
  label: string
}

/** A deliberately quieter route into the optional, heavier experience. */
export function ExperienceLink({ label, className, ...props }: ExperienceLinkProps) {
  return (
    <Link className={cn(styles.action, styles.secondary, className)} {...props}>
      <span>{label}</span>
      <ArrowUpRight size={16} className={styles.arrow} aria-hidden="true" />
    </Link>
  )
}

export const themeControlClassName = styles.themeControl
