---
name: roblox-templates-creator
description: Search, verify, register Roblox assets and update game references. Use when populating asset registry, finding new assets, updating references, or user says "find assets", "add template assets", "search assets", "register assets", "update references".
argument-hint: "[category] [search-query]"
---

# Roblox Templates Creator

Use MCP to search assets in the Roblox Creator Store and register them in the `roblox-templates` registry.

**Core Mission:**
1. Search and verify assets from Roblox Creator Store
2. **Create and verify terrain presets** (manual MCP-generated terrain)
3. Register verified assets/presets to `assets/*.json`
4. **Update corresponding `references/*.md` with new assets**

The asset registry (`assets/`) is a **means** to build comprehensive game references (`references/`).

---

## Verification Strategy

**Two-Phase Verification:**

| Phase | Method | What It Validates |
|-------|--------|-------------------|
| **Phase 1: Script** | Bash scripts (offline) | JSON structure, required fields, value ranges |
| **Phase 2: MCP** | MCP tools (Studio) | Actual ground positions, visual appearance, camera views |

**Always run Phase 1 before Phase 2** - catches errors early without Studio.

---

## Phase 1: Script Validation (Offline)

### Terrain Preset Validation

```bash
./.claude/skills/roblox-templates-creator/scripts/validate-terrain-preset.sh <preset-key>
```

**What it validates:**
- Required fields exist: `name`, `theme`, `bounds`, `suggestedSpawns`, `objectSpawns`, `cameraFocus`, `steps`
- Bounds validity: `min < max` for all axes
- Spawn count: minimum 3 for `suggestedSpawns`, recommended 5 for `objectSpawns`
- Spawns within bounds
- Steps use valid terrain tools
- Camera focus has complete coordinates

**Exit codes:**
- `0` - Validation passed, ready for MCP verification
- `1` - Validation failed, fix errors first

### Asset Validation

```bash
./.claude/skills/roblox-templates-creator/scripts/validate-asset.sh <category> <asset-id-or-name>
```

**What it validates:**
- Required fields: `id`, `name`, `type`
- Category-specific fields (maps need `bounds`, `suggestedSpawns`, `cameraFocus`)
- Animation references exist (for monsters/npcs)
- Structure completeness

---

## Phase 2: MCP Validation (Studio Required)

### Prerequisites

- Roblox Studio must be running and MCP plugin connected
- Required MCP tools:
  - `search_creator_store`, `get_asset_info`, `insert_free_model`
  - `find_ground`, `find_spawn_positions`, `get_bounds`
  - `focus_camera` (explicit camera control)
  - `terrain_fill_*`, `terrain_clear`, `terrain_smooth`

### Terrain Preset MCP Verification

```
1. Clear terrain region
     │
     v
2. Execute preset steps (terrain_fill_*)
     │
     v
3. focus_camera → View created terrain
     │
     v
4. Verify each spawn with find_ground
     │
     v
5. focus_camera → Final overview
     │
     v
6. Cleanup (optional)
```

#### Step-by-Step MCP Verification

```typescript
async function verifyTerrainPresetMCP(presetKey: string) {
    const preset = loadPreset(presetKey);

    // 1. Clear terrain
    await mcp.terrain_clear({
        region: {
            min: { x: -500, y: -100, z: -500 },
            max: { x: 500, y: 300, z: 500 }
        }
    });

    // 2. Execute preset steps
    for (const step of preset.steps) {
        await mcp[step.tool](step.params);
    }

    // 3. Camera focus on terrain (EXPLICIT - not auto)
    await mcp.focus_camera({
        targetPath: "game.Workspace.Terrain",
        distance: 1.0,
        angle: { pitch: 30, yaw: 45 },
        duration: 0.5
    });

    // 4. Verify spawns with find_ground
    const spawnResults = [];
    for (let i = 0; i < preset.suggestedSpawns.length; i++) {
        const spawn = preset.suggestedSpawns[i];
        const ground = await mcp.find_ground({
            position: { x: spawn.x, y: 300, z: spawn.z },
            offset: 3
        });

        const actualY = ground.found ? ground.groundPosition.y + 3 : null;
        const diff = actualY ? Math.abs(spawn.y - actualY) : Infinity;

        spawnResults.push({
            index: i + 1,
            preset: spawn,
            actual: actualY,
            diff: diff,
            valid: diff < 10
        });
    }

    // 5. Report results
    return {
        preset: presetKey,
        stepsExecuted: preset.steps.length,
        spawns: spawnResults,
        corrections: spawnResults
            .filter(s => !s.valid)
            .map(s => ({
                index: s.index,
                currentY: s.preset.y,
                suggestedY: Math.round(s.actual)
            }))
    };
}
```

### External Asset MCP Verification

```typescript
async function verifyExternalAssetMCP(assetId: number, category: string) {
    // 1. Create verification folder
    await mcp.create_instance({
        className: "Folder",
        name: "_AssetVerification",
        parent: "game.Workspace"
    });

    // 2. Insert asset
    const result = await mcp.insert_free_model({
        assetId,
        parentPath: "game.Workspace._AssetVerification"
    });

    // 3. EXPLICIT camera focus (not auto)
    await mcp.focus_camera({
        targetPath: result.path,
        distance: 1.5,
        angle: { pitch: 20, yaw: 45 },
        duration: 0.5
    });

    // 4. Get bounds
    const bounds = await mcp.get_bounds({ path: result.path });

    // 5. Category-specific verification
    let categoryData = {};

    if (category === "maps") {
        // Find spawn positions
        const spawns = await mcp.find_spawn_positions({
            searchArea: {
                min: bounds.min,
                max: bounds.max
            },
            count: 5,
            preferOutdoor: true,
            minSpacing: 20
        });

        categoryData = {
            bounds: bounds,
            suggestedSpawns: spawns.positions.slice(0, 3),
            objectSpawns: spawns.positions.slice(0, 5),
            cameraFocus: {
                x: (bounds.min.x + bounds.max.x) / 2,
                y: bounds.max.y * 0.6,
                z: (bounds.min.z + bounds.max.z) / 2
            }
        };
    }

    // 6. Cleanup
    await mcp.delete_instance({ path: "game.Workspace._AssetVerification" });

    return {
        assetId,
        path: result.path,
        bounds,
        ...categoryData
    };
}
```

---

## Camera Focus Policy

**IMPORTANT:** Camera focus is NEVER automatic. Always use `focus_camera` explicitly.

### `respectAutoFocusSetting` Option

When calling `focus_camera` from skills, always set `respectAutoFocusSetting: true` to respect the user's Auto Focus Camera plugin setting:

```typescript
// This allows users to disable auto-focus via plugin settings
await mcp.focus_camera({
    targetPath: "game.Workspace.Terrain",
    respectAutoFocusSetting: true,  // Always true in skills
    distance: 1.0,
    angle: { pitch: 35, yaw: 45 }
});
```

### Using cameraFocus from Preset/Asset Data

For maps and terrain, use the predefined `cameraFocus` coordinates from JSON files instead of focusing on individual elements:

```typescript
// After creating terrain from preset - use cameraFocus from terrain-presets.json
const preset = terrainPresets.presets["rolling_hills"];
await mcp.focus_camera({
    targetPath: "game.Workspace.Terrain",
    respectAutoFocusSetting: true,
    position: preset.cameraFocus,  // { x: 0, y: 60, z: 0 }
    distance: 1.0,
    angle: { pitch: 35, yaw: 45 }
});

// After inserting a map - use cameraFocus from maps.json
const map = maps.assets.find(m => m.id === assetId);
await mcp.focus_camera({
    targetPath: result.path,
    respectAutoFocusSetting: true,
    position: map.cameraFocus,
    distance: 1.0,
    angle: { pitch: 30, yaw: 45 }
});
```

### When to Focus Camera

| Action | Camera Focus |
|--------|--------------|
| Terrain created | `focus_camera` using cameraFocus from preset |
| Map inserted | `focus_camera` using cameraFocus from maps.json |
| Single asset inserted | `focus_camera` on inserted instance |
| Spawn verified | `focus_camera` on spawn position (optional) |
| Verification complete | `focus_camera` for final overview |

### Camera Focus Patterns

```typescript
// After terrain creation - use preset's cameraFocus
await mcp.focus_camera({
    targetPath: "game.Workspace.Terrain",
    respectAutoFocusSetting: true,
    distance: 0.8,
    angle: { pitch: 35, yaw: 45 }
});

// After asset insertion
await mcp.focus_camera({
    targetPath: "game.Workspace._AssetVerification.InsertedModel",
    respectAutoFocusSetting: true,
    distance: 1.5,
    angle: { pitch: 20, yaw: 0 }
});

// For overview (larger distance)
await mcp.focus_camera({
    targetPath: "game.Workspace.Terrain",
    respectAutoFocusSetting: true,
    distance: 2.0,
    angle: { pitch: 45, yaw: 45 }
});
```

---

## Complete Verification Workflow

```
USER: /roblox-templates-creator terrain-presets rolling_hills
     │
     v
┌─────────────────────────────────────┐
│  PHASE 1: Script Validation         │
│  ./scripts/validate-terrain-preset.sh rolling_hills
│                                     │
│  ✓ Required fields                  │
│  ✓ Bounds validity                  │
│  ✓ Spawn counts                     │
│  ✓ Steps validity                   │
└────────────────┬────────────────────┘
                 │ PASS
                 v
┌─────────────────────────────────────┐
│  PHASE 2: MCP Verification          │
│                                     │
│  1. terrain_clear                   │
│  2. Execute steps (terrain_fill_*)  │
│  3. focus_camera → View terrain     │
│  4. find_ground × N spawns          │
│  5. focus_camera → Final view       │
└────────────────┬────────────────────┘
                 │
                 v
┌─────────────────────────────────────┐
│  RESULTS                            │
│                                     │
│  Spawn 1: OK (diff: 2)              │
│  Spawn 2: ADJUST Y 25→47            │
│  Spawn 3: ADJUST Y 25→78            │
│                                     │
│  → Fix? [Yes/No]                    │
└─────────────────────────────────────┘
```

---

## Categories

| Category | File | Type | Script Validation |
|----------|------|------|-------------------|
| monsters | assets/monsters.json | External | validate-asset.sh |
| weapons | assets/weapons.json | External | validate-asset.sh |
| items | assets/items.json | External | validate-asset.sh |
| environment | assets/environment.json | External | validate-asset.sh |
| npcs | assets/npcs.json | External | validate-asset.sh |
| effects | assets/effects.json | External | validate-asset.sh |
| maps | assets/maps.json | External | validate-asset.sh |
| terrain-presets | assets/terrain-presets.json | MCP-generated | validate-terrain-preset.sh |

---

## Required Fields Reference

### Terrain Preset

| Field | Type | Required | Validated By |
|-------|------|----------|--------------|
| `name` | string | YES | Script |
| `nameEn` | string | NO | - |
| `theme` | string | YES | Script |
| `difficulty` | string | NO | - |
| `description` | string | NO | - |
| `bounds` | {min, max} | YES | Script + MCP |
| `suggestedSpawns` | [{x,y,z},...] | YES (≥3) | Script + MCP |
| `objectSpawns` | [{x,y,z},...] | YES (≥5) | Script |
| `cameraFocus` | {x,y,z} | YES | Script + MCP |
| `steps` | [{tool, params},...] | YES | Script + MCP |

### Map Asset

| Field | Type | Required | Validated By |
|-------|------|----------|--------------|
| `id` | number | YES | Script |
| `name` | string | YES | Script |
| `type` | string | YES | Script |
| `bounds` | {min, max} | YES | MCP (get_bounds) |
| `suggestedSpawns` | [{x,y,z},...] | YES (≥3) | MCP (find_spawn_positions) |
| `cameraFocus` | {x,y,z} | YES | MCP (calculated) |

---

## Result Report Format

```markdown
## Asset Verification Report

### Category: terrain-presets

**Preset: rolling_hills**

#### Phase 1: Script Validation
- Required fields: PASS
- Bounds validity: PASS
- Spawn counts: PASS (3 spawns, 5 object spawns)
- Steps validity: PASS (12 steps)

#### Phase 2: MCP Verification
- Steps executed: 12
- Terrain created: YES
- Camera focused: YES

#### Spawn Position Verification

| # | Preset Y | Actual Ground | Recommended Y | Status |
|---|----------|---------------|---------------|--------|
| 1 | 27 | 23.67 | 27 | ✅ OK |
| 2 | 47 | 43.85 | 47 | ✅ OK |
| 3 | 78 | 74.66 | 78 | ✅ OK |

#### Camera Focus
- Position: (0, 60, 0)
- Terrain visible: YES

### Actions
- [ ] Fix spawn positions (if needed)
- [ ] Update terrain-presets.json
- [ ] Update references/rpg.md
```

---

## Usage Examples

### Verify existing terrain preset
```
/roblox-templates-creator verify terrain-presets rolling_hills
```

### Create and verify new terrain preset
```
/roblox-templates-creator terrain-presets "volcanic island"
```

### Search and register map asset
```
/roblox-templates-creator maps "medieval castle"
```

### Validate asset offline (no Studio)
```bash
./scripts/validate-terrain-preset.sh mountain_valley
./scripts/validate-asset.sh monsters zombie
```

---

## Language Policy

**All content created by this skill MUST be in English.**

| Field | Language | Example |
|-------|----------|---------|
| `name` | English | "Rolling Hills" |
| `nameEn` | English | "Rolling Hills" |
| `description` | English | "Peaceful terrain with gentle rolling hills" |
| `theme` | English | "plains", "mountain", "desert" |
| `note` (in steps) | English | "Grass base layer" |
| Comments | English | All code comments |

**Exception:** `nameKo` field (if needed for localization) can be in Korean.

```json
// CORRECT
{
  "name": "Rolling Hills",
  "description": "Peaceful plains with gentle rolling hills",
  "steps": [
    { "tool": "terrain_fill_block", "note": "Grass base layer" }
  ]
}

// INCORRECT - Do not use Korean in main fields
{
  "name": "완만한 언덕",  // ❌ Wrong
  "description": "넓은 잔디밭에 완만한 언덕들",  // ❌ Wrong
}
```

---

## Important Notes

1. **Script first, MCP second**: Always run script validation before MCP to catch errors early
2. **Explicit camera focus**: Never rely on auto-focus; always call `focus_camera` explicitly
3. **Spawn Y correction**: If MCP finds different ground heights, update the preset
4. **Two-phase approach**: Script catches structural issues, MCP catches spatial issues
5. **English only**: All asset/preset content must be written in English
