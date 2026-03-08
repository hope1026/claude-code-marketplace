# HTML/CSS to UXML/USS Migration Checklist

## UXML Migration

- [ ] Replace `<div>` with `<ui:VisualElement>`
- [ ] Replace `<span>`, `<p>`, `<h1>`-`<h6>` with `<ui:Label>`
- [ ] Replace `<button>` with `<ui:Button>`
- [ ] Replace `<input>` with `<ui:TextField>`, `<ui:IntegerField>`, etc.
- [ ] Replace `<select>` with `<ui:DropdownField>`
- [ ] Replace `<img>` with `<ui:Image>`
- [ ] Replace `id=` with `name=`
- [ ] Replace `<link rel="stylesheet">` with `<Style src="..." />`
- [ ] Add namespace declarations to root `<ui:UXML>`

## USS Migration

- [ ] Replace `em`/`rem` units with `px`
- [ ] Remove `!important` (restructure specificity)
- [ ] Convert `display: block/inline` to `display: flex`
- [ ] Default flex-direction is `column` (not `row`)
- [ ] Replace `hsl()`/`hsla()` with `rgb()`/`rgba()` or hex
- [ ] Remove `::before`, `::after` pseudo-elements
- [ ] Replace `@media` with C# conditional stylesheet loading
- [ ] Replace `@import` with C# or UXML `<Style>`
- [ ] Convert `text-align` to `-unity-text-align`
- [ ] Convert `font-family` to `-unity-font` with `resource()` or `url()`
- [ ] Remove `z-index` (use UXML element order)
- [ ] Remove `box-shadow`/`text-shadow`
- [ ] Replace `transform` with C# `style.transform`

## Common Mistakes

### UXML

```xml
<!-- WRONG: Using HTML element names -->
<div class="container">  <!-- Not valid -->
<span>text</span>         <!-- Not valid -->

<!-- CORRECT: Use Unity element names -->
<ui:VisualElement class="container">
<ui:Label text="text" />

<!-- WRONG: Missing namespace prefix -->
<VisualElement>           <!-- Needs ui: prefix -->

<!-- CORRECT -->
<ui:VisualElement>

<!-- WRONG: Using id attribute -->
<ui:Button id="my-btn" /> <!-- Not valid -->

<!-- CORRECT: Use name attribute -->
<ui:Button name="my-btn" />
```

### USS

```css
/* WRONG: calc() not supported */
width: calc(100% - 20px);

/* WRONG: em/rem units */
font-size: 1.2em;

/* WRONG: grid layout */
display: grid;

/* WRONG: var inside function */
background-color: rgb(var(--r), var(--g), var(--b));

/* WRONG: !important */
color: red !important;

/* WRONG: text-transform */
text-transform: uppercase;

/* WRONG: CSS text-align */
text-align: center;
```

```css
/* CORRECT equivalents */
width: 80%;
font-size: 14px;
display: flex;
--my-bg: #FF0000;
background-color: var(--my-bg);
.parent .child { color: red; }  /* increase specificity */
-unity-text-align: middle-center;
```
