---
name: skill-creator
description: Guide for creating Claude Code skills. Use when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.
---

# Skill Creator

This skill provides guidance for creating effective Claude Code skills.

## Workflow

```
Phase 0: Check Official Documentation
   ↓ Fetch latest spec from official docs
Phase 1: Clarify Requirements
   ↓ Ask questions to understand skill purpose
Phase 1.5: Identify Preconditions & Completion Criteria
   ↓ Determine start conditions and success criteria
Phase 2: Create Skill
   ↓ Generate SKILL.md with Workflow at top + scripts
Phase 3: Test & Verify
   ↓ Test invocation, precondition checks, and completion verification
Phase 4: User Confirmation
   ↓ Report results and get approval
```

---

## Phase 0: Check Official Documentation

> **CRITICAL**: Always fetch the latest documentation before creating a skill.

Use WebFetch to check the official Claude Code skills documentation:

```
URL: https://code.claude.com/docs/en/skills
```

**What to verify:**
- Latest frontmatter fields and their usage
- New features or deprecated options
- Current best practices and examples
- Any breaking changes from previous versions

**Example WebFetch prompt:**
```
Extract the complete documentation about Claude Code skills including:
frontmatter fields, structure, examples, and best practices.
```

After fetching, compare with the reference below and use the **latest official spec** for any discrepancies.

---

## Phase 1: Clarify Requirements

Before creating a skill, gather necessary information. **Ask the user** if any are unclear:

| Question | Why It Matters |
|----------|----------------|
| What specific task should this skill handle? | Defines the skill's purpose |
| What triggers should make Claude use this skill? | Shapes the description field |
| Should users invoke it directly (`/skill-name`) or let Claude decide? | Determines `disable-model-invocation` |
| Does it need scripts for automation or validation? | Identifies `scripts/` needs |
| Is there reference documentation to include? | Identifies `references/` needs |
| Should it run in isolated context? | Determines `context: fork` |

**Example questions to ask:**
- "What would a user say that should trigger this skill?"
- "Should this skill run automatically when relevant, or only when explicitly called?"
- "Are there validation steps needed before or after the skill runs?"
- "Does this skill need to modify files or is it read-only?"

---

## Phase 1.5: Identify Preconditions & Completion Criteria

> **MANDATORY**: For every skill, explicitly determine preconditions and completion criteria.

### Precondition Analysis

Ask the user (or infer from context):

| Question | Example |
|----------|---------|
| What must exist before this skill can run? | Specific files, tools, services, environment variables |
| What state must the project be in? | Clean git state, running server, specific branch |
| What external dependencies are required? | CLI tools (`node`, `rojo`, `gh`), running processes, network access |

**Decision rule:**
- If **any precondition exists** → Create `scripts/check-preconditions.sh`
- If **no preconditions** → Skip the script but document "No preconditions" in SKILL.md

### Completion Criteria Analysis

Ask the user (or infer from context):

| Question | Example |
|----------|---------|
| How do we know the skill finished successfully? | Output file exists, tests pass, server responds |
| What artifacts should exist after completion? | Generated files, modified configs, new entries |
| What state should the project be in after? | All tests green, no lint errors, build succeeds |

**Decision rule:**
- If **any verifiable completion criteria exists** → Create `scripts/verify-completion.sh`
- If **no verifiable criteria** (e.g., pure knowledge/reference skills) → Skip the script

### Script Requirements

When creating scripts, follow these rules:

```bash
# scripts/check-preconditions.sh
#!/bin/bash
set -e

# Each check: descriptive message on failure, exit 1 to block
# Exit 0 only when ALL preconditions are met

echo "Checking preconditions..."

# Example checks:
# command -v node >/dev/null 2>&1 || { echo "FAIL: node is required" >&2; exit 1; }
# [ -f "package.json" ] || { echo "FAIL: package.json not found" >&2; exit 1; }
# curl -sf http://localhost:3002/status >/dev/null || { echo "FAIL: MCP server not running" >&2; exit 1; }

echo "All preconditions met"
```

```bash
# scripts/verify-completion.sh
#!/bin/bash
set -e

# Each check: verify an expected outcome, exit 1 on failure
# Exit 0 only when ALL completion criteria are satisfied

echo "Verifying completion..."

# Example checks:
# [ -f "$1" ] || { echo "FAIL: Expected output file not found: $1" >&2; exit 1; }
# [ -s "$1" ] || { echo "FAIL: Output file is empty: $1" >&2; exit 1; }
# npm test --silent || { echo "FAIL: Tests did not pass" >&2; exit 1; }

echo "All completion criteria verified"
```

---

## Phase 2: Create Skill

### Skill Directory Structure

```
skill-name/
├── SKILL.md                    # Required: main instructions
├── scripts/                    # Conditional: executable scripts
│   ├── check-preconditions.sh  # When preconditions exist
│   └── verify-completion.sh    # When completion criteria exist
├── references/                 # Optional: detailed documentation
└── assets/                     # Optional: templates, images
```

### Where Skills Live

| Location | Path | Applies to |
|----------|------|------------|
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<skill-name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | Where plugin is enabled |

### SKILL.md Template

> **RULE**: The `## Workflow` section MUST be the first content section after the title. This ensures Claude always sees the execution flow before any details.

```markdown
---
name: {skill-name}
description: {What this skill does. Use when...}
---

# {Skill Title}

{One-line summary of what this skill does}

## Workflow

{Workflow diagram or numbered steps - ALWAYS first section}

```
Step 1: {Precondition Check}
   ↓ Run scripts/check-preconditions.sh (if applicable)
Step 2: {First action}
   ↓
Step 3: {Second action}
   ↓
Step N: {Completion Verification}
   ↓ Run scripts/verify-completion.sh (if applicable)
```

## Precondition Check (if applicable)

Run `scripts/check-preconditions.sh` before starting.
If it fails, report the missing precondition to the user and stop.

## Instructions

{Detailed instructions for each workflow step}

## Completion Verification (if applicable)

Run `scripts/verify-completion.sh` after finishing.
If it fails, investigate and fix before reporting success.
```

### Frontmatter Fields Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | No | Skill identifier (lowercase, hyphens, max 64 chars). Defaults to directory name |
| `description` | Recommended | What the skill does and when to use it. Claude uses this to decide when to load |
| `argument-hint` | No | Hint for expected arguments, e.g., `[filename]` or `[issue-number]` |
| `disable-model-invocation` | No | `true` = only user can invoke via `/name`. Default: `false` |
| `user-invocable` | No | `false` = hidden from `/` menu (background knowledge). Default: `true` |
| `allowed-tools` | No | Tools Claude can use without asking permission when skill is active |
| `model` | No | Model to use when skill is active |
| `context` | No | `fork` = run in isolated subagent context |
| `agent` | No | Subagent type when `context: fork` (e.g., `Explore`, `Plan`, `general-purpose`) |
| `hooks` | No | Hooks scoped to this skill's lifecycle |

### String Substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking the skill |
| `$ARGUMENTS[N]` or `$N` | Access specific argument by 0-based index |
| `${CLAUDE_SESSION_ID}` | Current session ID |

### Writing Effective Descriptions

The `description` is critical—Claude uses it to decide when to load the skill.

**Include:**
1. What the skill does
2. Trigger phrases ("Use when...", "Use for...")
3. Specific contexts or keywords

**Example:**
```yaml
description: Generate API documentation from code. Use when creating docs, documenting endpoints, or when user says "document this API".
```

### Invocation Control

| Frontmatter | You can invoke | Claude can invoke | Use case |
|-------------|----------------|-------------------|----------|
| (default) | Yes | Yes | General skills |
| `disable-model-invocation: true` | Yes | No | Workflows with side effects (deploy, commit) |
| `user-invocable: false` | No | Yes | Background knowledge |

### Skill Types

**Reference Content** - Knowledge Claude applies to work:
```yaml
---
name: api-conventions
description: API design patterns for this codebase
---

# API Conventions

## Workflow
1. Read these conventions before writing any API code
2. Apply all rules during implementation
3. No scripts needed (reference-only skill)

When writing API endpoints:
- Use RESTful naming conventions
- Return consistent error formats
- Include request validation
```

**Task Content** - Step-by-step instructions with validation:
```yaml
---
name: deploy
description: Deploy the application to production
context: fork
disable-model-invocation: true
---

# Deploy

## Workflow

```
Step 1: Precondition Check
   ↓ Run scripts/check-preconditions.sh
Step 2: Run Tests
   ↓
Step 3: Build Application
   ↓
Step 4: Push to Deployment Target
   ↓
Step 5: Completion Verification
   ↓ Run scripts/verify-completion.sh
```

## Precondition Check
Run `scripts/check-preconditions.sh` to verify:
- Clean git working tree
- All tests passing
- Correct branch

## Instructions
Deploy $ARGUMENTS to production:
1. Run the test suite
2. Build the application
3. Push to the deployment target

## Completion Verification
Run `scripts/verify-completion.sh` to confirm:
- Deployment endpoint responds 200
- No errors in deployment logs
```

**Subagent Skill** - Run in isolated context:
```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

# Deep Research

## Workflow
1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references

Research $ARGUMENTS thoroughly.
```

### Dynamic Context with Shell Commands

Use `!`command`` to inject shell output before Claude sees the prompt:

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`

## Your task
Summarize this pull request...
```

---

## Phase 3: Test & Verify

After creating the skill:

### 3.1 Test Precondition Script (if created)

```bash
# Run the precondition check
bash {skill-path}/scripts/check-preconditions.sh

# Verify it blocks correctly when preconditions are NOT met
# (temporarily break a precondition and confirm exit 1)
```

### 3.2 Test Invocation

**Direct invocation:**
```
/skill-name [arguments]
```

**Automatic invocation (if enabled):**
Ask Claude something that matches the description keywords.

### 3.3 Verify Behavior

Check that:
- [ ] Skill appears in `What skills are available?`
- [ ] Description triggers work as expected
- [ ] **Workflow is the first section** after the title
- [ ] **Precondition script blocks** when conditions are not met
- [ ] Instructions execute correctly
- [ ] Supporting files load when referenced
- [ ] **Completion script passes** when work is done correctly
- [ ] **Completion script fails** when work is incomplete

### 3.4 Test Completion Script (if created)

```bash
# Run after skill completes successfully
bash {skill-path}/scripts/verify-completion.sh [args]

# Verify it detects incomplete work
# (simulate partial completion and confirm exit 1)
```

---

## Phase 4: User Confirmation

After testing, report to user:

```
Skill Created Successfully

Location: {path}/skills/{skill-name}/SKILL.md
Name: {skill-name}
Description: {description}
Precondition Script: {Yes/No - description of what it checks}
Completion Script: {Yes/No - description of what it verifies}

Test Results:
- [ ] Direct invocation: /{skill-name} works
- [ ] Auto-invocation: Claude triggers when relevant
- [ ] Precondition check: Blocks when conditions not met
- [ ] Completion check: Passes on success, fails on incomplete
- [ ] Workflow is first section in SKILL.md

Would you like to:
1. Make any modifications
2. Add additional files (scripts, references)
3. Confirm and finish
```

---

## Troubleshooting

### Skill not triggering
- Check description includes keywords users would naturally say
- Verify skill appears in `/` menu
- Try rephrasing request to match description

### Skill triggers too often
- Make description more specific
- Add `disable-model-invocation: true`

### Claude doesn't see all skills
- Check context budget (default 15,000 chars for descriptions)
- Set `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var to increase limit

### Precondition script not blocking
- Ensure script exits with code 1 on failure
- Check `set -e` is at the top
- Verify script is executable (`chmod +x`)

### Completion script gives false positive
- Add more specific checks (file content, not just existence)
- Test with intentionally incomplete output

---

## Quick Reference

**Minimal skill (no scripts needed):**
```yaml
---
name: my-skill
description: What it does. Use when...
---

# My Skill

## Workflow
1. Step one
2. Step two

Instructions here...
```

**Full-featured skill (with precondition + completion scripts):**
```yaml
---
name: my-skill
description: What it does. Use when user says X or Y.
argument-hint: [filename]
disable-model-invocation: true
allowed-tools: Read, Bash
context: fork
agent: Explore
---

# My Skill

## Workflow

```
Step 1: Precondition Check
   ↓ Run scripts/check-preconditions.sh
Step 2: Do work with $ARGUMENTS
   ↓
Step 3: Completion Verification
   ↓ Run scripts/verify-completion.sh
```

## Precondition Check
Run `scripts/check-preconditions.sh` to verify environment.
If it fails, stop and report the issue.

## Instructions
1. Step one with $ARGUMENTS
2. Step two

## Completion Verification
Run `scripts/verify-completion.sh {output}` to confirm success.
If it fails, fix the issue before reporting completion.
```

---

## Mandatory Rules Summary

| Rule | Description |
|------|-------------|
| **Workflow First** | `## Workflow` MUST be the first content section after the skill title in every SKILL.md |
| **Precondition Script** | If the skill has ANY start conditions (tools, files, services, state), create `scripts/check-preconditions.sh` |
| **Completion Script** | If the skill produces ANY verifiable output (files, state changes, test results), create `scripts/verify-completion.sh` |
| **Script Standards** | All scripts: `#!/bin/bash`, `set -e`, descriptive failure messages to stderr, exit 1 on failure |
| **Workflow includes scripts** | The workflow diagram must show precondition check as first step and completion verification as last step (when applicable) |
