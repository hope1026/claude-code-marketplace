---
name: agent-creator
description: Guide for creating Claude Code subagents. Use when users want to create a new agent (or update an existing agent) that handles specialized tasks with custom prompts, tool restrictions, and independent context.
---

# Agent Creator

This skill provides guidance for creating effective Claude Code subagents.

## Workflow

```
Phase 0: Check Official Documentation
   ↓ Fetch latest spec from official docs
Phase 1: Clarify Requirements
   ↓ Ask questions to understand agent purpose
Phase 2: Create Agent
   ↓ Generate agent markdown with proper structure
Phase 3: Test & Verify
   ↓ Test delegation and behavior
Phase 4: User Confirmation
   ↓ Report results and get approval
```

---

## Phase 0: Check Official Documentation

> **CRITICAL**: Always fetch the latest documentation before creating an agent.

Use WebFetch to check the official Claude Code subagents documentation:

```
URL: https://code.claude.com/docs/en/sub-agents
```

**What to verify:**
- Latest frontmatter fields and their usage
- New features or deprecated options
- Current best practices and examples
- Permission modes and tool configurations
- Hook integration patterns

**Example WebFetch prompt:**
```
Extract the complete documentation about Claude Code sub-agents including:
frontmatter fields, structure, tools configuration, examples, and best practices.
```

After fetching, compare with the reference below and use the **latest official spec** for any discrepancies.

---

## Phase 1: Clarify Requirements

Before creating an agent, gather necessary information. **Ask the user** if any are unclear:

| Question | Why It Matters |
|----------|----------------|
| What specific task should this agent handle? | Defines the agent's purpose |
| Should it modify files or be read-only? | Determines tool access |
| What triggers should make Claude use this agent? | Shapes the description field |
| Does it need specific domain knowledge? | Informs the system prompt |
| Are there validation steps needed? | Determines if hooks are needed |
| Should certain operations be blocked? | Identifies PreToolUse hooks |

**Example questions to ask:**
- "What kind of tasks should trigger this agent?"
- "Should the agent be able to edit files, or just read and analyze?"
- "Are there specific patterns or conventions it should follow?"
- "Should certain operations be validated before execution?"

### Model Selection (Required)

> **IMPORTANT**: Always ask the user which model to use. Default is `sonnet`.

**Ask the user:**
> "Which model should this agent use?"
>
> | Model | Best For | Trade-off |
> |-------|----------|-----------|
> | `sonnet` (Recommended) | Balanced tasks, code review, general development | Good balance of capability and speed |
> | `opus` | Complex reasoning, architecture decisions, difficult debugging | Most capable but slower and more expensive |
> | `haiku` | Simple tasks, quick lookups, high-volume operations | Fastest and cheapest but less capable |
> | `inherit` | Use same model as main conversation | Depends on user's current session |

**Default**: If user doesn't specify, use `sonnet`.

---

## Phase 2: Create Agent

### Agent File Structure

```
{location}/agents/
└── {agent-name}.md
```

With validation hooks:
```
{location}/
├── agents/
│   └── {agent-name}.md
└── scripts/
    └── validate-{agent-name}.sh
```

### Where Agents Live (Priority Order)

| Location | Path | Scope | Priority |
|----------|------|-------|----------|
| CLI flag | `--agents` JSON | Current session | 1 (highest) |
| Project | `.claude/agents/` | Current project | 2 |
| User | `~/.claude/agents/` | All your projects | 3 |
| Plugin | `<plugin>/agents/` | Where plugin enabled | 4 (lowest) |

### Agent Template

```markdown
---
name: {agent-name}
description: {When Claude should delegate to this agent}
tools: {Tool list or omit to inherit all}
model: {sonnet|opus|haiku|inherit}
---

You are a {role} specializing in {domain}.

## Core Expertise
{What this agent excels at}

## Workflow
When invoked:
1. {First step}
2. {Second step}
3. {Third step}

## Guidelines
- {Important rule 1}
- {Important rule 2}
```

### Frontmatter Fields Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase, hyphens) |
| `description` | Yes | When Claude should delegate. Include trigger phrases |
| `tools` | No | Allowed tools. Inherits all if omitted |
| `disallowedTools` | No | Tools to deny from inherited list |
| `model` | No | `sonnet`, `opus`, `haiku`, or `inherit` (default) |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `skills` | No | Skills to preload into agent's context at startup |
| `hooks` | No | Lifecycle hooks (PreToolUse, PostToolUse, Stop) |

### Permission Modes

| Mode | Behavior |
|------|----------|
| `default` | Standard permission checking with prompts |
| `acceptEdits` | Auto-accept file edits |
| `dontAsk` | Auto-deny permission prompts |
| `bypassPermissions` | Skip all permission checks (use with caution) |
| `plan` | Plan mode (read-only exploration) |

### Tool Categories

| Use Case | Tools |
|----------|-------|
| Read-only analysis | `Read, Grep, Glob` |
| Code review | `Read, Grep, Glob, Bash` |
| Development | `Read, Edit, Write, Bash, Grep, Glob` |
| All tools | Omit `tools` field to inherit all |

### Writing Effective Descriptions

The `description` is critical—Claude uses it to decide when to delegate.

**Include:**
1. What the agent does
2. Trigger phrases ("Use when...", "Use proactively after...")
3. Concrete examples

**Example:**
```yaml
description: Expert code reviewer. Use proactively after code changes. Analyzes code quality, security, and maintainability.
```

### Preloading Skills

Inject skill content into agent's context at startup:

```yaml
---
name: api-developer
description: Implement API endpoints following team conventions
skills:
  - api-conventions
  - error-handling-patterns
---

Implement API endpoints. Follow the conventions from preloaded skills.
```

---

## Phase 3: Test & Verify

After creating the agent:

### 3.1 Load the Agent

If created manually, restart Claude Code or run `/agents` to load immediately.

### 3.2 Test Delegation

**Explicit delegation:**
```
Use the {agent-name} agent to {task}
```

**Automatic delegation:**
Ask Claude something that matches the agent's description.

### 3.3 Verify Behavior

Check that:
- [ ] Agent appears in `/agents` list
- [ ] Claude delegates appropriate tasks
- [ ] Tool restrictions work correctly
- [ ] System prompt guides behavior as expected
- [ ] Hooks execute properly (if included)

### 3.4 Test Hooks (if applicable)

For agents with PreToolUse hooks:
1. Trigger a tool call that should be allowed
2. Trigger a tool call that should be blocked
3. Verify hook exit codes work correctly

**Hook Exit Codes:**
| Code | Behavior |
|------|----------|
| 0 | Success, continue |
| 2 | Block the operation |
| Other | Warning, continue |

---

## Phase 4: User Confirmation

After testing, report to user:

```
✅ Agent Created Successfully

📁 Location: {path}/agents/{agent-name}.md
📝 Name: {agent-name}
📋 Description: {description}
🔧 Tools: {tools or "All (inherited)"}
🤖 Model: {model}

Test Results:
- [ ] Agent appears in /agents list
- [ ] Delegation works correctly
- [ ] Tool restrictions enforced
- [ ] Hooks execute properly (if applicable)

Would you like to:
1. Make any modifications
2. Add hooks for validation
3. Confirm and finish
```

---

## Example Agents

### Read-only Code Reviewer

```markdown
---
name: code-reviewer
description: Expert code review specialist. Proactively reviews code for quality, security, and maintainability. Use immediately after writing or modifying code.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a senior code reviewer ensuring high standards of code quality.

When invoked:
1. Run git diff to see recent changes
2. Focus on modified files
3. Begin review immediately

Review checklist:
- Code clarity and readability
- Proper error handling
- No exposed secrets or API keys
- Good test coverage

Provide feedback organized by priority:
- Critical issues (must fix)
- Warnings (should fix)
- Suggestions (consider improving)
```

### Debugger with Edit Access

```markdown
---
name: debugger
description: Debugging specialist for errors, test failures, and unexpected behavior. Use proactively when encountering any issues.
tools: Read, Edit, Bash, Grep, Glob
---

You are an expert debugger specializing in root cause analysis.

When invoked:
1. Capture error message and stack trace
2. Identify reproduction steps
3. Isolate the failure location
4. Implement minimal fix
5. Verify solution works

For each issue, provide:
- Root cause explanation
- Evidence supporting diagnosis
- Specific code fix
- Testing approach
```

### Database Reader with Validation Hook

```markdown
---
name: db-reader
description: Execute read-only database queries. Use when analyzing data or generating reports.
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
---

You are a database analyst with read-only access.

Execute SELECT queries to answer questions about the data.
You cannot modify data. If asked to INSERT, UPDATE, DELETE,
explain that you only have read access.
```

**Validation script (`scripts/validate-readonly-query.sh`):**
```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Block write operations
if echo "$COMMAND" | grep -iE '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b' > /dev/null; then
  echo "Blocked: Only SELECT queries allowed" >&2
  exit 2
fi
exit 0
```

### Agent with Preloaded Skills

```markdown
---
name: api-developer
description: Implement API endpoints following team conventions.
skills:
  - api-conventions
  - error-handling-patterns
---

Implement API endpoints. Follow the conventions and patterns
from the preloaded skills.
```

---

## Troubleshooting

### Agent not being used
- Check description includes clear trigger phrases
- Verify agent appears in `/agents`
- Try explicit delegation: "Use the X agent to..."

### Agent uses wrong tools
- Verify `tools` field lists correct tools
- Check `disallowedTools` if using inheritance

### Hooks not running
- Ensure script is executable (`chmod +x`)
- Check matcher regex matches tool name
- Verify script path is correct

---

## Quick Reference

**Minimal agent:**
```yaml
---
name: my-agent
description: What it does. Use when...
---

You are a specialist in X. When invoked, do Y.
```

**Full-featured agent:**
```yaml
---
name: my-agent
description: What it does. Use proactively when...
tools: Read, Grep, Glob, Bash
disallowedTools: Edit, Write
model: sonnet
permissionMode: default
skills:
  - relevant-skill
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
---

You are a specialist in X.

## Workflow
1. First step
2. Second step

## Guidelines
- Important rule
```
