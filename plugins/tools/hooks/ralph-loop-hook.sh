#!/bin/bash
# Shared Stop hook
# Controls exit behavior when .claude/loop-state.json exists.
# The state file is a loop-control summary, not a detailed task ledger.
#
# Example state file:
# {
#   "status": "active" | "complete" | "inactive",
#   "iteration": 1,
#   "title": "Task Ralph",
#   "skill": "task-ralph",
#   "remaining": 2,
#   "metric_label": "Remaining tasks",
#   "pending_items": ["Run tests", "Update docs"],
#   "next_steps": ["Continue working", "Update the loop summary"],
#   "block_reason": "There is still unfinished work.",
#   "phase": "Implementation",
#   "plan_id": "plan-20260307-task-ralph",
#   "detail_path": ".task-cache/tasks/plan-20260307-task-ralph-tasks.md"
# }

set -euo pipefail

STATE_FILE=".claude/loop-state.json"
INPUT=$(cat)
TMP_STATE_FILE="${STATE_FILE}.tmp"

# Allow exit when stop_hook_active is true to avoid recursive blocking.
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

# If there is no state file, this is not an active loop.
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

read_state() {
  jq -r "$1" "$STATE_FILE"
}

write_state() {
  local jq_expr="${@: -1}"
  local jq_args=()
  if [ "$#" -gt 1 ]; then
    jq_args=("${@:1:$#-1}")
  fi
  if [ "${#jq_args[@]}" -gt 0 ]; then
    jq "${jq_args[@]}" "$jq_expr" "$STATE_FILE" > "$TMP_STATE_FILE" && mv "$TMP_STATE_FILE" "$STATE_FILE"
    return
  fi

  jq "$jq_expr" "$STATE_FILE" > "$TMP_STATE_FILE" && mv "$TMP_STATE_FILE" "$STATE_FILE"
}

append_numbered_lines() {
  local index=1
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    printf '%s. %s\n' "$index" "$line"
    index=$((index + 1))
  done
}

build_default_steps() {
  cat <<'EOF'
Check the current goal and remaining work
Continue the next required step
Update the loop summary in .claude/loop-state.json
When finished, set status to complete or set remaining to 0
EOF
}

# Read loop state.
STATUS=$(read_state '.status // "inactive"')
ITERATION=$(read_state '.iteration // 0')
SKILL=$(read_state '.skill // ""')
TITLE=$(read_state '.title // .skill // "generic-loop"')
BLOCK_REASON=$(read_state '.block_reason // ""')
REMAINING=$(read_state '
  if .remaining != null then (.remaining | tostring)
  elif (.pending_items | type) == "array" then ((.pending_items | length) | tostring)
  else ""
  end
')
METRIC_LABEL=$(read_state '
  if .metric_label != null then .metric_label
  elif .remaining != null then "Remaining work"
  elif (.pending_items | type) == "array" then "Pending items"
  else ""
  end
')
NEXT_STEPS=$(read_state '
  if (.next_steps | type) == "array" then .next_steps[]
  elif (.next_steps | type) == "string" then .next_steps
  else empty
  end
')
PENDING_ITEMS=$(read_state '
  if (.pending_items | type) == "array" then .pending_items[]
  else empty
  end
')
PHASE=$(read_state '.phase // ""')
PLAN_ID=$(read_state '.plan_id // ""')
DETAIL_PATH=$(read_state '.detail_path // ""')

# Clean up and allow exit if the loop is inactive or complete.
if [ "$STATUS" = "inactive" ] || [ "$STATUS" = "complete" ]; then
  rm -f "$STATE_FILE"
  exit 0
fi

# Allow exit when the numeric completion condition is satisfied.
if [ -n "$REMAINING" ] && [ "$REMAINING" -eq 0 ] 2>/dev/null; then
  write_state '.status = "complete"'
  exit 0
fi

# Increment the loop and block exit while work remains.
NEXT_ITER=$((ITERATION + 1))
write_state --argjson iter "$NEXT_ITER" '.iteration = $iter'

if [ -z "$BLOCK_REASON" ]; then
  if [ -n "$REMAINING" ] && [ -n "$METRIC_LABEL" ]; then
    BLOCK_REASON="Exit blocked. Current $METRIC_LABEL: $REMAINING"
  else
    BLOCK_REASON="Exit blocked because the active loop is not complete yet."
  fi
fi

DISPLAY_NAME="$TITLE"
if [ -n "$SKILL" ] && [ "$TITLE" != "$SKILL" ]; then
  DISPLAY_NAME="$TITLE / $SKILL"
fi

if [ -z "$NEXT_STEPS" ]; then
  NEXT_STEPS=$(build_default_steps)
fi

cat <<EOF
[Loop Hook - $DISPLAY_NAME - Iteration $NEXT_ITER] $BLOCK_REASON
EOF

if [ -n "$PHASE" ] || [ -n "$PLAN_ID" ] || [ -n "$DETAIL_PATH" ]; then
  cat <<EOF

Context:
EOF
  [ -n "$PHASE" ] && printf -- '- Phase: %s\n' "$PHASE"
  [ -n "$PLAN_ID" ] && printf -- '- Plan ID: %s\n' "$PLAN_ID"
  [ -n "$DETAIL_PATH" ] && printf -- '- Detail Path: %s\n' "$DETAIL_PATH"
fi

if [ -n "$PENDING_ITEMS" ]; then
  cat <<EOF

Current pending_items:
EOF
  printf '%s\n' "$PENDING_ITEMS" | sed 's/^/- /'
fi

cat <<EOF

Next steps:
EOF
printf '%s\n' "$NEXT_STEPS" | append_numbered_lines

cat <<EOF

To finish the loop, set status to complete or update remaining to 0 in .claude/loop-state.json.
EOF

# exit 2 = block exit
exit 2
