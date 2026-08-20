"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ArrowUpRight, Moon, Sun } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import styles from "./inquiry-hero.module.css"

const INQUIRY_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4"

function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (motionPreference.matches) {
      const frame = requestAnimationFrame(() => {
        setDisplayed(text)
        setDone(true)
      })
      return () => cancelAnimationFrame(frame)
    }

    let interval: ReturnType<typeof setInterval> | undefined
    const delay = setTimeout(() => {
      let index = 0
      interval = setInterval(() => {
        index += 1
        setDisplayed(text.slice(0, index))
        if (index >= text.length) {
          if (interval) clearInterval(interval)
          setDone(true)
        }
      }, speed)
    }, startDelay)

    return () => {
      clearTimeout(delay)
      if (interval) clearInterval(interval)
    }
  }, [speed, startDelay, text])

  return { displayed, done }
}

type AnimatedInquiryHeroProps = {
  continuous?: boolean
}

export function AnimatedInquiryHero({ continuous = false }: AnimatedInquiryHeroProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [darkMode, setDarkMode] = useState(continuous)
  const { displayed, done } = useTypewriter("build what's\nmissing.", 38, 420)

  useEffect(() => {
    const section = sectionRef.current
    const video = videoRef.current
    if (!section || !video) return

    const mobile = window.matchMedia("(max-width: 1023px)")
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let visible = false
    let previousX: number | null = null
    let targetTime = 0
    let frame: number | null = null

    const stopFrame = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
    }

    const settle = () => {
      frame = null
      if (mobile.matches || reduceMotion.matches || !visible || !Number.isFinite(video.duration)) return
      const distance = targetTime - video.currentTime
      if (Math.abs(distance) < 1 / 90) return
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + distance * 0.22))
      frame = requestAnimationFrame(settle)
    }

    const requestSettle = () => {
      if (frame === null) frame = requestAnimationFrame(settle)
    }

    const onMouseMove = (event: MouseEvent) => {
      if (mobile.matches || reduceMotion.matches || !visible || !Number.isFinite(video.duration)) return
      if (previousX === null) {
        previousX = event.clientX
        targetTime = video.currentTime
        return
      }

      const delta = event.clientX - previousX
      previousX = event.clientX
      targetTime = Math.max(0, Math.min(video.duration, targetTime + (delta / window.innerWidth) * 0.8 * video.duration))
      requestSettle()
    }

    const syncPlaybackMode = () => {
      previousX = null
      stopFrame()
      if (reduceMotion.matches || !visible || document.hidden) {
        video.pause()
        return
      }
      if (mobile.matches) {
        void video.play().catch(() => undefined)
      } else {
        video.pause()
        targetTime = video.currentTime
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting)
      syncPlaybackMode()
    }, { threshold: 0.16 })

    const onVisibility = () => syncPlaybackMode()
    const onBlur = () => { previousX = null }
    const onSeeked = () => requestSettle()

    observer.observe(section)
    window.addEventListener("mousemove", onMouseMove, { passive: true })
    window.addEventListener("blur", onBlur)
    document.addEventListener("visibilitychange", onVisibility)
    mobile.addEventListener?.("change", syncPlaybackMode)
    reduceMotion.addEventListener?.("change", syncPlaybackMode)
    video.addEventListener("loadedmetadata", syncPlaybackMode)
    video.addEventListener("seeked", onSeeked)

    return () => {
      stopFrame()
      observer.disconnect()
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("blur", onBlur)
      document.removeEventListener("visibilitychange", onVisibility)
      mobile.removeEventListener?.("change", syncPlaybackMode)
      reduceMotion.removeEventListener?.("change", syncPlaybackMode)
      video.removeEventListener("loadedmetadata", syncPlaybackMode)
      video.removeEventListener("seeked", onSeeked)
      video.pause()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="inquiry"
      aria-labelledby="inquiry-heading"
      className={`${styles.inquiry} ${darkMode ? styles.dark : styles.light} ${continuous ? styles.continuous : ""}`}
    >
      <button
        type="button"
        className={styles.modeToggle}
        onClick={() => setDarkMode((current) => !current)}
        aria-label={darkMode ? "Switch inquiry to light mode" : "Switch inquiry to dark mode"}
        aria-pressed={darkMode}
      >
        <span>{darkMode ? "Light" : "Dark"}</span>
        {darkMode ? <Sun aria-hidden /> : <Moon aria-hidden />}
      </button>

      <div className={styles.copyPanel}>
        <div className={styles.copyInner}>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.eyebrow}>Start a project</span>
            <h2 id="inquiry-heading" className={styles.headline}>
              {displayed}
              {!done && <span className={styles.cursor} aria-hidden />}
            </h2>
          </motion.div>

          <motion.p
            className={styles.description}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            Describe the system. We&apos;ll review the context and define the scope.
          </motion.p>

          <div className={styles.secondaryActions}>
            <Link href="/#booking" className={styles.primaryCta}>Book a Call <ArrowUpRight aria-hidden /></Link>
            <a href="mailto:info@aimedia.global">info@aimedia.global</a>
          </div>
        </div>
      </div>

      <div className={styles.mediaPanel} aria-hidden>
        <video
          ref={videoRef}
          className={styles.video}
          muted
          playsInline
          preload="auto"
          loop
          poster="/animated/posters/inquiry-entity.jpg"
          disablePictureInPicture
        >
          <source src={INQUIRY_VIDEO} type="video/mp4" />
        </video>
        <div className={styles.mediaWash} />
        <span className={styles.scrubHint}>Move to explore</span>
      </div>
    </section>
  )
}
