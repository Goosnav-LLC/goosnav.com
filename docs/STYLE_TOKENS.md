# Y2K Design Tokens

Design token specifications for the "eBay 2010 + YouTube 2007" aesthetic.

## Typography

### Font Stack
```
Verdana, Tahoma, Geneva, Arial, Helvetica, sans-serif
```
Old-web system stack. No custom fonts loaded.

## Colors

### Link Colors
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Link Blue | `#0000EE` | 0, 0, 238 | Unvisited links |
| Visited Purple | `#551A8B` | 85, 26, 139 | Visited links |

### UI Colors
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Panel Gray | `#F0F0F0` | 240, 240, 240 | Card/panel backgrounds |
| Border | `#CCCCCC` | 204, 204, 204 | Standard borders (lighter YouTube style) |
| Border Dark | `#808080` | 128, 128, 128 | Inset shadow (bottom/right) |
| Border Light | `#FFFFFF` | 255, 255, 255 | Raised highlight (top/left) |
| Background White | `#FFFFFF` | 255, 255, 255 | Clean page background |
| Background Light | `#F9F9F9` | 249, 249, 249 | Filter panels, subtle bg |

### YouTube 2007 Tab Colors
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Tab Red | `#CC0000` | 204, 0, 0 | First nav tab (Videos) |
| Tab Orange | `#FF9900` | 255, 153, 0 | Second nav tab (Categories) |
| Tab Green | `#009900` | 0, 153, 0 | Third nav tab (Channels) |
| Tab Blue | `#0066CC` | 0, 102, 204 | Fourth nav tab (Community) |
| Accent Red | `#CC3333` | 204, 51, 51 | Buttons, badges, highlights |

## Borders & Corners

| Token | Value | Notes |
|-------|-------|-------|
| Border Radius | `0px` | Sharp corners everywhere |
| Button Border | `2px` | Visible beveled edges |
| Input Border | `2px` | Inset 3D effect |

## Shadows

| Token | Value | Notes |
|-------|-------|-------|
| Shadow Opacity | `0` | No drop shadows |
| All shadow offsets | `0px` | Flat appearance |

## Spacing

| Token | Value | Notes |
|-------|-------|-------|
| Section Spacing (Desktop) | `24px` | Tighter than Dawn default |
| Section Spacing (Mobile) | `16px` | Proportionally tight |
| Grid Gap | `12px` | Dense product grids |

## Beveled Button Style

Win95-style 3D buttons using CSS borders:

```
┌─────────────────┐  ← #FFFFFF (light, 2px)
│                 │
│     BUTTON      │  ← Background: linear-gradient(#E8E8E8, #C0C0C0)
│                 │
└─────────────────┘  ← #808080 (dark, 2px)
        ↑
    #808080 (dark)
```

### Button States
- **Default**: Light top/left, dark bottom/right
- **Hover**: Slightly lighter gradient
- **Active/Pressed**: Inverted borders (dark top/left, light bottom/right)
- **Focus**: Dotted inner outline (1px inset)

## Inset Input Style

Text inputs appear recessed:

```
┌─────────────────┐  ← #808080 (dark, 2px)
│                 │
│   input text    │  ← Background: #FFFFFF
│                 │
└─────────────────┘  ← #FFFFFF (light, 2px)
        ↑
    #C0C0C0 (border)
```

## Implementation

All tokens implemented in `assets/y2k-tokens.css` as CSS variable overrides on `:root`.
