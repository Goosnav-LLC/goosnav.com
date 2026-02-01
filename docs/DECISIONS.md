# Y2K Theme Design Decisions

## Color Palette Split (eBay vs YouTube)

**Date:** 2026-01-31

**Decision:** The Y2K theme uses a split color approach synthesizing eBay 2004 and YouTube 2007 aesthetics.

### Header Navigation (eBay 2004)
- Background: #FFFFFF (pure white)
- Tabs: #003D7A (dark blue)
- Tab text: #FFFFFF (white)
- Active tab: White background, blue text with bottom border
- Tab hover: #0052A3 (lighter blue)

### Accent Colors (Spec Compliant)
- Accent Red: #CC3333 (buttons, badges, hover states, general accent use)
- Tab Red: #CC0000 (YouTube exact - cart bubble only)

**Rationale:** Keep YouTube's exact #CC0000 for cart bubble authenticity, but use spec-compliant #CC3333 for all other accent/hover states to match STYLE_TOKENS.md.

### Body Content (YouTube 2007 influence)
- Links: #0000EE (browser default blue)
- Visited: #551A8B (browser default purple)
- Hover: #CC3333 (accent red)
- Yellow hover background: #FFFFCC (eBay style)

### Implementation Notes
- Header follows eBay 2004 structure: pure white background with dark blue navigation tabs
- Body content follows YouTube 2007 density and information hierarchy
- Don't slavishly copy either - synthesize and make it work for Shopify
