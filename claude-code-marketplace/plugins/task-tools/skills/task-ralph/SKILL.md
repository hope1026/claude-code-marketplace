---
name: task-ralph
description: Execute an approved task plan with a Ralph-style stop-hook loop. Use when a plan already exists and the work needs to be carried through implementation, validation, retries, handoff, or resume.
---

# Task Ralph

Execute the current approved plan with a Ralph-style loop until the remaining work reaches zero.

This skill owns execution, validation, retry loops, handoff, and resume.

## Preconditions

Before using this skill:

- an approved plan exists in `.task-cache/plans/`
- a task file exists in `.task-cache/tasks/`
- `.task-cache/current-plan.txt` points to the active plan

If those conditions are not met, go back to `task-plan`.

## State Model

Detailed execution state lives under `.task-cache/`.

- `plans/{plan-id}.md`: approved plan
- `tasks/{plan-id}-tasks.md`: source of truth for task state
- `logs/{plan-id}.log`: append-only execution history
- `user-checks/{plan-id}.md`: deferred user-facing review items
- `handoff/{plan-id}-handoff.md`: session handoff snapshot

`.claude/loop-state.json` is only the Ralph loop summary.

- Keep only loop-control fields there
- Do not duplicate detailed task sections there
- Derive `remaining`, `pending_items`, `phase`, and `detail_path` from the active task file when possible

## Stop Hook Contract

This skill uses the shared hook `[.claude/hooks/ralph-loop-hook.sh](/Users/han-byeol/Work/roblox-mcp-private/.claude/hooks/ralph-loop-hook.sh)`.

Example loop summary:

```json
{
  "status": "active",
  "title": "task-ralph",
  "skill": "task-ralph",
  "iteration": 1,
  "remaining": 3,
  "metric_label": "Remaining tasks",
  "phase": "Phase 2: Implementation",
  "plan_id": "plan-20260307-example",
  "detail_path": ".task-cache/tasks/plan-20260307-example-tasks.md",
  "pending_items": [
    "Finish TASK-003 implementation",
    "Rerun phase validation",
    "Update handoff notes"
  ],
  "next_steps": [
    "Handle the next task",
    "Run validation for the current phase",
    "Update the loop summary"
  ]
}
```

Required fields:

- `status`: `active`, `complete`, `inactive`
- `iteration`: current iteration count
- `remaining`: number of remaining work items

Recommended fields:

- `title`
- `skill`
- `metric_label`
- `phase`
- `plan_id`
- `detail_path`
- `pending_items`
- `next_steps`
- `block_reason`

## Workflow

### Phase 1: Load Current State

1. Read `.task-cache/current-plan.txt`.
2. Read the active plan, task file, logs, and user-checks file.
3. Resume from the first phase whose validation status is not `passed`.
4. Summarize the remaining work.

### Phase 2: Initialize or Refresh Loop Summary

Create or update `.claude/loop-state.json` from the active task file.

```bash
cat > .claude/loop-state.json <<'EOF'
{
  "status": "active",
  "title": "task-ralph",
  "skill": "task-ralph",
  "iteration": 1,
  "remaining": <remaining count>,
  "metric_label": "Remaining tasks",
  "phase": "<current phase>",
  "plan_id": "<plan-id>",
  "detail_path": ".task-cache/tasks/<plan-id>-tasks.md",
  "pending_items": [
    "<remaining item 1>",
    "<remaining item 2>"
  ],
  "next_steps": [
    "Handle the next task",
    "Run validation for the current phase",
    "Update the loop summary"
  ]
}
EOF
```

### Phase 3: Execute Current Phase

1. Respect task dependencies.
2. Execute tasks in the current phase.
3. Update the task file after each meaningful step.
4. Append execution history to `.task-cache/logs/{plan-id}.log`.
5. Add non-blocking user-facing review items to `.task-cache/user-checks/{plan-id}.md`.
6. Ask the user immediately only when the issue is blocking, risky, or irreversible.

### Phase 4: Validate and Retry in Place

1. Run the current phase validation checks.
2. If validation fails:
   - record the failure in the task file and log
   - keep the phase open
   - add or reopen fix tasks in the same phase
   - rerun validation after fixes
3. Do not move to the next phase until the current phase validation status is `passed`.
4. Repeat the same loop for every phase.

### Phase 5: Update Task State

Use:

```text
/task-tools:task-ralph update TASK-001 completed
```

Update rules:

1. Read `.task-cache/tasks/{plan-id}-tasks.md`.
2. Update the task entry and one-line test summary.
3. Apply status transitions:
   - `completed`: mark all acceptance criteria `[x]`, move the task to `### Completed Tasks`, and remove it from `### Remaining Tasks`
   - `pending|in-progress|blocked`: keep unmet criteria `[ ]`, keep the task in `### Remaining Tasks`, and remove it from `### Completed Tasks`
4. Update `Started`, `Completed`, `Result`, and validation evidence.
5. Update the current phase validation state.
6. Recalculate overall progress.
7. Refresh `Visual Checklist`.
8. Append activity log history.
9. Refresh `.claude/loop-state.json` so `remaining` and `pending_items` still match the task file.

### Phase 6: Progress Report

Use:

```text
/task-tools:task-ralph status
```

Report:

```markdown
## Progress Report

**Plan:** {title}
**Progress:** {completed}/{total} ({percentage}%)
**Current Phase Gate:** pending | failed | passed
**Pending User Checks:** {count}

### Visual Snapshot
- Phase Completion:
  - [ ] Phase 1: {name} [gate: failed] ({completed}/{phase-total})
- Completed Tasks:
  - [x] `TASK-00A` completed - test: {one-line verification focus}
- Remaining Tasks:
  - [ ] `TASK-00X` pending - test: {one-line verification focus}

### In Progress
- TASK-003: {title} - Started {timestamp}

### Next Up
- TASK-004: {title}

### Blockers
- TASK-005: Blocked by {reason}
```

### Phase 7: Session Handoff and Resume

Handoff:

1. Gather the current plan, task file, logs, user checks, and changed files.
2. Draft the summary.
3. Get explicit user confirmation before saving.
4. Save it to `.task-cache/handoff/{plan-id}-handoff.md`.
5. Include the latest validation failure, retry status, and pending user checks.

Resume:

1. Read the latest plan, task file, log, handoff, and user-check file.
2. Resume from the first phase whose validation status is not `passed`.
3. Restore `.claude/loop-state.json` from the task file if needed.
4. Continue the same fix-and-validate loop until the phase passes.

### Phase 8: Final Review and Completion

1. After all phase validations pass, read `.task-cache/user-checks/{plan-id}.md`.
2. If pending user checks remain, set the plan status to `awaiting-user-review` and surface them before declaring completion.
3. Mark the plan `completed` only after all validations have passed and pending user checks have been surfaced.
4. Mark the loop summary complete:

```bash
jq '
  .remaining = 0
  | .status = "complete"
  | .phase = "Finalize"
  | .pending_items = []
' .claude/loop-state.json > .claude/loop-state.json.tmp && mv .claude/loop-state.json.tmp .claude/loop-state.json
```

## Guardrails

- Never move to the next phase before the current phase validation passes
- Always rerun validation after fixes in the same phase
- Keep detailed execution state in `.task-cache/`
- Keep `loop-state.json` as loop summary only
- Keep `remaining` and `pending_items` consistent with the active task file
- Never declare overall completion before surfacing pending user checks
