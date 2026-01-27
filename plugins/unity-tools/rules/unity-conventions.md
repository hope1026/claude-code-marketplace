# Unity Conventions

## Unity Lifecycle

**Reserved methods:**
- `Update` / `FixedUpdate` / `LateUpdate` - Only for Unity lifecycle usage

**Avoid in Update:**
- Per-frame allocations
- `Enum.GetValues()` in hot paths
- Creating new collections

```csharp
// WRONG
void Update()
{
    List<Item> items = new List<Item>(); // Allocation every frame!
}

// CORRECT
private readonly List<Item> _itemsCache = new List<Item>();

void Update()
{
    _itemsCache.Clear();
    // Reuse cached list
}
```

## Collections

Reuse empty collections instead of allocating:

```csharp
// CORRECT
private static readonly List<int> EMPTY_LIST = new List<int>();

public List<int> GetItems()
{
    if (_items.Count == 0)
        return EMPTY_LIST;
    return _items;
}
```


## Performance and Memory

### Defer and Batch Work (Dirty Flags)

- **Storage/DB writes:** Avoid writing immediately on every change. Mark dirty and flush once on the next frame or on a scheduled tick.
- **UI refresh:** When values change frequently, set a dirty flag and refresh once per frame instead of per change.

```csharp
// CORRECT: Defer storage flush
private bool _isDirty;

public void SetValue(int value_)
{
    _value = value_;
    _isDirty = true;
}

private void LateUpdate()
{
    if (!_isDirty)
        return;

    _isDirty = false;
    SaveToStorage();
}
```

```csharp
// CORRECT: Batch UI refresh
private bool _isUiDirty;

public void UpdateStat(int value_)
{
    _stat = value_;
    _isUiDirty = true;
}

private void Update()
{
    if (!_isUiDirty)
        return;

    _isUiDirty = false;
    RefreshUi();
}
```

### Return Read-Only Containers

- Prefer `IReadOnlyList<T>`, `IReadOnlyCollection<T>`, or `ReadOnlyCollection<T>` for return types.
- Avoid allocating new lists just to return data unless absolutely necessary.

```csharp
// CORRECT
private readonly List<Item> _items = new List<Item>();

public IReadOnlyList<Item> GetItems()
{
    return _items;
}
```

```csharp
// AVOID: Allocates a new list on every call
public List<Item> GetItems()
{
    return new List<Item>(_items);
}
```

## UI Toolkit (Editor + Runtime)

### UXML-First Approach

Static structure goes in UXML:

```xml
<!-- CORRECT: Structure in UXML -->
<ui:VisualElement name="container">
    <ui:Label name="title" />
    <ui:Button name="submit-btn" text="Submit" />
</ui:VisualElement>
```

Dynamic elements only in code:

```csharp
// CORRECT: Only dynamic elements in code
for (int i = 0; i < items.Count; i++)
{
    VisualElement item = new VisualElement();
    _container.Add(item);
}
```

### USS-First Approach

Static styles in USS:

```css
/* CORRECT: Static styles in USS */
.container {
    flex-direction: column;
    padding: 10px;
}
```

Dynamic styling only in code:

```csharp
// CORRECT: Only dynamic styles in code
element.style.backgroundColor = isActive
    ? Color.green
    : Color.gray;
```

### Text Rendering

Always use advanced text generator:

```css
Label, Button, TextField {
    -unity-text-generator: advanced;
}
```

### Layout Guidelines

- **Editor windows:** Use flex layout
- **Runtime UI:** Can use absolute layout when needed

## Editor Window Lifecycle

```csharp
public class MyEditorWindow : EditorWindow
{
    private Button _button;

    // Register callbacks here
    public void CreateGUI()
    {
        _button = rootVisualElement.Q<Button>("my-button");
        _button.clicked += HandleButtonClicked;
    }

    // Unregister callbacks here
    private void OnDisable()
    {
        if (_button != null)
            _button.clicked -= HandleButtonClicked;
    }

    private void HandleButtonClicked()
    {
        // Handle click
    }
}
```

## Quick Reference

| Rule | Do | Don't |
|------|-----|-------|
| Allocations | Reuse cached instances | Allocate in Update |
| UI Structure | UXML for static | Code for static |
| UI Styles | USS for static | Code for static |
| Text | Use advanced generator | Default generator |
| Callbacks | Register in CreateGUI | Register in constructor |
| Cleanup | Unregister in OnDisable | Leave callbacks dangling |

# C# Coding Style

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes/Structs/Enums | `PascalCase` | `UserManager` |
| Methods | `PascalCase` | `GetUserById` |
| Private fields | `_camelCase` | `_userId` |
| Public fields | `PascalCase` | `UserId` |
| Parameters | `camelCase_` | `userId_` |
| Out parameters | `outCamelCase_` | `outResult_` |
| Constants | `UPPER_CASE` | `MAX_RETRIES` |
| Enum values | `UPPER_CASE` | `NONE`, `ACTIVE` |
| Callbacks | Prefix `Handle` | `HandleOnClicked` |
| External handlers | Prefix `EventOn` | `EventOnChanged` |
| Internal hooks | Suffix `Pre`/`Post` | `OnSavePre`, `OnSavePost` |
| External references | Suffix `Ref` | `_userManagerRef` |

## External References

When storing externally-created instances as member fields, suffix with `Ref`:

```csharp
// CORRECT: External reference with Ref suffix
public class ItemView
{
    private readonly ItemManager _itemManagerRef;

    public ItemView(ItemManager itemManager_)
    {
        _itemManagerRef = itemManager_;
    }
}

// WRONG: No suffix for external reference
public class ItemView
{
    private readonly ItemManager _itemManager; // Missing Ref suffix!

    public ItemView(ItemManager itemManager_)
    {
        _itemManager = itemManager_;
    }
}
```

## Type Naming

**Enums:**
- Regular: suffix `Type` (`FooType`)
- Flags: suffix `Flags` (`FooFlags`)

**Parent Classes:**
- Interface: suffix `Interface` (`FooInterface`)
- Abstract: suffix `Abstract` (`FooAbstract`)
- Base: suffix `Base` (`FooBase`)

**Child Classes:**
- `ParentName(without suffix) + ChildSpecificName`
- `FooBase` → `FooBar`, `FooBaz`

## Manager vs Controller

**Manager** - Globally accessible singleton/static object:
- Entry point accessible from anywhere
- Manages entire app/system
- Examples: `AIAgentManager`, `AudioManager`, `SceneManager`

**Controller** - Object that controls functionality within a specific class:
- Exists as a member variable of Manager or other classes
- Handles logic for a specific domain
- Examples: `ContextController`, `SessionController`, `MessageController`

```csharp
// Manager: Global entry point
public class AIAgentManager
{
    public static AIAgentManager Instance { get; }

    // Controller: Internal functionality control
    private readonly ContextController _contextController;
    private readonly SessionController _sessionController;
    private readonly MessageController _messageController;
}

// Folder structure
// ContextSystem/           <- System folder
// └── ContextController.cs <- Functionality control class
```

## Folder Structure

```
Foo/
├── FooBase.cs
└── Extends/
    └── FooBar.cs

Bar/
├── BarInterface.cs
└── Implements/
    └── BarAlpha.cs
```

## Code Style Rules

**ALWAYS:**
- Explicit types (no `var`)
- Auto-properties when no logic in getter/setter
- One type per file, filename = type name
- Inner types at top of class

**NEVER:**
- `#region` (unless explicitly requested)
- Callback method chaining (use local functions)
- `var` keyword

## Namespace

```csharp
// CORRECT: Single-level namespace
namespace AIProvider.Image

// WRONG: Nested namespace
namespace AIProvider.Image.Providers.Chat
```

## Collections

```csharp
// Return immutable interfaces
public IReadOnlyList<int> GetValues()
{
    return _values;
}

// Empty collections: use shared instances
public IReadOnlyList<int> GetEmptyValues()
{
    return Array.Empty<int>();
}
```

## Error Handling

**NO `throw` statements.** Use return values:

```csharp
// CORRECT
public bool TryGetUser(string id_, out User outUser_)
{
    outUser_ = _users.GetValueOrDefault(id_);
    return outUser_ != null;
}

// WRONG
public User GetUser(string id_)
{
    if (!_users.ContainsKey(id_))
        throw new KeyNotFoundException(); // NO!
    return _users[id_];
}
```

## Boxing Avoidance

**NO nullable value types (`T?`).** Use explicit invalid values:

```csharp
// CORRECT
public enum StatusType
{
    NONE = 0,  // Invalid/default
    ACTIVE,
    INACTIVE
}

// WRONG
public StatusType? GetStatus() // Nullable enum!
```

## Method Design

**NO fluent API / method chaining:**

```csharp
// CORRECT
public void SetName(string name_)
{
    _name = name_;
}

// WRONG
public Builder SetName(string name_)
{
    _name = name_;
    return this; // Chaining!
}
```

## Comments Policy

- Use self-documenting names first
- Comment only for non-obvious logic or workarounds
- No redundant comments restating code

## Code Quality Checklist

Before completing work:
- [ ] Explicit types used (no var)
- [ ] Naming conventions followed
- [ ] One type per file
- [ ] No throw statements
- [ ] No nullable value types
- [ ] No method chaining
- [ ] Collections return immutable interfaces
