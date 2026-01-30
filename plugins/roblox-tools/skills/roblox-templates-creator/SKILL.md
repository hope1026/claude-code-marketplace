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
├── maps.json                              # Entry point - all environments with spawnZones
└── sources/
    ├── terrain-presets.json               # Terrain generation configs
    ├── standalone-maps.json               # Pre-built maps (all sizes)
    └── decorations.json                   # Environment props + structures
```

### Schemas

```
roblox-templates/schemas/
├── spawn-zone.schema.json                 # Spawn zone definitions
├── layout-rules.schema.json               # Asset placement rules
├── map-randomization.schema.json          # Randomization settings
└── decorations.schema.json                # Decoration sets
```

### Other Assets

```
roblox-templates/assets/
├── monsters.json
├── weapons.json
└── items.json
```

---

## Spawn Zone System

### Zone Types

| Type | Use Case | Schema |
|------|----------|--------|
| `aabb` | Rectangular areas (most common) | `{ min: Vector3, max: Vector3 }` |
| `sphere` | Circular areas (clearings, oasis) | `{ center: Vector3, radius: number }` |

### Zone Tags

| Tag | Description |
|-----|-------------|
| `player` | Player spawn area |
| `monster` | Monster spawn area |
| `object` | Item/collectible spawn area |
| `safe` | Safe zone (no combat) |
| `combat` | Combat zone |
| `boss` | Boss encounter zone |

### Spawn Zone Schema

```json
"spawnZones": [
  {
    "id": "player_main",
    "type": "aabb",
    "volume": {
      "min": { "x": -50, "y": 20, "z": -50 },
      "max": { "x": 50, "y": 40, "z": 50 }
    },
    "tags": ["player", "safe"],
    "weight": 1.0,
    "heightOffset": 3
  }
]
```

> **Note:** All coordinates are in **studs** (Roblox unit). 1 stud ≈ 28cm.

---

## Layout Rules System

For `terrain_with_decorations` environments, use `layoutRules` to define random placement:

```json
"layoutRules": [
  {
    "id": "forest_trees_rule",
    "decorationSet": "forest_trees",
    "zones": ["forest_zone"],
    "density": { "min": 20, "max": 40 },
    "constraints": {
      "minSpacing": 8,
      "avoidTags": ["path", "spawn"],
      "terrainMaterials": ["Grass", "Ground"]
    },
    "randomization": {
      "rotation": { "min": 0, "max": 360 },
      "scale": { "min": 0.8, "max": 1.2 }
    }
  }
]
```

---

## Randomization System

```json
"randomization": {
  "seedMode": "auto",           // "auto" | "fixed" | "session" | "daily"
  "fixedSeed": null,            // Used when seedMode is "fixed"
  "variantCount": 5,            // Number of variants
  "affectedSystems": ["decorations", "spawns", "terrain"]
}
```

---

## Verification Workflows

### 1. Map Verification (maps.json)

**Entry Point:** Always read `maps.json` first

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CLEANUP - Delete existing test map                           │
│    search_by_name("_TestMap") → mass_delete_instances           │
│    search_by_name("_ZoneMarker") → mass_delete_instances        │
│    search_by_name("_DecoMarker") → mass_delete_instances        │
├─────────────────────────────────────────────────────────────────┤
│ 2. LOAD - Load map by type                                      │
│    terrain_only: terrain_generate(preset)                       │
│    map_only: insert_free_model(assetId)                         │
│    terrain_with_map: terrain_generate + insert_free_model       │
│    terrain_with_decorations: terrain_generate + load decos      │
├─────────────────────────────────────────────────────────────────┤
│ 3. DECORATIONS - Load decoration sets (terrain_with_decorations)│
│    Read decorations.json for referenced decoration sets         │
│    Apply layoutRules: density, constraints, randomization       │
│    Create _DecoMarker for each placement zone                   │
├─────────────────────────────────────────────────────────────────┤
│ 4. CAMERA - Focus camera                                        │
│    get_bounds → focus_camera                                    │
├─────────────────────────────────────────────────────────────────┤
│ 5. VALIDATE - Verify spawn zones + decoration conflicts         │
│    Check spawnZones array (min 1 player zone)                   │
│    Verify zone bounds within map bounds                         │
│    Check layoutRules.avoidTags includes spawn zone tags         │
│    Verify no decoration placement overlaps player spawn zones   │
├─────────────────────────────────────────────────────────────────┤
│ 6. SAMPLE ASSETS - Load sample assets from registry             │
│    For each zone tag (player/monster/object):                   │
│      - Load random asset from roblox-templates/assets/          │
│      - get_bounds to measure actual size                        │
│      - Verify asset fits within zone dimensions                 │
│      - Place at zone center for visual inspection               │
│    Sample naming: _SampleAsset_{tag}_{assetId}                  │
├─────────────────────────────────────────────────────────────────┤
│ 7. MARKERS - Create spawn zone markers (AABB/Sphere)            │
│    Create semi-transparent box/sphere for each zone             │
│    Color by tag: green=player, red=monster, blue=object         │
│    Yellow outline for decoration placement zones                │
├─────────────────────────────────────────────────────────────────┤
│ 8. USER CONFIRM - Ask user                                      │
│    - Does asset fit well in the spawn zone?                     │
│    - Adjust zone positions/sizes?                               │
│    - Adjust decoration density/placement?                       │
│    - Adjust camera?                                             │
│    - Play test from random spawn in zone?                       │
├─────────────────────────────────────────────────────────────────┤
│ 9. ADJUST (optional) - Apply user adjustments                   │
│    Update spawnZones in maps.json                               │
│    Update layoutRules if decoration changes needed              │
├─────────────────────────────────────────────────────────────────┤
│10. FINALIZE - Complete                                          │
│    Delete markers (_ZoneMarker, _DecoMarker)                    │
│    Delete sample assets (_SampleAsset_*)                        │
│    Update JSON files (maps.json, decorations.json if needed)    │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Zone Marker Visualization

Create visual markers for spawn zones:

**AABB Zone Marker:**
```typescript
const zone = spawnZone.volume; // { min, max }
const size = {
  x: zone.max.x - zone.min.x,
  y: zone.max.y - zone.min.y,
  z: zone.max.z - zone.min.z
};
const center = {
  x: (zone.min.x + zone.max.x) / 2,
  y: (zone.min.y + zone.max.y) / 2,
  z: (zone.min.z + zone.max.z) / 2
};

await mcp.create_instance_with_properties({
  className: "Part",
  name: `_ZoneMarker_${spawnZone.id}`,
  parentPath: "game.Workspace",
  properties: {
    Position: center,
    Size: size,
    Anchored: true,
    CanCollide: false,
    Transparency: 0.7,
    Color: getColorByTag(spawnZone.tags), // green/red/blue
    Material: "Neon"
  }
});
```

**Sphere Zone Marker:**
```typescript
const zone = spawnZone.volume; // { center, radius }

await mcp.create_instance_with_properties({
  className: "Part",
  name: `_ZoneMarker_${spawnZone.id}`,
  parentPath: "game.Workspace",
  properties: {
    Shape: "Ball",
    Position: zone.center,
    Size: { x: zone.radius * 2, y: zone.radius * 2, z: zone.radius * 2 },
    Anchored: true,
    CanCollide: false,
    Transparency: 0.7,
    Color: getColorByTag(spawnZone.tags),
    Material: "Neon"
  }
});
```

**Color by Tag:**
```typescript
function getColorByTag(tags: string[]): { r: number, g: number, b: number } {
  if (tags.includes("player")) return { r: 0, g: 255, b: 100 };     // Green
  if (tags.includes("monster")) return { r: 255, g: 50, b: 50 };    // Red
  if (tags.includes("object")) return { r: 50, g: 150, b: 255 };    // Blue
  if (tags.includes("boss")) return { r: 180, g: 50, b: 255 };      // Purple
  if (tags.includes("decoration")) return { r: 255, g: 220, b: 50 };// Yellow
  return { r: 200, g: 200, b: 200 };  // Gray default
}
```

---

## Decoration & Spawn Zone Conflict Validation

For `terrain_with_decorations` environments, validate that decorations don't block spawn zones:

### 1. Check layoutRules avoidTags

```typescript
// Verify spawn zone tags are in avoidTags
function validateLayoutRules(layoutRules: LayoutRule[], spawnZones: SpawnZone[]): string[] {
  const errors: string[] = [];
  const spawnTags = new Set(spawnZones.flatMap(z => z.tags));

  for (const rule of layoutRules) {
    const avoidTags = rule.constraints?.avoidTags || [];

    // Player spawn zones MUST be avoided
    if (spawnTags.has("player") && !avoidTags.includes("player")) {
      errors.push(`Rule "${rule.id}" missing "player" in avoidTags`);
    }

    // Safe zones should also be avoided
    if (spawnTags.has("safe") && !avoidTags.includes("safe")) {
      errors.push(`Rule "${rule.id}" missing "safe" in avoidTags`);
    }
  }

  return errors;
}
```

### 2. Visual Conflict Check

```typescript
// Create decoration zone markers for visual inspection
for (const rule of layoutRules) {
  const zones = rule.zones; // Zone IDs from spawnZones

  for (const zoneId of zones) {
    const zone = spawnZones.find(z => z.id === zoneId);
    if (!zone) continue;

    await mcp.create_instance_with_properties({
      className: "Part",
      name: `_DecoMarker_${rule.id}_${zoneId}`,
      parentPath: "game.Workspace",
      properties: {
        Position: calculateCenter(zone.volume),
        Size: calculateSize(zone.volume),
        Anchored: true,
        CanCollide: false,
        Transparency: 0.85,
        Color: { r: 255, g: 220, b: 50 }, // Yellow for decoration zones
        Material: "Neon"
      }
    });
  }
}
```

### 3. Validation Checklist

| Check | Pass Criteria |
|-------|---------------|
| avoidTags | All player/safe tags in avoidTags |
| minSpacing | minSpacing >= 5 studs from spawn edge |
| Zone overlap | No decoration zones fully overlap player zones |
| Density | Density allows clear paths to spawn areas |

---

## Asset Size Verification

Spawn zone 검증 시 실제 에셋을 로드하여 크기가 zone에 맞는지 확인합니다.

### 1. Load Sample Assets

각 zone 태그에 맞는 샘플 에셋을 로드:

```typescript
// Load sample assets from roblox-templates registry
const assetsByTag = {
  player: null,  // Use standard R15 rig (5.3 studs tall)
  monster: "monsters.json",
  object: "items.json"
};

async function loadSampleAsset(tag: string, spawnZone: SpawnZone) {
  if (tag === "player") {
    // Player uses standard R15 rig dimensions
    return { bounds: { size: { x: 2, y: 5.3, z: 1 } } };
  }

  const assetFile = assetsByTag[tag];
  if (!assetFile) return null;

  // Read asset registry
  const registry = await readJson(`roblox-templates/assets/${assetFile}`);

  // Pick random asset from registry
  const randomAsset = registry.assets[Math.floor(Math.random() * registry.assets.length)];

  // Insert and measure
  const result = await mcp.insert_free_model({
    assetId: randomAsset.id,
    parentPath: "game.Workspace",
    name: `_SampleAsset_${tag}_${randomAsset.id}`
  });

  const bounds = await mcp.get_bounds({ path: result.path });

  return { asset: randomAsset, bounds };
}
```

### 2. Verify Zone Fits Asset

```typescript
async function verifyZoneFitsAsset(spawnZone: SpawnZone, sampleResult: any): string[] {
  const errors: string[] = [];
  const { bounds } = sampleResult;

  if (spawnZone.type === "aabb") {
    const zoneSize = {
      x: spawnZone.volume.max.x - spawnZone.volume.min.x,
      y: spawnZone.volume.max.y - spawnZone.volume.min.y,
      z: spawnZone.volume.max.z - spawnZone.volume.min.z
    };

    // Check if asset fits in zone
    if (bounds.size.x > zoneSize.x) {
      errors.push(`Asset width (${bounds.size.x}) exceeds zone width (${zoneSize.x})`);
    }
    if (bounds.size.y > zoneSize.y) {
      errors.push(`Asset height (${bounds.size.y}) exceeds zone height (${zoneSize.y})`);
    }
    if (bounds.size.z > zoneSize.z) {
      errors.push(`Asset depth (${bounds.size.z}) exceeds zone depth (${zoneSize.z})`);
    }

    // Check minimum clearance (asset should have room to move)
    const minClearance = 5; // studs
    if (zoneSize.x < bounds.size.x + minClearance * 2) {
      errors.push(`Zone too narrow for comfortable spawn (need ${minClearance} stud clearance)`);
    }
  } else if (spawnZone.type === "sphere") {
    const maxAssetDimension = Math.max(bounds.size.x, bounds.size.y, bounds.size.z);
    if (maxAssetDimension > spawnZone.volume.radius) {
      errors.push(`Asset size (${maxAssetDimension}) exceeds sphere radius (${spawnZone.volume.radius})`);
    }
  }

  return errors;
}
```

### 3. Visual Asset Placement Test

```typescript
// Place sample assets at zone center for visual inspection
async function placeSampleAtZoneCenter(spawnZone: SpawnZone, assetPath: string) {
  const center = spawnZone.type === "aabb"
    ? {
        x: (spawnZone.volume.min.x + spawnZone.volume.max.x) / 2,
        y: spawnZone.volume.min.y + 3,  // Slightly above ground
        z: (spawnZone.volume.min.z + spawnZone.volume.max.z) / 2
      }
    : spawnZone.volume.center;

  await mcp.set_property({
    path: assetPath,
    property: "Position",
    value: center
  });

  // Focus camera on the sample
  await mcp.focus_camera({
    targetPath: assetPath,
    distance: 30
  });
}
```

### 4. Asset Registry Bounds Field (Recommended)

에셋 등록 시 bounds 정보를 함께 저장하면 검증이 빨라집니다:

```json
{
  "id": 11250836013,
  "name": "Undead Soldier",
  "type": "undead",
  "bounds": {
    "size": { "x": 2.5, "y": 6.2, "z": 1.8 },
    "center": { "x": 0, "y": 3.1, "z": 0 }
  }
}
```

### 5. Standard Size References

| Entity Type | Typical Size (studs) | Min Zone Size |
|-------------|---------------------|---------------|
| Player (R15) | 2 x 5.3 x 1 | 10 x 10 x 10 |
| Small monster | 2 x 4 x 2 | 8 x 8 x 8 |
| Medium monster | 4 x 6 x 4 | 15 x 12 x 15 |
| Boss | 8 x 12 x 8 | 30 x 20 x 30 |
| Small item | 1 x 1 x 1 | 3 x 3 x 3 |
| Medium item | 2 x 2 x 2 | 5 x 5 x 5 |

### 6. Cleanup After Verification

```typescript
// Delete all sample assets after verification
await mcp.search_by_name({ pattern: "_SampleAsset_" });
await mcp.mass_delete_instances({ paths: samplePaths });
```

---

## Converting Points to Zones

When migrating from old `suggestedSpawns` format:

```typescript
// Old format (points)
"suggestedSpawns": [
  { "x": 61, "y": 26, "z": -252 },
  { "x": 461, "y": 26, "z": -212 }
]

// New format (zone covering the points with padding)
function pointsToZone(points: Vector3[], padding: number = 30): SpawnZone {
  const minX = Math.min(...points.map(p => p.x)) - padding;
  const maxX = Math.max(...points.map(p => p.x)) + padding;
  const minY = Math.min(...points.map(p => p.y)) - 5;
  const maxY = Math.max(...points.map(p => p.y)) + 20;
  const minZ = Math.min(...points.map(p => p.z)) - padding;
  const maxZ = Math.max(...points.map(p => p.z)) + padding;

  return {
    id: "player_zone",
    type: "aabb",
    volume: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    },
    tags: ["player", "safe"],
    weight: 1.0
  };
}
```

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

### Calculating cameraConfig from Studio

```typescript
const cameraInfo = await mcp.get_camera_info({});
const bounds = await mcp.get_bounds({ path: modelPath });

const dx = cameraInfo.position.x - bounds.center.x;
const dy = cameraInfo.position.y - bounds.center.y;
const dz = cameraInfo.position.z - bounds.center.z;

const distance = Math.round(Math.sqrt(dx*dx + dy*dy + dz*dz));

const offset = {
  x: Math.round(dx / distance * 10) / 10,
  y: Math.round(dy / distance * 10) / 10,
  z: Math.round(dz / distance * 10) / 10
};

const cameraConfig = { distance, offset };
```

---

## Adding New Environment

1. Add asset details to `sources/standalone-maps.json` or `sources/decorations.json`
2. Add environment entry to `maps.json`:

```json
{
  "id": "env-m-014",
  "type": "map_only",
  "theme": "forest",
  "name": "New Forest Map",
  "assetId": 12345678,
  "source": "standalone-maps",
  "description": "Description here",
  "creator": "CreatorName",
  "spawnZones": [
    {
      "id": "player_main",
      "type": "aabb",
      "volume": {
        "min": { "x": -50, "y": 10, "z": -50 },
        "max": { "x": 50, "y": 30, "z": 50 }
      },
      "tags": ["player", "safe"],
      "weight": 1.0
    }
  ]
}
```

3. Update theme's `environmentIds` in maps.json
4. Run verification workflow

---

## Environment Types

| Type | ID Format | Description |
|------|-----------|-------------|
| `terrain_only` | `env-t-XXX` | Generated terrain, no pre-built assets |
| `map_only` | `env-m-XXX` | Pre-built map from standalone-maps |
| `terrain_with_map` | `env-tm-XXX` | Terrain + pre-built map overlay |
| `terrain_with_decorations` | `env-ts-XXX` | Terrain + decoration sets with layoutRules |

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
