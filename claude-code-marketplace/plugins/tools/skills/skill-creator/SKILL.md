---
name: skill-creator
description: Create or optimize Claude Code skills. Use when users want to create a new skill, update an existing skill, verify skill structure, or optimize skill content.
---

# Skill Creator

Guide for creating and verifying/optimizing Claude Code skills.

## Mode Selection

This skill provides two modes:

| Mode | When to Use | Key Actions |
|------|-------------|-------------|
| **Creation Mode** | Creating new skill or major revision | Check docs → Gather requirements → Write skill → Test → Confirm |
| **Verification/Optimization Mode** | Review and improve existing skill | Validate structure → Analyze content → Optimize → Report |

**Mode Decision Criteria:**
- "Create a skill", "Make new skill" → **Creation Mode**
- "Review skill", "Optimize skill", "Verify skill" → **Verification/Optimization Mode**
- If unclear, ask the user

---

# Mode A: Skill Creation

## Workflow (Creation Mode)

```
Phase 1: Check Official Documentation
   ↓ Fetch latest spec
Phase 2: Gather Requirements
   ↓ Clarify purpose, triggers, script needs
Phase 3: Analyze Preconditions & Completion Criteria
   ↓ Define start conditions and success criteria
Phase 4: Create Skill
   ↓ Write SKILL.md + required scripts
Phase 5: Test & Verify
   ↓ Test invocation, preconditions, completion
Phase 6: User Confirmation
   ↓ Report results and get approval
```

---

## Phase 1: Check Official Documentation

> **Required**: Always fetch the latest documentation before creating a skill.

Use WebFetch to check official docs:

```
URL: https://code.claude.com/docs/en/skills
```

**What to verify:**
- Latest frontmatter fields
- New features or deprecated options
- Current best practices

---

## Phase 2: Gather Requirements

Collect necessary information before creating. **Ask the user** if unclear:

| Question | Why It Matters |
|----------|----------------|
| What task should this skill handle? | Defines skill purpose |
| What triggers should activate this skill? | Shapes description field |
| User-only invocation (`/skill-name`)? | Determines `disable-model-invocation` |
| Need automation/validation scripts? | Identifies `scripts/` needs |
| Need reference documentation? | Identifies `references/` needs |
| Run in isolated context? | Determines `context: fork` |

---

## Phase 3: Analyze Preconditions & Completion Criteria

### Precondition Analysis

| Question | Example |
|----------|---------|
| What must exist before skill runs? | Specific files, tools, services, env vars |
| What project state is required? | Clean git, running server, specific branch |
| What external dependencies needed? | CLI tools (`node`, `rojo`, `gh`) |

**Decision rule:**
- Preconditions **exist** → Create `scripts/check-preconditions.sh`
- **No** preconditions → Skip script, document "No preconditions" in SKILL.md

### Completion Criteria Analysis

| Question | Example |
|----------|---------|
| How to confirm successful completion? | Output file exists, tests pass |
| What artifacts should exist after? | Generated files, modified configs |
| What project state after completion? | All tests pass, no lint errors |

**Decision rule:**
- Verifiable criteria **exist** → Create `scripts/verify-completion.sh`
- **No** verifiable criteria (reference-only skills) → Skip script

---

## Phase 4: Create Skill

### Directory Structure

```
skill-name/
├── SKILL.md                    # Required: main instructions
├── scripts/                    # Conditional: executable scripts
│   ├── check-preconditions.sh  # When preconditions exist
│   └── verify-completion.sh    # When completion criteria exist
├── references/                 # Optional: detailed documentation
└── assets/                     # Optional: templates, images
```

### Skill Locations

| Location | Path | Scope |
|----------|------|-------|
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All projects |
| Project | `.claude/skills/<skill-name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | Where plugin is enabled |

### SKILL.md Template

> **Rule**: `## Workflow` section MUST be the **first content section** after the title.

```markdown
---
name: {skill-name}
description: {What it does. Use when...}
---

# {Skill Title}

{One-line summary}

## Workflow

{Workflow diagram - always first section}

## Precondition Check (if applicable)

Run `scripts/check-preconditions.sh` before starting.

## Instructions

{Detailed instructions for each workflow step}

## Completion Verification (if applicable)

Run `scripts/verify-completion.sh` after finishing.
```

---

## Phase 5: Test & Verify

### 5.1 Test Precondition Script

```bash
bash {skill-path}/scripts/check-preconditions.sh
# Verify exit 1 when preconditions not met
```

### 5.2 Test Invocation

- Direct: `/skill-name [arguments]`
- Automatic: Trigger via description keywords

### 5.3 Test Completion Script

```bash
bash {skill-path}/scripts/verify-completion.sh [args]
# Verify exit 1 when incomplete
```

---

## Phase 6: User Confirmation

```
Skill Created Successfully

Location: {path}/skills/{skill-name}/SKILL.md
Name: {skill-name}
Description: {description}
Precondition Script: {Yes/No}
Completion Script: {Yes/No}

Test Results:
- [ ] Direct invocation works
- [ ] Auto-invocation trigger works
- [ ] Precondition check works
- [ ] Completion verification works

Choose next action:
1. Make modifications
2. Add additional files
3. Finish
```

---

# Mode B: Skill Verification & Optimization

## Workflow (Verification/Optimization Mode)

```
Phase 1: Read Skill Files
   ↓ Load target SKILL.md and related files
Phase 2: Validate Structure
   ↓ Check skill structure rules compliance
Phase 3: Analyze Content
   ↓ Identify duplicates, contradictions, unnecessary content
Phase 4: Propose Optimizations
   ↓ Organize and apply improvements
Phase 5: Report Results
   ↓ Summarize changes and get user confirmation
```

---

## Phase 1: Read Skill Files

Read all files in the target skill:

```
{skill-path}/
├── SKILL.md
├── scripts/*.sh
├── references/*
└── assets/*
```

---

## Phase 2: Validate Structure

Check compliance with the following rules:

### 2.1 Frontmatter Validation

| Check Item | Criteria |
|------------|----------|
| `name` format | Lowercase, hyphens, max 64 chars |
| `description` exists | Recommended - describes purpose and triggers |
| Field validity | Only known fields used |

### 2.2 Structure Validation

| Check Item | Criteria |
|------------|----------|
| `## Workflow` position | First section after title |
| Precondition section | Must exist if script exists |
| Completion section | Must exist if script exists |
| Workflow consistency | Diagram matches actual sections |

### 2.3 Script Validation

| Check Item | Criteria |
|------------|----------|
| Shebang | `#!/bin/bash` |
| set -e | Present at top of script |
| Failure messages | Output to stderr, exit 1 |
| Success messages | exit 0 |

---

## Phase 3: Analyze Content

### 3.1 Duplicate Content Check

- Same content repeated across sections?
- Identical content in Workflow and Instructions?
- Duplicate documentation in references/ and SKILL.md?

### 3.2 Logical Contradiction Check

- Workflow order matches Instructions order?
- Frontmatter settings match body descriptions?
- Preconditions and completion criteria logically connected?

### 3.3 Unnecessary Content Check

- Content unrelated to skill purpose?
- Overly detailed explanations?
- Unused files?

---

## Phase 4: Propose Optimizations

Organize discovered issues by category:

### Issue Report Format

```
## Verification Results

### Structure Issues (Critical)
- [ ] {Issue description} → {Fix method}

### Duplicate Content (Warning)
- [ ] {Duplicate location} → {Consolidation suggestion}

### Logical Contradictions (Warning)
- [ ] {Contradiction} → {Fix method}

### Unnecessary Content (Info)
- [ ] {Unnecessary content} → {Remove or move suggestion}

### Improvement Suggestions (Info)
- [ ] {Improvement}
```

### Severity Definitions

| Severity | Description | Action |
|----------|-------------|--------|
| **Critical** | Affects skill operation | Immediate fix required |
| **Warning** | Maintainability/readability issue | Fix recommended |
| **Info** | Potential improvement | Optional |

---

## Phase 5: Report Results

```
Skill Verification Complete: {skill-name}

## Summary
- Critical issues: {N}
- Warnings: {N}
- Info: {N}

## Changes Applied
{List of applied fixes}

## Remaining Recommendations
{Items requiring user judgment}

Choose next action:
1. Continue with additional fixes
2. Complete verification
```

---

# Reference: Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | No | Skill ID (lowercase, hyphens, max 64 chars). Default: directory name |
| `description` | Recommended | Skill description. Claude uses this to decide when to load |
| `argument-hint` | No | Expected argument hint (e.g., `[filename]`) |
| `disable-model-invocation` | No | `true` = only user can invoke via `/name` |
| `user-invocable` | No | `false` = hidden from `/` menu (background knowledge) |
| `allowed-tools` | No | Tools allowed without asking when skill is active |
| `model` | No | Model to use when skill is active |
| `context` | No | `fork` = run in isolated subagent context |
| `agent` | No | Subagent type when `context: fork` |
| `hooks` | No | Hooks scoped to skill lifecycle |

---

# Reference: Script Templates

### check-preconditions.sh

```bash
#!/bin/bash
set -e

echo "Checking preconditions..."

# Examples:
# command -v node >/dev/null 2>&1 || { echo "FAIL: node required" >&2; exit 1; }
# [ -f "package.json" ] || { echo "FAIL: package.json not found" >&2; exit 1; }

echo "All preconditions met"
```

### verify-completion.sh

```bash
#!/bin/bash
set -e

echo "Verifying completion..."

# Examples:
# [ -f "$1" ] || { echo "FAIL: Output file not found: $1" >&2; exit 1; }
# npm test --silent || { echo "FAIL: Tests failed" >&2; exit 1; }

echo "All completion criteria verified"
```

---

# Reference: Skill Type Examples

### Reference Skill (No Scripts Needed)

```yaml
---
name: api-conventions
description: API design patterns. Use when writing API code.
---

# API Conventions

## Workflow
1. Read these rules before writing API code
2. Apply all rules during implementation

## Rules
- RESTful naming
- Consistent error format
- Include request validation
```

### Task Skill (With Scripts)

```yaml
---
name: deploy
description: Deploy to production. Use when deploying.
disable-model-invocation: true
---

# Deploy

## Workflow

Step 1: Precondition Check
   ↓ scripts/check-preconditions.sh
Step 2: Build
   ↓
Step 3: Deploy
   ↓
Step 4: Verify
   ↓ scripts/verify-completion.sh

## Precondition Check
Run `scripts/check-preconditions.sh`

## Instructions
1. Run build
2. Push to deployment target

## Completion Verification
Run `scripts/verify-completion.sh`
```

---

# Mandatory Rules Summary

| Rule | Description |
|------|-------------|
| **Workflow First** | `## Workflow` must be first section after title |
| **Precondition Script** | Create `scripts/check-preconditions.sh` if start conditions exist |
| **Completion Script** | Create `scripts/verify-completion.sh` if verifiable output exists |
| **Script Standards** | `#!/bin/bash`, `set -e`, stderr for failures, exit 1 |
| **Workflow-Script Match** | Workflow diagram includes script steps (when applicable) |
