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
Phase 1.5: Identify Preconditions & Completion Criteria
   ↓ Determine start conditions and success criteria
Phase 2: Create Agent
   ↓ Generate agent markdown with Workflow at top + scripts
Phase 2.5: Skill Duplication Check
   ↓ Verify no skill content is duplicated in agent
Phase 3: Test & Verify
   ↓ Test delegation, precondition checks, and completion verification
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

## Phase 1.5: Identify Preconditions & Completion Criteria

> **MANDATORY**: For every agent, explicitly determine preconditions and completion criteria.

### Precondition Analysis

Ask the user (or infer from context):

| Question | Example |
|----------|---------|
| What must exist before this agent can work? | Specific files, tools, services, environment variables |
| What state must the project be in? | Clean git state, running server, built artifacts |
| What external dependencies are required? | CLI tools (`node`, `rojo`, `gh`), running processes, network access |

**Decision rule:**
- If **any precondition exists** → Create `scripts/check-{agent-name}-preconditions.sh`
- If **no preconditions** → Skip the script but document "No preconditions" in agent body

### Completion Criteria Analysis

Ask the user (or infer from context):

| Question | Example |
|----------|---------|
| How do we know the agent finished successfully? | Output file exists, tests pass, build succeeds |
| What artifacts should exist after completion? | Generated files, modified configs, new entries |
| What state should the project be in after? | All tests green, no lint errors, build succeeds |

**Decision rule:**
- If **any verifiable completion criteria exists** → Create `scripts/verify-{agent-name}-completion.sh`
- If **no verifiable criteria** (e.g., pure analysis agents) → Skip the script

### Script Requirements

When creating scripts, follow these rules:

```bash
# scripts/check-{agent-name}-preconditions.sh
#!/bin/bash
set -e

# Each check: descriptive message on failure, exit 1 to block
# Exit 0 only when ALL preconditions are met

echo "Checking preconditions for {agent-name}..."

# Example checks:
# command -v node >/dev/null 2>&1 || { echo "FAIL: node is required" >&2; exit 1; }
# [ -f "package.json" ] || { echo "FAIL: package.json not found" >&2; exit 1; }
# curl -sf http://localhost:3002/status >/dev/null || { echo "FAIL: MCP server not running" >&2; exit 1; }

echo "All preconditions met"
```

```bash
# scripts/verify-{agent-name}-completion.sh
#!/bin/bash
set -e

# Each check: verify an expected outcome, exit 1 on failure
# Exit 0 only when ALL completion criteria are satisfied

echo "Verifying completion for {agent-name}..."

# Example checks:
# [ -f "$1" ] || { echo "FAIL: Expected output file not found: $1" >&2; exit 1; }
# npm test --silent || { echo "FAIL: Tests did not pass" >&2; exit 1; }
# npm run build --silent || { echo "FAIL: Build failed" >&2; exit 1; }

echo "All completion criteria verified"
```

---

## Phase 2: Create Agent

### Agent File Structure

```
{location}/
├── agents/
│   └── {agent-name}.md
└── scripts/
    ├── check-{agent-name}-preconditions.sh   # When preconditions exist
    └── verify-{agent-name}-completion.sh     # When completion criteria exist
```

With validation hooks:
```
{location}/
├── agents/
│   └── {agent-name}.md
└── scripts/
    ├── check-{agent-name}-preconditions.sh
    ├── verify-{agent-name}-completion.sh
    └── validate-{agent-name}.sh              # Hook validation script
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
Step 1: {Precondition Check} (if applicable)
   ↓ Run scripts/check-{agent-name}-preconditions.sh
Step 2: {First action}
   ↓
Step 3: {Second action}
   ↓
Step N: {Completion Verification} (if applicable)
   ↓ Run scripts/verify-{agent-name}-completion.sh
```

## Precondition Check (if applicable)

Run `scripts/check-{agent-name}-preconditions.sh` before starting.
If it fails, report the missing precondition and stop.

## Core Expertise
{What this agent excels at}

## Guidelines
- {Important rule 1}
- {Important rule 2}

## Completion Verification (if applicable)

Run `scripts/verify-{agent-name}-completion.sh` after finishing.
If it fails, investigate and fix before reporting success.
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

### Verification Script

Run this check before finalizing:

```bash
# Check for potential duplication
AGENT_FILE=".claude/agents/{agent-name}.md"
SKILLS=$(grep -A10 "^skills:" "$AGENT_FILE" | grep "^\s*-" | sed 's/.*- //')

for SKILL in $SKILLS; do
  SKILL_FILE=$(find .claude/skills -name "*.md" | xargs grep -l "^name: $SKILL" | head -1)
  if [ -n "$SKILL_FILE" ]; then
    # Check for content overlap (simplified)
    SKILL_LINES=$(wc -l < "$SKILL_FILE")
    AGENT_LINES=$(wc -l < "$AGENT_FILE")
    if [ "$AGENT_LINES" -gt 50 ]; then
      echo "Warning: Agent has $AGENT_LINES lines. Check for skill duplication."
    fi
  fi
done
```

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

### 3.1 Test Precondition Script (if created)

```bash
# Run the precondition check
bash scripts/check-{agent-name}-preconditions.sh

# Verify it blocks correctly when preconditions are NOT met
# (temporarily break a precondition and confirm exit 1)
```

### 3.2 Load the Agent

If created manually, restart Claude Code or run `/agents` to load immediately.

### 3.3 Test Delegation

**Explicit delegation:**
```
Use the {agent-name} agent to {task}
```

**Automatic delegation:**
Ask Claude something that matches the agent's description.

### 3.4 Verify Behavior

Check that:
- [ ] Agent appears in `/agents` list
- [ ] Claude delegates appropriate tasks
- [ ] **Workflow is the first section** in the agent body
- [ ] **Precondition script blocks** when conditions are not met
- [ ] Tool restrictions work correctly
- [ ] System prompt guides behavior as expected
- [ ] Hooks execute properly (if included)
- [ ] No skill content duplicated in agent body (if using skills)
- [ ] **Completion script passes** when work is done correctly
- [ ] **Completion script fails** when work is incomplete

### 3.5 Test Completion Script (if created)

```bash
# Run after agent completes work successfully
bash scripts/verify-{agent-name}-completion.sh [args]

# Verify it detects incomplete work
# (simulate partial completion and confirm exit 1)
```

### 3.6 Test Hooks (if applicable)

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
Precondition Script: {Yes/No - description of what it checks}
Completion Script: {Yes/No - description of what it verifies}

Test Results:
- [ ] Agent appears in /agents list
- [ ] Delegation works correctly
- [ ] Workflow is first section in agent body
- [ ] Precondition check: Blocks when conditions not met
- [ ] Completion check: Passes on success, fails on incomplete
- [ ] Tool restrictions enforced
- [ ] Hooks execute properly (if applicable)
- [ ] No skill content duplicated (if using skills)

Would you like to:
1. Make any modifications
2. Add hooks for validation
3. Confirm and finish
```

---

## Example Agents

### Read-only Code Reviewer (no scripts needed)

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

No preconditions or completion scripts needed (analysis-only agent).

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

### Build Agent with Precondition + Completion Scripts

```markdown
---
name: builder
description: Build and compile the project. Use when user says "build", "compile", or needs to produce build artifacts.
tools: Read, Bash, Grep, Glob
---

You are a build specialist that compiles and packages project artifacts.

## Workflow

```
Step 1: Precondition Check
   ↓ Run scripts/check-builder-preconditions.sh
Step 2: Clean previous build
   ↓
Step 3: Compile/Build
   ↓
Step 4: Completion Verification
   ↓ Run scripts/verify-builder-completion.sh
```

## Precondition Check
Run `scripts/check-builder-preconditions.sh` before starting.
If it fails, report the issue and stop.

## Build Steps
1. Clean previous build artifacts
2. Run the build command
3. Report any warnings or errors

## Completion Verification
Run `scripts/verify-builder-completion.sh` after building.
If it fails, investigate build errors before reporting success.
```

**Precondition script (`scripts/check-builder-preconditions.sh`):**
```bash
#!/bin/bash
set -e
echo "Checking build preconditions..."
command -v node >/dev/null 2>&1 || { echo "FAIL: node is required" >&2; exit 1; }
[ -f "package.json" ] || { echo "FAIL: package.json not found" >&2; exit 1; }
[ -d "node_modules" ] || { echo "FAIL: run npm install first" >&2; exit 1; }
echo "All preconditions met"
```

**Completion script (`scripts/verify-builder-completion.sh`):**
```bash
#!/bin/bash
set -e
echo "Verifying build completion..."
[ -d "dist" ] || { echo "FAIL: dist/ directory not found" >&2; exit 1; }
[ -f "dist/index.js" ] || { echo "FAIL: dist/index.js not found" >&2; exit 1; }
echo "Build verified successfully"
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

No precondition/completion scripts needed (hook validates each query).

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
1. Check preconditions (API framework installed)
2. Read requirements
3. Implement using preloaded skill conventions
4. Verify implementation

## Precondition Check
Run `scripts/check-api-developer-preconditions.sh` to verify the API framework is set up.

Use preloaded skills for:
- Endpoint conventions (api-conventions skill)
- Error handling patterns (error-handling-patterns skill)

Focus on business logic implementation. Do NOT redefine conventions
already specified in the skills.

## Completion Verification
Run `scripts/verify-api-developer-completion.sh` to confirm tests pass.
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

### Precondition script not blocking
- Ensure script exits with code 1 on failure
- Check `set -e` is at the top
- Verify script is executable (`chmod +x`)

### Completion script gives false positive
- Add more specific checks (file content, not just existence)
- Test with intentionally incomplete output

---

## Quick Reference

**Minimal agent (no scripts needed):**
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

**Full-featured agent (with precondition + completion scripts):**
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

```
Step 1: Precondition Check
   ↓ Run scripts/check-my-agent-preconditions.sh
Step 2: First step
   ↓
Step 3: Second step
   ↓
Step 4: Completion Verification
   ↓ Run scripts/verify-my-agent-completion.sh
```

## Precondition Check
Run `scripts/check-my-agent-preconditions.sh` before starting.
If it fails, report the issue and stop.

## Guidelines
- Important rule

## Completion Verification
Run `scripts/verify-my-agent-completion.sh` after finishing.
If it fails, investigate and fix before reporting success.
```

---

## Mandatory Rules Summary

| Rule | Description |
|------|-------------|
| **Workflow First** | `## Workflow` MUST be the first content section in the agent body, right after the role description |
| **Precondition Script** | If the agent has ANY start conditions (tools, files, services, state), create `scripts/check-{agent-name}-preconditions.sh` |
| **Completion Script** | If the agent produces ANY verifiable output (files, state changes, test results), create `scripts/verify-{agent-name}-completion.sh` |
| **Script Standards** | All scripts: `#!/bin/bash`, `set -e`, descriptive failure messages to stderr, exit 1 on failure |
| **Workflow includes scripts** | The workflow diagram must show precondition check as first step and completion verification as last step (when applicable) |
| **No Skill Duplication** | When using preloaded skills, never copy skill content into the agent body |
