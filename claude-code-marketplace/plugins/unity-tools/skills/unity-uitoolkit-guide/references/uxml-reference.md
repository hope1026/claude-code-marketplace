# UXML Reference

## UXML vs HTML: Key Differences

| Feature | HTML | UXML |
|---------|------|------|
| Root element | `<html>` | `<ui:UXML>` with namespace declarations |
| Element names | `<div>`, `<span>`, `<p>` | C# class names: `<ui:VisualElement>`, `<ui:Label>`, `<ui:Button>` |
| ID attribute | `id="foo"` | `name="foo"` |
| CSS class | `class="foo"` | `class="foo"` (same) |
| Stylesheet link | `<link rel="stylesheet">` | `<Style src="file.uss" />` |
| Template include | N/A | `<Template>` + `<Instance>` |
| Inline styles | `style="..."` | `style="..."` (same, but USS syntax) |
| Data binding | N/A | `binding-path="property"` |
| Default layout | Block flow | **Flexbox (column)** |

## Basic Structure

```xml
<?xml version="1.0" encoding="utf-8"?>
<ui:UXML
    xmlns:ui="UnityEngine.UIElements"
    xmlns:uie="UnityEditor.UIElements">

    <Style src="MyStyles.uss" />

    <ui:VisualElement name="root" class="container">
        <ui:Label name="title" text="Hello" class="title-label" />
        <ui:Button name="submit-btn" text="Submit" class="action-button" />
    </ui:VisualElement>
</ui:UXML>
```

## Built-in Elements

### Containers & Layout

| Element | Purpose | Key Attributes |
|---------|---------|----------------|
| `VisualElement` | Base container (like `<div>`) | `name`, `class`, `style`, `picking-mode`, `tooltip`, `focusable` |
| `ScrollView` | Scrollable container | `mode`, `show-horizontal-scroller`, `show-vertical-scroller` |
| `ListView` | Virtualized list | `item-height` |
| `Foldout` | Collapsible section | `text`, `value` (open/closed) |
| `Box` | Container with border | — |
| `GroupBox` | Labeled group | `text` |

### Controls

| Element | Purpose | Key Attributes |
|---------|---------|----------------|
| `Button` | Click button | `text` |
| `RepeatButton` | Auto-repeat on hold | `text`, `delay`, `interval` |
| `Toggle` | Checkbox | `text`, `value` |
| `Label` | Text display | `text` |
| `Image` | Image display | — |

### Input Fields

| Element | Purpose | Key Attributes |
|---------|---------|----------------|
| `TextField` | Text input | `value`, `multiline`, `max-length` |
| `IntegerField` | Integer input | `value` |
| `FloatField` | Float input | `value` |
| `LongField` | Long input | `value` |
| `DoubleField` | Double input | `value` |
| `Vector2Field` | 2D vector | — |
| `Vector3Field` | 3D vector | — |
| `Vector4Field` | 4D vector | — |
| `RectField` | Rectangle | — |
| `BoundsField` | Bounds | — |

### Selection

| Element | Purpose | Key Attributes |
|---------|---------|----------------|
| `Slider` | Float slider | `low-value`, `high-value`, `direction`, `page-size` |
| `SliderInt` | Integer slider | `low-value`, `high-value`, `direction`, `page-size` |
| `MinMaxSlider` | Range slider | `low-limit`, `high-limit`, `min-value`, `max-value` |
| `DropdownField` | Dropdown select | `choices`, `index` |
| `EnumField` | Enum selector | `type`, `value` |
| `RadioButton` | Single choice | `text`, `value` |
| `RadioButtonGroup` | Radio group | `choices` |

### Editor-Only (UnityEditor.UIElements)

| Element | Purpose | Key Attributes |
|---------|---------|----------------|
| `PropertyField` | SerializedProperty editor | `binding-path`, `label` |
| `ObjectField` | Object picker | `allow-scene-objects`, `type` |
| `ColorField` | Color picker | `show-eye-dropper`, `show-alpha`, `hdr` |
| `CurveField` | Animation curve | — |
| `GradientField` | Gradient editor | — |
| `Toolbar` | Toolbar container | — |
| `ToolbarButton` | Toolbar button | `text` |
| `ToolbarToggle` | Toolbar toggle | `text` |
| `ToolbarMenu` | Toolbar dropdown | `text` |
| `ToolbarSearchField` | Search input | — |

## Common Attributes

All elements inherit from `VisualElement`:

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `name` | Unique ID (query with `Q<T>("name")` or `#name` in USS) | `name="submit-btn"` |
| `class` | USS classes (space-separated) | `class="btn btn--primary"` |
| `style` | Inline USS styles | `style="width: 100px;"` |
| `picking-mode` | Mouse event handling | `Position` (default) or `Ignore` |
| `tooltip` | Hover tooltip text | `tooltip="Click to submit"` |
| `focusable` | Can receive focus | `focusable="true"` |
| `tabindex` | Tab navigation order | `tabindex="1"` |
| `binding-path` | SerializedProperty binding | `binding-path="myField"` |

## Templates (Reusable Components)

### Define and use templates:

```xml
<!-- Main.uxml -->
<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <ui:Template src="PlayerCard.uxml" name="PlayerCard" />

    <ui:Instance template="PlayerCard" name="player1" />
    <ui:Instance template="PlayerCard" name="player2" />
</ui:UXML>
```

### Override attributes in instances:

```xml
<ui:Instance template="PlayerCard" name="player1">
    <ui:AttributeOverrides element-name="player-name" text="Alice" />
    <ui:AttributeOverrides element-name="player-score" text="100" />
</ui:Instance>
```

**Limitations:**
- Cannot override `name` or `style` attributes
- Matches by `element-name`, not CSS selectors

## File References

| Method | Syntax | Use When |
|--------|--------|----------|
| `src` (relative path) | `src="./Card.uxml"` | Default — provides import-time error checking |
| `path` (Resources) | `path="UI/Card"` | Asset in `Resources/` folder (no extension needed) |

## UXML + USS Integration

### Linking Stylesheets

```xml
<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <Style src="MyComponent.uss" />

    <ui:VisualElement class="container">
        <ui:Label text="Hello" class="title" />
    </ui:VisualElement>
</ui:UXML>
```

### Querying Elements in C#

```csharp
// By name (matches #name in USS)
Button submitBtn = rootVisualElement.Q<Button>("submit-btn");

// By class
VisualElement panel = rootVisualElement.Q(className: "panel");

// By type
Label label = rootVisualElement.Q<Label>();

// Multiple results
UQueryBuilder<Button> allButtons = rootVisualElement.Query<Button>();
```

### Loading USS from C#

```csharp
// Load and add stylesheet
StyleSheet styleSheet = AssetDatabase.LoadAssetAtPath<StyleSheet>("Assets/UI/MyStyles.uss");
rootVisualElement.styleSheets.Add(styleSheet);

// Or from Resources
StyleSheet styleSheet = Resources.Load<StyleSheet>("UI/MyStyles");
rootVisualElement.styleSheets.Add(styleSheet);
```

### BEM Naming Convention (Recommended by Unity)

```
block__element--modifier
```

```xml
<ui:VisualElement class="card">
    <ui:VisualElement class="card__header">
        <ui:Label class="card__title" text="Title" />
    </ui:VisualElement>
    <ui:VisualElement class="card__body">
        <ui:Label class="card__content" text="Content" />
    </ui:VisualElement>
    <ui:Button class="card__action card__action--primary" text="OK" />
    <ui:Button class="card__action card__action--secondary" text="Cancel" />
</ui:VisualElement>
```

```css
.card { flex-direction: column; padding: 8px; }
.card__header { flex-direction: row; margin-bottom: 4px; }
.card__title { font-size: 16px; -unity-font-style: bold; }
.card__body { flex-grow: 1; }
.card__action { height: 28px; }
.card__action--primary { background-color: #3A72D6; color: white; }
.card__action--secondary { background-color: #555555; color: white; }
```
