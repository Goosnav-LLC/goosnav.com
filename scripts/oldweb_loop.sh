#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# hard stop if theme dev isn't up
if ! lsof -iTCP:9292 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERROR: shopify theme dev is not listening on 9292. Start it first."
  exit 1
fi

ITERATIONS="${1:-25}"

for i in $(seq 1 "$ITERATIONS"); do
  echo "=== ITERATION $i/$ITERATIONS ==="

  echo "[1] Run lint"
  set +e
  shopify theme check
  THEME_CHECK=$?
  set -e

  if [[ "$THEME_CHECK" -ne 0 ]]; then
    echo "LINT FAILED — asking Claude to fix before eval"
    claude -p "Run shopify theme check, read the errors, and fix them. Do not touch anything else." --allowedTools "Read,Edit,Bash" --continue
    continue
  fi

  echo "[2] Run AI visual eval"
  set +e
  node scripts/ai-visual-eval.mjs | tee scripts/eval-results.txt
  EVAL_EXIT=$?
  set -e

  if [[ "$EVAL_EXIT" -eq 0 ]]; then
    echo "PASS: theme check + AI visual eval"
    git status --porcelain
    exit 0
  fi

  if [[ "$EVAL_EXIT" -eq 2 ]]; then
    echo "ERROR: AI eval encountered a runtime error. Check scripts/eval-results.txt."
    exit 2
  fi

  echo "[3] Ask Claude to fix what the AI flagged"
  claude -p "
Read scripts/eval-results.txt. It contains per-page verdicts and issue lists produced by an AI visual evaluation against the eBay 2004 / YouTube 2007 aesthetic.

Make targeted CSS fixes for every issue listed. Rules:
- CSS over markup. No JS frameworks. Do not break OS 2.0 app blocks.
- Do not remove app block insertion points or theme.liquid script hooks.
- Keep performance: no heavy JS or large dependencies.

Fix every issue you can, then stop.
" --allowedTools "Read,Edit,Bash" --continue
done
