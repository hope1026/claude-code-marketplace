---
name: task-planner
description: Plan and structure tasks from user requests. Use when user says "plan this", "help me plan", "break down this task", "create a plan", or needs requirement clarification, task breakdown, or project planning.
---

# Task Planner

Plan and structure complex tasks by clarifying requirements, breaking down work into actionable items, and coordinating execution.

## Cache Directory (Option A - Simplified)

All data stored in `.task-cache/` at the project root:

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

## Workflow

### Phase 1: Requirement Clarification

When user makes a request:

1. **Analyze the request** for ambiguities
2. **Ask clarifying questions** using AskUserQuestion tool
   - What is the expected outcome?
   - Are there constraints or preferences?
   - What's the scope (files, features, integrations)?
   - Any existing patterns to follow?
3. **Summarize understanding** back to user
4. Repeat until requirements are crystal clear

**Example questions:**
```
- "Should this feature support X or Y?"
- "Do you want to follow the existing pattern in Z?"
- "What should happen when error occurs?"
```

### Phase 2: Plan Creation

Once requirements are clear:

1. **Break down into phases** (logical groupings)
2. **Create task list** with:
   - Clear, actionable descriptions
   - Dependencies between tasks
   - Estimated complexity (simple/medium/complex)
   - Suggested executor (main agent / subagent type)
3. **Identify risks** and edge cases
4. **Write plan document**

**Plan document format:**
```markdown
# Plan: {title}

**ID:** {plan-id}
**Created:** {date}
**Status:** draft | confirmed | in-progress | completed

## Overview
{Brief description of what we're building}

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Phases

### Phase 1: {name}
- [ ] Task 1.1 - {description} [complexity: simple] [executor: main]
- [ ] Task 1.2 - {description} [complexity: medium] [executor: unity-engineer]

### Phase 2: {name}
- [ ] Task 2.1 - {description} [complexity: complex] [executor: subagent]
  - Depends on: Task 1.1, Task 1.2

## Risks & Mitigations
- Risk 1: {description} → Mitigation: {approach}

## Notes
{Any additional context}
```

### Phase 3: User Confirmation

**CRITICAL: Never proceed without explicit user approval.**

1. Present the complete plan to user
2. Ask for confirmation:
   ```
   Does this plan look correct? Please confirm to proceed, or let me know what needs adjustment.
   ```
3. If changes requested → update plan and re-confirm
4. On confirmation → save plan and update status to "confirmed"

### Phase 4: Task List Generation

After plan is confirmed:

1. Create detailed task list in `.task-cache/tasks/{plan-id}-tasks.md`
2. Set as active plan: `echo "{plan-id}" > .task-cache/current-plan.txt`

**Task list format (single source of truth for status):**
```markdown
# Tasks: {plan-title}

**Plan ID:** {plan-id}
**Created:** {timestamp}
**Last Updated:** {timestamp}
**Progress:** 0/{total} (0%)

## Phase 1: {name}

### TASK-001: {title}
- **Status:** pending
- **Executor:** main | {subagent-name}
- **Complexity:** simple | medium | complex
- **Dependencies:** none | TASK-XXX
- **Description:** {detailed description}
- **Acceptance Criteria:**
  - [ ] Criterion 1
  - [ ] Criterion 2

### TASK-002: {title}
...
```

### Phase 5: Discover Available Agents

Before execution:

1. Scan project for available subagents:
   ```bash
   find . -name "*.md" -path "*agents*" -type f 2>/dev/null
   find .claude/agents -name "*.md" 2>/dev/null
   ```
2. Read each agent's description and capabilities
3. Save to `.task-cache/agents/available-agents.md`
4. Match agents to tasks based on their specializations

**Available agents format:**
```markdown
# Available Agents

**Last Scanned:** {timestamp}
**Project:** {project-path}

## Agents

### {agent-name}
- **Source:** {file-path}
- **Description:** {from agent's description field}
- **Best For:** {inferred use cases}
- **Model:** {if specified}
```

### Phase 6: Execution Coordination

For each task in order (respecting dependencies):

**Simple tasks (main agent):**
- Execute directly
- Update task status in `.task-cache/tasks/{plan-id}-tasks.md`

**Complex tasks (subagent delegation):**
- Select appropriate subagent from available-agents.md
- Delegate using Task tool with clear instructions
- Monitor completion
- Update task status

**Hybrid approach:**
- Evaluate task complexity at runtime
- Simple: execute directly
- Complex: delegate to subagent

## File Operations

### Initialize Cache
```bash
mkdir -p .task-cache/plans .task-cache/tasks .task-cache/logs .task-cache/agents .task-cache/handoff
```

### Generate Plan ID
Format: `plan-{YYYYMMDD}-{short-description}`
Example: `plan-20250127-auth-feature`

### Set Active Plan
```bash
echo "{plan-id}" > .task-cache/current-plan.txt
```

## Integration with task-tracker

- **Single source of truth**: All task status lives in `tasks/{plan-id}-tasks.md`
- **Hooks**: task-tracker's hooks log activity to `logs/{plan-id}.log`
- **Handoff**: When context is full, use `/task-tools:task-tracker handoff`
- **Resume**: New session can resume with `/task-tools:task-tracker resume`

## Best Practices

### Requirement Gathering
- Ask specific, targeted questions
- Avoid yes/no questions when possible
- Confirm understanding before proceeding
- Document all decisions

### Planning
- Keep tasks small and focused (< 30 min each ideally)
- Make dependencies explicit
- Identify blocking tasks early
- Include buffer for unexpected issues

### Execution
- Start with tasks that have no dependencies
- Parallelize independent tasks when possible
- Check in with user at phase boundaries
- Handle blocked tasks immediately

## Examples

### User Request
"Add user authentication to the app"

### Clarifying Questions
1. "What auth method? (OAuth, JWT, session-based)"
2. "Which providers? (Google, GitHub, email/password)"
3. "Do we need role-based access control?"
4. "Should sessions persist across browser restarts?"

### Resulting Plan Structure
```
Phase 1: Setup
- Task 1.1: Install auth dependencies [simple] [main]
- Task 1.2: Configure auth provider [medium] [main]

Phase 2: Backend
- Task 2.1: Create user model [medium] [backend-engineer]
- Task 2.2: Implement auth endpoints [complex] [backend-engineer]

Phase 3: Frontend
- Task 3.1: Create login UI [medium] [frontend-engineer]
- Task 3.2: Add auth state management [medium] [main]

Phase 4: Integration
- Task 4.1: Connect frontend to backend [medium] [main]
- Task 4.2: Add protected routes [simple] [main]
- Task 4.3: Test end-to-end flow [medium] [main]
```

## Notes

- Always save plans to .task-cache for persistence
- Never start execution without user confirmation
- Task status lives only in `tasks/` (no duplication)
- Coordinate with task-tracker for progress monitoring and session handoff
