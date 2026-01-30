---
name: roblox-templates-creator
description: Search, verify, register Roblox assets and update game references. Use when populating asset registry, finding new assets, updating references, or user says "find assets", "add template assets", "search assets", "register assets", "update references".
argument-hint: "[category] [search-query]"
---

# Roblox Templates Creator

Create, verify, and register assets for the `roblox-templates` registry.

---

## File Structure

### Environment Assets (maps.json)

```
roblox-templates/assets/maps/
├── maps.json                              # Entry point - all environments
└── sources/
    ├── terrain-presets-source.json        # Terrain generation configs
    ├── standalone-maps-source.json        # Large maps (500+ studs)
    ├── hybrid-maps-source.json            # Medium maps (200-650 studs)
    └── addon-structures-source.json       # Small structures (<200 studs)
```

### Other Assets

```
roblox-templates/assets/
├── monsters.json
├── weapons.json
├── items.json
├── effects.json
├── environment.json    # Props, buildings (NOT maps)
└── npcs.json
```

---

## Schemas

Located in `schemas/`:

| Schema | Purpose |
|--------|---------|
| `base-asset.schema.json` | Common fields for all assets |
| `category-schemas.json` | Category-specific requirements |
| `terrain-preset.schema.json` | Terrain preset structure |
| `maps.schema.json` | maps.json registry structure |

---

## Asset Schema

### Required Fields (All Assets)

```json
{
  "id": 12345678,
  "name": "Asset Name",
  "type": "subtype",
  "cameraConfig": {
    "distance": 2.0,
    "offset": { "x": 1, "y": 0.4, "z": 1 }
  }
}
```

**Optional:** `query`, `creator`, `description`, `structure`, `recommended`

### Category Requirements

| Category | Required Fields | Notes |
|----------|-----------------|-------|
| monsters | `cameraConfig` | 5-20 studs typical |
| weapons | `cameraConfig`, `structure.className: "Tool"` | 2-6 studs typical |
| items | `cameraConfig` | Collectibles, consumables |
| effects | `cameraConfig` | Particles, beams |
| npcs | `cameraConfig` | May have animations |
| maps | See Map Source Requirements | Entry via maps.json |

### Map Source Requirements

| Source | Size | Required Fields |
|--------|------|-----------------|
| `standalone-maps` | 500+ studs | bounds, suggestedSpawns(3+), objectSpawns |
| `hybrid-maps` | 200-650 studs | bounds, suggestedSpawns, compatibleTerrains |
| `addon-structures` | <200 studs | bounds, compatibleTerrains |
| `terrain-presets` | N/A | generation params, layers |

**Note:** 1 stud ≈ 28cm. Player character is ~5 studs tall.

---

## Camera Configuration

### Understanding distance

**`distance` is absolute distance in studs**, not a multiplier.

| Asset Size | Typical distance |
|------------|------------------|
| Small (1-10 studs) | 15-30 studs |
| Medium (10-50 studs) | 50-100 studs |
| Large (50-200 studs) | 150-400 studs |
| Maps (500+ studs) | 500-1000 studs |

### Offset Convention

`offset` is a direction vector from target to camera (normalized internally).

- `x`: Horizontal (positive = camera to the right of target)
- `y`: Vertical (positive = camera above target)
- `z`: Depth (positive = camera in front of target)

### Calculating cameraConfig from Studio

```typescript
const cameraInfo = await mcp.get_camera_info({});
const bounds = await mcp.get_bounds({ path: modelPath });

// Direction from target to camera
const dx = cameraInfo.position.x - bounds.center.x;
const dy = cameraInfo.position.y - bounds.center.y;
const dz = cameraInfo.position.z - bounds.center.z;

// Actual distance in studs
const distance = Math.round(Math.sqrt(dx*dx + dy*dy + dz*dz));

// Normalize for offset (direction vector)
const offset = {
  x: Math.round(dx / distance * 10) / 10,
  y: Math.round(dy / distance * 10) / 10,
  z: Math.round(dz / distance * 10) / 10
};

const cameraConfig = { distance, offset };
```

---

## Verification Workflows

Three verification levels:

| Level | Target | Entry Point |
|-------|--------|-------------|
| **Map Verification** | maps.json environments | maps.json |
| **Map Source Verification** | sources/*.json details | source files |
| **Asset Verification** | monsters, weapons, items, etc. | asset files |

---

### 1. Map Verification (maps.json)

**Entry Point:** Always read `maps.json` first

| Request | Action |
|---------|--------|
| "verify maps" | maps.json → show themes list → user selects |
| "verify forest theme" | maps.json → filter by themes.forest.environmentIds |
| "verify Goblin Town Map" | Find environment in maps.json |

#### Environment Types

| Type | ID Format | Source |
|------|-----------|--------|
| `terrain_only` | `env-t-XXX` | terrain-presets-source.json |
| `map_only` | `env-m-XXX` | standalone-maps or hybrid-maps |
| `terrain_with_map` | `env-tm-XXX` | hybrid-maps-source.json |
| `terrain_with_structures` | `env-ts-XXX` | addon-structures-source.json |

#### Map Verification Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CLEANUP - Delete existing test map                           │
│    search_by_name("_TestMap") → mass_delete_instances           │
├─────────────────────────────────────────────────────────────────┤
│ 2. LOAD - Load map                                              │
│    terrain_only: terrain_generate(preset)                       │
│    map_only: insert_free_model(assetId)                         │
│    terrain_with_*: terrain_generate + insert_free_model         │
├─────────────────────────────────────────────────────────────────┤
│ 3. CAMERA - Focus camera                                        │
│    get_bounds → focus_camera                                    │
├─────────────────────────────────────────────────────────────────┤
│ 4. VALIDATE - Verify spawn points and values                    │
│    suggestedSpawns (min 3), objectSpawns, bounds                │
├─────────────────────────────────────────────────────────────────┤
│ 5. MARKERS - Create spawn point markers                         │
│    mass_create_instances(_SpawnMarker*)                         │
├─────────────────────────────────────────────────────────────────┤
│ 6. USER CONFIRM - Ask user                                      │
│    AskUserQuestion:                                             │
│    - Adjust camera?                                             │
│    - Adjust marker/spawn positions?                             │
│    - Other modifications?                                       │
│    - Play test from random spawn?                               │
├─────────────────────────────────────────────────────────────────┤
│ 7. ADJUST (optional) - Apply user adjustments                   │
│    get_camera_info → update cameraConfig                        │
│    Reposition markers, etc.                                     │
├─────────────────────────────────────────────────────────────────┤
│ 8. FINALIZE - Final confirmation                                │
│    Delete markers → Update JSON (if needed) → Complete          │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. Map Source Verification (Sub-categories)

Map sources verify detailed data in `sources/` folder.

Same as **Map Verification workflow** plus additional checks:

```
[Map Verification Steps 1-8]
        +
┌─────────────────────────────────────────────────────────────────┐
│ TERRAIN VARIANCE (terrain_only, terrain_with_* types only)      │
│                                                                 │
│ 1. Random seed change test (3-5 times)                          │
│    terrain_clear → terrain_generate({ seed: random })           │
│                                                                 │
│ 2. Verify spawn validity for each seed                          │
│    find_spawn_positions → ensure minimum 3 spawns               │
│                                                                 │
│ 3. Report variance results to user                              │
└─────────────────────────────────────────────────────────────────┘
```

#### Source-Specific Checks

**standalone-maps:**
- Verify size > 500 studs
- suggestedSpawns minimum 3, evenly distributed
- objectSpawns minimum 3

**hybrid-maps:**
- Verify size 200-650 studs
- Test standalone placement
- Test terrain combo placement
- Verify compatibleTerrains list

**addon-structures:**
- Verify size < 200 studs
- Test placement on compatible terrains
- compatibleTerrains required

---

### 3. Asset Verification (monsters, weapons, items, etc.)

#### Asset Verification Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CLEANUP - Delete existing test asset                         │
│    search_by_name("_TestAsset") → mass_delete_instances         │
├─────────────────────────────────────────────────────────────────┤
│ 2. LOAD - Load asset                                            │
│    insert_free_model(assetId) → rename to _TestAsset_*          │
├─────────────────────────────────────────────────────────────────┤
│ 3. CAMERA - Focus camera                                        │
│    get_bounds → focus_camera(cameraConfig)                      │
├─────────────────────────────────────────────────────────────────┤
│ 4. ANIMATION (if applicable) - Verify animations                │
│    If asset has AnimationController/Animator:                   │
│    - Check animation list                                       │
│    - Play test representative animation                         │
├─────────────────────────────────────────────────────────────────┤
│ 5. USER CONFIRM - Ask user                                      │
│    AskUserQuestion:                                             │
│    - Adjust camera focus?                                       │
│    - Other modifications?                                       │
├─────────────────────────────────────────────────────────────────┤
│ 6. ADJUST (optional) - If camera adjustment needed              │
│    get_camera_info → calculate cameraConfig → update            │
├─────────────────────────────────────────────────────────────────┤
│ 7. FINALIZE - Complete                                          │
│    Delete test asset → Update JSON (if needed)                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Category-Specific Checks

| Category | Additional Checks |
|----------|-------------------|
| monsters | cameraConfig, animation verification |
| weapons | structure.className = "Tool" |
| npcs | animations, dialogue capability |
| effects | ParticleEmitter/Beam playback |

---

## Spawn Generation

### Requirements

- Minimum **3 spawn positions** per map
- Evenly distributed across map bounds

### Grid-Based Distribution

```typescript
const bounds = await mcp.get_bounds({ path: inserted.path });
const gridX = Math.max(2, Math.floor(bounds.size.x / 100));
const gridZ = Math.max(2, Math.floor(bounds.size.z / 100));

const suggestedSpawns = [];
for (let gx = 0; gx < gridX; gx++) {
  for (let gz = 0; gz < gridZ; gz++) {
    const testX = bounds.center.x - bounds.size.x/2 + (gx + 0.5) * bounds.size.x / gridX;
    const testZ = bounds.center.z - bounds.size.z/2 + (gz + 0.5) * bounds.size.z / gridZ;

    const ground = await mcp.find_ground({
      position: { x: testX, y: 500, z: testZ },
      offset: 3
    });

    if (ground.found) {
      suggestedSpawns.push({
        x: Math.round(ground.position.x),
        y: Math.round(ground.position.y),
        z: Math.round(ground.position.z)
      });
    }
  }
}
```

### Visual Markers

```typescript
// Create markers
const markers = suggestedSpawns.map((spawn, i) => ({
  className: "Part",
  name: `_SpawnMarker${String(i + 1).padStart(2, '0')}`,
  parentPath: "game.Workspace",
  properties: {
    Position: { x: spawn.x, y: spawn.y + 4, z: spawn.z },
    Size: { x: 4, y: 8, z: 4 },
    Anchored: true, CanCollide: false, Transparency: 0.3,
    Color: { r: 0, g: 255, b: 100 }, Material: "Neon"
  }
}));

await mcp.mass_create_instances({ instances: markers, focusCamera: false });

// Delete markers after verification
await mcp.mass_delete_instances({
  paths: markers.map(m => `game.Workspace.${m.name}`)
});
```

---

## Terrain Preset Creation

### Workflow

1. **Design** - Define theme, difficulty, description
2. **Test Parameters**:
```typescript
await mcp.terrain_clear({ region: bounds });
await mcp.terrain_generate({
  region: bounds,
  baseHeight: 40,
  amplitude: 35,
  frequency: 0.012,
  layers: [
    { material: "Water", maxHeight: 10 },
    { material: "Grass", maxHeight: 60 },
    { material: "Rock", maxHeight: 100 }
  ]
});
```
3. **Determine Variance** - Test 5+ seeds, analyze height distribution
4. **Validate Spawns** - `find_spawn_positions`
5. **Register** - Add to `terrain-presets-source.json` and `maps.json`

### Parameter Guidelines

| Theme | baseHeight | amplitude | frequency |
|-------|------------|-----------|-----------|
| mountain | 40-50 | 45-60 | 0.006-0.010 |
| plains | 30-40 | 20-30 | 0.010-0.015 |
| desert | 25-35 | 25-35 | 0.008-0.012 |
| island | 20-30 | 35-45 | 0.005-0.008 |
| snow | 45-55 | 50-70 | 0.006-0.009 |
| volcanic | 35-45 | 45-60 | 0.007-0.010 |
| forest | 20-30 | 15-25 | 0.012-0.018 |
| flat | 8-12 | 0-3 | 0.015-0.025 |

---

## Adding New Environment

1. Add asset to appropriate `sources/*.json`
2. Add environment entry to `maps.json`:
```json
{
  "id": "env-m-009",
  "type": "map_only",
  "theme": "forest",
  "name": "New Forest Map",
  "assetId": 12345678,
  "source": "standalone-maps",
  "description": "Description here"
}
```
3. Update theme's `environmentIds`:
```json
"themes": {
  "forest": {
    "environmentIds": ["env-t-007", "env-m-006", "env-m-009"]
  }
}
```
4. Run verification workflow

---

## Language Policy

| Field | Language |
|-------|----------|
| `name` | English |
| `nameKo` | Korean (optional) |
| `description` | English |
| `theme` | English |

---

## Usage Examples

```bash
# Show themes list for selection
/roblox-templates-creator verify maps

# Verify specific environment
/roblox-templates-creator verify env-m-002
/roblox-templates-creator verify "Goblin Town Map"

# Search and register new map
/roblox-templates-creator search "large forest adventure"

# Create terrain preset
/roblox-templates-creator terrain "canyon with river"

# Verify asset category
/roblox-templates-creator verify monsters
```
