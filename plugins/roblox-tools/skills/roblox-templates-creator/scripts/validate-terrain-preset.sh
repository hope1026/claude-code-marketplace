#!/bin/bash
# Validate terrain preset JSON structure (offline validation)
# Usage: ./validate-terrain-preset.sh <preset-key> [json-file]

set -e

PRESET_KEY="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Find roblox-templates skill path
# Searches from current working directory's git root
find_templates_path() {
    # Method 1: Use ROBLOX_TEMPLATES_PATH env var if set
    if [ -n "$ROBLOX_TEMPLATES_PATH" ] && [ -d "$ROBLOX_TEMPLATES_PATH" ]; then
        echo "$ROBLOX_TEMPLATES_PATH"
        return 0
    fi

    # Method 2: Find from git root's .claude/skills/roblox-templates
    local git_root=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$git_root" ]; then
        local templates_link="$git_root/.claude/skills/roblox-templates"
        if [ -L "$templates_link" ]; then
            # Resolve symlink
            local resolved=$(readlink "$templates_link")
            if [[ "$resolved" == /* ]]; then
                echo "$resolved"
            else
                echo "$(cd "$(dirname "$templates_link")" && cd "$(dirname "$resolved")" && pwd)/$(basename "$resolved")"
            fi
            return 0
        elif [ -d "$templates_link" ]; then
            echo "$(cd "$templates_link" && pwd)"
            return 0
        fi
    fi

    # Method 3: Search for terrain-presets.json
    if [ -n "$git_root" ]; then
        local found=$(find "$git_root" -name "terrain-presets.json" -path "*roblox-templates/assets/*" 2>/dev/null | head -1)
        if [ -n "$found" ]; then
            # Return the roblox-templates directory (2 levels up from terrain-presets.json)
            echo "$(dirname "$(dirname "$found")")"
            return 0
        fi
    fi

    return 1
}

TEMPLATES_PATH=$(find_templates_path)
if [ -z "$TEMPLATES_PATH" ]; then
    echo "ERROR: Cannot find roblox-templates skill"
    echo ""
    echo "Solutions:"
    echo "  1. Run from a git repository with .claude/skills/roblox-templates"
    echo "  2. Set ROBLOX_TEMPLATES_PATH environment variable"
    echo ""
    echo "Example:"
    echo "  export ROBLOX_TEMPLATES_PATH=/path/to/roblox-templates"
    echo "  $0 $PRESET_KEY"
    exit 1
fi

JSON_FILE="${2:-$TEMPLATES_PATH/assets/terrain-presets.json}"

if [ -z "$PRESET_KEY" ]; then
    echo "Usage: $0 <preset-key> [json-file]"
    echo "Example: $0 rolling_hills"
    exit 1
fi

if [ ! -f "$JSON_FILE" ]; then
    echo "ERROR: File not found: $JSON_FILE"
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "ERROR: jq is required but not installed"
    exit 1
fi

echo "=== Terrain Preset Validation ==="
echo "Preset: $PRESET_KEY"
echo "File: $JSON_FILE"
echo ""

# Check if preset exists
PRESET=$(jq -r ".presets[\"$PRESET_KEY\"]" "$JSON_FILE")
if [ "$PRESET" == "null" ]; then
    echo "ERROR: Preset '$PRESET_KEY' not found"
    echo ""
    echo "Available presets:"
    jq -r '.presets | keys[]' "$JSON_FILE"
    exit 1
fi

ERRORS=0
WARNINGS=0

# Required fields check
echo "--- Required Fields ---"

check_field() {
    local field="$1"
    local value=$(jq -r ".presets[\"$PRESET_KEY\"].$field" "$JSON_FILE")
    if [ "$value" == "null" ] || [ -z "$value" ]; then
        echo "  [FAIL] $field: MISSING"
        ((ERRORS++))
    else
        echo "  [PASS] $field: exists"
    fi
}

check_field "name"
check_field "theme"
check_field "bounds"
check_field "generation"
check_field "spawnConfig"
check_field "focusView"

echo ""

# Bounds validation
echo "--- Bounds Validation ---"
BOUNDS_MIN_X=$(jq -r ".presets[\"$PRESET_KEY\"].bounds.min.x // \"null\"" "$JSON_FILE")
BOUNDS_MIN_Y=$(jq -r ".presets[\"$PRESET_KEY\"].bounds.min.y // \"null\"" "$JSON_FILE")
BOUNDS_MIN_Z=$(jq -r ".presets[\"$PRESET_KEY\"].bounds.min.z // \"null\"" "$JSON_FILE")
BOUNDS_MAX_X=$(jq -r ".presets[\"$PRESET_KEY\"].bounds.max.x // \"null\"" "$JSON_FILE")
BOUNDS_MAX_Y=$(jq -r ".presets[\"$PRESET_KEY\"].bounds.max.y // \"null\"" "$JSON_FILE")
BOUNDS_MAX_Z=$(jq -r ".presets[\"$PRESET_KEY\"].bounds.max.z // \"null\"" "$JSON_FILE")

if [ "$BOUNDS_MIN_X" != "null" ] && [ "$BOUNDS_MAX_X" != "null" ]; then
    if (( $(echo "$BOUNDS_MIN_X >= $BOUNDS_MAX_X" | bc -l) )); then
        echo "  [FAIL] bounds.min.x ($BOUNDS_MIN_X) >= bounds.max.x ($BOUNDS_MAX_X)"
        ((ERRORS++))
    else
        echo "  [PASS] X range: $BOUNDS_MIN_X to $BOUNDS_MAX_X"
    fi
fi

if [ "$BOUNDS_MIN_Y" != "null" ] && [ "$BOUNDS_MAX_Y" != "null" ]; then
    if (( $(echo "$BOUNDS_MIN_Y >= $BOUNDS_MAX_Y" | bc -l) )); then
        echo "  [FAIL] bounds.min.y ($BOUNDS_MIN_Y) >= bounds.max.y ($BOUNDS_MAX_Y)"
        ((ERRORS++))
    else
        echo "  [PASS] Y range: $BOUNDS_MIN_Y to $BOUNDS_MAX_Y"
    fi
fi

if [ "$BOUNDS_MIN_Z" != "null" ] && [ "$BOUNDS_MAX_Z" != "null" ]; then
    if (( $(echo "$BOUNDS_MIN_Z >= $BOUNDS_MAX_Z" | bc -l) )); then
        echo "  [FAIL] bounds.min.z ($BOUNDS_MIN_Z) >= bounds.max.z ($BOUNDS_MAX_Z)"
        ((ERRORS++))
    else
        echo "  [PASS] Z range: $BOUNDS_MIN_Z to $BOUNDS_MAX_Z"
    fi
fi

echo ""

# Generation parameters validation
echo "--- Generation Parameters ---"
check_generation_param() {
    local param="$1"
    local base=$(jq -r ".presets[\"$PRESET_KEY\"].generation.$param.base // \"null\"" "$JSON_FILE")
    local variance=$(jq -r ".presets[\"$PRESET_KEY\"].generation.$param.variance // \"null\"" "$JSON_FILE")

    if [ "$base" == "null" ]; then
        echo "  [FAIL] generation.$param.base: MISSING"
        ((ERRORS++))
    elif [ "$variance" == "null" ]; then
        echo "  [WARN] generation.$param.variance: MISSING (using 0)"
        ((WARNINGS++))
    else
        echo "  [PASS] generation.$param: base=$base, variance=$variance"
    fi
}

check_generation_param "baseHeight"
check_generation_param "amplitude"
check_generation_param "frequency"

# Layers validation
LAYER_COUNT=$(jq ".presets[\"$PRESET_KEY\"].generation.layers | length" "$JSON_FILE")
if [ "$LAYER_COUNT" -lt 1 ]; then
    echo "  [FAIL] generation.layers: empty"
    ((ERRORS++))
else
    echo "  [PASS] generation.layers: $LAYER_COUNT layers"

    # Check layers are ordered by maxHeight
    PREV_HEIGHT=-9999
    for i in $(seq 0 $((LAYER_COUNT - 1))); do
        MATERIAL=$(jq -r ".presets[\"$PRESET_KEY\"].generation.layers[$i].material" "$JSON_FILE")
        MAX_HEIGHT=$(jq -r ".presets[\"$PRESET_KEY\"].generation.layers[$i].maxHeight" "$JSON_FILE")

        if (( $(echo "$MAX_HEIGHT < $PREV_HEIGHT" | bc -l) )); then
            echo "  [WARN] Layer $MATERIAL (maxHeight=$MAX_HEIGHT) should come before previous layer"
            ((WARNINGS++))
        fi
        PREV_HEIGHT=$MAX_HEIGHT
    done
fi

echo ""

# Spawn config validation
echo "--- Spawn Configuration ---"
SPAWN_COUNT=$(jq -r ".presets[\"$PRESET_KEY\"].spawnConfig.count // 0" "$JSON_FILE")
FALLBACK_COUNT=$(jq ".presets[\"$PRESET_KEY\"].spawnConfig.fallbackSpawns | length" "$JSON_FILE")

echo "  spawnConfig.count: $SPAWN_COUNT"
echo "  fallbackSpawns: $FALLBACK_COUNT positions"

if [ "$FALLBACK_COUNT" -lt "$SPAWN_COUNT" ]; then
    echo "  [FAIL] fallbackSpawns ($FALLBACK_COUNT) < spawnConfig.count ($SPAWN_COUNT)"
    ((ERRORS++))
else
    echo "  [PASS] Sufficient fallback spawns"
fi

# Check fallback spawns are within bounds
echo ""
echo "--- Fallback Spawns Within Bounds ---"
for i in $(seq 0 $((FALLBACK_COUNT - 1))); do
    SPAWN_X=$(jq -r ".presets[\"$PRESET_KEY\"].spawnConfig.fallbackSpawns[$i].x" "$JSON_FILE")
    SPAWN_Y=$(jq -r ".presets[\"$PRESET_KEY\"].spawnConfig.fallbackSpawns[$i].y" "$JSON_FILE")
    SPAWN_Z=$(jq -r ".presets[\"$PRESET_KEY\"].spawnConfig.fallbackSpawns[$i].z" "$JSON_FILE")

    IN_BOUNDS=true
    if (( $(echo "$SPAWN_X < $BOUNDS_MIN_X || $SPAWN_X > $BOUNDS_MAX_X" | bc -l) )); then
        IN_BOUNDS=false
    fi
    if (( $(echo "$SPAWN_Y < $BOUNDS_MIN_Y || $SPAWN_Y > $BOUNDS_MAX_Y" | bc -l) )); then
        IN_BOUNDS=false
    fi
    if (( $(echo "$SPAWN_Z < $BOUNDS_MIN_Z || $SPAWN_Z > $BOUNDS_MAX_Z" | bc -l) )); then
        IN_BOUNDS=false
    fi

    if [ "$IN_BOUNDS" = true ]; then
        echo "  [PASS] Fallback $((i+1)): ($SPAWN_X, $SPAWN_Y, $SPAWN_Z)"
    else
        echo "  [WARN] Fallback $((i+1)): ($SPAWN_X, $SPAWN_Y, $SPAWN_Z) - outside bounds"
        ((WARNINGS++))
    fi
done

echo ""

# Camera config validation
echo "--- Camera Configuration ---"
CAM_HEIGHT=$(jq -r ".presets[\"$PRESET_KEY\"].focusView.heightAboveGround // \"null\"" "$JSON_FILE")
CAM_DISTANCE=$(jq -r ".presets[\"$PRESET_KEY\"].focusView.distance // \"null\"" "$JSON_FILE")
CAM_OFFSET_X=$(jq -r ".presets[\"$PRESET_KEY\"].focusView.offset.x // \"null\"" "$JSON_FILE")
CAM_OFFSET_Y=$(jq -r ".presets[\"$PRESET_KEY\"].focusView.offset.y // \"null\"" "$JSON_FILE")
CAM_OFFSET_Z=$(jq -r ".presets[\"$PRESET_KEY\"].focusView.offset.z // \"null\"" "$JSON_FILE")

if [ "$CAM_HEIGHT" != "null" ] && [ "$CAM_DISTANCE" != "null" ]; then
    echo "  [PASS] heightAboveGround: $CAM_HEIGHT"
    echo "  [PASS] distance: $CAM_DISTANCE"
    echo "  [PASS] offset: {x:$CAM_OFFSET_X, y:$CAM_OFFSET_Y, z:$CAM_OFFSET_Z}"
else
    echo "  [FAIL] focusView: incomplete"
    ((ERRORS++))
fi

echo ""

# Post process validation
echo "--- Post Process ---"
POST_COUNT=$(jq ".presets[\"$PRESET_KEY\"].postProcess | length" "$JSON_FILE")
if [ "$POST_COUNT" -eq 0 ]; then
    echo "  [INFO] No post-processing steps"
else
    VALID_TOOLS=("terrain_smooth" "terrain_fill_block" "terrain_fill_ball" "terrain_fill_cylinder" "terrain_fill_wedge" "terrain_clear" "terrain_replace_material")

    for i in $(seq 0 $((POST_COUNT - 1))); do
        TOOL=$(jq -r ".presets[\"$PRESET_KEY\"].postProcess[$i].tool" "$JSON_FILE")

        TOOL_VALID=false
        for valid in "${VALID_TOOLS[@]}"; do
            if [ "$TOOL" == "$valid" ]; then
                TOOL_VALID=true
                break
            fi
        done

        if [ "$TOOL_VALID" = true ]; then
            echo "  [PASS] Step $((i+1)): $TOOL"
        else
            echo "  [FAIL] Step $((i+1)): Unknown tool '$TOOL'"
            ((ERRORS++))
        fi
    done
fi

echo ""
echo "=== Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "VALIDATION FAILED - Fix errors before MCP verification"
    exit 1
else
    echo ""
    echo "VALIDATION PASSED - Ready for MCP verification"
    exit 0
fi
