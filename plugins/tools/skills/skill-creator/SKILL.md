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
Phase 2: Create Skill
   ↓ Generate SKILL.md with proper structure
Phase 3: Test & Verify
   ↓ Test invocation and behavior
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

## Phase 2: Create Skill

### Skill Directory Structure

```
skill-name/
├── SKILL.md              # Required: main instructions
├── scripts/              # Optional: executable code
│   ├── validate.sh       # Pre-execution validation
│   └── verify-result.sh  # Post-execution verification
├── references/           # Optional: detailed documentation
└── assets/               # Optional: templates, images
```

### Where Skills Live

| Location | Path | Applies to |
|----------|------|------------|
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<skill-name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | Where plugin is enabled |

### SKILL.md Template

```markdown
---
name: {skill-name}
description: {What this skill does. Use when...}
---

# {Skill Title}

{Instructions for Claude when this skill is active}

## Workflow
1. {Step 1}
2. {Step 2}

## Validation (if applicable)
Run `scripts/validate.sh` before execution to verify preconditions.
Run `scripts/verify-result.sh` after execution to confirm success.
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

When writing API endpoints:
- Use RESTful naming conventions
- Return consistent error formats
- Include request validation
```

**Task Content** - Step-by-step instructions:
```yaml
---
name: deploy
description: Deploy the application to production
context: fork
disable-model-invocation: true
---

Deploy $ARGUMENTS to production:
1. Run the test suite
2. Build the application
3. Push to the deployment target
```

**Subagent Skill** - Run in isolated context:
```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:
1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
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

### 3.1 Test Invocation

**Direct invocation:**
```
/skill-name [arguments]
```

**Automatic invocation (if enabled):**
Ask Claude something that matches the description keywords.

### 3.2 Verify Behavior

Check that:
- [ ] Skill appears in `What skills are available?`
- [ ] Description triggers work as expected
- [ ] Instructions execute correctly
- [ ] Supporting files load when referenced
- [ ] Scripts run successfully (if included)

### 3.3 Validation Scripts (if applicable)

**Pre-execution validation:**
```bash
# scripts/validate.sh
#!/bin/bash
set -e
# Check required environment
command -v node >/dev/null || { echo "Node.js required" >&2; exit 1; }
# Check required files
[ -f "package.json" ] || { echo "package.json required" >&2; exit 1; }
echo "Validation passed"
```

**Post-execution verification:**
```bash
# scripts/verify-result.sh
#!/bin/bash
OUTPUT_FILE="$1"
[ -f "$OUTPUT_FILE" ] || { echo "Output not found" >&2; exit 1; }
[ -s "$OUTPUT_FILE" ] || { echo "Output is empty" >&2; exit 1; }
echo "Result verified: $OUTPUT_FILE"
```

---

## Phase 4: User Confirmation

After testing, report to user:

```
✅ Skill Created Successfully

📁 Location: {path}/skills/{skill-name}/SKILL.md
📝 Name: {skill-name}
📋 Description: {description}

Test Results:
- [ ] Direct invocation: /{skill-name} works
- [ ] Auto-invocation: Claude triggers when relevant
- [ ] Scripts: All validation scripts pass

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

---

## Quick Reference

**Minimal skill:**
```yaml
---
name: my-skill
description: What it does. Use when...
---

Instructions here...
```

**Full-featured skill:**
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

# Skill Title

## Pre-check
Run `scripts/validate.sh` to verify environment.

## Workflow
1. Step one with $ARGUMENTS
2. Step two

## Post-check
Run `scripts/verify-result.sh {output}` to confirm.
```
