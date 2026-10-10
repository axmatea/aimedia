---
name: aimedia-interface
description: Build or review the AX Media website’s premium editorial interface, restrained motion and business-workflow visuals while preserving its conversion contracts. Use for AX Media UI changes, not backend or hosting migration.
---

# AX Media interface

This is a proposed repository-local design skill. It is a reviewable text file, not an installed third-party skill or an instruction to deploy.

Read the current repository brief and identify the source-of-truth branch before editing. If production has uncommitted work missing from the checkout, isolate presentation changes and record that integration is blocked on source parity.

## Visual decisions

- Use a graphite/ink canvas, off-white contrast sections, precise sans typography, narrow mono labels and generous space. Prefer a few clear editorial sections over repeated generic feature cards.
- Keep the business offer visible above the fold. A visual should explain a real workflow or capability. Label demonstrations; do not invent client proof, metrics, live status or integration activity.
- Reuse existing assets or generate a bitmap only when an art-directed image is the right medium. Keep diagrams with labels, states or interactions in HTML/SVG. Do not add a model runtime to the landing page.
- Use plain, high-contrast buttons with visible focus and useful touch targets. Do not add magnetic buttons, cursor effects or shaders by default.

## Implementation decisions

- Leave static headings and content in server components. Add small client islands for genuine interaction.
- Use native CSS first, then the installed Motion version where it simplifies stateful transitions. Inspect actual installed versions before using current documentation APIs. Add no second animation engine without a specific visual requirement and measured tradeoff.
- Keep motion bounded, user-triggered where possible, and fully optional. Reduced motion must cover custom timers and WebGL as well as CSS/Motion. The complete static state must remain useful.
- Preserve booking event names, source/UTM propagation, API schemas, CRM behavior, idempotency and analytics. A visual change does not authorize changing their contracts.
- Do not change shared root providers just to make a preview easier. Describe inherited costs separately from the new UI cost.

## Review

Check mobile and desktop screenshots, keyboard navigation, touch targets, focus, contrast, reduced motion, no horizontal overflow, no-JS content and interrupted/repeated interactions. Run lint, type checks, the production build and relevant existing tests. Report passed, failed and unrun checks separately. Do not call a preview production-ready while the complete production source or runtime checks are missing.

Reference current official Motion accessibility/bundle guidance and Vercel’s public React/web-interface guidance when useful. Read and audit a selected external skill before copying it; do not execute installers, enable hosted servers or add persistent access as part of a design review.
