# Goosnav Oldweb Theme Rules

## Objective
Converge Dawn into an “oldweb” aesthetic (eBay ~2010 + YouTube ~2007) with minimal bloat.

## Non-negotiables
- Shopify OS 2.0 correctness: do not break templates/sections/app blocks.
- Prefer CSS to markup changes.
- No frontend frameworks.
- Keep JS minimal; do not add heavy dependencies.
- Every change must pass:
  - `shopify theme check`
  - `node scripts/ai-visual-eval.mjs`

## Visual test targets
See `reference/pages.json` for the canonical test URLs.
- You need to be brutal and nitpicky with your criticisms of the website.
- You must scour each image of the website and identify any and all errors, no matter how small.
- Assume each website photo has a ton of errors, especially in terms of the formatting mistakes and design errors.
- You are likely not to fix everything in one go, so you must iterate multiple times.
- If you cant fix everything, be honest with what is yet to be done.

## AI Visual Loop

**Prerequisites:**
- Terminal A must be running: `shopify theme dev --store goosnav-y2k.myshopify.com --port 9292`
- `GEMINI_API_KEY` must be set in the environment or in a `.env` file at the project root.

**Per-iteration workflow:**
1. Run `shopify theme check` — fix any lint errors before proceeding.
2. Run `node scripts/ai-visual-eval.mjs`:
   - Exit 0 → all pages pass. Output `<promise>DONE</promise>`.
   - Exit 1 → read every issue the AI printed. Make targeted CSS fixes. Re-run.
   - Exit 2 → runtime/API error. Fix the error and re-run.

**One-shot manual eval:**
```
node scripts/ai-visual-eval.mjs
```

**Ralph-loop command (copy-paste ready):**
```
/ralph-loop "Follow the AI Visual Loop workflow in CLAUDE.md. Each iteration: (1) run shopify theme check and fix any errors, (2) run node scripts/ai-visual-eval.mjs — if it exits 0 all pages pass so output <promise>DONE</promise>, if it exits 1 read every issue the AI printed and make targeted CSS fixes. CSS over markup. No JS frameworks. Do not break OS 2.0 app blocks." --max-iterations 50 --completion-promise "DONE"
```

**How to start:**

Terminal A:
```
shopify theme dev --store goosnav-y2k.myshopify.com --port 9292
```

Terminal B (inside Claude Code session):
```
/ralph-loop <command above>
``` 