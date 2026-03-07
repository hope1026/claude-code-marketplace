---
name: review-ralph
description: Review changed work with a stop-hook loop. Use when user says "review", "code review", "check my changes", "review this PR", or wants a thorough quality check on code, docs, or configs.
---

# Review Ralph

This skill runs a review loop on top of the shared Stop hook.  
Keep `.claude/loop-state.json` while review work remains. When all work is done, set `remaining` to `0` or change `status` to `complete`.

## Workflow

```
Phase 1: Scope Analysis
   ↓ identify review scope
Phase 2: Self Review
   ↓ collect findings
Phase 3: State Initialize
   ↓ create loop-state.json
Phase 4: Fix + Re-check
   ↓ update remaining
Phase 5: Finalize
   ↓ status=complete or remaining=0
```

## Stop Hook Contract

This skill uses the shared hook `[.claude/hooks/ralph-loop-hook.sh](/Users/han-byeol/Work/roblox-mcp-private/.claude/hooks/ralph-loop-hook.sh)`.

Example state file:

```json
{
  "status": "active",
  "title": "review-ralph",
  "skill": "review-ralph",
  "iteration": 1,
  "remaining": 2,
  "metric_label": "Remaining review issues",
  "pending_items": [
    "Fix missing null handling",
    "Add test coverage"
  ],
  "next_steps": [
    "Fix the remaining issues",
    "Re-check the changed files",
    "Update the state file"
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
- `pending_items`: list of remaining work items
- `next_steps`: suggested next actions
- `block_reason`: custom reason shown when exit is blocked

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

## Phase 3: State Initialize

Summarize the findings, then create the state file.

```bash
cat > .claude/loop-state.json <<'EOF'
{
  "status": "active",
  "title": "review-ralph",
  "skill": "review-ralph",
  "iteration": 1,
  "remaining": <number of issues that still need fixes>,
  "metric_label": "Remaining review issues",
  "pending_items": [
    "<issue 1>",
    "<issue 2>"
  ],
  "next_steps": [
    "Fix the remaining issues",
    "Re-check the changed files",
    "Update the state file"
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
  "metric_label": "Remaining review issues"
}
EOF
```

## Phase 4: Fix + Re-check

Fix the remaining issues and review again.

Rules:

1. Handle one issue at a time.
2. After each fix, re-check the related code and tests.
3. If new issues appear, reflect them in `pending_items` and `remaining`.
4. Remove resolved items from the list.

State update example:

```bash
jq '
  .remaining = <remaining count>
' .claude/loop-state.json > .claude/loop-state.json.tmp && mv .claude/loop-state.json.tmp .claude/loop-state.json
```

When updating `pending_items` as well:

```bash
jq '
  .remaining = <remaining count>
  | .pending_items = ["<remaining issue 1>", "<remaining issue 2>"]
' .claude/loop-state.json > .claude/loop-state.json.tmp && mv .claude/loop-state.json.tmp .claude/loop-state.json
```

## Phase 5: Finalize

When all issues are resolved, mark the state file as complete.

```bash
jq '
  .remaining = 0
  | .status = "complete"
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
- Keep the state file aligned with the shared hook schema
- Use `jq` when updating the state file
- Keep `remaining` and `pending_items` consistent
- Before exiting, make sure `remaining = 0` or `status = "complete"`
