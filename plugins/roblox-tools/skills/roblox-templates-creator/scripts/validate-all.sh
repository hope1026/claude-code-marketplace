#!/bin/bash
# Validate all assets against schemas
# Usage: ./validate-all.sh [category]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCHEMA_DIR="$SCRIPT_DIR/../schemas"

# Find roblox-templates skill path
find_templates_path() {
    if [ -n "$ROBLOX_TEMPLATES_PATH" ] && [ -d "$ROBLOX_TEMPLATES_PATH" ]; then
        echo "$ROBLOX_TEMPLATES_PATH"
        return 0
    fi

    local git_root=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$git_root" ]; then
        local templates_link="$git_root/.claude/skills/roblox-templates"
        if [ -L "$templates_link" ]; then
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
    return 1
}

TEMPLATES_PATH=$(find_templates_path)
if [ -z "$TEMPLATES_PATH" ]; then
    echo "ERROR: Cannot find roblox-templates skill"
    exit 1
fi

ASSETS_DIR="$TEMPLATES_PATH/assets"
CATEGORY="${1:-all}"

if ! command -v jq &> /dev/null; then
    echo "ERROR: jq is required but not installed"
    exit 1
fi

# Load category schemas
CATEGORY_SCHEMAS="$SCHEMA_DIR/category-schemas.json"
if [ ! -f "$CATEGORY_SCHEMAS" ]; then
    echo "ERROR: category-schemas.json not found"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TOTAL_ERRORS=0
TOTAL_WARNINGS=0
TOTAL_ASSETS=0

validate_camera_config() {
    local asset="$1"
    local default_config="$2"
    local errors=0

    local has_camera=$(echo "$asset" | jq 'has("cameraConfig")')
    if [ "$has_camera" != "true" ]; then
        echo -e "    ${RED}[FAIL]${NC} cameraConfig: MISSING"
        return 1
    fi

    local distance=$(echo "$asset" | jq '.cameraConfig.distance // "null"')
    local pitch=$(echo "$asset" | jq '.cameraConfig.pitch // "null"')
    local yaw=$(echo "$asset" | jq '.cameraConfig.yaw // "null"')

    if [ "$distance" == "null" ] || [ "$pitch" == "null" ] || [ "$yaw" == "null" ]; then
        echo -e "    ${RED}[FAIL]${NC} cameraConfig: incomplete (distance=$distance, pitch=$pitch, yaw=$yaw)"
        return 1
    fi

    # Validate ranges
    if (( $(echo "$distance < 0.1 || $distance > 10.0" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "    ${YELLOW}[WARN]${NC} cameraConfig.distance: $distance (expected 0.1-10.0)"
        return 2
    fi

    echo -e "    ${GREEN}[PASS]${NC} cameraConfig: distance=$distance, pitch=$pitch, yaw=$yaw"
    return 0
}

validate_asset() {
    local asset="$1"
    local category="$2"
    local asset_errors=0
    local asset_warnings=0

    local id=$(echo "$asset" | jq -r '.id')
    local name=$(echo "$asset" | jq -r '.name')

    echo "  Asset: $name (ID: $id)"

    # Required fields
    for field in id name type; do
        local value=$(echo "$asset" | jq -r ".$field // \"null\"")
        if [ "$value" == "null" ] || [ -z "$value" ]; then
            echo -e "    ${RED}[FAIL]${NC} $field: MISSING"
            ((asset_errors++))
        fi
    done

    # Camera config validation
    local default_camera=$(jq -r ".categories[\"$category\"].defaultCameraConfig" "$CATEGORY_SCHEMAS")
    validate_camera_config "$asset" "$default_camera"
    local cam_result=$?
    if [ $cam_result -eq 1 ]; then
        ((asset_errors++))
    elif [ $cam_result -eq 2 ]; then
        ((asset_warnings++))
    fi

    # Category-specific validation
    local asset_type=$(echo "$asset" | jq -r '.type // "unknown"')

    case "$category" in
        maps)
            # generator type doesn't require suggestedSpawns
            if [ "$asset_type" != "generator" ]; then
                local spawns=$(echo "$asset" | jq '.suggestedSpawns | length // 0')
                if [ "$spawns" -lt 3 ]; then
                    echo -e "    ${RED}[FAIL]${NC} suggestedSpawns: $spawns (minimum 3 required)"
                    ((asset_errors++))
                else
                    echo -e "    ${GREEN}[PASS]${NC} suggestedSpawns: $spawns positions"
                fi
            else
                echo -e "    ${GREEN}[PASS]${NC} type: generator (suggestedSpawns not required)"
            fi
            ;;
        monsters|npcs)
            local has_humanoid=$(echo "$asset" | jq '.structure.hasHumanoid // false')
            if [ "$has_humanoid" != "true" ]; then
                echo -e "    ${YELLOW}[WARN]${NC} structure.hasHumanoid: not set (recommended)"
                ((asset_warnings++))
            fi
            ;;
        weapons)
            local has_handle=$(echo "$asset" | jq '.structure.hasHandle // false')
            local class_name=$(echo "$asset" | jq -r '.structure.className // "null"')
            if [ "$class_name" != "Tool" ]; then
                echo -e "    ${YELLOW}[WARN]${NC} structure.className: $class_name (expected Tool)"
                ((asset_warnings++))
            fi
            ;;
    esac

    echo "$asset_errors $asset_warnings"
}

validate_category() {
    local category="$1"
    local json_file="$ASSETS_DIR/${category}.json"

    if [ ! -f "$json_file" ]; then
        echo -e "${YELLOW}[SKIP]${NC} $category: file not found"
        return
    fi

    echo ""
    echo "=== Validating: $category ==="
    echo "File: $json_file"

    # Validate _meta
    local meta_category=$(jq -r '._meta.category // "null"' "$json_file")
    local total_assets=$(jq -r '._meta.totalAssets // 0' "$json_file")
    local actual_count=$(jq '.assets | length' "$json_file")

    if [ "$meta_category" != "$category" ]; then
        echo -e "${YELLOW}[WARN]${NC} _meta.category mismatch: '$meta_category' vs '$category'"
        ((TOTAL_WARNINGS++))
    fi

    if [ "$total_assets" != "$actual_count" ]; then
        echo -e "${YELLOW}[WARN]${NC} _meta.totalAssets mismatch: $total_assets vs actual $actual_count"
        ((TOTAL_WARNINGS++))
    fi

    # Validate each asset
    local cat_errors=0
    local cat_warnings=0

    while IFS= read -r asset; do
        local result=$(validate_asset "$asset" "$category")
        local errors=$(echo "$result" | tail -1 | awk '{print $1}')
        local warnings=$(echo "$result" | tail -1 | awk '{print $2}')
        ((cat_errors += errors))
        ((cat_warnings += warnings))
        ((TOTAL_ASSETS++))
    done < <(jq -c '.assets[]' "$json_file")

    ((TOTAL_ERRORS += cat_errors))
    ((TOTAL_WARNINGS += cat_warnings))

    echo ""
    echo "Category Summary: $cat_errors errors, $cat_warnings warnings"
}

validate_terrain_presets() {
    local json_file="$ASSETS_DIR/terrain-presets.json"

    if [ ! -f "$json_file" ]; then
        echo -e "${YELLOW}[SKIP]${NC} terrain-presets: file not found"
        return
    fi

    echo ""
    echo "=== Validating: terrain-presets ==="

    local preset_count=$(jq '.presets | keys | length' "$json_file")
    echo "Total presets: $preset_count"

    for preset_key in $(jq -r '.presets | keys[]' "$json_file"); do
        echo ""
        echo "  Preset: $preset_key"

        # Required fields
        for field in name theme bounds generation spawnConfig cameraConfig; do
            local value=$(jq -r ".presets[\"$preset_key\"].$field // \"null\"" "$json_file")
            if [ "$value" == "null" ]; then
                echo -e "    ${RED}[FAIL]${NC} $field: MISSING"
                ((TOTAL_ERRORS++))
            fi
        done

        # Generation params validation
        for param in baseHeight amplitude frequency; do
            local base=$(jq -r ".presets[\"$preset_key\"].generation.$param.base // \"null\"" "$json_file")
            local variance=$(jq -r ".presets[\"$preset_key\"].generation.$param.variance // \"null\"" "$json_file")
            if [ "$base" == "null" ]; then
                echo -e "    ${RED}[FAIL]${NC} generation.$param.base: MISSING"
                ((TOTAL_ERRORS++))
            elif [ "$variance" == "null" ]; then
                echo -e "    ${YELLOW}[WARN]${NC} generation.$param.variance: MISSING"
                ((TOTAL_WARNINGS++))
            else
                echo -e "    ${GREEN}[PASS]${NC} generation.$param: base=$base, variance=$variance"
            fi
        done

        # Spawn fallback count
        local spawn_count=$(jq -r ".presets[\"$preset_key\"].spawnConfig.count // 0" "$json_file")
        local fallback_count=$(jq ".presets[\"$preset_key\"].spawnConfig.fallbackSpawns | length" "$json_file")
        if [ "$fallback_count" -lt "$spawn_count" ]; then
            echo -e "    ${RED}[FAIL]${NC} fallbackSpawns: $fallback_count < spawnConfig.count ($spawn_count)"
            ((TOTAL_ERRORS++))
        else
            echo -e "    ${GREEN}[PASS]${NC} fallbackSpawns: $fallback_count >= $spawn_count"
        fi

        # Camera config
        local cam_height=$(jq -r ".presets[\"$preset_key\"].cameraConfig.heightAboveGround // \"null\"" "$json_file")
        local cam_distance=$(jq -r ".presets[\"$preset_key\"].cameraConfig.distance // \"null\"" "$json_file")
        if [ "$cam_height" == "null" ] || [ "$cam_distance" == "null" ]; then
            echo -e "    ${RED}[FAIL]${NC} cameraConfig: incomplete"
            ((TOTAL_ERRORS++))
        else
            echo -e "    ${GREEN}[PASS]${NC} cameraConfig: height=$cam_height, distance=$cam_distance"
        fi

        ((TOTAL_ASSETS++))
    done
}

echo "========================================"
echo "  Roblox Templates Validation"
echo "========================================"
echo "Templates Path: $TEMPLATES_PATH"
echo "Category: $CATEGORY"

if [ "$CATEGORY" == "all" ]; then
    for cat in monsters weapons items effects environment npcs maps; do
        validate_category "$cat"
    done
    validate_terrain_presets
else
    if [ "$CATEGORY" == "terrain-presets" ]; then
        validate_terrain_presets
    else
        validate_category "$CATEGORY"
    fi
fi

echo ""
echo "========================================"
echo "  Final Summary"
echo "========================================"
echo "Total Assets/Presets: $TOTAL_ASSETS"
echo -e "Total Errors: ${RED}$TOTAL_ERRORS${NC}"
echo -e "Total Warnings: ${YELLOW}$TOTAL_WARNINGS${NC}"

if [ $TOTAL_ERRORS -gt 0 ]; then
    echo ""
    echo -e "${RED}VALIDATION FAILED${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}VALIDATION PASSED${NC}"
    exit 0
fi
