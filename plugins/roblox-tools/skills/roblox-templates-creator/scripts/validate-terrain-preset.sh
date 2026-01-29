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
check_field "suggestedSpawns"
check_field "objectSpawns"
check_field "cameraFocus"
check_field "steps"

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

# Spawn positions count
echo "--- Spawn Positions ---"
SPAWN_COUNT=$(jq ".presets[\"$PRESET_KEY\"].suggestedSpawns | length" "$JSON_FILE")
OBJECT_SPAWN_COUNT=$(jq ".presets[\"$PRESET_KEY\"].objectSpawns | length" "$JSON_FILE")

if [ "$SPAWN_COUNT" -lt 3 ]; then
    echo "  [FAIL] suggestedSpawns: $SPAWN_COUNT (minimum 3 required)"
    ((ERRORS++))
else
    echo "  [PASS] suggestedSpawns: $SPAWN_COUNT positions"
fi

if [ "$OBJECT_SPAWN_COUNT" -lt 5 ]; then
    echo "  [WARN] objectSpawns: $OBJECT_SPAWN_COUNT (recommended 5)"
    ((WARNINGS++))
else
    echo "  [PASS] objectSpawns: $OBJECT_SPAWN_COUNT positions"
fi

echo ""

# Spawn positions within bounds
echo "--- Spawn Within Bounds ---"
for i in $(seq 0 $((SPAWN_COUNT - 1))); do
    SPAWN_X=$(jq -r ".presets[\"$PRESET_KEY\"].suggestedSpawns[$i].x" "$JSON_FILE")
    SPAWN_Y=$(jq -r ".presets[\"$PRESET_KEY\"].suggestedSpawns[$i].y" "$JSON_FILE")
    SPAWN_Z=$(jq -r ".presets[\"$PRESET_KEY\"].suggestedSpawns[$i].z" "$JSON_FILE")

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
        echo "  [PASS] Spawn $((i+1)): ($SPAWN_X, $SPAWN_Y, $SPAWN_Z)"
    else
        echo "  [WARN] Spawn $((i+1)): ($SPAWN_X, $SPAWN_Y, $SPAWN_Z) - outside bounds"
        ((WARNINGS++))
    fi
done

echo ""

# Camera focus within bounds
echo "--- Camera Focus ---"
CAM_X=$(jq -r ".presets[\"$PRESET_KEY\"].cameraFocus.x // \"null\"" "$JSON_FILE")
CAM_Y=$(jq -r ".presets[\"$PRESET_KEY\"].cameraFocus.y // \"null\"" "$JSON_FILE")
CAM_Z=$(jq -r ".presets[\"$PRESET_KEY\"].cameraFocus.z // \"null\"" "$JSON_FILE")

if [ "$CAM_X" != "null" ] && [ "$CAM_Y" != "null" ] && [ "$CAM_Z" != "null" ]; then
    echo "  [PASS] cameraFocus: ($CAM_X, $CAM_Y, $CAM_Z)"
else
    echo "  [FAIL] cameraFocus: incomplete coordinates"
    ((ERRORS++))
fi

echo ""

# Steps validation
echo "--- Steps Validation ---"
STEP_COUNT=$(jq ".presets[\"$PRESET_KEY\"].steps | length" "$JSON_FILE")
echo "  Total steps: $STEP_COUNT"

VALID_TOOLS=("terrain_fill_block" "terrain_fill_ball" "terrain_fill_cylinder" "terrain_fill_wedge" "terrain_clear" "terrain_smooth" "terrain_generate")

for i in $(seq 0 $((STEP_COUNT - 1))); do
    TOOL=$(jq -r ".presets[\"$PRESET_KEY\"].steps[$i].tool" "$JSON_FILE")
    ORDER=$(jq -r ".presets[\"$PRESET_KEY\"].steps[$i].order // $((i+1))" "$JSON_FILE")
    NOTE=$(jq -r ".presets[\"$PRESET_KEY\"].steps[$i].note // \"\"" "$JSON_FILE")

    TOOL_VALID=false
    for valid in "${VALID_TOOLS[@]}"; do
        if [ "$TOOL" == "$valid" ]; then
            TOOL_VALID=true
            break
        fi
    done

    if [ "$TOOL_VALID" = true ]; then
        echo "  [PASS] Step $ORDER: $TOOL ($NOTE)"
    else
        echo "  [FAIL] Step $ORDER: Unknown tool '$TOOL'"
        ((ERRORS++))
    fi
done

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
