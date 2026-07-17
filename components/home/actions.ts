"use client"

/**
 * Tiny client-side actions shared by the interactive islands (v7.2).
 * Client-only module: touches window and the Lenis instance.
 */

import { lenisScrollTo } from "@/components/providers/SmoothScroll"

export const scrollToId = (id: string) => lenisScrollTo(`#${id}`)

// Opens the native <dialog> booking modal from anywhere (decoupled from component trees)
export const openBooking = () => window.dispatchEvent(new Event("open-booking"))
