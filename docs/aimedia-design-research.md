# AX Media: interface and motion recommendation

Research checked 10 October 2026. This is an isolated UI study, not a production migration or a replacement for the currently deployed source.

## Decision

Keep the existing Next.js 16.4.0 / React 19.2.4 application and use CSS/SVG plus the existing Motion dependency where animation genuinely needs React state. The first preview adds **zero packages, zero generated images and zero third-party scripts**. Prefer native, static presentation by default and let visitors play a meaningful workflow example.

The project already has Motion 12.38.0, Framer Motion 12.38.0, Base UI 1.3.0, Tailwind 4, Spline, Lenis and Paper shaders. Adding another animation engine before removing unnecessary effects would increase maintenance and testing work. Motion and Framer Motion share an upstream ecosystem; standardize imports later, inspect the real bundle, and do not assume deleting a manifest entry automatically saves an entire second copy.

## Prioritized sources

### 1. Motion: retain the installed version for this preview

- Repository: https://github.com/motiondivision/motion
- License: MIT, https://github.com/motiondivision/motion/blob/main/packages/motion/LICENSE.md
- Health: official changelog records 14.1.0 on 9 October 2026 and 14.0.0 on 2 October. This is active maintenance, and also a reason to avoid a simultaneous major upgrade during migration. https://github.com/motiondivision/motion/blob/main/CHANGELOG.md
- Compatibility: official installation guidance supports React 18.2+ and both Next.js routers. https://motion.dev/docs/react-installation
- Use: isolated state changes, short opacity/transform transitions, explicit user interactions. Native CSS is sufficient for the initial preview.
- Accessibility: apply `MotionConfig reducedMotion="user"` for Motion components and a CSS reduced-motion rule for non-Motion effects. Custom timers, video and WebGL need separate controls. https://motion.dev/docs/react-accessibility
- Performance: `m` plus `LazyMotion` can defer features; the documentation’s size figures are illustrative bundler measurements, not an AX Media benchmark. A synchronous `domAnimation` import still ships its features initially. https://motion.dev/docs/react-reduce-bundle-size

### 2. Base UI / shadcn: reuse selected primitives, avoid a template replacement

- Repositories: https://github.com/mui/base-ui and https://github.com/shadcn-ui/ui
- Licenses: MIT for both. https://github.com/mui/base-ui/blob/master/LICENSE and https://github.com/shadcn-ui/ui/blob/main/LICENSE.md
- Health: Base UI’s release page records 1.9.0 on 9 October 2026, including interaction, focus and accessibility fixes. The checkout uses 1.3.0. https://base-ui.com/react/overview/releases
- Use only where needed: a dialog, menu or complex disclosure deserves a well-tested primitive; simple FAQ disclosure can use native `details`/`summary`. Keep semantic links and buttons. Do not swap all existing controls during a hosting migration.
- Avoid copying a large animated component gallery. Keep the existing component ownership and validate each downloaded component’s dependencies and license before using it.

### 3. Vercel’s public agent skills: best reference shortlist

- Repository and license: https://github.com/vercel-labs/agent-skills (MIT)
- Relevant paths: `skills/react-best-practices`, `skills/web-design-guidelines`, `skills/composition-patterns`
- Health: the official repository documents immutable discovery releases; the latest visible release is commit `063bee9` on 28 August. https://github.com/vercel-labs/agent-skills/releases
- Use as source-reviewed checklists: server/client boundaries, import size, focus, semantic HTML, motion preferences, and stable layout. No need to install its deployment skill for a Railway project.
- Caution: the web-design skill fetches a live rules file. Pin the reviewed content or review its changes; a trusted owner does not make mutable fetched instructions automatically trustworthy. https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md

### 4. Motion AI Kit: optional documentation aid, no installer run

- Official source: https://github.com/motiondivision/ai-kit
- Motion’s README describes its free skill as MIT; verify the selected skill/package license before copying files. The AI Kit repository is small and younger than the animation library. https://github.com/motiondivision/motion#-using-motion-with-ai
- The installer also configures hosted MCP servers. That is more than copying a local checklist, so do not run it as a casual design dependency.
- Free guidance and docs are enough here. Motion+ examples/source and audits are separate paid capabilities, not part of the free `motion` package. https://github.com/motiondivision/ai-kit/blob/main/plugins/motion/skills/motion/SKILL.md

### 5. GSAP and Three.js: evaluated, not selected

- GSAP: https://github.com/greensock/GSAP; official package source is 3.15.0. Its Standard No Charge license permits ordinary commercial sites but has restrictions on competing visual animation builders; it is **not MIT**. https://gsap.com/community/standard-license/
- GSAP’s official skills are a separate MIT-licensed repository: https://github.com/greensock/gsap-skills/blob/main/LICENSE
- Use GSAP only if a later approved direction genuinely requires a multi-scene timeline or tightly orchestrated SVG sequence. Do not stack it on top of Motion for ordinary buttons and reveals.
- React Three Fiber: https://github.com/pmndrs/react-three-fiber (MIT). Version 9 pairs with React 19. Its release page lists 9.8.1 on 24 September, with lifecycle/disposal fixes. https://github.com/pmndrs/react-three-fiber/releases
- Reserve WebGL for a visual that communicates essential value. A workflow can be understood with HTML/SVG, without a render loop, shader download or graphics-context failure mode.

## Image generation

Use the available image-generation capability if a specific original bitmap asset earns its place. The initial workflow diagram is code-native: readable text, responsive layout, accessible semantics and editable states matter more than a flattened image.

For an optional hero/art asset, create one art-directed graphite object or abstract process material, then crop and compress with explicit dimensions. Avoid pseudo-client screenshots, invented dashboards or implied results. Keep large decorative imagery off the mobile critical path. Reuse the current robot poster if retaining the robot direction; load the live scene only on deliberate interaction or an appropriate idle/viewport gate after measurement.

Public repositories reviewed:

- `openai/skills` now declares itself deprecated and directs users to `openai/plugins`; do not install an old skill collection blindly. https://github.com/openai/skills/blob/main/README.md
- Current examples: https://github.com/openai/plugins, including product-design and build-web-apps. Licenses must be checked per selected package; no blanket license was verified for all plugin content.
- `huggingface/diffusers` is Apache-2.0 code and actively maintained: 0.41.0 was released 6 October. Model weights carry their own licenses and compute needs. It is an offline production alternative, not a browser dependency or a free hosted image service. No model was downloaded. https://github.com/huggingface/diffusers/releases and https://github.com/huggingface/diffusers/blob/main/LICENSE

## Design system

- Palette: ink `#101111`, graphite, paper `#f1f0eb`, restrained warm-red accent. Muted greens are confined to the illustrative workflow’s status treatment.
- Typography: one existing sans family, two or three useful weights, tight display tracking, readable body copy and small mono system labels. Reduce font payload only after source parity is restored.
- Layout: strong editorial hierarchy, generous white space, a quiet integration strip, three clear system offerings, human-control explanation, concise FAQ and direct booking CTA. No invented customer logos or numerical results.
- Buttons: solid paper on ink, ink on paper; 44–48px practical targets, visible keyboard focus, quiet hover. No shaders, magnetic movement or long animated button entrances.
- Motion: user-triggered workflow progress explains capture → context → preparation → human review. Default state remains fully readable. No autoplay loops, scroll hijacking or essential information hidden until animation completes.

## Isolation and integration gate

The local branch `preview/premium-workflow-ui` adds only `app/design-preview/*` and design documentation. Metadata is `noindex,nofollow`. It is not a privacy boundary; keep the branch local or protect any authorized future preview. It is not linked from the existing home page or sitemap.

The preview’s booking links point to the existing `/#booking` flow. It does not add submission handlers, replace booking components or change tracking events. The illustrative workflow does not call integrations. Existing root-layout providers remain inherited; removing Lenis, fonts or analytics is explicitly outside this isolated patch.

The deployed production source is newer than GitHub, including booking and attribution work. Before integration, recover the production source, reconcile contracts, then transplant only the UI files. Re-verify CTA events, booking start/completion, first-touch UTM persistence, CRM writes, webhook signatures, idempotency and rollback on the complete source. Do not claim frontend parity from this branch.

## Acceptance targets (not measured results)

Desktop and mobile visual checks at 390, 768 and 1440px; no horizontal overflow; keyboard completion; 200% zoom; contrast and axe checks; reduced-motion instant completion; no-JS readable content; reset/replay and tab switching mid-run. Preserve existing conversion/deployment tests. After production-source reconciliation, measure production mobile Core Web Vitals and bundle changes rather than promising a score: aim for LCP ≤2.5s, INP ≤200ms and CLS ≤0.1 at the 75th percentile.
