---
name: task-guide
description: Unified planning and tracking workflow for project tasks. Use when user asks to plan work, break down requirements, track progress, update task status, generate handoff summaries, or resume a previous task session.
---

# Task Guide

Plan tasks, execute with clear status transitions, and create handoffs from a single source of truth.

## Cache Directory

```
.task-cache/
├── plans/                    # Immutable plan documents
│   └── {plan-id}.md
├── tasks/                    # Task lists with status (single source of truth)
│   └── {plan-id}-tasks.md
├── logs/                     # Activity logs
│   └── {plan-id}.log
├── agents/                   # Discovered subagents
│   └── available-agents.md
├── handoff/                  # Session handoff summaries
│   └── {plan-id}-handoff.md
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
2. Create tasks with:
   - clear actions
   - dependencies
   - complexity (`simple|medium|complex`)
   - executor (`main|subagent`)
3. Identify risks and mitigations.
4. Write `.task-cache/plans/{plan-id}.md`.

**Plan format:**
```markdown
# Plan: {title}

**ID:** {plan-id}
**Created:** {date}
**Status:** draft | confirmed | in-progress | completed

## Overview
{what we are building}

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Phases
### Phase 1: {name}
- [ ] Task 1.1 - {description} [complexity: simple] [executor: main]
### Phase 2: {name}
- [ ] Task 2.1 - {description} [complexity: complex] [executor: subagent]
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
2. Set active plan: `echo "{plan-id}" > .task-cache/current-plan.txt`.

**Task file format:**
```markdown
# Tasks: {plan-title}

**Plan ID:** {plan-id}
**Created:** {timestamp}
**Last Updated:** {timestamp}
**Progress:** {completed}/{total} ({percentage}%)

## Visual Checklist

### Phase Completion
- [ ] Phase 1: {name} ({completed}/{phase-total})
- [ ] Phase 2: {name} ({completed}/{phase-total})

### Completed Tasks
- [x] `TASK-00A` completed - test: {one-line verification focus}

### Remaining Tasks
- [ ] `TASK-00X` pending - test: {one-line verification focus}
- [ ] `TASK-00Y` blocked - test: {one-line verification focus}

## Phase 1: {name}

### TASK-001: {title}
- **Executor:** main | {agent-name}
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

### Phase 5: Discover Available Agents

1. Scan for agent specs:
   ```bash
   find . -name "*.md" -path "*agents*" -type f 2>/dev/null
   find .claude/agents -name "*.md" 2>/dev/null
   ```
2. Save summary to `.task-cache/agents/available-agents.md`.
3. Match tasks to best-fit agents.

### Phase 6: Execution Coordination

1. Respect dependencies.
2. Execute `simple` tasks directly.
3. Delegate `complex` tasks to matched subagents.
4. Update task file immediately after each status change.

### Phase 7: Status Updates

Use:
```text
/task-tools:task-guide update TASK-001 completed
```

1. Read `.task-cache/tasks/{plan-id}-tasks.md`.
2. Update task entry and one-line test summary.
3. Apply status transitions:
   - `completed`: mark all acceptance criteria `[x]`, move task to `### Completed Tasks`, remove from `### Remaining Tasks`.
   - `pending|in-progress|blocked`: keep unmet criteria `[ ]`, ensure task is in `### Remaining Tasks`, remove from `### Completed Tasks`.
4. Update `Started`, `Completed`, `Result` evidence fields.
5. Recalculate progress.
6. Refresh `Visual Checklist` (`Phase Completion` + `Completed Tasks` + `Remaining Tasks`).
7. Append activity log entry.

### Phase 8: Progress Report

Use:
```text
/task-tools:task-guide status
```

**Output format:**
```markdown
## Progress Report

**Plan:** {title}
**Progress:** {completed}/{total} ({percentage}%)

### Visual Snapshot
- Phase Completion:
  - [ ] Phase 1: {name} ({completed}/{phase-total})
  - [ ] Phase 2: {name} ({completed}/{phase-total})
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

### Phase 9: Session Handoff and Resume

Generate:
```text
/task-tools:task-guide handoff
```

Resume:
```text
/task-tools:task-guide resume
```

Handoff workflow:
1. Gather current plan, tasks, logs, changed files.
2. Draft summary for user review.
3. Get explicit user confirmation before saving.
4. Save to `.task-cache/handoff/{plan-id}-handoff.md`.
5. Ask for optional final user notes and append them.

## Guardrails

- Do not add `| Status | Count |` table to task files.
- Do not add `## Phase Snapshot` when `### Phase Completion` already exists.
- Do not add per-task `- **Status:**` fields in task detail sections.
- Keep task state only in `tasks/{plan-id}-tasks.md` (single source of truth).
- Never mark `completed` while any acceptance criterion remains unchecked.
- Always keep `Visual Checklist` synchronized with detailed task sections.

## File Operations

Initialize cache:
```bash
mkdir -p .task-cache/plans .task-cache/tasks .task-cache/logs .task-cache/agents .task-cache/handoff
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
- Resume always uses the latest task file.
