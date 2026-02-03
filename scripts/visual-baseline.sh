#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-9292}"
STORE="${STORE:-goosnav-y2k.myshopify.com}"

cleanup() {
  if [[ -n "${SHOPIFY_PID:-}" ]]; then
    kill "$SHOPIFY_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# start theme dev in background (no live reload to avoid hanging navigations)
shopify theme dev --store "$STORE" --port "$PORT" --live-reload off >/tmp/theme-dev.log 2>&1 &
SHOPIFY_PID=$!

# wait for server
for i in {1..60}; do
  if curl -sf "http://127.0.0.1:${PORT}/" >/dev/null; then
    break
  fi
  sleep 1
done

# run screenshots
npx playwright test --update-snapshots
