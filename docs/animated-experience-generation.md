# Animated Experience generation record

This record makes the cinematic source assets reproducible. Generated typography was intentionally excluded. All visible copy and actions are rendered as accessible HTML.

## Models and settings

- Keyframes: Higgsfield GPT Image 2, `16:9`, `4k`, high quality.
- Motion: Higgsfield Seedance 2.0 with exact start and end images, `16:9`, high bitrate, audio disabled. The first two masters are six-second `1080p`; the third is a four-second `720p` master.
- Web delivery: H.264 MP4, 24 fps, fast-start, no audio. Desktop is 1280×720; mobile is 854×480.

Cinema Studio was evaluated, but Seedance 2.0 was selected because controlled start/end-frame continuity was more important than unconstrained single-shot generation.

## Scene 1 keyframe: AI entity

> Full-body cinematic portrait of an evolving artificial intelligence entity in a vast black studio, head and articulated feet comfortably inside frame. Anatomically coherent humanoid proportions, elegant relaxed hands, seamless unmarked obsidian faceplate, black ceramic and smoked titanium surfaces with translucent graphite membranes. A restrained AX-red energy filament travels from the feet through the torso into a small white-red chest core. Subtle material transformation along one shoulder, sparse evaporating particles, deep negative space, controlled rim lighting, precise premium industrial design, 35mm lens, symmetrical composition, photoreal detail.

## Scene 2 keyframe: core

> Preserve the exact entity identity, materials, proportions, faceplate and AX-red energy language. Move the camera into a perfectly centered chest-up portrait with the shoulders fully inside frame. The white-red core is now larger and optically precise, surrounded by concentric glass apertures and controlled volumetric red light. Energy flows visibly upward through the neck and outward across both shoulders. The right shoulder continues dissolving into elegant graphite particles. Deep black studio, crisp premium surface detail, cinematic 70mm lens, symmetrical composition, generous clean edges, unmarked surfaces.

## Scene 3 keyframe: orchestration

> A precision AI orchestration architecture floating in a deep black spatial void. One large central black-glass sphere contains a white-red energy core. Six distinct smaller agent nodes orbit on disciplined concentric paths, connected by fine luminous data filaments with visibly directional pulses. Black ceramic, smoked titanium and transparent graphite materials continue the same premium industrial language; restrained AX red with tiny purple, lime and cyan signal accents. Pure abstract geometry and unmarked surfaces, clear central hierarchy, wide readable spacing, elegant depth, crisp volumetric light, centered 16:9 cinematic composition, high-end photoreal detail.

## Scene 4 keyframe: workflow

> Preserve the exact black-glass, smoked titanium and AX-red material language. Reconfigure the orbital architecture into a living workflow corridor viewed in elegant three-quarter perspective. Six sequential unmarked stations flow clearly from left to right: one intake portal, one analysis core, a branching cluster of specialized agent nodes, one execution engine, one approval gate, and one luminous output sphere. Fine directional pulses travel through transparent conduits. Keep the hierarchy instantly readable, disciplined and architectural, with generous spacing, deep black negative space, restrained purple, lime and cyan signal accents, crisp volumetric light and premium photoreal detail. Pure abstract interface geometry, centered 16:9 composition.

## Motion 1: entity to core

> One continuous controlled cinematic shot. The artificial entity remains anatomically stable while subtle mechanical breathing and micro material shifts make it feel alive. A restrained red energy pulse travels from the feet through the torso into the chest core. The right shoulder evaporates into sparse graphite particles. The camera performs a slow symmetrical dolly from the exact full-body start toward the chest, with elegant easing and stable framing, settling precisely on the provided close core end frame. Black studio, crisp ceramic and titanium detail, unmarked surfaces, no cuts, no camera shake, silent.

## Motion 2: core to orchestration

> One seamless precision transition. Begin exactly on the close entity core. The camera advances into the white-red aperture as the entity dissolves into controlled graphite particles and volumetric red filaments. Concentric glass rings form a clean neural gateway around the lens, then widen into disciplined orbital paths. The material language remains black glass, smoked titanium and AX red throughout. The gateway resolves into the exact six-agent orchestration architecture in the end frame, with stable hierarchy and elegant easing. Unmarked abstract geometry, crisp detail, restrained motion, no cuts, no camera shake, silent.

## Motion 3: orchestration to workflow

> One continuous architectural transformation. Begin exactly on the six-agent orbital system. Directional red pulses accelerate through the transparent conduits while the outer nodes coordinate around the central orchestrator. The orbital rings rotate in disciplined alignment, then unfold horizontally into a clear six-stage workflow corridor. The camera makes a subtle controlled pullback as branching agent paths become sequential intake, analysis, execution, approval and output geometry. Preserve black glass, smoked titanium, AX red and restrained signal colors. Settle precisely on the provided workflow end frame. Unmarked surfaces, stable geometry, elegant easing, no cuts, silent.

## Generation jobs

- AI entity keyframe: `ba8d4031-728e-486e-8ac4-09d85fae9c98`
- Core keyframe: `ca897924-0bb2-40d2-8d91-4803362927bd`
- Orchestration keyframe: `d2654013-f40d-47bb-b0ad-bd78fe574bc6`
- Workflow keyframe: `85db1601-d05a-41e3-8c78-28b1748f9005`
- Entity to core: `3f308820-7c7a-4520-98e2-36f69e6a982a`
- Core to orchestration: `c61510a5-7cf6-453a-ac82-fabbd4c193fc`
- Orchestration to workflow: `af7d7cfe-9f21-45bf-afa4-ae0c7e7d9ae6`

The third master was generated at `720p` after the available Higgsfield balance could not complete another `1080p` job. It was accepted only after frame-by-frame inspection confirmed stable geometry, exact endpoint continuity, and no generated typography or visible defects.

## Local source paths

- High-quality keyframes: `artifacts/animated-experience/keyframes/`
- High-quality video masters: `artifacts/animated-experience/source-videos/`
- Web video encodes: `public/animated/video/`
- Web poster frames: `public/animated/posters/`

High-quality masters and QA captures are intentionally ignored by Git and excluded from Vercel. Only optimized web assets are deployed.

## External-to-internal bridge contract

The bridge is intentionally isolated at `ANIMATED_MEDIA.entityThroughCore` in `app/animated/media.ts`. The current approved asset remains live. A future bridge can replace the two web encodes at the same paths without changing the scroll timeline or loading strategy.

### Locked source frames

- External master: `scene-01-entity-to-core-master.mp4`, 1920×1080, 24 fps, 145 frames, 6.041667 seconds.
- Start reference: frame 144 at approximately 6.000 seconds. The entity is centered frontally; head and shoulders are stable; the chest core is centered at approximately 50% x / 69% y; the right shoulder is already separating into restrained graphite particles.
- Internal master: `scene-02-core-to-orchestration-master.mp4`, 1920×1080, 24 fps, 145 frames, 6.041667 seconds.
- End reference: frame 0 at 0.000 seconds. The same chest core is centered at approximately 50% x / 48% y in a close torso composition; black ceramic anatomy, right-shoulder particle state, red spine, exposure, and black background remain continuous.
- Generate from exported lossless PNGs of those exact frames. Do not use screenshots, recompressed JPEGs, or approximate redraws as Higgsfield inputs.

### Bridge motion

- Master: 16:9, 1920×1080, 24 fps, 2.0 to 2.5 seconds, no audio.
- Camera: one symmetrical 35mm-to-70mm dolly from the wider entity frame directly toward the center of the chest core. No lateral drift, roll, cut, rack-focus jump, or speed ramp.
- Identity lock: preserve the exact unmarked obsidian faceplate, shoulder geometry, torso proportions, black ceramic and smoked titanium materials. Do not add fingers, armor, logos, text, or a second light source.
- Core lock: the white-hot center stays on the same optical axis while moving from approximately 69% to 48% vertical position solely through the camera push. Keep the concentric red aperture circular and centered.
- Lighting lock: deep neutral black background, cool metallic edge light, restrained AX red emissive light. Preserve the external master exposure at the start and resolve exactly to the internal master exposure at the end.
- Particle continuity: continue the existing right-shoulder evaporation at low density. Particles travel outward and slightly backward; no explosion, smoke plume, debris crossing the face, or new particle source.

### Reproducible generation prompt

> Use the supplied exact start and end frames as hard continuity anchors. Create one uninterrupted, perfectly centered cinematic dolly toward the entity’s illuminated chest core. Preserve the identical entity anatomy, unmarked obsidian faceplate, black ceramic and smoked titanium surface design, shoulder geometry, red spine, exposure, and deep black studio. The camera advances smoothly on the core axis as the core grows from the wider chest position into the exact close aperture composition of the end frame. Continue only the existing sparse graphite evaporation from the entity’s right shoulder, drifting outward and backward with restrained motion. Controlled AX-red volumetric light, precise concentric aperture, premium photoreal detail, elegant easing, no cut, no lateral drift, no roll, no camera shake, no anatomy change, no new objects, no typography, no audio.

Preferred model: Higgsfield Seedance 2.0 using both exact endpoint images, because endpoint identity and camera continuity are more important than unconstrained cinematic variation. Generate at least three candidates and accept only a candidate whose first and last decoded frames match the references without a visible exposure or geometry jump.
