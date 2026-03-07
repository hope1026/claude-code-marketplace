---
name: agent-creator
description: Guide for creating Claude Code subagents. Use when users want to create a new agent (or update an existing agent) that handles specialized tasks with custom prompts, tool restrictions, and independent context.
---

# Agent Creator

This skill provides guidance for creating effective Claude Code subagents.

> **IMPORTANT**: Agent files must ALWAYS be written in English, regardless of the user's language.

## Workflow

```
Phase 0: Check Official Documentation
   ↓ Fetch latest spec from official docs
Phase 1: Clarify Requirements
   ↓ Ask questions to understand agent purpose
Phase 1.5: Identify Validation Needs
   ↓ If validation scripts needed → suggest creating a skill instead
Phase 2: Create Agent
   ↓ Generate agent markdown with Workflow at top
Phase 2.5: Skill Duplication Check
   ↓ Verify no skill content is duplicated in agent
Phase 3: Test & Verify
   ↓ Test delegation and tool restrictions
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

> **IMPORTANT**: Always ask the user which model to use. Default is `inherit`.

**Ask the user:**
> "Which model should this agent use?"
>
> | Model | Best For | Trade-off |
> |-------|----------|-----------|
> | `inherit` (Recommended) | Use same model as main conversation | Depends on user's current session |
> | `sonnet` | Balanced tasks, code review, general development | Good balance of capability and speed |
> | `opus` | Complex reasoning, architecture decisions, difficult debugging | Most capable but slower and more expensive |
> | `haiku` | Simple tasks, quick lookups, high-volume operations | Fastest and cheapest but less capable |

**Default**: If user doesn't specify, use `inherit`.

---

## Phase 1.5: Identify Validation Needs

> **IMPORTANT**: This skill does NOT create validation scripts. If validation is needed, suggest creating a companion skill instead.

### Validation Analysis

Ask the user (or infer from context):

| Question | Example |
|----------|---------|
| Does this agent need precondition checks? | Specific files, tools, services must exist |
| Does this agent need completion verification? | Output validation, test execution, build checks |
| Are there complex validation workflows? | Multi-step verification, external tool integration |

### Decision Rule

**If validation scripts are needed:**

1. Ask the user: "This agent would benefit from validation scripts. Would you like me to create a companion skill that handles the validation?"

2. If user agrees:
   - Use the `skill-creator` skill if available
   - Otherwise, create the skill manually following skill conventions
   - The skill should contain the validation scripts and logic
   - Reference the skill in the agent's `skills:` frontmatter

3. If user declines:
   - Create the agent without validation scripts
   - Document the manual validation steps in the agent body

**If no validation needed:**
- Proceed directly to Phase 2

---

## Phase 2: Create Agent

### Agent File Structure

```
{location}/
└── agents/
    └── {agent-name}.md
```

With companion validation skill:
```
{location}/
├── agents/
│   └── {agent-name}.md
└── skills/
    └── {agent-name}-validator/    # Created via skill-creator if validation needed
        └── SKILL.md
```

### Where Agents Live (Priority Order)

| Location | Path | Scope | Priority |
|----------|------|-------|----------|
| CLI flag | `--agents` JSON | Current session | 1 (highest) |
| Project | `.claude/agents/` | Current project | 2 |
| User | `~/.claude/agents/` | All your projects | 3 |
| Plugin | `<plugin>/agents/` | Where plugin enabled | 4 (lowest) |

### Agent Template

> **RULE**: The `## Workflow` section MUST be the first content section in the agent body. This ensures the agent always sees its execution flow before any details.

```markdown
---
name: {agent-name}
description: {When Claude should delegate to this agent}
tools: {Tool list or omit to inherit all}
model: {sonnet|opus|haiku|inherit}
---

You are a {role} specializing in {domain}.

## Workflow

{Workflow diagram or numbered steps - ALWAYS first section}

```
Step 1: {First action}
   ↓
Step 2: {Second action}
   ↓
Step 3: {Third action}
```

## Core Expertise
{What this agent excels at}

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
| `model` | No | `inherit` (default), `sonnet`, `opus`, or `haiku` |
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

## Phase 2.5: Skill Duplication Check

> **CRITICAL**: When an agent uses skills, the agent file must NOT duplicate skill content.

### Why This Matters

- Skills are automatically injected into agent context at startup
- Duplicating skill content bloats the agent and causes inconsistencies
- Updates to skills won't reflect if content is hardcoded in agent

### Verification Checklist

Before finalizing an agent that uses skills, verify:

| Check | Action |
|-------|--------|
| Skills listed in frontmatter only | `skills:` field contains skill names |
| Brief reference in body | Only mention "Follow the conventions from preloaded skills" |
| No copied skill content | Don't paste workflow, guidelines, or examples from skills |
| No duplicate instructions | Don't repeat what the skill already explains |

### How to Reference Skills in Agent Body

**CORRECT - Brief reference:**
```markdown
---
name: roblox-developer
skills:
  - roblox-templates
  - roblox-mcp-guide
---

You are a Roblox game developer.

## Workflow
1. Check preconditions
2. Use preloaded skills for asset IDs and MCP tools
3. Implement game logic
4. Verify completion

Use the preloaded skills for:
- Asset IDs and templates (roblox-templates)
- MCP tool usage patterns (roblox-mcp-guide)

Focus on game logic and user experience.
```

**WRONG - Duplicated content:**
```markdown
---
name: roblox-developer
skills:
  - roblox-templates
---

You are a Roblox game developer.

## Available Assets  <!-- This is in the skill! -->
- Zombie: 12345678
- Skeleton: 23456789
- ...

## How to Insert Models  <!-- This is in the skill! -->
Use insert_model with assetId...
```

### Manual Verification

Before finalizing an agent that uses skills:

1. Read the skill files listed in the agent's `skills:` frontmatter
2. Compare the agent body with skill content
3. If the agent has more than ~50 lines, check for potential duplication
4. Remove any duplicated content from the agent body

### Quick Reference Table

| Agent needs... | In frontmatter | In body |
|----------------|----------------|---------|
| Skill knowledge | `skills: [skill-name]` | "Follow preloaded skill guidelines" |
| Skill workflow | `skills: [skill-name]` | "Use workflow from skill" |
| Skill examples | `skills: [skill-name]` | Don't copy examples |
| Custom additions | - | Only agent-specific content |

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
- [ ] **Workflow is the first section** in the agent body
- [ ] Tool restrictions work correctly
- [ ] System prompt guides behavior as expected
- [ ] Hooks execute properly (if included)
- [ ] No skill content duplicated in agent body (if using skills)

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
Agent Created Successfully

Location: {path}/agents/{agent-name}.md
Name: {agent-name}
Description: {description}
Tools: {tools or "All (inherited)"}
Model: {model}
Skills: {skills or "None"}

Test Results:
- [ ] Agent appears in /agents list
- [ ] Delegation works correctly
- [ ] Workflow is first section in agent body
- [ ] Tool restrictions enforced
- [ ] Hooks execute properly (if applicable)
- [ ] No skill content duplicated (if using skills)

Would you like to:
1. Make any modifications
2. Add hooks for validation
3. Create a companion validation skill (via skill-creator)
4. Confirm and finish
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

## Workflow
1. Run git diff to see recent changes
2. Focus on modified files
3. Review against checklist
4. Report findings by priority

## Review Checklist
- Code clarity and readability
- Proper error handling
- No exposed secrets or API keys
- Good test coverage

## Output Format
Provide feedback organized by priority:
- Critical issues (must fix)
- Warnings (should fix)
- Suggestions (consider improving)
```

### Build Agent (Simple)

```markdown
---
name: builder
description: Build and compile the project. Use when user says "build", "compile", or needs to produce build artifacts.
tools: Read, Bash, Grep, Glob
---

You are a build specialist that compiles and packages project artifacts.

## Workflow
1. Verify prerequisites (node, package.json, node_modules)
2. Clean previous build artifacts
3. Run the build command
4. Verify build output exists
5. Report any warnings or errors

## Prerequisites
Before building, verify:
- `node` is installed
- `package.json` exists
- `node_modules` directory exists (run `npm install` if not)

## Build Steps
1. Clean previous build artifacts
2. Run the build command
3. Verify dist/ directory was created

## Success Criteria
Build is successful when:
- No compilation errors
- dist/ directory exists with expected output
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

## Workflow
1. Understand the data question
2. Formulate SELECT query
3. Execute and analyze results
4. Present findings

Execute SELECT queries to answer questions about the data.
You cannot modify data. If asked to INSERT, UPDATE, DELETE,
explain that you only have read access.
```

> **Note**: This agent uses a hook that references `./scripts/validate-readonly-query.sh`.
> Hook scripts are NOT created by this skill. Use the `hooks-creator` skill to create
> the validation script, or create it manually.

### Agent with Preloaded Skills (No Duplication)

```markdown
---
name: api-developer
description: Implement API endpoints following team conventions.
skills:
  - api-conventions      # Provides: endpoint naming, request/response formats
  - error-handling-patterns  # Provides: error codes, exception handling
---

You are an API developer. Implement endpoints following team standards.

## Workflow
1. Read requirements
2. Implement using preloaded skill conventions
3. Test the endpoint
4. Report completion

Use preloaded skills for:
- Endpoint conventions (api-conventions skill)
- Error handling patterns (error-handling-patterns skill)

Focus on business logic implementation. Do NOT redefine conventions
already specified in the skills.
```

> **Note**: The agent body is minimal because all detailed guidelines
> are in the preloaded skills. This prevents duplication and ensures
> updates to skills automatically apply to the agent.

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

You are a specialist in X.

## Workflow
1. Analyze the request
2. Do the work
3. Report findings

When invoked, do Y.
```

**Full-featured agent (with skills and hooks):**
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
          command: "./my-hook-script.sh"
---

You are a specialist in X.

## Workflow
1. First step
2. Second step
3. Third step

## Guidelines
- Important rule

Use preloaded skills for detailed conventions.
```

---

## Mandatory Rules Summary

| Rule | Description |
|------|-------------|
| **English Only** | Agent files must ALWAYS be written in English, regardless of user's language |
| **Workflow First** | `## Workflow` MUST be the first content section in the agent body, right after the role description |
| **No Scripts** | This skill does NOT create validation scripts. If validation is needed, suggest creating a companion skill via `skill-creator` |
| **No Skill Duplication** | When using preloaded skills, never copy skill content into the agent body |
