---
name: roblox-templates-creator
description: Search, verify, register Roblox assets and update game references. Use when populating asset registry, finding new assets, updating references, or user says "find assets", "add template assets", "search assets", "register assets", "update references".
argument-hint: "[category] [search-query]"
---

# Roblox Templates Creator

Create, verify, and register assets and terrain presets for the `roblox-templates` registry.

---

## Schemas

All assets and presets must follow schemas in `schemas/`:

| Schema | Purpose |
|--------|---------|
| `base-asset.schema.json` | Common fields for all assets |
| `category-schemas.json` | Category-specific requirements |
| `terrain-preset.schema.json` | Terrain preset structure |

---

## Validation Scripts

### Validate All Assets

```bash
./scripts/validate-all.sh [category]
```

**Examples:**
```bash
./scripts/validate-all.sh          # All categories
./scripts/validate-all.sh monsters  # Specific category
./scripts/validate-all.sh terrain-presets
```

### Validate Terrain Preset

```bash
./scripts/validate-terrain-preset.sh <preset-key>
```

### Validate Single Asset

```bash
./scripts/validate-asset.sh <category> <asset-id-or-name>
```

---

## Asset Schema (Required)

All assets MUST have:

```json
{
  "id": 12345678,
  "name": "Asset Name",
  "type": "subtype",
  "cameraConfig": {
    "distance": 2.0,
    "pitch": 15,
    "yaw": 45
  }
}
```

**Optional fields:** `query`, `creator`, `description`, `structure`, `recommended`

### Category-Specific Requirements

| Category | Additional Fields |
|----------|-------------------|
| monsters/npcs | `structure.hasHumanoid` recommended |
| weapons | `structure.className: "Tool"`, `structure.hasHandle` |
| maps | `suggestedSpawns` (min 3), `bounds`, `objectSpawns`, `cameraFocus` |
| effects | `structure.hasParticleEmitter` recommended |

---

## Camera Configuration

Every asset must include `cameraConfig`:

```json
{
  "cameraConfig": {
    "distance": 2.0,
    "pitch": 15,
    "yaw": 45
  }
}
```

### Default Values by Category

| Category | distance | pitch | yaw |
|----------|----------|-------|-----|
| monsters | 2.0 | 15 | 45 |
| weapons | 3.0 | 20 | 30 |
| items | 3.0 | 25 | 30 |
| effects | 2.5 | 20 | 30 |
| environment | 2.0 | 20 | 45 |
| npcs | 2.0 | 15 | 45 |
| maps | 1.2 | 25 | 30 |

### Camera Angle Convention

**Important:** `pitch` and `yaw` use **offset direction** (from target to camera), matching `focus_camera` parameters.

| Parameter | Description |
|-----------|-------------|
| `pitch` | Vertical angle (positive = looking down) |
| `yaw` | Horizontal angle (offset direction from target to camera) |
| `distance` | Distance multiplier from target |

### Camera Testing Workflow

```
1. insert_free_model(assetId)
2. get_bounds(path) → Get size/center
3. focus_camera with default values
4. User adjusts camera manually in Studio
5. get_camera_info() → Get current pitch/yaw/position
6. Calculate distance from camera position
7. Save cameraConfig with verified values
8. focus_camera with saved values → Verify it matches
```

### Getting Camera Values

After user adjusts camera manually:

```typescript
// Get current camera state
const cameraInfo = await mcp.get_camera_info({});

// cameraInfo returns:
// {
//   pitch: 23,        // Use directly in cameraConfig
//   yaw: 133,         // Use directly in cameraConfig
//   position: {...},
//   fieldOfView: 70
// }

// Calculate distance (camera position to model center)
const bounds = await mcp.get_bounds({ path: modelPath });
const dx = cameraInfo.position.x - bounds.center.x;
const dy = cameraInfo.position.y - bounds.center.y;
const dz = cameraInfo.position.z - bounds.center.z;
const actualDistance = Math.sqrt(dx*dx + dy*dy + dz*dz);
const effectiveExtent = Math.max(bounds.size.x, bounds.size.y, bounds.size.z);
const distanceMultiplier = actualDistance / effectiveExtent / 1.2 / 0.87;
// Round to 1 decimal: distance = Math.round(distanceMultiplier * 10) / 10;
```

---

## Asset Verification Workflow

### Step 1: Load Asset

```typescript
const inserted = await mcp.insert_free_model({
  assetId,
  focusCamera: false  // Don't auto-focus
});
```

### Step 2: Camera Focus

```typescript
// Use registered cameraConfig if exists, otherwise use category defaults
const cameraConfig = asset?.cameraConfig ?? defaultCameraConfig[category];

await mcp.focus_camera({
  targetPath: inserted.path,
  distance: cameraConfig.distance,
  angle: {
    pitch: cameraConfig.pitch,
    yaw: cameraConfig.yaw
  }
});
```

### Step 3: Camera Adjustment

1. Check if the asset is fully visible
2. If not optimal, **user adjusts camera manually in Studio**
3. Get current camera values:

```typescript
const cameraInfo = await mcp.get_camera_info({});
// Returns { pitch, yaw, position, ... }
// pitch and yaw can be used directly in cameraConfig
```

4. Calculate distance multiplier from position
5. Update cameraConfig with new values
6. Verify with focus_camera using saved values

### Step 4: Verify Bounds and Structure

```typescript
const bounds = await mcp.get_bounds({ path: inserted.path });
const instance = await mcp.get_instance({ path: inserted.path });
// Compare with registered values if exists
```

### Step 5: Spawn Validation (maps only)

```typescript
// Verify existing spawns
for (const spawn of asset.suggestedSpawns) {
  const ground = await mcp.find_ground({
    position: { x: spawn.x, y: 300, z: spawn.z },
    offset: 3
  });
}

// Or find new spawns
const spawns = await mcp.find_spawn_positions({
  searchArea: bounds,
  count: 5,
  minSpacing: 20
});
```

### Step 6: Visual Spawn Markers (maps only)

Create temporary markers to visually verify spawn positions:

```typescript
// Create spawn markers
const markers = suggestedSpawns.map((spawn, i) => ({
  className: "Part",
  name: `_SpawnMarker${i + 1}`,
  parentPath: "game.Workspace",
  properties: {
    Position: { x: spawn.x, y: spawn.y + 4, z: spawn.z },
    Size: { x: 4, y: 8, z: 4 },  // Player size
    Anchored: true,
    CanCollide: false,
    Transparency: 0.3,
    Color: { r: 0, g: 255, b: 100 },  // Green
    Material: "Neon"
  }
}));

await mcp.mass_create_instances({ instances: markers, focusCamera: false });

// After visual confirmation, delete markers
const markerPaths = markers.map(m => `game.Workspace.${m.name}`);
await mcp.mass_delete_instances({ paths: markerPaths });
```

### Step 7: Register or Update

```typescript
// Add/update in assets/{category}.json
// Update _meta.totalAssets if new
// Run validate-all.sh
```

---

## Terrain Preset Creation

### Phase 1: Design

Define concept with theme, difficulty, description.

### Phase 2: Test Parameters

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

### Phase 3: Determine Variance

Test 5+ seeds, analyze height distribution:

| Parameter | Recommended Variance |
|-----------|---------------------|
| baseHeight | 15-25% of base |
| amplitude | 20-30% of base |
| frequency | 20-30% of base |

### Phase 4: Validate Spawns

```typescript
const spawns = await mcp.find_spawn_positions({
  searchArea: preset.bounds,
  count: preset.spawnConfig.count,
  minSpacing: preset.spawnConfig.minSpacing
});
```

### Phase 5: Register

See `schemas/terrain-preset.schema.json` for required structure.

---

## Parameter Guidelines by Theme

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

## MCP Verification (Studio Required)

```
1. terrain_clear
2. terrain_generate (base params)
3. terrain_smooth (post-process)
4. find_ground × 5 points
5. find_spawn_positions
6. Repeat 2-5 with 3 seeds
7. Adjust variance if needed
```

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
# Create terrain preset
/roblox-templates-creator terrain-presets "canyon with river"

# Verify preset
/roblox-templates-creator verify terrain-presets rolling_hills

# Search and register asset
/roblox-templates-creator maps "medieval castle"

# Validate all
/roblox-templates-creator validate all
```
