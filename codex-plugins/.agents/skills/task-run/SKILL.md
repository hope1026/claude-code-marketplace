---
name: task-run
description: Execute an approved task plan phase-by-phase using task-cache state. Use when a plan already exists and the work needs implementation, validation, retry tracking, handoff, or resume support.
---

# Task Run

Execute the current approved plan one phase at a time. This is a Codex workflow and uses `.task-cache/` as the execution source of truth.

## Preconditions

- `.task-cache/plans/{plan-id}.md` exists
- `.task-cache/tasks/{plan-id}-tasks.md` exists
- `.task-cache/logs/{plan-id}.log` exists
- `.task-cache/current-plan.txt` points to the active plan

If not, go back to `task-plan`.

## State Model

Detailed state lives in `.task-cache/`.

- `plans/{plan-id}.md`: approved plan and phase definitions
- `tasks/{plan-id}-tasks.md`: source of truth for phase status, task status, validation evidence, and progress
- `logs/{plan-id}.log`: append-only execution history
- `user-checks/{plan-id}.md`: deferred user-facing checks
- `handoff/{plan-id}-handoff.md`: session handoff snapshot
- `runtime/{plan-id}.json`: lightweight execution summary for Codex

The task file is the source of truth. Runtime JSON is a summary only.

## Execution Contract

1. Read `current-plan.txt`.
2. Read the active plan, task file, runtime file, and log.
3. Resume from the first phase whose validation gate is not `passed`.
4. Execute tasks only from that active phase.
5. Update the task file and log after each meaningful implementation step.
6. Refresh the runtime summary so it mirrors the current phase and remaining work.
7. Run phase validation before moving forward.
8. Do not start the next phase until the current phase gate is `passed`.

## Workflow

### Phase 1: Load State

1. Read `current-plan.txt`.
2. Read the plan, task file, runtime file, log, and user checks if present.
3. Resume from the first phase whose validation gate is not `passed`.
4. Reconfirm `Current Phase`, `Current Task`, and `Next Task` from the task file.

### Phase 2: Refresh Runtime Summary

Keep `.task-cache/runtime/{plan-id}.json` aligned with the active task file.

Example:

```json
{
  "status": "active",
  "plan_id": "plan-20260307-example",
  "phase": "Phase 2: Implementation",
  "current_task": "TASK-003",
  "next_task": "TASK-004",
  "remaining": 3,
  "detail_path": ".task-cache/tasks/plan-20260307-example-tasks.md"
}
```

### Phase 3: Execute The Active Phase

1. Respect task dependencies inside the current phase.
2. Pick the next remaining task from the current phase only.
3. Update the task file after each meaningful step:
   - `Last Updated`
   - `Current Phase`
   - `Current Task`
   - `Next Task`
   - task `Started`
   - task `Completed`
   - task `Result`
   - task `Test`
   - acceptance criteria
4. Append execution notes to the log.
5. Record non-blocking user review items in `user-checks/`.
6. Ask the user only for blocking, risky, or irreversible choices.
7. Do not begin any later-phase task while the current phase gate is still open.

### Phase 4: Validate And Retry

1. Run the current phase validation checks.
2. Record validation output in the phase section:
   - `Phase Validation Status`
   - `Last Validation Run`
   - `Validation Evidence`
   - `Retry Count`
3. If validation fails:
   - keep the phase open
   - mark the phase gate as `failed`
   - append the failure summary to the log
   - add or reopen fix tasks in the same phase
   - refresh runtime to reflect the remaining work
4. Re-run validation after fixes.
5. Do not advance until the current phase gate passes.

### Phase 5: Update Task State

When a task status changes:

1. Update the task entry.
2. Refresh the visual checklist.
3. Recalculate overall progress.
4. Refresh `Current Task` and `Next Task`.
5. Append a short verification note to the log.
6. Refresh the runtime JSON so `phase`, `current_task`, `next_task`, and `remaining` still match the task file.

### Phase 6: Handoff And Resume

Handoff:

1. Summarize current state from plan, task file, log, runtime, and user checks.
2. Save it to `.task-cache/handoff/{plan-id}-handoff.md`.
3. Include current phase, latest validation result, blockers, and next steps.

Resume:

1. Read the latest handoff and runtime file.
2. Reconfirm the current phase from the task file.
3. Continue the same execute-and-validate loop.

### Phase 7: Complete

1. After all phase validations pass, surface pending user checks.
2. Mark the plan `completed` only after implementation and validations are done.
3. Set runtime `status` to `complete`, `remaining` to `0`, and `current_task` to `none`.

## Guardrails

- The task file is the source of truth
- Runtime JSON is a lightweight summary only
- Never skip validation just to advance the phase
- Never start Phase 2 while Phase 1 is still `pending` or `failed`
- Keep progress state in `.task-cache/tasks/`, detailed history in `.task-cache/logs/`, and lightweight summary in `.task-cache/runtime/`
