---
name: review-ralph
description: Review changed work with a stop-hook loop. Use when user says "review", "code review", "check my changes", "review this PR", or wants a thorough quality check on code, docs, or configs.
---

# Review Ralph

This skill runs a review loop on top of the shared Stop hook.  
Keep `.claude/loop-state.json` while review work remains. When all work is done, set `remaining` to `0` or change `status` to `complete`.

`loop-state.json` is only a loop-control summary. Detailed review notes, findings, fixes, and re-check history must live under `.task-cache/review/`.

## Review Cache Directory

```text
.task-cache/
└── review/
    ├── findings/               # Review scope and issue list (source of truth)
    │   └── {review-id}.md
    ├── logs/                   # Re-check and verification history
    │   └── {review-id}.log
    ├── handoff/                # Optional review handoff summaries
    │   └── {review-id}-handoff.md
    └── current-review.txt      # Active review ID
```

## Workflow

```
Phase 1: Scope Analysis
   ↓ identify review scope
Phase 2: Self Review
   ↓ collect findings
Phase 3: State Initialize
   ↓ create review cache + loop summary
Phase 4: Fix + Re-check
   ↓ sync findings + summary
Phase 5: Finalize
   ↓ status=complete or remaining=0
```

## Stop Hook Contract

This skill uses the shared hook `[.claude/hooks/ralph-loop-hook.sh](/Users/han-byeol/Work/roblox-mcp-private/.claude/hooks/ralph-loop-hook.sh)`.

Use `.claude/loop-state.json` only for the current loop summary.

Example state file:

```json
{
  "status": "active",
  "title": "review-ralph",
  "skill": "review-ralph",
  "iteration": 1,
  "remaining": 2,
  "metric_label": "Remaining review issues",
  "phase": "Fix + Re-check",
  "detail_path": ".task-cache/review/findings/review-20260307-example.md",
  "pending_items": [
    "Fix missing null handling",
    "Add test coverage"
  ],
  "next_steps": [
    "Handle the next review issue",
    "Re-check the changed files",
    "Update the loop summary"
  ]
}
```

Required fields:

- `status`: `active`, `complete`, `inactive`
- `iteration`: current iteration count
- `remaining`: number of remaining work items

Recommended fields:

- `title`: loop title
- `skill`: active skill name
- `metric_label`: human label for `remaining`
- `phase`: current workflow phase summary
- `detail_path`: pointer to the detailed review record under `.task-cache/review/`
- `pending_items`: list of remaining work items
- `next_steps`: suggested next actions
- `block_reason`: custom reason shown when exit is blocked

Do not store full findings, file-by-file notes, or fix history in `loop-state.json`.

## Phase 1: Scope Analysis

Identify the review scope.

```bash
git status
git diff --name-only
git diff --stat HEAD~1
```

If the user specified a scope, review that scope first.

Typical targets:

- changed code files
- config files
- documentation files
- test files

## Phase 2: Self Review

Review in this order:

1. Re-read the changed files.
2. Check whether the requested work is actually complete.
3. Find bugs, regressions, missing edge-case handling, and missing tests.
4. Check consistency with project conventions and existing patterns.
5. Record findings with file paths and line references.

Review criteria:

- Correctness: logic bugs, edge cases, missing branches
- Regression Risk: possible behavior changes
- Completeness: requirement coverage
- Consistency: alignment with existing patterns and rules
- Test Coverage: whether tests should be added or updated

Record the detailed review scope and findings in `.task-cache/review/findings/{review-id}.md`.

Suggested review file format:

```markdown
# Review: {title}

**Review ID:** {review-id}
**Status:** in-progress | complete
**Scope:** {scope}
**Files Reviewed:**
- path/to/file

## Findings
### REV-001
- **Status:** open | fixed | deferred
- **File:** path:line
- **Issue:** {description}
- **Risk:** {why it matters}
- **Fix:** {summary of change}
- **Verification:** {how it was re-checked}
```

## Phase 3: State Initialize

Summarize the findings, create the review cache files, then create the loop summary.

```bash
mkdir -p .task-cache/review/findings .task-cache/review/logs .task-cache/review/handoff
echo "<review-id>" > .task-cache/review/current-review.txt
```

Create the detailed findings file first, then create `.claude/loop-state.json`.

```bash
cat > .task-cache/review/findings/<review-id>.md <<'EOF'
# Review: <title>
#
# Detailed findings and fix history live here.
EOF
```

```bash
cat > .claude/loop-state.json <<'EOF'
{
  "status": "active",
  "title": "review-ralph",
  "skill": "review-ralph",
  "iteration": 1,
  "remaining": <number of issues that still need fixes>,
  "phase": "Fix + Re-check",
  "metric_label": "Remaining review issues",
  "detail_path": ".task-cache/review/findings/<review-id>.md",
  "pending_items": [
    "<issue 1>",
    "<issue 2>"
  ],
  "next_steps": [
    "Handle the next review issue",
    "Re-check the changed files",
    "Update the loop summary"
  ]
}
EOF
```

If no more work remains, mark the state as complete immediately.

```bash
cat > .claude/loop-state.json <<'EOF'
{
  "status": "complete",
  "title": "review-ralph",
  "skill": "review-ralph",
  "iteration": 1,
  "remaining": 0,
  "phase": "Finalize",
  "detail_path": ".task-cache/review/findings/<review-id>.md",
  "metric_label": "Remaining review issues"
}
EOF
```

## Phase 4: Fix + Re-check

Fix the remaining issues and review again.

Rules:

1. Handle one issue at a time.
2. After each fix, re-check the related code and tests.
3. Update `.task-cache/review/findings/{review-id}.md` and `.task-cache/review/logs/{review-id}.log` after each fix or re-check.
4. If new issues appear, reflect them in both the detailed review file and the loop summary `pending_items` and `remaining`.
5. Remove resolved items from the summary list after the detailed review file has been updated.

State update example:

```bash
jq '
  .remaining = <remaining count>
  | .phase = "Fix + Re-check"
' .claude/loop-state.json > .claude/loop-state.json.tmp && mv .claude/loop-state.json.tmp .claude/loop-state.json
```

When updating `pending_items` as well:

```bash
jq '
  .remaining = <remaining count>
  | .phase = "Fix + Re-check"
  | .pending_items = ["<remaining issue 1>", "<remaining issue 2>"]
' .claude/loop-state.json > .claude/loop-state.json.tmp && mv .claude/loop-state.json.tmp .claude/loop-state.json
```

## Phase 5: Finalize

When all issues are resolved, mark the state file as complete.

```bash
jq '
  .remaining = 0
  | .status = "complete"
  | .phase = "Finalize"
  | .pending_items = []
' .claude/loop-state.json > .claude/loop-state.json.tmp && mv .claude/loop-state.json.tmp .claude/loop-state.json
```

Then end the session. The shared Stop hook will allow exit.

## Final Report

When the loop finishes, report the result in this format.

```markdown
## Review Complete

- Reviewed scope: <scope>
- Issues found: <count>
- Issues fixed: <count>
- Remaining issues: <count>
- Iterations: <loop-state iteration>

### Findings
- [file:line] issue description

### Actions Taken
- which fixes were applied

### Residual Risks
- remaining risks or follow-up work
```

## Guidelines

- Always perform self-review
- Write the issues down clearly before fixing them
- Re-read and verify changed files after each fix
- Keep detailed review records under `.task-cache/review/`
- Keep the state file aligned with the shared hook schema
- Use `jq` when updating the state file
- Keep `remaining` and `pending_items` consistent
- Treat `loop-state.json` as a loop summary, not as the review source of truth
- Keep `detail_path` aligned with the active findings file when it is present
- Before exiting, make sure `remaining = 0` or `status = "complete"`
