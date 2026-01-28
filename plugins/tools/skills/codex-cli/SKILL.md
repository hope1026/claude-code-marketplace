---
name: codex-cli
description: Collaborate with OpenAI Codex CLI for code tasks. Use when user says "ask Codex", "Codex review", "Codex opinion", "check with GPT", or needs second opinion, code review, pair programming, code generation, refactoring, test writing, or bug fixing.
---

# Codex CLI Collaboration

Collaborate with OpenAI GPT-5.2-Codex via Codex CLI for code review, second opinions, and pair programming.

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
codex exec "Review this code for bugs, performance issues, and best practices" --context-file <file>
```

### Second Opinion
```bash
codex exec "I'm considering <approach>. What are the pros/cons? Any better alternatives?" --context-file <file>
```

### Pair Programming
```bash
codex exec "Help me implement <feature>. Current progress:" --context-file <file>
```

## Basic Usage

### Query with Context
```bash
codex exec "<task>" --context-file <file>
```

### Model Selection

| Model | Use Case | Speed |
|-------|----------|-------|
| `gpt-5.2-codex` | Complex tasks, architecture, planning (default) | Slower |
| `gpt-5-codex` | Standard coding tasks | Medium |
| `gpt-5-codex-mini` | Simple queries, quick fixes | Fast |

**Model Selection Guidelines:**
- **Planning/Problem-solving**: Use `gpt-5.2-codex` (best reasoning)
- **General tasks**: Use default or `gpt-5-codex-mini` for speed

```bash
# Complex analysis (default model)
codex exec "<complex architecture question>"

# Quick simple query
codex exec --model gpt-5-codex-mini "<simple question>"
```

### Approval Modes
- `suggest`: Review only (default, recommended)
- `auto-edit`: Auto-approve edits
- `full-auto`: Auto-approve all (use with caution)

```bash
codex exec --approval-mode suggest "<task>"
```

## Response Handling

1. Review Codex output before applying
2. Compare with Claude's analysis for best solution
3. Verify code matches project conventions

## Examples

### Bug Analysis
```bash
codex exec "Analyze this error and suggest fixes: $(cat error.log | tail -50)"
```

### Test Generation
```bash
codex exec "Write unit tests for this module" --context-file src/utils.ts
```

### Refactoring
```bash
codex exec "Suggest refactoring for better readability" --context-file src/legacy.ts
```

## Notes

- Requires ChatGPT Plus/Pro subscription or API key
- 5-hour usage limit (subscription-based)
- Always use `suggest` mode for safety
- Review all generated code before applying
