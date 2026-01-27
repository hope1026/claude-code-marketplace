# Unity UIToolkit Style Guide

## Core Principles

1. **Never hardcode values** - Always use CSS variables from Theme.uss
2. **Use semantic naming** - Choose tokens by action meaning, not appearance
3. **Maintain consistency** - Components at same level use matching size tokens
4. **Define hover states** - All interactive elements need hover styling
5. **Apply disabled states** - Use disabled tokens for non-interactive elements

## Token Naming Convention

```
--weppy-{component}-{property}-{variant}

Examples:
--weppy-button-color-action-bg
--weppy-button-height-md
--weppy-dropdown-padding-lg
```

## Button Colors

### Semantic Classification

| Color | Purpose | Use When |
|-------|---------|----------|
| **Action** (Green) | Critical operations | Send, Generate, Execute, Create |
| **Primary** (Blue) | Standard interactions | Add, Select, Save, Confirm |
| **Neutral** (Gray) | Secondary actions | Navigate, Settings, View |
| **Destructive** (Red) | Dangerous operations | Delete, Remove, Clear |
| **Warning** (Yellow) | Cautionary actions | Overwrite, Force, Retry |
| **Link** (Blue) | Text navigation | Documentation, External URLs |

### Color Token Pattern

```css
/* Action button */
background-color: var(--weppy-button-color-action-bg);
color: var(--weppy-button-color-action-text);

/* Hover state */
.button:hover {
    background-color: var(--weppy-button-color-action-bg-hover);
}

/* Disabled state */
.button:disabled {
    background-color: var(--weppy-button-color-disabled-bg);
    border-color: var(--weppy-button-color-disabled-border);
    color: var(--weppy-button-color-disabled-text);
}
```

## Button Sizes

| Size | Use When |
|------|----------|
| **xl** | Hero CTAs, most prominent action |
| **lg** | Primary actions, main workflows |
| **md** | Default, standard buttons |
| **sm** | Icon buttons, compact layouts |

### Size Token Pattern

All four tokens must be used together:

```css
.button-md {
    height: var(--weppy-button-height-md);
    padding: var(--weppy-button-padding-md);
    border-radius: var(--weppy-button-border-radius-md);
    font-size: var(--weppy-button-font-size-md);
}
```

## Other Components

### Dropdowns

```css
.dropdown {
    height: var(--weppy-dropdown-height-md);
    padding: var(--weppy-dropdown-padding-md);
    border-radius: var(--weppy-dropdown-border-radius-md);
    font-size: var(--weppy-dropdown-font-size-md);

    background-color: var(--weppy-dropdown-color-bg);
    border-color: var(--weppy-dropdown-color-border);
    color: var(--weppy-dropdown-color-text);
}

.dropdown:hover {
    background-color: var(--weppy-dropdown-color-bg-hover);
}
```

### Chips

```css
.chip {
    height: var(--weppy-chip-height-md);
    padding: var(--weppy-chip-padding-md);
    border-radius: var(--weppy-chip-border-radius-md);
    font-size: var(--weppy-chip-font-size-md);

    background-color: var(--weppy-chip-color-bg);
    color: var(--weppy-chip-color-text);
}
```

### Labels and Inputs

```css
.label {
    height: var(--weppy-label-height-md);
    padding: var(--weppy-label-padding-md);
    font-size: var(--weppy-label-font-size-md);
}

.input {
    height: var(--weppy-input-height-md);
    padding: var(--weppy-input-padding-md);
    border-radius: var(--weppy-input-border-radius-md);
    font-size: var(--weppy-input-font-size-md);
}
```

## Decision Tree

### 1. Choosing Color

**"What does this button do?"**

- Creates/Generates/Executes → **Action**
- Adds/Selects/Saves → **Primary**
- Navigates/Configures → **Neutral**
- Deletes/Clears → **Destructive**
- Overwrites/Forces → **Warning**
- Opens link → **Link**

### 2. Choosing Size

**"How important is this button?"**

- Most prominent → **xl**
- Primary action → **lg**
- Standard (default) → **md**
- Compact/icon → **sm**

## Do's and Don'ts

### DO

```css
/* Use tokens */
background-color: var(--weppy-button-color-action-bg);

/* Use all size tokens together */
height: var(--weppy-button-height-lg);
padding: var(--weppy-button-padding-lg);
border-radius: var(--weppy-button-border-radius-lg);
font-size: var(--weppy-button-font-size-lg);

/* Define hover states */
.button:hover {
    background-color: var(--weppy-button-color-action-bg-hover);
}
```

### DON'T

```css
/* Hardcode values */
background-color: rgba(80, 160, 100, 0.9); /* WRONG */
height: 24px; /* WRONG */

/* Mix size tiers */
height: var(--weppy-button-height-lg);
padding: var(--weppy-button-padding-md); /* WRONG: inconsistent */

/* Skip hover states */
.button {
    background-color: var(--weppy-button-color-primary-bg);
    /* WRONG: no hover defined */
}
```

## Quick Reference

**When styling a button:**
1. Determine semantic color (action/primary/neutral/destructive/warning/link)
2. Choose size tier (xl/lg/md/sm) - default to md
3. Apply all 4 size tokens
4. Apply color tokens (bg, text)
5. Define hover state
6. Define disabled state if needed
