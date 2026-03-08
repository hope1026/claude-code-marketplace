#!/bin/bash
set -e

# Unity UI Toolkit UXML/USS Linter
# Checks for unsupported CSS features and common mistakes in UXML/USS files.
# Usage: verify-completion.sh [directory]
#   directory: path to scan (default: current directory)

SCAN_DIR="${1:-.}"
ERRORS=0
WARNINGS=0

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

error() {
    echo -e "${RED}ERROR${NC}: $1" >&2
    ERRORS=$((ERRORS + 1))
}

warn() {
    echo -e "${YELLOW}WARN${NC}: $1" >&2
    WARNINGS=$((WARNINGS + 1))
}

check_uss() {
    local file="$1"
    local rel_path="${file#$SCAN_DIR/}"

    # --- Unsupported units ---
    if grep -nE ':[[:space:]]*[0-9.]+[[:space:]]*(em|rem|vw|vh|vmin|vmax|cm|mm|pt)[^a-zA-Z]' "$file" >/dev/null 2>&1; then
        error "$rel_path: Unsupported units (em/rem/vw/vh/vmin/vmax/cm/mm/pt). Use px or %."
    fi

    # --- calc() ---
    if grep -nE 'calc[[:space:]]*\(' "$file" >/dev/null 2>&1; then
        error "$rel_path: calc() is not supported in USS."
    fi

    # --- !important ---
    if grep -nE '![[:space:]]*important' "$file" >/dev/null 2>&1; then
        error "$rel_path: !important is not supported in USS. Restructure specificity instead."
    fi

    # --- hsl/hsla ---
    if grep -nE 'hsla?[[:space:]]*\(' "$file" >/dev/null 2>&1; then
        error "$rel_path: hsl()/hsla() not supported. Use rgb()/rgba() or hex."
    fi

    # --- @media ---
    if grep -nE '^[[:space:]]*@media' "$file" >/dev/null 2>&1; then
        error "$rel_path: @media queries not supported. Use C# conditional stylesheet loading."
    fi

    # --- @keyframes ---
    if grep -nE '^[[:space:]]*@keyframes' "$file" >/dev/null 2>&1; then
        error "$rel_path: @keyframes not supported in USS."
    fi

    # --- @import ---
    if grep -nE '^[[:space:]]*@import' "$file" >/dev/null 2>&1; then
        error "$rel_path: @import not supported. Use C# or UXML <Style> to load stylesheets."
    fi

    # --- Unsupported pseudo-elements ---
    if grep -nE '::(before|after)' "$file" >/dev/null 2>&1; then
        error "$rel_path: ::before/::after pseudo-elements not supported in USS."
    fi

    # --- Unsupported pseudo-classes ---
    if grep -nE ':(nth-child|first-child|last-child|not)[[:space:]]*\(' "$file" >/dev/null 2>&1; then
        error "$rel_path: :nth-child/:first-child/:last-child/:not() not supported in USS."
    fi

    # --- Sibling selectors ---
    if grep -nE '[.#a-zA-Z][a-zA-Z0-9_-]*[[:space:]]*[+~][[:space:]]*[.#a-zA-Z]' "$file" >/dev/null 2>&1; then
        warn "$rel_path: +/~ sibling selectors not supported in USS."
    fi

    # --- Unsupported properties ---
    if grep -nE '^[[:space:]]*(box-shadow|text-shadow)[[:space:]]*:' "$file" >/dev/null 2>&1; then
        error "$rel_path: box-shadow/text-shadow not supported in USS."
    fi

    if grep -nE '^[[:space:]]*z-index[[:space:]]*:' "$file" >/dev/null 2>&1; then
        error "$rel_path: z-index not supported. Use UXML element order instead."
    fi

    if grep -nE '^[[:space:]]*(float|clear)[[:space:]]*:' "$file" >/dev/null 2>&1; then
        error "$rel_path: float/clear not supported. Use flexbox."
    fi

    if grep -nE '^[[:space:]]*text-transform[[:space:]]*:' "$file" >/dev/null 2>&1; then
        error "$rel_path: text-transform not supported in USS."
    fi

    if grep -nE '^[[:space:]]*text-decoration[[:space:]]*:' "$file" >/dev/null 2>&1; then
        warn "$rel_path: text-decoration may not be supported (depends on Unity version)."
    fi

    if grep -nE '^[[:space:]]*grid-' "$file" >/dev/null 2>&1; then
        error "$rel_path: CSS Grid not supported. Use flexbox."
    fi

    if grep -nE '^[[:space:]]*(animation|animation-name|animation-duration)[[:space:]]*:' "$file" >/dev/null 2>&1; then
        error "$rel_path: CSS animations not supported. Use USS transitions or C#."
    fi

    if grep -nE '^[[:space:]]*(background-size|background-position|background-repeat)[[:space:]]*:' "$file" >/dev/null 2>&1; then
        error "$rel_path: background-size/position/repeat not supported. Use -unity-background-scale-mode."
    fi

    if grep -nE '^[[:space:]]*(overflow-x|overflow-y)[[:space:]]*:' "$file" >/dev/null 2>&1; then
        warn "$rel_path: overflow-x/overflow-y not supported. Use combined 'overflow' property."
    fi

    # --- text-align instead of -unity-text-align ---
    if grep -nE '^[[:space:]]*text-align[[:space:]]*:' "$file" >/dev/null 2>&1; then
        error "$rel_path: Use -unity-text-align instead of text-align."
    fi

    # --- font-family instead of -unity-font ---
    if grep -nE '^[[:space:]]*font-family[[:space:]]*:' "$file" >/dev/null 2>&1; then
        error "$rel_path: Use -unity-font or -unity-font-definition instead of font-family."
    fi

    # --- display: block/inline/grid ---
    if grep -nE 'display[[:space:]]*:[[:space:]]*(block|inline|inline-block|grid|inline-flex|table)' "$file" >/dev/null 2>&1; then
        error "$rel_path: Only 'display: flex' and 'display: none' are supported in USS."
    fi

    # --- position: fixed/sticky/static ---
    if grep -nE 'position[[:space:]]*:[[:space:]]*(fixed|sticky|static)' "$file" >/dev/null 2>&1; then
        error "$rel_path: Only 'position: relative' and 'position: absolute' are supported in USS."
    fi

    # --- var() inside function ---
    if grep -nE '(rgb|rgba)[[:space:]]*\([[:space:]]*var\(' "$file" >/dev/null 2>&1; then
        error "$rel_path: var() cannot be nested inside functions like rgb(). Define the full color as a variable."
    fi
}

check_uxml() {
    local file="$1"
    local rel_path="${file#$SCAN_DIR/}"

    # --- HTML tags ---
    if grep -nE '<(div|span|p|h[1-6]|section|article|nav|header|footer|main|aside|ul|ol|li|a|input|select|option|textarea|form|table|tr|td|th)[[:space:]>]' "$file" >/dev/null 2>&1; then
        error "$rel_path: HTML tags detected. Use Unity UI Toolkit elements (VisualElement, Label, Button, etc.)."
    fi

    # --- id= attribute ---
    if grep -nE '[[:space:]]id[[:space:]]*=' "$file" >/dev/null 2>&1; then
        error "$rel_path: Use 'name=' instead of 'id=' in UXML."
    fi

    # --- Missing namespace prefix ---
    if grep -nE '<(VisualElement|Label|Button|TextField|Toggle|Slider|ScrollView|Foldout|Image|ListView|DropdownField|EnumField|RadioButton|RadioButtonGroup|GroupBox|Box|RepeatButton|MinMaxSlider|IntegerField|FloatField|LongField|DoubleField|Vector2Field|Vector3Field|Vector4Field|RectField|BoundsField|SliderInt)[[:space:]/>]' "$file" >/dev/null 2>&1; then
        warn "$rel_path: Unity elements may be missing namespace prefix (ui: or uie:)."
    fi

    # --- <link> tag ---
    if grep -nE '<link[[:space:]]' "$file" >/dev/null 2>&1; then
        error "$rel_path: Use <Style src=\"...\"/> instead of <link> in UXML."
    fi
}

# Find USS/UXML files
USS_FILES=$(find "$SCAN_DIR" -name "*.uss" -not -path "*/Library/*" -not -path "*/Temp/*" 2>/dev/null || true)
UXML_FILES=$(find "$SCAN_DIR" -name "*.uxml" -not -path "*/Library/*" -not -path "*/Temp/*" 2>/dev/null || true)

USS_COUNT=0
UXML_COUNT=0
[ -n "$USS_FILES" ] && USS_COUNT=$(echo "$USS_FILES" | wc -l | tr -d ' ')
[ -n "$UXML_FILES" ] && UXML_COUNT=$(echo "$UXML_FILES" | wc -l | tr -d ' ')

if [ "$USS_COUNT" -eq 0 ] && [ "$UXML_COUNT" -eq 0 ]; then
    echo "No UXML/USS files found in: $SCAN_DIR"
    exit 0
fi

echo "Scanning $USS_COUNT USS files, $UXML_COUNT UXML files..."
echo "---"

# USS Checks
if [ "$USS_COUNT" -gt 0 ]; then
    echo ""
    echo "=== USS Validation ==="
    while IFS= read -r file; do
        [ -n "$file" ] && check_uss "$file"
    done <<< "$USS_FILES"
fi

# UXML Checks
if [ "$UXML_COUNT" -gt 0 ]; then
    echo ""
    echo "=== UXML Validation ==="
    while IFS= read -r file; do
        [ -n "$file" ] && check_uxml "$file"
    done <<< "$UXML_FILES"
fi

# Summary
echo ""
echo "---"
echo -e "Scan complete: ${RED}${ERRORS} errors${NC}, ${YELLOW}${WARNINGS} warnings${NC}"

if [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}FAIL${NC}: Fix errors before proceeding." >&2
    exit 1
fi

if [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}PASS with warnings${NC}: Review warnings above."
    exit 0
fi

echo -e "${GREEN}PASS${NC}: All UXML/USS files look good."
exit 0
