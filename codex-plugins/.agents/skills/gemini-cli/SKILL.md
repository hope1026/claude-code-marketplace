---
name: gemini-cli
description: Query Google Gemini CLI for large-context analysis, security review, or a second opinion. Use when the user asks to check with Gemini or when an external architecture or security perspective would be useful.
---

# Gemini CLI

Use Gemini as an external reviewer, not as a transcript relay.

## Workflow

1. Confirm `gemini` is available.
2. Share only the smallest safe context.
3. Use `auto` first; pin a model only when needed.
4. Summarize the response and compare it with the current reasoning.

## Tool Check

```bash
gemini --version
```

## Model Guidance

- `auto`: default
- `pro`: deeper reasoning for hard architecture or security questions
- `flash`: faster general analysis
- `flash-lite`: cheapest lightweight checks

## Common Commands

### Single question

```bash
gemini -m auto "Review this plan and call out missing risks or blind spots."
```

### File review

```bash
FILE=<file>
gemini -m auto "Review this code for correctness, security, and maintenance issues.

Context:
$(sed -n '1,220p' "$FILE")"
```

### Directory review

```bash
gemini --include-directories ./src,./tests "Review the architecture and identify fragile areas."
```

## Guardrails

- Never send secrets or private production data.
- Prefer excerpts over full repositories.
- If a pinned model fails, retry with `auto`.
- Return a synthesized conclusion, not a verbatim dump.
