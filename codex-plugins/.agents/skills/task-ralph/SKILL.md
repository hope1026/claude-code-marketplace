---
name: task-ralph
description: Execute an approved task plan with resumable task-cache state. Use when a plan already exists and the work needs implementation, validation, retry tracking, handoff, or resume support.
---

# Task Ralph

Execute the current approved plan until the remaining work reaches zero. This is a Codex workflow, not a hook-driven loop.

## Preconditions

- `.task-cache/plans/{plan-id}.md` exists
- `.task-cache/tasks/{plan-id}-tasks.md` exists
- `.task-cache/current-plan.txt` points to the active plan

If not, go back to `task-plan`.

## State Model

Detailed state lives in `.task-cache/`.

- `plans/{plan-id}.md`: approved plan
- `tasks/{plan-id}-tasks.md`: source of truth for task status
- `logs/{plan-id}.log`: append-only execution history
- `user-checks/{plan-id}.md`: deferred user-facing checks
- `handoff/{plan-id}-handoff.md`: session handoff snapshot
- `runtime/{plan-id}.json`: lightweight execution summary

## Workflow

### Phase 1: Load State

1. Read `current-plan.txt`.
2. Read the plan, task file, runtime file, log, and user checks.
3. Resume from the first phase whose validation gate is not `passed`.

### Phase 2: Refresh Runtime Summary

Keep `.task-cache/runtime/{plan-id}.json` aligned with the active task file.

Example:

```json
{
  "status": "active",
  "plan_id": "plan-20260307-example",
  "phase": "Phase 2: Implementation",
  "remaining": 3,
  "pending_items": [
    "Finish TASK-003",
    "Rerun phase validation"
  ],
  "detail_path": ".task-cache/tasks/plan-20260307-example-tasks.md"
}
```

### Phase 3: Execute

1. Respect task dependencies.
2. Update the task file after each meaningful step.
3. Append execution notes to the log.
4. Record non-blocking user review items in `user-checks/`.
5. Ask the user only for blocking, risky, or irreversible choices.

### Phase 4: Validate And Retry

1. Run the current phase validation checks.
2. If validation fails, keep the phase open.
3. Add or reopen fix tasks in the same phase.
4. Re-run validation after fixes.
5. Do not advance until the current phase gate passes.

### Phase 5: Update Task State

When a task status changes:

1. Update the task entry.
2. Refresh the visual checklist.
3. Recalculate overall progress.
4. Append a short verification note to the log.
5. Refresh the runtime JSON so `remaining` and `pending_items` still match the task file.

### Phase 6: Handoff And Resume

Handoff:

1. Summarize current state from plan, task file, log, and user checks.
2. Save it to `.task-cache/handoff/{plan-id}-handoff.md`.
3. Include current phase, latest validation result, blockers, and next steps.

Resume:

1. Read the latest handoff and runtime file.
2. Reconfirm the current phase from the task file.
3. Continue the same execute-and-validate loop.

### Phase 7: Complete

1. After all phase validations pass, surface pending user checks.
2. Mark the plan `completed` only after implementation and validations are done.
3. Set runtime `status` to `complete` and `remaining` to `0`.

## Guardrails

- The task file is the source of truth.
- Runtime JSON is a summary, not a duplicate task ledger.
- Never skip validation just to advance the phase.
