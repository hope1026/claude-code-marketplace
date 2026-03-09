---
name: task-plan
description: Plan work into phases and initialize task-cache files before implementation. Use when the user asks for a plan, wants scope clarified, or needs a resumable execution plan prepared before work starts.
---

# Task Plan

Create the execution plan first. This skill owns planning, not implementation.

Use `task-run` after the plan is approved and the task-cache files are ready.

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
├── runtime/
│   └── {plan-id}.json
└── current-plan.txt
```

## Workflow

### Phase 1: Clarify

1. Identify requirements, constraints, and acceptance criteria.
2. Ask brief follow-up questions only when ambiguity is material.
3. Summarize the scoped work before planning.

### Phase 2: Build The Plan

1. Break the work into phases.
2. Define goal, entry criteria, tasks, dependencies, validation checks, and risks for each phase.
3. Write `.task-cache/plans/{plan-id}.md`.

Plan format:

```markdown
# Plan: {title}

**ID:** {plan-id}
**Created:** {date}
**Status:** draft | confirmed | in-progress | awaiting-user-review | completed

## Overview
{what will be built}

## Requirements
- [ ] Requirement 1

## Phases
### Phase 1: {name}
**Goal:** {outcome}
**Entry Criteria:** {start condition}
**Validation Gate:** pending | failed | passed
**Validation Checks:**
- [ ] Check 1
- [ ] Check 2
- [ ] Task 1.1 - {description} [complexity: simple]

## Risks & Mitigations
- Risk: {description} -> Mitigation: {approach}

## Visual Summary

> Consolidate all key visuals here so the entire plan can be grasped at a glance.
> Even if diagrams already appear in earlier sections, aggregate them here for quick reference.

### Process Flow
{End-to-end execution flow as an ASCII sequence diagram}

### Before / After
{Side-by-side comparison of the structure before and after the change}

### File Impact Map
{New / Modified / Deleted files shown as a tree structure}

### Phase Dependencies
{Phase ordering and parallelism as an ASCII dependency graph}
```

#### Visual Summary Guidelines

The `## Visual Summary` section is **mandatory** in every plan. Include at least 2 of the following subsections, chosen based on relevance:

| Subsection | When to Include | Format |
|------------|----------------|--------|
| Process Flow | Always (default) | ASCII sequence / flowchart showing the end-to-end execution path |
| Before / After | When architecture or structure changes | Side-by-side ASCII diagrams comparing current vs. target state |
| File Impact Map | When 5+ files are affected | Tree structure marking `[NEW]`, `[MOD]`, `[DEL]` per file |
| Phase Dependencies | When 3+ phases exist | ASCII DAG showing sequential vs. parallel phases |
| Data Flow | When multiple systems interact | ASCII diagram showing data movement between components |

Rules:
- Use only ASCII art (no Mermaid, no images) for maximum portability
- Keep each diagram under 30 lines
- Label all arrows and nodes clearly
- If a subsection is not applicable, omit it (do not include empty placeholders)

### Phase 3: Confirm With The User

- Do not start implementation until the user approves the plan.
- If scope changes, re-confirm the plan.

### Phase 4: Initialize Task Files

Create the task, log, user-check, and runtime files, then set the active plan.

```bash
mkdir -p .task-cache/plans .task-cache/tasks .task-cache/logs .task-cache/handoff .task-cache/user-checks .task-cache/runtime
echo "{plan-id}" > .task-cache/current-plan.txt
```

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
- [x] `TASK-001` completed - test: {one-line verification}

### Remaining Tasks
- [ ] `TASK-002` pending - test: {one-line verification}

## Phase 1: {name}
- **Phase Validation Status:** pending | failed | passed
- **Last Validation Run:** {timestamp}
- **Validation Evidence:** {brief summary}
- **Retry Count:** {n}
- **Phase Gate Rule:** Do not start the next phase until this phase is `passed`
```

Runtime file example:

```json
{
  "status": "planned",
  "plan_id": "plan-20260307-example",
  "phase": "Phase 1: Planning",
  "current_task": "none",
  "next_task": "TASK-001",
  "remaining": 4,
  "detail_path": ".task-cache/tasks/plan-20260307-example-tasks.md"
}
```

## Guardrails

- Planning detail lives in `.task-cache/`.
- Runtime JSON is a lightweight summary only.
- Initialize the task file so `task-run` can update `Current Phase`, `Current Task`, `Next Task`, progress, and phase validation state without changing the document structure.
- Keep the initial task file aligned with the approved plan.
