---
name: unity-uitoolkit-guide
description: "Unity UI Toolkit reference guide covering UXML and USS. Use when writing, reviewing, or debugging UXML/USS files, converting HTML/CSS to UXML/USS, or building Unity UI Toolkit interfaces."
user-invocable: false
---

# Unity UI Toolkit Guide

Reference for building Unity UI with UXML (structure) and USS (styling). Covers syntax, supported features, and critical differences from HTML/CSS.

## Workflow

```
1. Check UXML structure rules
   ↓ Verify element types, attributes, templates
2. Check USS styling rules
   ↓ Verify properties, selectors, units, variables
3. Validate UXML-USS integration
   ↓ Ensure correct class/name references, stylesheet linking
4. Run lint verification (optional)
   ↓ scripts/verify-completion.sh [directory]
```

---

## Key Differences from HTML/CSS

### UXML (not HTML)

- `<ui:VisualElement>` not `<div>`, `<ui:Label>` not `<span>`/`<p>`
- `name="foo"` not `id="foo"`
- `<Style src="file.uss" />` not `<link rel="stylesheet">`
- Default layout: **flexbox column** (not block flow)
- All elements need `ui:` namespace prefix

### USS (not CSS)

- **Flexbox only** — no block, inline, grid
- `display`: only `flex` or `none`
- `position`: only `relative` or `absolute`
- Default flex-direction: **`column`** (not `row`)
- Units: only `px` and `%` — no em/rem/vw/vh
- Colors: only hex, `rgb()`, `rgba()` — no hsl()
- `text-align` → `-unity-text-align` (9 positions: upper/middle/lower + left/center/right)
- `font-family` → `-unity-font` or `-unity-font-definition`
- `var()` CANNOT nest inside functions: `rgb(var(--r), 0, 0)` is INVALID

### NOT Supported in USS

| Category | Not Available |
|----------|--------------|
| Functions | `calc()`, `hsl()`, `env()` |
| Units | `em`, `rem`, `vw`, `vh`, `vmin`, `vmax`, `cm`, `mm`, `pt` |
| Directives | `@media`, `@keyframes`, `@import`, `!important` |
| Selectors | `::before`, `::after`, `:nth-child`, `:not()`, `+`/`~` siblings, `[attr]` |
| Properties | `box-shadow`, `text-shadow`, `z-index`, `float`, `grid-*`, `animation`, `text-transform`, `background-size/position/repeat` |

---

## Quick Reference

### USS Supported Selectors

`TypeName {}`, `.class {}`, `#name {}`, `* {}`, `A B {}` (descendant), `A > B {}` (child), `A, B {}` (multiple)

Pseudo-classes: `:hover`, `:active`, `:focus`, `:checked`, `:disabled`, `:enabled`, `:inactive`, `:root`

### USS Specificity (High → Low)

Inline styles > `#name` > `.class` > `TypeName` > `*`

### Common Unity Properties

| Property | Values |
|----------|--------|
| `-unity-text-align` | `upper-left/center/right`, `middle-left/center/right`, `lower-left/center/right` |
| `-unity-font-style` | `normal`, `italic`, `bold`, `bold-and-italic` |
| `-unity-text-generator` | `standard`, `advanced` |
| `-unity-background-scale-mode` | `stretch-to-fill`, `scale-and-crop`, `scale-to-fit` |

---

## Detailed References

- **UXML elements, attributes, templates, C# integration**: `references/uxml-reference.md`
- **USS properties, selectors, units, variables**: `references/uss-reference.md`
- **HTML/CSS → UXML/USS migration checklist**: `references/migration-checklist.md`

## Completion Verification

Run `scripts/verify-completion.sh [directory]` to lint UXML/USS files for unsupported features and common mistakes.
