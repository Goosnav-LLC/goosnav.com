# Agent Rules (Hard)

## Allowed changes
- CSS, theme settings, section schema additions, minimal markup adjustments.
- Add stable class names only when needed for styling.
- Add @app blocks to key sections if missing (product/collection/cart).

## Forbidden
- Adding React/Vue/Next/etc
- Rebuilding cart with heavy JS
- Renaming large folders, reorganizing theme structure
- Removing Shopify form semantics
- Removing app insertion points (@app block support)

## Required checks
- `shopify theme dev` must still load pages.
- `shopify theme check` must pass or improve.
