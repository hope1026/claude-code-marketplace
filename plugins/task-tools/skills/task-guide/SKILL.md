---
name: task-guide
description: Unified planning and tracking workflow for project tasks. Use when user asks to plan work, break down requirements, track progress, update task status, generate handoff summaries, or resume a previous task session.
---

# Task Guide

Plan tasks, execute with phase-level validation gates, and create handoffs from a single source of truth.

## Cache Directory

```text
.task-cache/
├── plans/                    # Immutable plan documents
│   └── {plan-id}.md
├── tasks/                    # Task lists with status (single source of truth)
│   └── {plan-id}-tasks.md
├── logs/                     # Activity logs
│   └── {plan-id}.log
├── handoff/                  # Session handoff summaries
│   └── {plan-id}-handoff.md
├── user-checks/              # Deferred user confirmations and must-know items
│   └── {plan-id}.md
└── current-plan.txt          # Active plan ID
```

## End-to-End Workflow

### Phase 1: Requirement Clarification

1. Analyze the request for ambiguities and constraints.
2. Ask targeted clarifying questions.
3. Summarize understanding back to user.
4. Repeat until scope and acceptance criteria are clear.

### Phase 2: Plan Creation

1. Break work into phases.
2. Define for each phase:
   - goal
   - entry criteria
   - tasks and dependencies
   - complexity (`simple|medium|complex`)
   - validation checks
   - failure loop for validation retries
3. Identify risks and mitigations.
4. Write `.task-cache/plans/{plan-id}.md`.

**Plan format:**
```markdown
# Plan: {title}

**ID:** {plan-id}
**Created:** {date}
**Status:** draft | confirmed | in-progress | awaiting-user-review | completed

## Overview
{what we are building}

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Phases
### Phase 1: {name}
**Goal:** {phase outcome}
**Entry Criteria:** {when this phase can start}
**Validation Gate:** pending | failed | passed
**Validation Checks:**
- [ ] Check 1
- [ ] Check 2
**Failure Loop:** If validation fails, stay in this phase, add or reopen tasks, apply fixes, and rerun validation until passed.
- [ ] Task 1.1 - {description} [complexity: simple]

### Phase 2: {name}
**Goal:** {phase outcome}
**Entry Criteria:** {when this phase can start}
**Validation Gate:** pending | failed | passed
**Validation Checks:**
- [ ] Check 1
- [ ] Check 2
**Failure Loop:** If validation fails, stay in this phase, add or reopen tasks, apply fixes, and rerun validation until passed.
- [ ] Task 2.1 - {description} [complexity: complex]
  - Depends on: Task 1.1

## Risks & Mitigations
- Risk: {description} -> Mitigation: {approach}
```

### Phase 3: User Confirmation

Never execute without explicit user confirmation.

1. Present the full plan.
2. Ask for confirmation.
3. If changed, re-confirm.
4. On confirmation, set plan status to `confirmed`.

### Phase 4: Task List Generation

1. Create `.task-cache/tasks/{plan-id}-tasks.md`.
2. Create `.task-cache/user-checks/{plan-id}.md`.
3. Set active plan: `echo "{plan-id}" > .task-cache/current-plan.txt`.

**Task file format:**
```markdown
# Tasks: {plan-title}

**Plan ID:** {plan-id}
**Created:** {timestamp}
**Last Updated:** {timestamp}
**Current Phase:** Phase 1
**Progress:** {completed}/{total} ({percentage}%)
**Pending User Checks:** {count}

## Visual Checklist

### Phase Completion
- [ ] Phase 1: {name} [gate: pending] ({completed}/{phase-total})
- [ ] Phase 2: {name} [gate: pending] ({completed}/{phase-total})

### Completed Tasks
- [x] `TASK-00A` completed - test: {one-line verification focus}

### Remaining Tasks
- [ ] `TASK-00X` pending - test: {one-line verification focus}
- [ ] `TASK-00Y` blocked - test: {one-line verification focus}

## Phase 1: {name}
- **Phase Validation Status:** pending | failed | passed
- **Last Validation Run:** {timestamp}
- **Validation Evidence:** {brief summary}
- **Retry Count:** {n}

### TASK-001: {title}
- **Complexity:** simple | medium | complex
- **Dependencies:** none | TASK-XXX
- **Started:** {timestamp}
- **Completed:** {timestamp}
- **Result:** {brief summary}
- **Test:** {short verification description}
- **Acceptance Criteria:**
  - [ ] Criterion 1
  - [ ] Criterion 2
```

**User check file format:**
```markdown
# User Checks: {plan-title}

**Plan ID:** {plan-id}
**Last Updated:** {timestamp}

## Pending Review
### ITEM-001
- **Type:** confirmation | must-know
- **Created:** {timestamp}
- **Context:** {why this matters}
- **User Must Review:** {what the user should check}
- **Impact:** {risk, consequence, or follow-up}
```

### Phase 5: Phase Execution and Validation Loop

1. Respect dependencies.
2. Execute tasks in the current phase.
3. Run the current phase validation checks.
4. If validation fails, record the failure in `tasks/` and `logs/`, add or reopen follow-up tasks in the same phase, apply fixes, and rerun validation.
5. Do not move to the next phase until the current phase validation status is `passed`.
6. Repeat the same loop for every phase until all phases pass.
7. If a non-blocking user confirmation or must-know item appears during work, append it to `user-checks/{plan-id}.md` and continue execution.
8. Keep recording ongoing execution details in `tasks/` and `logs/` exactly as before.
9. Ask the user immediately only when the issue is blocking, risky, or irreversible.

### Phase 6: Status Updates

Use:
```text
/task-tools:task-guide update TASK-001 completed
```

1. Read `.task-cache/tasks/{plan-id}-tasks.md`.
2. Update task entry and one-line test summary.
3. Apply status transitions:
   - `completed`: mark all acceptance criteria `[x]`, move task to `### Completed Tasks`, remove from `### Remaining Tasks`.
   - `pending|in-progress|blocked`: keep unmet criteria `[ ]`, ensure task is in `### Remaining Tasks`, remove from `### Completed Tasks`.
4. Update `Started`, `Completed`, `Result`, and validation evidence fields.
5. Update the current phase validation state:
   - `pending`: work still in progress.
   - `failed`: validation failed, increment retry count, keep the phase open, and add or reopen fix tasks in the same phase.
   - `passed`: validation evidence is recorded and the phase can be marked complete.
6. Recalculate progress.
7. Refresh `Visual Checklist` (`Phase Completion` + `Completed Tasks` + `Remaining Tasks`).
8. Append activity log entry.
9. If a deferred user review item was discovered, append it to `.task-cache/user-checks/{plan-id}.md` and update `Pending User Checks`.

### Phase 7: Progress Report

Use:
```text
/task-tools:task-guide status
```

**Output format:**
```markdown
## Progress Report

**Plan:** {title}
**Progress:** {completed}/{total} ({percentage}%)
**Current Phase Gate:** pending | failed | passed
**Pending User Checks:** {count}

### Visual Snapshot
- Phase Completion:
  - [ ] Phase 1: {name} [gate: failed] ({completed}/{phase-total})
  - [ ] Phase 2: {name} [gate: pending] ({completed}/{phase-total})
- Completed Tasks:
  - [x] `TASK-00A` completed - test: {one-line verification focus}
- Remaining Tasks:
  - [ ] `TASK-00X` pending - test: {one-line verification focus}
  - [ ] `TASK-00Y` blocked - test: {one-line verification focus}

### In Progress
- TASK-003: {title} - Started {timestamp}

### Next Up
- TASK-004: {title}

### Blockers
- TASK-005: Blocked by {reason}
```

### Phase 8: Session Handoff and Resume

Generate:
```text
/task-tools:task-guide handoff
```

Resume:
```text
/task-tools:task-guide resume
```

Handoff workflow:
1. Gather current plan, tasks, logs, user checks, and changed files.
2. Draft summary for user review.
3. Get explicit user confirmation before saving.
4. Save to `.task-cache/handoff/{plan-id}-handoff.md`.
5. Include the latest validation failure, retry status, and pending user checks.

Resume workflow:
1. Read the latest plan, task file, log, handoff, and user check file.
2. Resume from the first phase whose validation status is not `passed`.
3. Continue the same fix-and-validate loop until the phase passes.
4. Preserve pending user checks for the final summary.

### Phase 9: Final Review and Completion

1. After every phase validation has passed, read `.task-cache/user-checks/{plan-id}.md`.
2. If the file contains pending items, set plan status to `awaiting-user-review` and surface those items to the user before declaring the work complete.
3. Tell the user they must review the pending items before closing the task.
4. Mark the plan `completed` only after all phase validations have passed and pending user checks have been surfaced.

## Guardrails

- Do not add `| Status | Count |` table to task files.
- Do not add `## Phase Snapshot` when `### Phase Completion` already exists.
- Do not add per-task `- **Status:**` fields in task detail sections.
- Keep task state only in `tasks/{plan-id}-tasks.md` (single source of truth).
- Keep non-blocking user confirmations and must-know items in `user-checks/{plan-id}.md`.
- Keep execution history in `logs/{plan-id}.log` as append-only history.
- Never mark `completed` while any acceptance criterion remains unchecked.
- Never move to the next phase while the current phase validation is not `passed`.
- Always rerun validation after fixes in the same phase.
- Always keep `Visual Checklist` synchronized with detailed task sections.
- Never declare overall completion before surfacing pending user checks to the user.

## File Operations

Initialize cache:
```bash
mkdir -p .task-cache/plans .task-cache/tasks .task-cache/logs .task-cache/handoff .task-cache/user-checks
```

Plan ID format:
`plan-{YYYYMMDD}-{short-description}`

Set active plan:
```bash
echo "{plan-id}" > .task-cache/current-plan.txt
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `/task-tools:task-guide status` | Show current progress |
| `/task-tools:task-guide update TASK-XXX {status}` | Update task status |
| `/task-tools:task-guide handoff` | Generate session handoff |
| `/task-tools:task-guide resume` | Resume from handoff |
| `/task-tools:task-guide activity` | Show recent activity log |

## Notes

- Logs are append-only history.
- Handoffs are snapshots, not live state.
- Resume always uses the latest task file and the latest incomplete phase validation state.
- `user-checks/` stores deferred user-facing review items and does not replace task or log history.
