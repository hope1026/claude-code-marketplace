---
name: task-plan
description: Plan work into phases and initialize task cache files. Use when the user needs requirements clarified, a plan created, tasks initialized, or planning revised before execution begins.
---

# Task Plan

Create and confirm the execution plan before any implementation work starts.

This skill owns planning. It does not own the execution loop.

## Scope

Use this skill for:

- requirement clarification
- scope definition
- phase planning
- dependency and risk analysis
- task file initialization
- user confirmation before execution

Use `task-run` after planning is approved and the task files are ready.

## Cache Directory

```text
.task-cache/
├── plans/
│   └── {plan-id}.md
├── tasks/
│   └── {plan-id}-tasks.md
├── logs/
│   └── {plan-id}.log
├── handoff/
│   └── {plan-id}-handoff.md
├── user-checks/
│   └── {plan-id}.md
└── current-plan.txt
```

## Workflow

### Phase 1: Requirement Clarification

1. Analyze the request for ambiguities, constraints, and acceptance criteria.
2. Ask targeted clarifying questions when needed.
3. Summarize the agreed scope back to the user.
4. Repeat until the work is clear enough to plan.

### Phase 2: Plan Creation

1. Break the work into phases.
2. For each phase define:
   - goal
   - entry criteria
   - tasks and dependencies
   - complexity (`simple|medium|complex`)
   - validation checks
   - failure loop for validation retries
3. Identify risks and mitigations.
4. Write `.task-cache/plans/{plan-id}.md`.

Plan format:

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

## Risks & Mitigations
- Risk: {description} -> Mitigation: {approach}
```

### Phase 3: User Confirmation

Never execute without explicit user confirmation.

1. Present the plan.
2. Ask for confirmation.
3. If the plan changes, re-confirm it.
4. Set the plan status to `confirmed` only after approval.

### Phase 4: Task File Initialization

1. Create `.task-cache/tasks/{plan-id}-tasks.md`.
2. Create `.task-cache/user-checks/{plan-id}.md`.
3. Create or initialize `.task-cache/logs/{plan-id}.log`.
4. Set the active plan with `.task-cache/current-plan.txt`.

Task file format:

```markdown
# Tasks: {plan-title}

**Plan ID:** {plan-id}
**Created:** {timestamp}
**Last Updated:** {timestamp}
**Current Phase:** Phase 1
**Current Task:** none
**Next Task:** TASK-001
**Progress:** {completed}/{total} ({percentage}%)
**Pending User Checks:** {count}

## Visual Checklist

### Phase Completion
- [ ] Phase 1: {name} [gate: pending] ({completed}/{phase-total})

### Completed Tasks
- [x] `TASK-00A` completed - test: {one-line verification focus}

### Remaining Tasks
- [ ] `TASK-00X` pending - test: {one-line verification focus}

## Phase 1: {name}
- **Phase Validation Status:** pending | failed | passed
- **Last Validation Run:** {timestamp}
- **Validation Evidence:** {brief summary}
- **Retry Count:** {n}
- **Phase Gate Rule:** Do not start the next phase until this phase is `passed`

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

User check file format:

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

## Guardrails

- Do not start implementation work before the user confirms the plan
- Keep planning detail in `.task-cache/`
- Initialize the task file so `task-run` can update `Current Phase`, `Current Task`, `Next Task`, progress, and phase validation state without changing the document structure
- Keep validation and retry history in `.task-cache/tasks/` and `.task-cache/logs/`
- Keep the initial task file aligned with the approved plan
- Keep `current-plan.txt` aligned with the plan that should execute next

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
