# Animation References — Research Findings (2026-06-11)

Read-only teardown of 3 references for the aimedia.global animation upgrade.
All findings VERIFIED from actual shipped JS/CSS bundles (static CDN snapshots at
`<jobid>.preview.static.emergentagent.com`), not guesses.

Context: all three references are by ONE author (Jo Mendes / NomadaToast). The Notion
page is the methodology; the two preview sites are its worked examples. The Notion page
links to both sites directly.

---

## 1. skeleton-rebuild.preview.emergentagent.com ("very cool animation")

Jo Mendes / NomadaToast creator portfolio. CRA React 18 build
(`main.0ab285cc.js`, 296 KB; `main.15470f16.css`, 72 KB).

**Verified stack: ZERO animation libraries.** No gsap, no framer-motion, no three.js,
no spline runtime, no lenis, no lottie. Just: 9 CSS @keyframes, 4 IntersectionObservers,
2 requestAnimationFrame loops, Tailwind + custom CSS.

### Standout effects (verified from code)

1. **Scroll-scrubbed fullscreen hero video (the "very cool animation").**
   - `#hero-zone` section is `h-[480vh] md:h-[520vh]` with a `sticky top-0 h-screen overflow-hidden` inner viewport.
   - A `fixed inset-0 z-0` background `<video muted playsInline preload="auto">` sits behind ALL content with layered CSS gradient fallbacks beneath it; video fades in `transition-opacity duration-700` on `loadedmetadata`; on error it silently stays on the gradients.
   - Scroll progress `p = clamp(-rect.top / (sectionHeight - viewportHeight), 0, 1)` maps to target video time `p * (duration - 4 - 0.1)`.
   - **The clever bit — no seek-thrash.** A rAF loop *chases* the target time instead of assigning `currentTime` every frame:
     - behind target → `playbackRate = clamp(6 * delta, 1, 16)` + `play()` (hardware-decoded forward playback = smooth)
     - ahead of target (scrolling up) → `pause()` + `fastSeek(target)` (fallback `currentTime`)
     - within 0.05 s dead-zone → `pause()` (idle, no work)
   - **Tail mode:** once the section bottom passes the viewport, the video loops its LAST 4 seconds at `playbackRate = 0.6` — an ambient living background for the rest of the page.

2. **Dual-speed mask-edged parallax text columns over the video.**
   - Left column (story stages, gaps 380–440 px): `transform: translate3d(0, ${-1600 * p}px, 0)`.
   - Right column (metadata rows): `translate3d(0, ${-900 * p}px, 0)` — different speed = depth illusion.
   - Both containers are `overflow-hidden` with `mask-image: linear-gradient(to bottom, transparent 0%, #000 14%, #000 80%, transparent 100%)` so text fades at edges instead of clipping. `will-change-transform` on the moving inner div only.

3. **Global one-shot reveal system.**
   - One IntersectionObserver (`threshold: 0.12`) over all `.reveal` elements; adds `.is-in`, then `unobserve`.
   - CSS: `.reveal { opacity:0; transform: translateY(24px); transition: opacity, transform .9s }` → `.is-in { opacity:1; translateY(0) }`.
   - Stagger via inline `style={{ transitionDelay: `${i * delay}ms` }}` per card.

4. **easeOutCubic stat count-up.** IO `threshold: 0.3` gate → rAF loop over 1600 ms with `1 - (1-t)^3`, regex-splits number from suffix and preserves decimal places (`"1.2M"` counts 0.0→1.2 keeping "M").

5. **Simulated live chat feed widget.** IO `threshold: 0.2` gates a recursive `setTimeout(2400 + 2200*random)` that appends a message (`msgIn` keyframe: `translateY(10px)` + fade, item list capped at last 6) and ages timestamps. Only runs while in view; cleans up on exit.

6. **Material/texture details.**
   - `.glass`: `backdrop-filter: blur(18px) saturate(160%)` + `inset 0 1px 0 #ffffffe6` top hairline (light theme).
   - `.grain::before`: fixed inline-SVG `feTurbulence` noise, `opacity .035`, `mix-blend-mode: multiply`, full viewport.
   - Marquee: duplicated track, `@keyframes marquee { to { translateX(-50%) } }`, 36 s linear.
   - Hero headline "rise": `animation: rise 1.2s cubic-bezier(.34,1.56,.64,1) both` — masked line reveal from `translateY(105%)` with a back-out overshoot easing.

**Not present:** `prefers-reduced-motion` handling — zero occurrences in CSS or JS.

---

## 2. site-checkout.preview.emergentagent.com ("Virtual Fridge")

Product landing demo. CRA React 18 (`main.aacb3da8.js`, 380 KB; `main.0cdb7d03.css`, 75 KB).

**Verified stack: ZERO animation libraries** (same as above). 6 @keyframes, 1 IO (inside a
UI primitive), 3 rAF systems, hand-rolled easing toolkit:
`easeOutCubic = 1-(1-t)^3`, `easeInCubic = t^3`, `invLerp = clamp((x-a)/(b-a))`, `lerp`.

### Standout effects (verified from code)

1. **Windowed dual-video scrub in one sticky section.** One rAF loop computes section progress `l`, then maps SUB-RANGES to two different videos: fridge video scrubs over `l ∈ [0, 0.44]`, phone video over `l ∈ [0.58, 0.93]`. Seek strategy: exponential chase `next = current + 0.5 * delta`, `fastSeek` when `|delta| > 0.25s`, skip if `|delta| ≤ 0.05` or `video.seeking`. React re-render gated: state only updates when progress moved > 5e-4.

2. **Trapezoid opacity windows for scroll-keyed callouts.** Each annotation has `window: [fadeInStart, fullStart, fullEnd, fadeOutEnd]` in progress space → opacity ramps 0→1, holds, 1→0. Off-state adds slide offset (`±14px` x by side, `+18px` y). `pointerEvents: opacity > 0.6 ? "auto" : "none"` so half-faded UI can't be clicked.

3. **Scatter → dock → converge ingredient choreography.** Items defined as `{start: {x,y,scale,rotate}, dock: {...}, target: {...}, delay}` in percent coordinates. Per-item `delay` shifts the progress thresholds (= stagger). easeOutCubic fly-in from scattered start to docked grid → hold → easeInCubic converge into the phone while fading to ~6 %. Rendered as absolutely-positioned imgs: `left/top %` + `translate(-50%,-50%) scale() rotate()`.

4. **Rise/hold/exit panel takeover with lerp smoothing.** Scroll progress is smoothed every frame: `t += 0.2 * (target - t)` (classic lerp damping — removes scroll jitter, adds "weight"). Each phone panel: enters from `translateY(110vh)` w/ easeOutCubic → hold phase drifts to `-4vh` (subtle parallax while "static") → exits to `-110vh` w/ easeInCubic. 600 vh section, sticky inner viewport.

5. **Deep-link anchors inside choreography.** Invisible 1 px `div.vf-anchor` elements absolutely placed at `top: 90vh / 260vh / 425vh` inside the tall section, so nav links land the scroll at the exact choreography moment for each feature.

6. **Marquee with hover-zoom pop-out.** Track: `vfMarquee 42s linear infinite` to `-50%`; container has horizontal edge mask `linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)`. On hover: card `z-index: 20`, image wrapper `z-index: 30`, `img { transform: scale(1.12); transition: transform .45s cubic-bezier(.2,.8,.2,1) }` with `overflow: visible` — the image grows OVER neighboring cards.

7. **Signature motion language.** One easing everywhere: `cubic-bezier(.2,.8,.2,1)` ("swift-out"). Hover micro-lifts: `translateY(-1px)` buttons, `-3/-4px` + soft shadow cards. `will-change: transform` only on persistently animated nodes.

8. **Mobile guard.** `matchMedia("(max-width: 1024px)")` → static images replace scrub videos entirely on small screens.

**Not present:** `prefers-reduced-motion` — zero occurrences here too.

---

## 3. Notion — "Jo Mendes Emergent 3D website Assets" (the advice)

Fetched via reader proxy (page is JS-rendered; raw HTML is a shell). Full content:

> **Turn any AI-generated video into a premium scroll-based website using Emergent + Claude.**
>
> | Step | What you provide | What happens |
> |---|---|---|
> | 1 | AI Video | Creates depth illusion |
> | 2 | Website Reference | Defines layout/style |
> | 3 | Claude Skill | Builds the system |
> | 4 | Emergent | Generates the website |
>
> - **Step 1 — Create Your Video:** "Generate a cinematic AI video that simulates camera movement and depth. This will act as your fake 3D layer."
> - **Step 2 — Choose a Website Reference:** "Pick a clean, modern site that has the layout and structure you want."
> - **Step 3 — Setup in Emergent:** agent/model settings (Emergent-specific, not relevant to us).
> - **Step 4 — Use the Claude Skill:** paste skill + prompt, upload video + reference.
>
> **Key Idea: "You are not building 3D. You are faking depth using video + scroll interaction + layered UI."**
>
> **Result:** "a strong first version (50–80 %) that looks premium and only needs refinement."

Attachments/links on the page: `emergent-scroll-video-hero-kit.zip` (2 MiB, contains the Claude skill — behind Notion attachment auth, not retrievable anonymously), plus links to both preview sites above as the worked examples.

**Translation for us:** the entire "wow" of reference #1 is pre-rendered video + scroll scrub + masked parallax UI layers. No live 3D needed. This is directly relevant as a mobile strategy for our heavy Spline hero.

---

## 4. STEAL THIS — prioritized, mapped to aimedia.global

Stack reminder: Next.js 16, Tailwind v4, framer-motion 12 (LazyMotion/domAnimation), Spline robot hero, WebGL shader in booking. Brand: restrained motion, 60 fps mobile, prefers-reduced-motion respected.

1. **Hero headline: masked "rise" line reveal with back-out easing.** (cheap)
   Wrap each Bebas Neue line in `overflow-hidden` span; inner `m.span` variants `{ y: "105%" } → { y: 0 }`, `transition: { duration: 0.9, ease: [0.34, 1.56, 0.64, 1], delay: i * 0.08 }`. Pure transform, one-shot on mount. Reduced-motion: skip to final state via `useReducedMotion()`.

2. **Standardized one-shot section reveal language.** (cheap)
   One shared variants object: `hidden: { opacity: 0, y: 24 }`, `show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.2, 0.8, 0.2, 1] } }` + `whileInView` / `viewport={{ once: true, amount: 0.12 }}`. Stagger glow cards with `staggerChildren: 0.08`. Adopt `cubic-bezier(.2,.8,.2,1)` as the site-wide easing token (CSS var `--ease-swift`).

3. **Glow cards / stats: easeOutCubic count-up gated by viewport.** (cheap)
   Port their counter: `useInView(ref, { amount: 0.3, once: true })` → rAF 1600 ms, `1-(1-t)^3`, regex keeps suffix + decimals ("12+", "3.5x", "240 %"). ~15 lines, no dependency.

4. **Services carousel dashboard: simulated live agent feed.** (cheap)
   Their chat-feed pattern: `useInView` gate → recursive `setTimeout(2400 + 2200 * Math.random())` appending "agent events" (lead scored, email drafted, call booked), cap last 6, animate entry with a 10 px y + fade keyframe (or `AnimatePresence` popLayout). Pauses off-screen = zero idle cost. Perfect for the live dashboard widget credibility play.

5. **Marquee tickers: edge mask + hover pop-out.** (cheap)
   Add `mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)` to ticker containers (kills the hard clip edges). Optional: on hover, item `scale(1.08–1.12)` over `.45s var(--ease-swift)` with z-index pop, `overflow: visible` on track. Compositor-only.

6. **Orchestrator diagram: trapezoid opacity windows + scatter-to-dock entrance.** (medium)
   - Entrance (one-shot): each radial node gets `{ start: offset/rotate/scale, dock: final }`, framer-motion variants with per-node `delay: i * 0.06`, easeOut — their ingredient fly-in, but triggered by `whileInView` once instead of scroll-scrubbed.
   - If we later add a scroll phase: `useScroll({ target })` + `useTransform(progress, [a,b,c,d], [0,1,1,0])` per annotation = their trapezoid windows, free in framer-motion.

7. **Any scroll-linked motion: lerp/spring smoothing + dual-speed mask-edged parallax.** (cheap-medium)
   `const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 28 })` ≈ their `t += 0.2*(r-t)`. Use it to drive TWO columns/layers at different multipliers (e.g. hero side micro-labels at -0.6x, content at -1x) inside containers with vertical fade `mask-image` (their 0/14/80/100 % stops). Transform-only, no layout.

8. **Mobile hero strategy (the Notion page's core idea): pre-rendered video instead of live 3D.** (medium, but it *improves* mobile FPS)
   Export a 6–10 s loop of the Spline robot (or a cinematic AI-generated equivalent) as compressed MP4/WebM. On `(max-width: 1024px)` (their guard) serve `<video muted playsInline autoplay loop preload="metadata">` + poster instead of the Spline runtime. Optional later: scroll-scrub it with their playbackRate-chase technique (rate 1–16x forward, pause+fastSeek backward, 0.05 s dead-zone, "tail loop" of last 4 s at 0.6x). Fake the depth, drop the WebGL cost.

## 5. DO NOT copy

- **480–600 vh scroll-jacked sticky sections.** Their whole hero/feature pattern hijacks 5–6 viewports per section. Breaks "restrained motion", frustrates mobile scroll, hurts bounce on a conversion-focused agency page. Our max: short scroll-linked accents within normal-height sections.
- **Stacking scroll-scrubbed video ON TOP of existing Spline + WebGL shader.** We already run two GPU contexts. Adding video decode + scrub on the same desktop page = mobile thermal throttle. Video is a *replacement* for Spline on mobile (steal #8), never an addition.
- **Heavy backdrop-filter glassmorphism (blur 18–24 px on many elements).** Their light-theme glass is a continuous compositing cost (brutal on mobile Safari) and the white-frosted look clashes with our #050507 big-tech dark. Keep our existing card treatment; hairline `inset 0 1px 0` highlights are the only part worth borrowing.
- **Full-viewport fixed grain overlay.** Theirs uses `mix-blend-mode: multiply` at 3.5 % — on a near-black bg multiply is invisible; a `screen`-mode variant would add a permanent full-screen composite layer for marginal payoff. Skip.
- **Always-on rAF loops.** The checkout site runs rAF every frame even when idle (battery drain). framer-motion's `useScroll`/`useSpring` already throttle correctly — never hand-roll a free-running loop.
- **Their accessibility gap.** Neither site has a single `prefers-reduced-motion` rule (verified: 0 occurrences in both CSS+JS bundles). We keep `useReducedMotion()` gates on every technique above — reveals collapse to opacity-only, counters render final values, videos show poster frames.
- **z-index hover pop on dense grids.** Fine for their 540 px marquee cards; on our 6-card glow grid overlapping neighbors reads as broken. Hover-lift `-2/-3px` + glow intensify only.

---

## Verification notes (how this was confirmed)

- Preview hosts serve an Emergent wake-up shell; actual builds fetched read-only from static CDN snapshots: `https://skeleton-rebuild.preview.static.emergentagent.com/` and `https://site-checkout.preview.static.emergentagent.com/` (`/pod-backups/<id>/build/static/...`).
- Library check: grepped both JS bundles for gsap/ScrollTrigger/framer-motion/three/spline/lenis/locomotive/lottie/react-spring → 0 hits each. IntersectionObserver: 4 + 1 hits; requestAnimationFrame: 4 + 6 hits; all read and documented above.
- Notion page text extracted via reader proxy (page title, 4-step table, all step texts, key idea, result line, attachment + example links).
