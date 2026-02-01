# Claude Code Operating Rules (Goosnav Y2K Theme)

## Mission
Transform Shopify Dawn into a lightweight, fast, OS2.0-correct theme with an "eBay 2010 + YouTube 2007" aesthetic.
Primary goal is aesthetic + UX density WITHOUT bloat.

## Non-Negotiables
- Stay Shopify OS 2.0: Liquid + JSON templates + sections. No headless.
- Preserve app compatibility: DO NOT remove @app blocks or break app embeds.
- Skin-first: prefer CSS over markup changes. Minimal HTML edits.
- Minimal JS: no frameworks, no heavy libs. Progressive enhancement only.
- No large refactors. Only touch files required for the current task.
- Any uncertainty: consult /reference/* and existing Dawn patterns. Do not invent new architecture.

## Sources of Truth
1) /reference/UI_SPEC.md and screenshots are binding.
2) /docs/STYLE_TOKENS.md defines design tokens.
3) /docs/DECISIONS.md records any ambiguity and resolution.

## Workflow
- Work in small PR-sized chunks.
- Each chunk updates: code + short note in /docs/TASKS.md + any decisions in /docs/DECISIONS.md
- Must keep performance: avoid increasing JS/CSS/asset weight unless justified.

## Definition of Done per chunk
- Theme still runs via `shopify theme dev`
- No broken cart/product/collection flows
- Theme Check passes (`shopify theme check`)
- Visual target moves closer to reference
