#!/bin/bash
# Validate all assets against schemas
# Usage: ./validate-all.sh [category]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCHEMA_DIR="$SCRIPT_DIR/../schemas"

# Find roblox-templates skill path
find_templates_path() {
    # 1. Environment variable
    if [ -n "$ROBLOX_TEMPLATES_PATH" ] && [ -d "$ROBLOX_TEMPLATES_PATH" ]; then
        echo "$ROBLOX_TEMPLATES_PATH"
        return 0
    fi

    # 2. Current working directory's .claude/skills/roblox-templates
    local pwd_templates="$(pwd)/.claude/skills/roblox-templates"
    if [ -e "$pwd_templates" ]; then
        if [ -L "$pwd_templates" ]; then
            # Resolve symlink
            local resolved=$(readlink "$pwd_templates")
            if [[ "$resolved" == /* ]]; then
                echo "$resolved"
            else
                echo "$(cd "$(dirname "$pwd_templates")" && cd "$(dirname "$resolved")" && pwd)/$(basename "$resolved")"
            fi
        else
            echo "$(cd "$pwd_templates" && pwd)"
        fi
        return 0
    fi

    # 3. Sibling folder (same parent as roblox-templates-creator)
    local sibling_path="$SCRIPT_DIR/../../roblox-templates"
    if [ -d "$sibling_path" ]; then
        echo "$(cd "$sibling_path" && pwd)"
        return 0
    fi

    # 4. Git root (may be symlinked from another repo)
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
    local offset_x=$(echo "$asset" | jq '.cameraConfig.offset.x // "null"')
    local offset_y=$(echo "$asset" | jq '.cameraConfig.offset.y // "null"')
    local offset_z=$(echo "$asset" | jq '.cameraConfig.offset.z // "null"')

    if [ "$distance" == "null" ] || [ "$offset_x" == "null" ] || [ "$offset_y" == "null" ] || [ "$offset_z" == "null" ]; then
        echo -e "    ${RED}[FAIL]${NC} cameraConfig: incomplete (distance=$distance, offset={x:$offset_x, y:$offset_y, z:$offset_z})"
        return 1
    fi

    # Validate ranges
    if (( $(echo "$distance < 0.1 || $distance > 10.0" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "    ${YELLOW}[WARN]${NC} cameraConfig.distance: $distance (expected 0.1-10.0)"
        return 2
    fi

    echo -e "    ${GREEN}[PASS]${NC} cameraConfig: distance=$distance, offset={x:$offset_x, y:$offset_y, z:$offset_z}"
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
    local json_file="$ASSETS_DIR/maps/sources/terrain-presets-source.json"

    if [ ! -f "$json_file" ]; then
        echo -e "${YELLOW}[SKIP]${NC} terrain-presets: file not found at $json_file"
        return
    fi

    echo ""
    echo "=== Validating: terrain-presets ==="
    echo "File: $json_file"

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

        # Camera config (distance + offset format)
        local cam_distance=$(jq -r ".presets[\"$preset_key\"].cameraConfig.distance // \"null\"" "$json_file")
        local cam_offset_x=$(jq -r ".presets[\"$preset_key\"].cameraConfig.offset.x // \"null\"" "$json_file")
        local cam_offset_y=$(jq -r ".presets[\"$preset_key\"].cameraConfig.offset.y // \"null\"" "$json_file")
        local cam_offset_z=$(jq -r ".presets[\"$preset_key\"].cameraConfig.offset.z // \"null\"" "$json_file")
        if [ "$cam_distance" == "null" ] || [ "$cam_offset_x" == "null" ] || [ "$cam_offset_y" == "null" ] || [ "$cam_offset_z" == "null" ]; then
            echo -e "    ${RED}[FAIL]${NC} cameraConfig: incomplete (distance=$cam_distance, offset={x:$cam_offset_x, y:$cam_offset_y, z:$cam_offset_z})"
            ((TOTAL_ERRORS++))
        else
            echo -e "    ${GREEN}[PASS]${NC} cameraConfig: distance=$cam_distance, offset={x:$cam_offset_x, y:$cam_offset_y, z:$cam_offset_z}"
        fi

        ((TOTAL_ASSETS++))
    done
}

validate_environment_category() {
    local category="$1"
    local json_file="$ASSETS_DIR/maps/sources/${category}-source.json"

    if [ ! -f "$json_file" ]; then
        echo -e "${YELLOW}[SKIP]${NC} $category: file not found at $json_file"
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

    # Get validation rules from category-schemas.json
    local min_spawns=$(jq -r ".categories[\"$category\"].validation.minSuggestedSpawns // 3" "$CATEGORY_SCHEMAS")
    local min_bounding=$(jq -r ".categories[\"$category\"].validation.minBoundingSize // 0" "$CATEGORY_SCHEMAS")
    local max_bounding=$(jq -r ".categories[\"$category\"].validation.maxBoundingSize // 9999" "$CATEGORY_SCHEMAS")
    local requires_terrains=$(jq -r ".categories[\"$category\"].validation.requiresCompatibleTerrains // false" "$CATEGORY_SCHEMAS")

    local cat_errors=0
    local cat_warnings=0

    while IFS= read -r asset; do
        local id=$(echo "$asset" | jq -r '.id')
        local name=$(echo "$asset" | jq -r '.name')
        local asset_errors=0
        local asset_warnings=0

        echo ""
        echo "  Asset: $name (ID: $id)"

        # Required fields
        for field in id name type theme cameraConfig; do
            local value=$(echo "$asset" | jq -r ".$field // \"null\"")
            if [ "$value" == "null" ] || [ -z "$value" ]; then
                echo -e "    ${RED}[FAIL]${NC} $field: MISSING"
                ((asset_errors++))
            fi
        done

        # Camera config validation
        validate_camera_config "$asset" ""
        local cam_result=$?
        if [ $cam_result -eq 1 ]; then
            ((asset_errors++))
        elif [ $cam_result -eq 2 ]; then
            ((asset_warnings++))
        fi

        # Bounds validation (if required)
        if [ "$min_bounding" != "0" ] || [ "$max_bounding" != "9999" ]; then
            local has_bounds=$(echo "$asset" | jq 'has("bounds")')
            if [ "$has_bounds" == "true" ]; then
                local size_x=$(echo "$asset" | jq '.bounds.max.x - .bounds.min.x')
                local size_y=$(echo "$asset" | jq '.bounds.max.y - .bounds.min.y')
                local size_z=$(echo "$asset" | jq '.bounds.max.z - .bounds.min.z')
                local max_size=$(echo "$size_x $size_y $size_z" | tr ' ' '\n' | sort -rn | head -1)

                if [ "$min_bounding" != "0" ] && (( $(echo "$max_size < $min_bounding" | bc -l 2>/dev/null || echo "0") )); then
                    echo -e "    ${RED}[FAIL]${NC} bounds: max dimension $max_size < minimum $min_bounding"
                    ((asset_errors++))
                elif [ "$max_bounding" != "9999" ] && (( $(echo "$max_size > $max_bounding" | bc -l 2>/dev/null || echo "0") )); then
                    echo -e "    ${RED}[FAIL]${NC} bounds: max dimension $max_size > maximum $max_bounding"
                    ((asset_errors++))
                else
                    echo -e "    ${GREEN}[PASS]${NC} bounds: max dimension $max_size (range: $min_bounding-$max_bounding)"
                fi
            else
                echo -e "    ${YELLOW}[WARN]${NC} bounds: MISSING (recommended for size validation)"
                ((asset_warnings++))
            fi
        fi

        # Spawns validation
        local spawns=$(echo "$asset" | jq '.suggestedSpawns | length // 0')
        if [ "$spawns" -lt "$min_spawns" ]; then
            echo -e "    ${RED}[FAIL]${NC} suggestedSpawns: $spawns (minimum $min_spawns required)"
            ((asset_errors++))
        else
            echo -e "    ${GREEN}[PASS]${NC} suggestedSpawns: $spawns positions"
        fi

        # compatibleTerrains validation (for addon-structures)
        if [ "$requires_terrains" == "true" ]; then
            local terrains=$(echo "$asset" | jq '.compatibleTerrains | length // 0')
            if [ "$terrains" -eq 0 ]; then
                echo -e "    ${RED}[FAIL]${NC} compatibleTerrains: MISSING (required)"
                ((asset_errors++))
            else
                echo -e "    ${GREEN}[PASS]${NC} compatibleTerrains: $terrains defined"
            fi
        fi

        ((cat_errors += asset_errors))
        ((cat_warnings += asset_warnings))
        ((TOTAL_ASSETS++))
    done < <(jq -c '.assets[]' "$json_file")

    ((TOTAL_ERRORS += cat_errors))
    ((TOTAL_WARNINGS += cat_warnings))

    echo ""
    echo "Category Summary: $cat_errors errors, $cat_warnings warnings"
}

validate_maps() {
    local json_file="$ASSETS_DIR/maps/maps.json"

    if [ ! -f "$json_file" ]; then
        echo -e "${YELLOW}[SKIP]${NC} maps: file not found at $json_file"
        return
    fi

    echo ""
    echo "=== Validating: maps.json ==="
    echo "File: $json_file"

    local maps_errors=0
    local maps_warnings=0

    # Validate _meta
    local version=$(jq -r '._meta.version // "null"' "$json_file")
    if [ "$version" == "null" ]; then
        echo -e "  ${RED}[FAIL]${NC} _meta.version: MISSING"
        ((maps_errors++))
    else
        echo -e "  ${GREEN}[PASS]${NC} _meta.version: $version"
    fi

    # Validate sources exist
    echo ""
    echo "  Checking source files..."
    for source in $(jq -r '.sources | keys[]' "$json_file"); do
        local source_path=$(jq -r ".sources[\"$source\"]" "$json_file")
        local full_path="$ASSETS_DIR/maps/${source_path#./}"
        if [ -f "$full_path" ]; then
            echo -e "    ${GREEN}[PASS]${NC} $source: exists"
        else
            echo -e "    ${RED}[FAIL]${NC} $source: file not found at $full_path"
            ((maps_errors++))
        fi
    done

    # Validate environments array
    echo ""
    echo "  Checking environments..."
    local env_count=$(jq '.environments | length' "$json_file")
    echo "  Total environments: $env_count"

    # Check for duplicate IDs
    local unique_ids=$(jq '[.environments[].id] | unique | length' "$json_file")
    if [ "$unique_ids" -ne "$env_count" ]; then
        echo -e "  ${RED}[FAIL]${NC} Duplicate environment IDs detected"
        ((maps_errors++))
    else
        echo -e "  ${GREEN}[PASS]${NC} All environment IDs are unique"
    fi

    # Validate each environment
    local env_idx=0
    while [ $env_idx -lt $env_count ]; do
        local env_id=$(jq -r ".environments[$env_idx].id" "$json_file")
        local env_type=$(jq -r ".environments[$env_idx].type" "$json_file")
        local env_source=$(jq -r ".environments[$env_idx].source" "$json_file")

        # Check ID format
        if [[ ! "$env_id" =~ ^env-(t|m|tm|ts)-[0-9]{3}$ ]]; then
            echo -e "    ${RED}[FAIL]${NC} $env_id: invalid ID format"
            ((maps_errors++))
        fi

        # Validate source reference
        case "$env_type" in
            terrain_only)
                local preset=$(jq -r ".environments[$env_idx].preset" "$json_file")
                local preset_exists=$(jq -r ".presets[\"$preset\"] // \"null\"" "$ASSETS_DIR/maps/sources/terrain-presets-source.json" 2>/dev/null)
                if [ "$preset_exists" == "null" ]; then
                    echo -e "    ${RED}[FAIL]${NC} $env_id: preset '$preset' not found"
                    ((maps_errors++))
                fi
                ;;
            map_only|terrain_with_map)
                local assetId=$(jq -r ".environments[$env_idx].assetId" "$json_file")
                local source_file="$ASSETS_DIR/maps/sources/${env_source}-source.json"
                if [ -f "$source_file" ]; then
                    local asset_exists=$(jq ".assets[] | select(.id == $assetId)" "$source_file" 2>/dev/null)
                    if [ -z "$asset_exists" ]; then
                        echo -e "    ${RED}[FAIL]${NC} $env_id: assetId $assetId not found in $env_source"
                        ((maps_errors++))
                    fi
                fi
                ;;
        esac

        ((env_idx++))
    done

    # Validate theme references
    echo ""
    echo "  Checking theme references..."
    local theme_count=$(jq '.themes | keys | length' "$json_file")
    echo "  Total themes: $theme_count"

    for theme in $(jq -r '.themes | keys[]' "$json_file"); do
        local env_ids=$(jq -r ".themes[\"$theme\"].environmentIds[]" "$json_file" 2>/dev/null)
        local valid_count=0
        local invalid_count=0

        for env_id in $env_ids; do
            local exists=$(jq -r ".environments[] | select(.id == \"$env_id\") | .id" "$json_file")
            if [ -n "$exists" ]; then
                ((valid_count++))
            else
                echo -e "    ${RED}[FAIL]${NC} Theme '$theme': references non-existent ID '$env_id'"
                ((maps_errors++))
                ((invalid_count++))
            fi
        done

        if [ $invalid_count -eq 0 ]; then
            echo -e "    ${GREEN}[PASS]${NC} Theme '$theme': $valid_count valid references"
        fi
    done

    ((TOTAL_ERRORS += maps_errors))
    ((TOTAL_WARNINGS += maps_warnings))

    echo ""
    echo "Maps Summary: $maps_errors errors, $maps_warnings warnings"
}

echo "========================================"
echo "  Roblox Templates Validation"
echo "========================================"
echo "Templates Path: $TEMPLATES_PATH"
echo "Category: $CATEGORY"

# Standard asset categories
STANDARD_CATEGORIES="monsters weapons items effects environment npcs"

# Environment categories (in maps/ folder)
ENV_CATEGORIES="standalone-maps hybrid-maps addon-structures"

if [ "$CATEGORY" == "all" ]; then
    # Validate standard asset categories
    for cat in $STANDARD_CATEGORIES; do
        validate_category "$cat"
    done

    # Validate legacy maps (deprecated)
    validate_category "maps"

    # Validate environment categories
    for cat in $ENV_CATEGORIES; do
        validate_environment_category "$cat"
    done

    # Validate terrain presets
    validate_terrain_presets

    # Validate environment index
    validate_maps

elif [ "$CATEGORY" == "environments" ]; then
    # Validate all environment-related files
    for cat in $ENV_CATEGORIES; do
        validate_environment_category "$cat"
    done
    validate_terrain_presets
    validate_maps

elif [ "$CATEGORY" == "terrain-presets" ]; then
    validate_terrain_presets

elif [ "$CATEGORY" == "maps" ] || [ "$CATEGORY" == "index" ]; then
    validate_maps

elif [[ " $ENV_CATEGORIES " =~ " $CATEGORY " ]]; then
    validate_environment_category "$CATEGORY"

else
    validate_category "$CATEGORY"
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
