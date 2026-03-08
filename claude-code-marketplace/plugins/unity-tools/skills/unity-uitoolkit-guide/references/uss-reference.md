# USS Reference

## USS vs CSS: Critical Differences

### Layout Model

| Feature | CSS | USS |
|---------|-----|-----|
| Layout system | Block, inline, grid, flex | **Flexbox only** |
| `display` values | `block`, `inline`, `flex`, `grid`, `none`, etc. | `flex`, `none` only |
| `position` values | `static`, `relative`, `absolute`, `fixed`, `sticky` | `relative`, `absolute` only |
| Default flex-direction | `row` | **`column`** (vertical) |
| Box sizing | `content-box` / `border-box` | No `box-sizing` property |

## Selectors

### Supported

| Selector | Syntax | Example |
|----------|--------|---------|
| Type (C# class) | `TypeName {}` | `Button {}`, `Label {}` |
| Class | `.class-name {}` | `.my-button {}` |
| Name | `#name {}` | `#submit-btn {}` |
| Wildcard | `* {}` | `* {}` |
| Descendant | `A B {}` | `.panel Label {}` |
| Child | `A > B {}` | `.panel > Label {}` |
| Multiple | `A, B {}` | `.a, .b {}` |
| Pseudo-classes | `:state {}` | `:hover`, `:active`, `:focus`, `:checked`, `:disabled`, `:enabled`, `:inactive`, `:root` |

### NOT Supported

| CSS Feature | Status |
|-------------|--------|
| `!important` | Not supported |
| `[attr=value]` attribute selectors | Not supported |
| `+`, `~` sibling selectors | Not supported |
| `::before`, `::after` | Not supported |
| `:nth-child()`, `:first-child`, `:last-child` | Not supported |
| `:not()` | Not supported |
| `@media` queries | Not supported (use C# conditional loading) |
| `@keyframes` animations | Not supported |
| `@import` | Not supported (use C# or UXML `<Style>`) |

### Specificity (Highest to Lowest)

1. Inline styles (C# code or UXML `style` attribute)
2. `#name` selector — most specific
3. `.class` selector
4. `TypeName` selector
5. `*` wildcard — least specific

## Units & Values

| Type | Supported | NOT Supported |
|------|-----------|---------------|
| Length | `px`, `%` | `em`, `rem`, `vw`, `vh`, `vmin`, `vmax`, `cm`, `mm`, `in`, `pt` |
| Color | `#RGB`, `#RRGGBB`, `#RGBA`, `#RRGGBBAA`, `rgb()`, `rgba()`, keywords | `hsl()`, `hsla()`, `currentColor` |
| Numbers | Integer, float | `calc()` expressions |

## Custom Properties (Variables)

```css
/* Define */
:root {
    --my-color: #FF0000;
    --my-size: 14px;
}

/* Use */
.my-element {
    color: var(--my-color);
    font-size: var(--my-size);
}

/* With fallback */
color: var(--my-color, #000000);
```

**Limitations:**
- `var()` CANNOT be nested inside functions: `rgb(var(--r), 0, 0)` is INVALID
- `:root` does NOT work in Inspector UI — use class selectors instead
- No `env()` function

## Unity-Specific Properties (`-unity-` prefix)

| Property | Purpose | Values |
|----------|---------|--------|
| `-unity-font` | Font asset | `resource("path")` or `url("path")` |
| `-unity-font-definition` | Font asset (newer API) | `resource("path")` or `url("path")` |
| `-unity-font-style` | Font style | `normal`, `italic`, `bold`, `bold-and-italic` |
| `-unity-text-align` | Text alignment (9 positions) | `upper-left`, `upper-center`, `upper-right`, `middle-left`, `middle-center`, `middle-right`, `lower-left`, `lower-center`, `lower-right` |
| `-unity-text-generator` | Text renderer | `standard`, `advanced` |
| `-unity-background-scale-mode` | Image scaling | `stretch-to-fill`, `scale-and-crop`, `scale-to-fit` |
| `-unity-background-image-tint-color` | Image tint | Color value |
| `-unity-overflow-clip-box` | Clip region | `padding-box`, `content-box` |
| `-unity-slice-left/right/top/bottom` | 9-slice sprite borders | Integer (pixels) |
| `-unity-text-overflow-position` | Truncation position | `start`, `middle`, `end` |
| `-unity-paragraph-spacing` | Paragraph gap | Length value |

## Asset References

```css
/* resource() — from Resources/ folder (extension optional) */
background-image: resource("Icons/my-icon");
-unity-font: resource("Fonts/my-font");

/* url() — project-relative path (extension required) */
background-image: url("Assets/UI/Icons/my-icon.png");
```

## Supported USS Properties

**Layout:**
`display`, `position`, `top`, `right`, `bottom`, `left`, `flex-direction`, `flex-wrap`, `flex-grow`, `flex-shrink`, `flex-basis`, `justify-content`, `align-items`, `align-self`, `align-content`

**Box Model:**
`width`, `height`, `min-width`, `min-height`, `max-width`, `max-height`, `margin` (+ per-side), `padding` (+ per-side), `border-width` (+ per-side), `border-color` (+ per-side), `border-radius` (+ per-corner)

**Visual:**
`background-color`, `background-image`, `opacity`, `overflow`, `visibility`

**Text:**
`color`, `font-size`, `white-space`, `-unity-font`, `-unity-font-definition`, `-unity-font-style`, `-unity-text-align`

**Transition:**
`transition-property`, `transition-duration`, `transition-timing-function`, `transition-delay`

**Other:**
`cursor`

## NOT Supported CSS Properties

- `float`, `clear` — use flexbox
- `text-decoration`, `text-transform`, `letter-spacing` — some added in later Unity versions
- `line-height` — use `-unity-paragraph-spacing`
- `box-shadow`, `text-shadow` — not available
- `transform` — use C# `style.transform`
- `animation`, `@keyframes` — not available
- `z-index` — use element order in UXML hierarchy
- `background-size`, `background-position`, `background-repeat` — use `-unity-background-scale-mode`
- `grid-*` — use flexbox
- `overflow-x`, `overflow-y` — only combined `overflow`
