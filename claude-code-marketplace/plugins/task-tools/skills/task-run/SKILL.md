---
name: task-run
description: Execute an approved task plan phase-by-phase using the task cache, completing implementation and verification for each phase before starting the next one.
---

# Task Run

Execute the current approved plan from `.task-cache/` one phase at a time.

This skill owns implementation, verification, retry loops, progress tracking, and resume.
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
- `tasks/{plan-id}-tasks.md`: source of truth for phase verification status, task status, final completion gate status, evidence, and progress
- `logs/{plan-id}.log`: append-only execution timeline
- `user-checks/{plan-id}.md`: optional deferred user review items
- `handoff/{plan-id}-handoff.md`: optional session handoff snapshot

Execution state must be recoverable from the task file and log file alone.

## Execution Contract

1. Read `.task-cache/current-plan.txt`.
2. Read the active plan, task file, and log file.
3. Find the first phase whose phase verification status is not `passed`.
4. Work only inside that phase until implementation and verification both complete.
5. Update the task file after each meaningful implementation step, retry, or verification run.
6. Append a time-ordered entry to the log file after each meaningful step.
7. Move to the next phase only after the current phase verification status is `passed`.
8. Run the final completion gate after all phase gates pass.
9. Mark the overall work complete only after every phase gate passes, the final completion gate passes, and pending user checks have been surfaced.

## Workflow

### Phase 1: Load Current State

1. Read `.task-cache/current-plan.txt`.
2. Open `.task-cache/plans/{plan-id}.md`.
3. Open `.task-cache/tasks/{plan-id}-tasks.md`.
4. Open `.task-cache/logs/{plan-id}.log`.
5. If present, also read `.task-cache/user-checks/{plan-id}.md` and `.task-cache/handoff/{plan-id}-handoff.md`.
6. Resume from the first phase whose phase verification status is not `passed`.
7. If all phase gates are `passed` but the final completion gate is not `passed`, resume from the final completion gate.

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

### Phase 3: Verify and Retry in Place

1. Run the verification checks defined for the active phase.
2. Record the result in the active phase section:
   - `Phase Verification Status`
   - `Last Verification Run`
   - `Verification Evidence`
   - `Retry Count`
3. If verification fails:
   - mark the phase verification status as `failed`
   - append the failure summary to the log file
   - add or reopen fix tasks in the same phase
   - continue working in the same phase until verification passes
4. If verification passes:
   - mark the phase verification status as `passed`
   - update the phase checklist summary
   - select the next phase whose verification status is not `passed`
5. Never move to the next phase before the current phase verification status is `passed`.

### Phase 4: Final Completion Gate

1. Run the final completion checks after every phase gate is `passed`.
2. Record the result in the final completion section:
   - `Overall Verification Status`
   - `Blocked By`
   - `Final Verification Evidence`
3. If final completion fails:
   - keep the plan open
   - append the failure summary to the log file
   - reopen the blocking phase or add follow-up fix tasks
   - continue working until final completion passes
4. If final completion passes:
   - mark the overall verification status as `passed`
   - refresh the verification scoreboard
5. Never mark the plan complete before the final completion gate is `passed`.

### Phase 5: Update Task State

Use:

```text
/task-tools:task-run update TASK-001 completed
```

Update rules:

1. Read `.task-cache/tasks/{plan-id}-tasks.md`.
2. Update the task entry and its one-line verification summary.
3. Apply status transitions:
   - `completed`: mark all acceptance criteria `[x]`, move the task to `### Completed Tasks`, keep the `phase: \`Phase N: ...\`` label on that line, and remove it from `### Remaining Tasks`
   - `pending|in-progress|blocked`: keep unmet criteria `[ ]`, keep the task in `### Remaining Tasks`, keep the `phase: \`Phase N: ...\`` label on that line, and remove it from `### Completed Tasks`
4. Recalculate progress and refresh the visual checklist, including `### Verification Scoreboard` and `### Phase Task Summary`.
5. Refresh `Current Task` and `Next Task` so they match the remaining work in the current phase.
6. Update the active phase verification fields or final completion fields when verification has run.
7. Append a matching entry to `.task-cache/logs/{plan-id}.log`.

### Phase 6: Progress Report

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
**Final Completion Gate:** pending | failed | passed
**Current Task:** {task-id or none}
**Next Task:** {task-id or none}
**Pending User Checks:** {count}
```

### Phase 7: Resume and Handoff

Resume:

1. Read the latest plan, task file, log file, and optional handoff.
2. Resume from the first phase whose verification status is not `passed`.
3. If all phase gates are `passed` but the final completion gate is not `passed`, resume from the final completion gate.
4. Continue the same implement, verify, and retry loop until the plan fully passes.

Handoff:

1. Gather the current plan, task file, log file, pending user checks, and changed files.
2. Summarize the current phase, latest verification result, final completion gate status, retry status, and next task.
3. Get explicit user confirmation before saving a handoff note.
4. Save it to `.task-cache/handoff/{plan-id}-handoff.md`.

### Phase 8: Final Review and Completion

1. After the final completion gate passes, read `.task-cache/user-checks/{plan-id}.md` if it exists.
2. If pending user checks remain, set the plan status to `awaiting-user-review` before declaring completion.
3. Mark the plan `completed` only after all phase verification has passed, the final completion gate has passed, and pending user checks have been surfaced.
4. Update the task file so `Current Task` and `Next Task` are empty or `none`.
5. Append the completion summary to `.task-cache/logs/{plan-id}.log`.

## Guardrails

- Never move to the next phase before the current phase verification passes
- Never mark the work complete before the final completion gate passes
- Never start Phase 2 work while Phase 1 is still `pending` or `failed`
- Keep detailed execution state in `.task-cache/tasks/` and `.task-cache/logs/`
- Treat the task file as the source of truth for current status
- Keep each task summary line phase-aware by preserving the `phase:` label in `### Completed Tasks` and `### Remaining Tasks`
- Keep the log file append-only
- Ask the user immediately only when the issue is blocking, risky, or irreversible
- Never require stop hooks or loop-summary files to recover execution state
