"use client"

import React from 'react';
import { motion } from 'motion/react';

const CircularBadge = () => (
  <div className="relative w-28 h-28 md:w-36 md:h-36 bg-white rounded-full flex items-center justify-center shadow-2xl rotate-12 hover:scale-105 transition-transform cursor-pointer border border-white/10">
    <div className="absolute inset-1 animate-[spin_12s_linear_infinite]">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path id="circlePath" d="M 50, 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" fill="none" />
        <text className="text-[10px] font-black tracking-[0.2em] uppercase" fill="#09090B">
          <textPath href="#circlePath" startOffset="0%">
            BOOK A CALL • GET STARTED • BOOK A CALL •
          </textPath>
        </text>
      </svg>
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#09090B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17L17 7M17 7H7M17 7V17" />
      </svg>
    </div>
  </div>
);

const PulsingDot = () => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8FF60] opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C8FF60]"></span>
  </span>
);

export const Component = () => {
  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col font-sans selection:bg-white/20 selection:text-white relative overflow-hidden w-full">

      {/* Subtle radial gradient background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-indigo-600/6 rounded-full blur-[100px]"></div>
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0"></div>

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-6 md:px-10 md:py-8 max-w-[1440px] mx-auto w-full">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[#09090B] font-black text-xs">AI</span>
            </div>
            <span className="text-white font-black text-sm tracking-tight uppercase">MEDIA</span>
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-1">
          {['Services', 'Case Studies', 'Process', 'Team'].map((item) => (
            <a key={item} href="#" className="px-4 py-1.5 rounded-full text-white/50 text-xs font-medium hover:text-white hover:bg-white/5 transition-all">
              {item}
            </a>
          ))}
        </div>

        {/* CTA Button */}
        <button className="px-5 py-2 rounded-full bg-white text-[#09090B] text-xs font-bold hover:bg-white/90 transition-colors shadow-lg">
          Book a Call
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 relative z-10 pt-8 pb-32 md:pt-12 md:pb-48 px-4 flex flex-col items-center justify-center w-full max-w-[1440px] mx-auto">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-10"
        >
          <PulsingDot />
          <span className="text-white/60 text-xs font-medium">Trusted by 200+ businesses worldwide</span>
        </motion.div>

        {/* Massive Typography */}
        <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center z-10 mb-16">
          <div className="w-full flex flex-col items-center relative z-10 space-y-1 md:space-y-2">

            {/* INTEGRATE */}
            <div className="w-full flex justify-start pl-[5%] md:pl-[15%] relative z-30">
              <h1
                className="text-[clamp(4rem,11vw,148px)] font-black leading-[0.88] tracking-tighter text-white/90 m-0 p-0 uppercase"
                style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}
              >
                INTEGRATE
              </h1>
            </div>

            {/* AI INTO */}
            <div className="w-full flex justify-center relative z-20">
              <h1
                className="text-[clamp(4.5rem,13vw,200px)] font-black leading-[0.88] tracking-tighter text-white m-0 p-0 uppercase"
                style={{
                  fontFamily: '"Arial Black", Impact, sans-serif',
                  WebkitTextStroke: '1px rgba(255,255,255,0.1)',
                }}
              >
                AI INTO
              </h1>
            </div>

            {/* EVERYTHING */}
            <div className="w-full flex justify-end pr-[5%] md:pr-[15%] relative z-10">
              <h1
                className="text-[clamp(3.5rem,10vw,140px)] font-black leading-[0.88] tracking-tighter text-white/40 m-0 p-0 uppercase"
                style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}
              >
                EVERYTHING
              </h1>
            </div>
          </div>

          {/* Floating Cards & Badge */}
          <div className="absolute inset-0 w-full h-full pointer-events-none">

            {/* AI Result Card — bottom left */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-[5%] left-[2%] md:left-[16%] z-30 pointer-events-auto"
            >
              <div className="bg-[#111113] border border-white/8 rounded-2xl p-4 shadow-2xl backdrop-blur-sm w-52 md:w-60 rotate-[-6deg] hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                      <polyline points="17 6 23 6 23 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-white/50 text-[10px] font-medium uppercase tracking-wider">Revenue Impact</span>
                </div>
                <p className="text-white font-black text-2xl mb-0.5">+340%</p>
                <p className="text-white/30 text-[10px]">avg. client growth in 90 days</p>
              </div>
            </motion.div>

            {/* AI Leads Card — top right */}
            <motion.div
              animate={{ y: [0, -16, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-[10%] right-[2%] md:right-[18%] z-30 pointer-events-auto"
            >
              <div className="bg-[#111113] border border-white/8 rounded-2xl p-4 shadow-2xl backdrop-blur-sm w-52 md:w-60 rotate-[6deg] hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-violet-500/15 rounded-lg flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"></path>
                    </svg>
                  </div>
                  <span className="text-white/50 text-[10px] font-medium uppercase tracking-wider">Leads Automated</span>
                </div>
                <p className="text-white font-black text-2xl mb-0.5">2,847<span className="text-white/30 text-lg font-normal">/day</span></p>
                <p className="text-white/30 text-[10px]">outreach on autopilot</p>
              </div>
            </motion.div>

            {/* Circular Badge */}
            <div className="absolute bottom-[-8%] right-[2%] md:right-[12%] z-40 pointer-events-auto">
              <CircularBadge />
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-white/40 text-sm md:text-base max-w-md text-center leading-relaxed mb-8 relative z-20"
        >
          We build custom AI systems that automate lead generation, content, and operations for fast-moving B2B companies.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex gap-3 relative z-20"
        >
          <button className="px-8 py-3 bg-white text-[#09090B] font-bold text-sm rounded-full hover:bg-white/90 transition-colors shadow-xl">
            Start for free
          </button>
          <button className="px-8 py-3 border border-white/15 text-white/70 font-medium text-sm rounded-full hover:bg-white/5 hover:text-white transition-all">
            See our work →
          </button>
        </motion.div>
      </main>

      {/* Bottom Services Section */}
      <section className="bg-[#0D0D10] border-t border-white/5 text-white rounded-t-[2rem] md:rounded-t-[3rem] px-6 py-12 md:px-10 md:py-16 relative z-20 w-full">
        <div className="max-w-6xl mx-auto">
          <p className="text-white/25 text-[10px] uppercase tracking-[0.3em] font-bold mb-8 text-center">What we build</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Card 1 */}
            <div className="bg-[#111113] border border-white/6 rounded-2xl p-7 flex flex-col gap-4 hover:border-white/12 transition-colors group">
              <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center group-hover:bg-violet-500/15 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-base mb-1.5">Lead Generation AI</h3>
                <p className="text-white/35 text-xs leading-relaxed">Scrape, enrich, and contact thousands of qualified leads on autopilot every single day.</p>
              </div>
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/5">
                <span className="text-white/20 text-[10px] font-mono">Apify • Clay • Instantly</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#111113] border border-white/6 rounded-2xl p-7 flex flex-col gap-4 hover:border-white/12 transition-colors group">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/15 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-base mb-1.5">Content at Scale</h3>
                <p className="text-white/35 text-xs leading-relaxed">AI-generated video scripts, thumbnails, email sequences, and social content — personalized at volume.</p>
              </div>
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/5">
                <span className="text-white/20 text-[10px] font-mono">Claude • GPT-4 • Remotion</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#111113] border border-white/6 rounded-2xl p-7 flex flex-col gap-4 hover:border-white/12 transition-colors group">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/15 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-base mb-1.5">Operations Automation</h3>
                <p className="text-white/35 text-xs leading-relaxed">From onboarding to reporting — replace manual workflows with AI agents that run 24/7 without error.</p>
              </div>
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/5">
                <span className="text-white/20 text-[10px] font-mono">n8n • Modal • Trigger.dev</span>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};
