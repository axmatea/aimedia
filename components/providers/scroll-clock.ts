"use client"

// Keep the deferred chunk's dependency surface limited to Motion's shared clock.
export { frame, cancelFrame } from "motion/react"
