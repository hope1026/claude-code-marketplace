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
   - phase verification gate
   - verification checks
   - evidence to collect
   - failure loop for verification retries
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
**Phase Verification Gate:** pending | failed | passed
**Verification Focus:** {what this phase must prove before exit}
**Verification Checks:**
- [ ] Check 1
- [ ] Check 2
**Verification Evidence:** {logs, screenshots, tests, diff proof, or review evidence to collect}
**User-Visible Proof:** {what the user can quickly read to know this phase is truly done}
**Failure Loop:** If verification fails, stay in this phase, add or reopen tasks, apply fixes, and rerun verification until passed.
- [ ] Task 1.1 - {description} [complexity: simple]

## Verification Overview

### Phase Gates
| Phase | Must Prove | Evidence | Gate |
|-------|------------|----------|------|
| Phase 1: {name} | {phase proof} | {test/log/screenshot} | pending |

### Final Completion Gate
**Overall Status:** pending | failed | passed
**Completion Rule:** All phase gates must be `passed` before overall completion can be `passed`.
**Final Verification Checks:**
- [ ] All planned phases passed their verification gates
- [ ] All required evidence is linked or summarized
- [ ] User-visible outcome matches the approved scope
- [ ] No open retry loop remains
**Final Evidence Bundle:** {release note, final screenshots, final test summary, or handoff proof}
**User-Visible Completion Proof:** {short summary a user can scan in one glance}

## Risks & Mitigations
- Risk: {description} -> Mitigation: {approach}

## Visual Summary

> Consolidate all key visuals here so the entire plan can be grasped at a glance.
> Even if diagrams already appear in earlier sections, aggregate them here for quick reference.

### Process Flow
{End-to-end execution flow as an ASCII sequence diagram}

### Verification Flow
{ASCII flow showing per-phase verification gates and the final completion gate}

### Completion Scoreboard
{ASCII or compact table showing each phase gate plus the final gate in one place}

### Before / After
{Side-by-side comparison of the structure before and after the change}

### File Impact Map
{New / Modified / Deleted files shown as a tree structure}

### Phase Dependencies
{Phase ordering and parallelism as an ASCII dependency graph}
```

#### Visual Summary Guidelines

The `## Visual Summary` section is **mandatory** in every plan. `Process Flow`, `Verification Flow`, and `Completion Scoreboard` are required. Include at least 1 additional subsection from the list below when relevant.

| Subsection | When to Include | Format |
|------------|----------------|--------|
| Process Flow | Always | ASCII sequence / flowchart showing the end-to-end execution path |
| Verification Flow | Always | ASCII flow showing each phase gate, retry loop, and final completion gate |
| Completion Scoreboard | Always | Compact table or ASCII block showing each phase gate plus overall completion state |
| Before / After | When architecture or structure changes | Side-by-side ASCII diagrams comparing current vs. target state |
| File Impact Map | When 5+ files are affected | Tree structure marking `[NEW]`, `[MOD]`, `[DEL]` per file |
| Phase Dependencies | When 3+ phases exist | ASCII DAG showing sequential vs. parallel phases |
| Data Flow | When multiple systems interact | ASCII diagram showing data movement between components |

Rules:
- Use only ASCII art (no Mermaid, no images) for maximum portability
- Keep each diagram under 30 lines
- Label all arrows and nodes clearly
- Make verification status easy to scan: prefer `pending | failed | passed` labels in every verification visual
- If a subsection is not applicable, omit it (do not include empty placeholders)

### Phase 3: User Confirmation

Never execute without explicit user confirmation.

1. Present the plan.
2. Call out the `Verification Overview` and `Visual Summary` so the user can review phase gates and final completion expectations quickly.
3. Ask for confirmation.
4. If the plan changes, re-confirm it.
5. Set the plan status to `confirmed` only after approval.

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

### Verification Scoreboard
- [ ] Phase 1: {name} - proof: {one-line proof target} - evidence: {one-line evidence} - gate: pending
- [ ] Final Completion Gate - blocked until every phase gate is `passed`

### Phase Task Summary
- Phase 1: {name} - completed: {completed}/{phase-total} - remaining: {remaining} - next: `TASK-001`

### Completed Tasks
- [x] `TASK-00A` completed - phase: `Phase 1: {name}` - test: {one-line verification focus}

### Remaining Tasks
- [ ] `TASK-00X` pending - phase: `Phase 1: {name}` - test: {one-line verification focus}

## Phase 1: {name}
- **Phase Verification Status:** pending | failed | passed
- **Verification Focus:** {what this phase must prove}
- **Last Verification Run:** {timestamp}
- **Verification Evidence:** {brief summary}
- **Retry Count:** {n}
- **Phase Gate Rule:** Do not start the next phase until this phase is `passed`

## Final Completion Gate
- **Overall Verification Status:** pending | failed | passed
- **Blocked By:** {list of phase gates still pending or failed}
- **Final Verification Evidence:** {brief summary}
- **Completion Rule:** Mark the plan complete only after every phase gate and the final gate are `passed`

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
- Initialize the task file so `task-run` can update `Current Phase`, `Current Task`, `Next Task`, progress, and phase verification state without changing the document structure
- Keep `### Phase Task Summary`, `### Completed Tasks`, and `### Remaining Tasks` aligned so each task line still exposes its owning phase
- Keep phase-level verification history and final completion verification history in `.task-cache/tasks/` and `.task-cache/logs/`
- Keep every phase tied to explicit proof, evidence, and a visible gate state
- Keep the final completion gate visually separate from individual phase gates so users can distinguish local completion from full completion
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
