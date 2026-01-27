---
name: task-tracker
description: Track task progress and generate session handoffs. Use when user says "update progress", "mark task done", "check status", "handoff", "save context", "prepare for next session", or needs to monitor task completion, update status, or prepare context for session continuation.
hooks:
  PostToolUse:
    - matcher: Edit|Write|Bash
      hooks:
        - type: command
          command: |
            if [ -d ".task-cache/tasks" ] && [ -f ".task-cache/current-plan.txt" ]; then
              plan_id=$(cat .task-cache/current-plan.txt)
              timestamp=$(date +"%Y-%m-%d %H:%M:%S")
              echo "[$timestamp] Tool completed: $TOOL_NAME" >> ".task-cache/logs/${plan_id}.log"
            fi
---

# Task Tracker

Monitor task progress, update status, and generate session handoff summaries for context continuity.

## Cache Directory Structure (Option A - Simplified)

```
.task-cache/
├── plans/                    # Immutable plan documents
│   └── {plan-id}.md
├── tasks/                    # Task lists with status (single source of truth)
│   └── {plan-id}-tasks.md
├── logs/                     # Activity logs (hooks write here)
│   └── {plan-id}.log
├── agents/                   # Discovered subagents
│   └── available-agents.md
├── handoff/                  # Session handoff summaries
│   └── {plan-id}-handoff.md
└── current-plan.txt          # Active plan ID
```

## Core Features

### 1. Progress Tracking

Track task status in a single file: `.task-cache/tasks/{plan-id}-tasks.md`

**Task file format:**
```markdown
# Tasks: {plan-title}

**Plan ID:** {plan-id}
**Created:** {timestamp}
**Last Updated:** {timestamp}
**Progress:** {completed}/{total} ({percentage}%)

## Phase 1: {name}

### TASK-001: {title}
- **Status:** pending | in-progress | completed | blocked | skipped
- **Executor:** main | {agent-name}
- **Started:** {timestamp}
- **Completed:** {timestamp}
- **Result:** {brief summary}
- **Dependencies:** none | TASK-XXX
- **Acceptance Criteria:**
  - [ ] Criterion 1
  - [ ] Criterion 2

### TASK-002: {title}
...
```

### 2. Update Task Status

```
/task-tools:task-tracker update TASK-001 completed
```

1. Read `.task-cache/tasks/{plan-id}-tasks.md`
2. Update the task's status field
3. Add timestamp (Started/Completed)
4. Recalculate progress percentage
5. Log to `.task-cache/logs/{plan-id}.log`

### 3. Progress Report

```
/task-tools:task-tracker status
```

**Output format:**
```markdown
## Progress Report

**Plan:** {title}
**Progress:** {completed}/{total} ({percentage}%)

### By Status
| Status | Count |
|--------|-------|
| Completed | X |
| In Progress | Y |
| Pending | Z |
| Blocked | W |

### Recently Completed
- TASK-001: {title} - {timestamp}

### In Progress
- TASK-003: {title} - Started {timestamp}

### Next Up
- TASK-004: {title}

### Blockers
- TASK-005: Blocked by {reason}
```

---

## Session Handoff

### Purpose

When context is running low or session ends, generate a compact summary that the next session can use to continue seamlessly.

### Generate Handoff

```
/task-tools:task-tracker handoff
```

Or automatically when context is high:
```
/task-tools:task-tracker handoff --auto
```

### Handoff File Format

Saved to `.task-cache/handoff/{plan-id}-handoff.md`:

```markdown
# Session Handoff

**Plan:** {plan-id}
**Generated:** {timestamp}
**Session:** {session-id if available}

## Quick Resume

To continue this work, read:
1. This handoff file
2. `.task-cache/tasks/{plan-id}-tasks.md` for full task list

## Current State

**Progress:** {completed}/{total} tasks ({percentage}%)
**Phase:** {current phase name}
**Active Task:** {task currently in progress, if any}

## Completed This Session

| Task | Summary |
|------|---------|
| TASK-001 | {what was done} |
| TASK-002 | {what was done} |

## In Progress

### TASK-003: {title}
- **Status:** in-progress
- **Started:** {timestamp}
- **Work Done:** {summary of progress}
- **Remaining:** {what's left to do}
- **Files Modified:** {list of files touched}

## Pending Tasks

| Task | Title | Dependencies | Executor |
|------|-------|--------------|----------|
| TASK-004 | {title} | TASK-003 | main |
| TASK-005 | {title} | none | unity-engineer |

## Blockers & Issues

- TASK-006: {reason blocked}
- Issue: {any discovered problems}

## Key Decisions Made

- Decision 1: {what was decided and why}
- Decision 2: {what was decided and why}

## Files Changed

| File | Change Type | Task |
|------|-------------|------|
| src/auth.ts | created | TASK-001 |
| src/utils.ts | modified | TASK-002 |

## Context for Next Session

### Important Notes
- {Any critical context the next session needs}
- {Gotchas or warnings}

### Suggested First Action
{What the next session should do first}

## Available Agents

From `.task-cache/agents/available-agents.md`:
- {agent-name}: {brief description}
```

### Handoff Workflow

**CRITICAL: Always get user confirmation before saving handoff.**

#### Step 1: Gather Session Data

1. Read current state:
   - Current plan from `current-plan.txt`
   - Tasks from `tasks/{plan-id}-tasks.md`
   - Recent logs from `logs/{plan-id}.log`
   - Git diff for changed files (if available)

#### Step 2: Generate Draft Summary

Create a draft handoff summary and present to user:

```markdown
## Handoff Preview

I've prepared the following session summary for handoff:

### Session Summary
- **Plan:** {plan-id}
- **Progress:** {completed}/{total} tasks ({percentage}%)
- **Session Duration:** {approximate time if trackable}

### Completed This Session
| Task | What Was Done |
|------|---------------|
| TASK-001 | {summary} |
| TASK-002 | {summary} |

### Currently In Progress
- TASK-003: {title}
  - Work done: {summary}
  - Remaining: {what's left}

### Files Changed
| File | Change |
|------|--------|
| src/auth.ts | Created new auth module |
| src/utils.ts | Added helper functions |

### Key Decisions
1. {Decision and rationale}
2. {Decision and rationale}

### Issues & Blockers
- {Any problems encountered}

### Suggested Next Action
{What the next session should do first}

---

**Please review and confirm:**
- Is this summary accurate?
- Anything to add or modify?
- Any additional context for the next session?
```

#### Step 3: User Confirmation

Use AskUserQuestion to confirm:

```
questions:
  - question: "Is this handoff summary accurate and complete?"
    header: "Confirm"
    options:
      - label: "Yes, save it"
        description: "Save handoff and end session"
      - label: "Add more context"
        description: "I want to add additional notes"
      - label: "Modify summary"
        description: "Some information needs correction"
    multiSelect: false
```

#### Step 4: Handle User Response

**If "Yes, save it":**
1. Write handoff to `handoff/{plan-id}-handoff.md`
2. Display resume instructions:
   ```
   Handoff saved successfully!

   To resume in a new session:
   /task-tools:task-tracker resume

   Or tell the new session:
   "Resume the task from .task-cache/handoff/{plan-id}-handoff.md"
   ```

**If "Add more context":**
1. Ask user for additional notes
2. Append to handoff under "Additional Context from User"
3. Re-confirm before saving

**If "Modify summary":**
1. Ask what needs to be changed
2. Update the draft
3. Re-present for confirmation

#### Step 5: Optional - User Notes Section

After confirmation, always ask:
```
"Any final notes or warnings for the next session?"
```

Add user's response to handoff under:
```markdown
## User Notes

{User's additional context}
```

### Resume from Handoff

In new session:
```
/task-tools:task-tracker resume
```

1. Read `current-plan.txt` for active plan
2. Read `handoff/{plan-id}-handoff.md`
3. Display summary to user
4. Ready to continue from "Suggested First Action"

---

## Hooks Integration

**PostToolUse Hook:**
- Triggers after Edit, Write, Bash complete
- Logs to `.task-cache/logs/{plan-id}.log`
- Format: `[timestamp] Tool completed: {tool_name}`

**Activity log example:**
```
[2025-01-27 14:30:00] Tool completed: Edit
[2025-01-27 14:30:15] Tool completed: Bash
[2025-01-27 14:31:00] Tool completed: Write
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `/task-tools:task-tracker status` | Show current progress |
| `/task-tools:task-tracker update TASK-XXX {status}` | Update task status |
| `/task-tools:task-tracker handoff` | Generate session handoff |
| `/task-tools:task-tracker resume` | Resume from handoff |
| `/task-tools:task-tracker activity` | Show recent activity log |

---

## Best Practices

### Progress Updates
- Update immediately after task completion
- Include brief result summary
- Don't batch updates

### Session Handoffs
- Generate before context fills up
- Include "why" not just "what"
- List files changed for easy review
- Suggest clear next action

### Resuming Sessions
- Always read handoff first
- Verify file state matches handoff
- Continue from suggested action

---

## Integration

### With task-planner
- Planner creates plans and initial tasks
- Tracker maintains task status
- Single source of truth in `tasks/`

### With task-manager agent
- Agent coordinates overall workflow
- Tracker provides status updates
- Handoff enables session continuity

## Notes

- All task state lives in `tasks/` (no duplication)
- Handoffs are snapshots, not live data
- Logs are append-only for history
- Resume always reads latest task file
