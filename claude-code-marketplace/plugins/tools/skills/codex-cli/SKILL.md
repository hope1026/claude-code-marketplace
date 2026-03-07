---
name: codex-cli
description: Collaborate with OpenAI Codex CLI for code tasks. Use when user says "ask Codex", "Codex review", "Codex opinion", "check with GPT", or needs second opinion, code review, pair programming, code generation, refactoring, test writing, or bug fixing.
---

# Codex CLI Collaboration

Collaborate with OpenAI Codex via Codex CLI for code review, second opinions, and pair programming.

## Prerequisites Check

Before using Codex CLI, verify installation:

```bash
codex --version
```

If not installed, guide user to install:

```bash
# Install via npm
npm install -g @openai/codex

# Authenticate (requires ChatGPT Plus/Pro or API key)
codex auth
```

## Collaboration Patterns

### Code Review Request
```bash
FILE=<file>
codex exec --model gpt-5.3-codex "Review this code for bugs, performance issues, and best practices.

Code from $FILE:
$(cat "$FILE")"
```

### Second Opinion
```bash
FILE=<file>
codex exec --model gpt-5.3-codex "I'm considering <approach>. What are the pros/cons? Any better alternatives?

Relevant context from $FILE:
$(cat "$FILE")"
```

### Pair Programming
```bash
FILE=<file>
codex exec --model gpt-5.3-codex "Help me implement <feature>. Current progress:

Context from $FILE:
$(cat "$FILE")"
```

## Basic Usage

### Query with Context
```bash
FILE=<file>
codex exec --model gpt-5.3-codex "<task>

Reference context from $FILE:
$(cat "$FILE")"
```

### Model Selection

| Model | Use Case | Speed |
|-------|----------|-------|
| `gpt-5.3-codex` | Complex tasks, architecture, planning (default) | Slower |
| `gpt-5-codex` | Standard coding tasks | Medium |
| `gpt-5-codex-mini` | Simple queries, quick fixes | Fast |

**Model Selection Guidelines:**
- **Default**: Always use `gpt-5.3-codex` (best reasoning)
- **Quick/simple queries**: Use `gpt-5-codex-mini` for speed

```bash
# Default — always use gpt-5.3-codex
codex exec --model gpt-5.3-codex "<task>"

# Quick simple query
codex exec --model gpt-5-codex-mini "<simple question>"
```

### Execution Modes
- default: safest mode, keeps approvals/sandbox in place
- `--full-auto`: low-friction automation in sandbox (use carefully)
- `--dangerously-bypass-approvals-and-sandbox`: no approvals or sandbox (high risk)

```bash
codex exec --model gpt-5.3-codex "<task>"
codex exec --model gpt-5.3-codex --full-auto "<task>"
```

## Response Handling

1. Review Codex output before applying
2. Compare with Claude's analysis for best solution
3. Verify code matches project conventions

## Examples

### Bug Analysis
```bash
codex exec --model gpt-5.3-codex "Analyze this error and suggest fixes: $(cat error.log | tail -50)"
```

### Test Generation
```bash
FILE=src/utils.ts
codex exec --model gpt-5.3-codex "Write unit tests for this module.

Module source:
$(cat "$FILE")"
```

### Refactoring
```bash
FILE=src/legacy.ts
codex exec --model gpt-5.3-codex "Suggest refactoring for better readability.

Source:
$(cat "$FILE")"
```

## Notes

- Requires ChatGPT Plus/Pro subscription or API key
- 5-hour usage limit (subscription-based)
- Keep approvals and sandbox enabled unless you explicitly need automation
- Review all generated code before applying
