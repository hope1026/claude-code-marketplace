#!/bin/bash
# Validate asset JSON structure (offline validation)
# Usage: ./validate-asset.sh <category> <asset-id-or-name> [json-file]

set -e

CATEGORY="${1:-}"
ASSET_QUERY="${2:-}"

if [ -z "$CATEGORY" ] || [ -z "$ASSET_QUERY" ]; then
    echo "Usage: $0 <category> <asset-id-or-name> [json-file]"
    echo "Example: $0 monsters zombie"
    echo "Example: $0 maps 123456789"
    exit 1
fi

# Determine JSON file path
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Find roblox-templates skill path
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

    # Method 3: Search for assets directory
    if [ -n "$git_root" ]; then
        local found=$(find "$git_root" -type d -name "assets" -path "*roblox-templates*" 2>/dev/null | head -1)
        if [ -n "$found" ]; then
            echo "$(dirname "$found")"
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
    exit 1
fi

JSON_FILE="${3:-$TEMPLATES_PATH/assets/${CATEGORY}.json}"

if [ ! -f "$JSON_FILE" ]; then
    echo "ERROR: File not found: $JSON_FILE"
    echo ""
    echo "Available categories:"
    ls "$SCRIPT_DIR/../../../roblox-templates/assets/" 2>/dev/null | sed 's/.json$//' || echo "  (none found)"
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "ERROR: jq is required but not installed"
    exit 1
fi

echo "=== Asset Validation ==="
echo "Category: $CATEGORY"
echo "Query: $ASSET_QUERY"
echo "File: $JSON_FILE"
echo ""

# Find asset by ID or name
ASSET=$(jq -r ".assets[] | select(.id == $ASSET_QUERY or .name == \"$ASSET_QUERY\" or (.name | test(\"$ASSET_QUERY\"; \"i\")))" "$JSON_FILE" 2>/dev/null | head -1)

if [ -z "$ASSET" ] || [ "$ASSET" == "null" ]; then
    echo "ERROR: Asset '$ASSET_QUERY' not found in $CATEGORY"
    echo ""
    echo "Available assets:"
    jq -r '.assets[] | "  \(.id): \(.name)"' "$JSON_FILE" | head -10
    exit 1
fi

ASSET_ID=$(echo "$ASSET" | jq -r '.id')
ASSET_NAME=$(echo "$ASSET" | jq -r '.name')

echo "Found: $ASSET_NAME (ID: $ASSET_ID)"
echo ""

ERRORS=0
WARNINGS=0

# Common required fields
echo "--- Common Fields ---"

check_field() {
    local field="$1"
    local required="$2"
    local value=$(echo "$ASSET" | jq -r ".$field // \"null\"")

    if [ "$value" == "null" ] || [ -z "$value" ]; then
        if [ "$required" == "required" ]; then
            echo "  [FAIL] $field: MISSING"
            ((ERRORS++))
        else
            echo "  [WARN] $field: missing (optional)"
            ((WARNINGS++))
        fi
    else
        # Truncate long values
        if [ ${#value} -gt 50 ]; then
            value="${value:0:47}..."
        fi
        echo "  [PASS] $field: $value"
    fi
}

check_field "id" "required"
check_field "name" "required"
check_field "type" "required"
check_field "theme" "optional"
check_field "description" "optional"

echo ""

# Category-specific validation
case "$CATEGORY" in
    monsters|npcs)
        echo "--- Character Fields ---"
        check_field "animations" "optional"

        ANIM_COUNT=$(echo "$ASSET" | jq '.animations | length // 0')
        if [ "$ANIM_COUNT" -gt 0 ]; then
            echo "  [INFO] Animations: $ANIM_COUNT defined"
            echo "$ASSET" | jq -r '.animations | to_entries[] | "    - \(.key): \(.value)"' 2>/dev/null || true
        fi
        ;;

    weapons)
        echo "--- Weapon Fields ---"
        check_field "damage" "optional"
        check_field "attackSpeed" "optional"
        check_field "range" "optional"
        ;;

    maps)
        echo "--- Map Fields ---"
        check_field "bounds" "required"
        check_field "suggestedSpawns" "required"
        check_field "objectSpawns" "optional"
        check_field "cameraFocus" "required"

        SPAWN_COUNT=$(echo "$ASSET" | jq '.suggestedSpawns | length // 0')
        if [ "$SPAWN_COUNT" -lt 3 ]; then
            echo "  [FAIL] suggestedSpawns: $SPAWN_COUNT (minimum 3 required)"
            ((ERRORS++))
        fi
        ;;

    environment)
        echo "--- Environment Fields ---"
        check_field "category" "optional"
        ;;

    effects)
        echo "--- Effect Fields ---"
        check_field "particleType" "optional"
        check_field "duration" "optional"
        ;;
esac

echo ""

# Structure validation (if exists)
STRUCTURE=$(echo "$ASSET" | jq '.structure // null')
if [ "$STRUCTURE" != "null" ]; then
    echo "--- Structure ---"
    echo "$ASSET" | jq -r '.structure | to_entries[] | "  \(.key): \(.value)"' 2>/dev/null || echo "  (complex structure)"
fi

echo ""
echo "=== Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "VALIDATION FAILED - Fix errors before use"
    exit 1
else
    echo ""
    echo "VALIDATION PASSED"
    exit 0
fi
