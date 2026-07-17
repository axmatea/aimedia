# AI Media Project

Parent MOC: [[MOC — Projects]]

Active AI Media web project.

## Run

```zsh
cd "/Users/axmatea/Desktop/AI Integration/Projects/AI Media"
npm install
npm run dev
```

## Architecture (v7.2, server-component islands)

`app/page.tsx` is a SERVER component: all static content (hero text incl. the
LCP paragraph, marquee, services, trace map, FAQ, CTA band, footer) renders on
the server and ships zero hydration JS. Interactivity lives in explicit client
islands under `components/home/`:

- `nav.tsx` (SiteNav), `hero-islands.tsx` (HeroVisual robot/Lightning,
  HeroRotator, HeroCtas), `booking.tsx` (BookingFlow/Section/Dialog),
  `booking-button.tsx`, `reveal.tsx` (whileInView wrapper; children stay
  server-rendered), `lazy-islands.tsx` (ssr:false widgets: AgentRadial,
  LeadFunnel, N8nWorkflowBlock, AIUGCCreators, WorldMap)
- `data.ts` + `shared.tsx` are plain modules imported by both sides.

Rules: static copy never goes into a `"use client"` file; new widgets get
their own island (or lazy-islands if they should stay off the critical path);
function props never cross the server/client boundary (dispatch the
`open-booking` window event instead, see `actions.ts`).

## Important

- This folder is for the app and site code.
- AI Media visual assets now live in `/Users/axmatea/Desktop/AI Integration/Assets/AI Media/`.
- Use `Assets/AI Media/Instagram Assets/` for reels, previews, post packs, and related media files.
