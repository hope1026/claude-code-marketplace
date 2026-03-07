---
name: ai-council
description: Gather multiple AI viewpoints with Claude Code and Gemini CLI. Use when the user wants a second opinion, architecture trade-off review, security review, or a cross-model sanity check before committing to a solution.
---

# AI Council

Use external AI runs only when the extra signal is worth the latency and data exposure.

## Workflow

1. Define the question in one sentence.
2. Select the minimum safe context to share.
3. Query one or two external models.
4. Compare agreements, disagreements, and blind spots.
5. Return a synthesized recommendation instead of raw transcripts.

## When To Use

- The user explicitly asks for multiple AI opinions.
- A design choice has meaningful trade-offs.
- Security, performance, or architecture review benefits from another model.
- You want separate Claude Code and Gemini takes on the same problem.

## Guardrails

- Never send secrets, credentials, tokens, private keys, or production-only data.
- Prefer short excerpts over dumping large files.
- Summarize model output in your own words.
- Stop after 1-2 follow-up rounds unless the user asks for more.

## Tool Checks

```bash
claude --version
gemini --version
```

## Recommended Patterns

### Separate Claude Code pass

```bash
FILE=<file>
claude -p "Review this approach and focus on correctness, maintainability, and missing tests.

Context:
$(sed -n '1,220p' "$FILE")"
```

### Gemini architecture or security pass

```bash
FILE=<file>
gemini -m auto "Review this for architecture and security concerns.

Context:
$(sed -n '1,220p' "$FILE")"
```

### Directory-level review

```bash
gemini --include-directories ./src "Review the project structure and call out risks, missing tests, and design debt."
```

## Response Format

```markdown
## Multi-AI Summary

### Question
{what was evaluated}

### External Signals
- ClaudeCode: {summary}
- Gemini: {summary}

### Agreements
- {shared point}

### Disagreements
- {difference and why it matters}

### Recommendation
{final decision}
```
