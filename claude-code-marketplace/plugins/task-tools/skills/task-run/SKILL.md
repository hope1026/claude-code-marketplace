---
name: task-run
description: Execute an approved task plan phase-by-phase using the task cache, completing implementation and verification for each phase before starting the next one.
---

# Task Run

Execute the current approved plan from `.task-cache/` one phase at a time.

This skill owns implementation, validation, retry loops, progress tracking, and resume.
Use it only after `task-plan` has created the plan and the user has approved it.

## Preconditions

Before using this skill:

- an approved plan exists in `.task-cache/plans/`
- a task file exists in `.task-cache/tasks/`
- a log file exists in `.task-cache/logs/`
- `.task-cache/current-plan.txt` points to the active plan

If those conditions are not met, go back to `task-plan`.

## State Model

Detailed execution state lives under `.task-cache/`.

- `plans/{plan-id}.md`: approved plan and phase definitions
- `tasks/{plan-id}-tasks.md`: source of truth for phase status, task status, validation evidence, and progress
- `logs/{plan-id}.log`: append-only execution timeline
- `user-checks/{plan-id}.md`: optional deferred user review items
- `handoff/{plan-id}-handoff.md`: optional session handoff snapshot

Execution state must be recoverable from the task file and log file alone.

## Execution Contract

1. Read `.task-cache/current-plan.txt`.
2. Read the active plan, task file, and log file.
3. Find the first phase whose validation status is not `passed`.
4. Work only inside that phase until implementation and validation both complete.
5. Update the task file after each meaningful implementation step, retry, or validation run.
6. Append a time-ordered entry to the log file after each meaningful step.
7. Move to the next phase only after the current phase validation status is `passed`.
8. Mark the overall work complete only after every phase passes and pending user checks have been surfaced.

## Workflow

### Phase 1: Load Current State

1. Read `.task-cache/current-plan.txt`.
2. Open `.task-cache/plans/{plan-id}.md`.
3. Open `.task-cache/tasks/{plan-id}-tasks.md`.
4. Open `.task-cache/logs/{plan-id}.log`.
5. If present, also read `.task-cache/user-checks/{plan-id}.md` and `.task-cache/handoff/{plan-id}-handoff.md`.
6. Resume from the first phase whose validation status is not `passed`.

### Phase 2: Execute the Active Phase

1. Respect task dependencies inside the active phase.
2. Pick the next remaining task from the active phase only.
3. Record the active phase and active task in the task file.
4. Execute the task.
5. Update the task entry after each meaningful step:
   - `Started`
   - `Completed`
   - `Result`
   - `Test`
   - acceptance criteria
6. Update the summary fields after each meaningful step:
   - `Last Updated`
   - `Current Phase`
   - `Current Task`
   - `Next Task`
   - `Progress`
7. Append a matching entry to `.task-cache/logs/{plan-id}.log`.
8. Do not start any task from a later phase while the current phase gate is still open.

### Phase 3: Validate and Retry in Place

1. Run the validation checks defined for the active phase.
2. Record the result in the active phase section:
   - `Phase Validation Status`
   - `Last Validation Run`
   - `Validation Evidence`
   - `Retry Count`
3. If validation fails:
   - mark the phase validation status as `failed`
   - append the failure summary to the log file
   - add or reopen fix tasks in the same phase
   - continue working in the same phase until validation passes
4. If validation passes:
   - mark the phase validation status as `passed`
   - update the phase checklist summary
   - select the next phase whose validation status is not `passed`
5. Never move to the next phase before the current phase validation status is `passed`.

### Phase 4: Update Task State

Use:

```text
/task-tools:task-run update TASK-001 completed
```

Update rules:

1. Read `.task-cache/tasks/{plan-id}-tasks.md`.
2. Update the task entry and its one-line verification summary.
3. Apply status transitions:
   - `completed`: mark all acceptance criteria `[x]`, move the task to `### Completed Tasks`, and remove it from `### Remaining Tasks`
   - `pending|in-progress|blocked`: keep unmet criteria `[ ]`, keep the task in `### Remaining Tasks`, and remove it from `### Completed Tasks`
4. Recalculate progress and refresh the visual checklist.
5. Refresh `Current Task` and `Next Task` so they match the remaining work in the current phase.
6. Update the active phase validation fields when validation has run.
7. Append a matching entry to `.task-cache/logs/{plan-id}.log`.

### Phase 5: Progress Report

Use:

```text
/task-tools:task-run status
```

Report:

```markdown
## Progress Report

**Plan:** {title}
**Progress:** {completed}/{total} ({percentage}%)
**Current Phase:** {phase name}
**Current Phase Gate:** pending | failed | passed
**Current Task:** {task-id or none}
**Next Task:** {task-id or none}
**Pending User Checks:** {count}
```

### Phase 6: Resume and Handoff

Resume:

1. Read the latest plan, task file, log file, and optional handoff.
2. Resume from the first phase whose validation status is not `passed`.
3. Continue the same implement, validate, and retry loop until the phase passes.

Handoff:

1. Gather the current plan, task file, log file, pending user checks, and changed files.
2. Summarize the current phase, latest validation result, retry status, and next task.
3. Get explicit user confirmation before saving a handoff note.
4. Save it to `.task-cache/handoff/{plan-id}-handoff.md`.

### Phase 7: Final Review and Completion

1. After all phase validations pass, read `.task-cache/user-checks/{plan-id}.md` if it exists.
2. If pending user checks remain, set the plan status to `awaiting-user-review` before declaring completion.
3. Mark the plan `completed` only after all validations have passed and pending user checks have been surfaced.
4. Update the task file so `Current Task` and `Next Task` are empty or `none`.
5. Append the completion summary to `.task-cache/logs/{plan-id}.log`.

## Guardrails

- Never move to the next phase before the current phase validation passes
- Never start Phase 2 work while Phase 1 is still `pending` or `failed`
- Keep detailed execution state in `.task-cache/tasks/` and `.task-cache/logs/`
- Treat the task file as the source of truth for current status
- Keep the log file append-only
- Ask the user immediately only when the issue is blocking, risky, or irreversible
- Never require stop hooks or loop-summary files to recover execution state
