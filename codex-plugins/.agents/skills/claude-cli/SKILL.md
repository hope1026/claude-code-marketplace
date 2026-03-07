---
name: claude-cli
description: Run an isolated Claude Code CLI pass for a second opinion, non-interactive review, or alternate prompt. Use when the user wants to check with Claude Code or get a clean-room review separate from the current session.
---

# Claude Code

Use this skill when a separate Claude Code run is more useful than continuing in the current session.

## Workflow

1. Decide why a second Claude Code run is needed.
2. Pass the smallest safe context.
3. Prefer non-interactive `claude -p` calls for repeatability.
4. Ask for analysis first unless the user explicitly wants generated code.
5. Summarize the result and reconcile it with the current session.

## Good Use Cases

- Independent code review on changed files.
- Compare two designs with a fresh Claude Code prompt.
- Reproduce a non-interactive review flow that can be rerun later.
- Ask Claude Code for a different framing on architecture or debugging.

## Tool Check

```bash
claude --version
```

## Common Commands

### Review one file

```bash
FILE=<file>
claude -p "Review this file for bugs, regressions, and missing tests.

Context:
$(sed -n '1,220p' "$FILE")"
```

### Ask for trade-offs

```bash
claude -p "Compare approach A and approach B for this task. Focus on correctness, maintenance cost, and migration risk."
```

### Fast diff check

```bash
claude -p "Spot obvious issues in this diff:
$(git diff --stat && git diff -- .)"
```

## Useful Flags

- `-p`: print response and exit
- `--model sonnet|opus`: choose a Claude model explicitly
- `--permission-mode plan`: keep the run read-oriented when appropriate
- `--add-dir <dir>`: include extra writable directories if needed

## Guardrails

- Prefer `claude -p` over nested interactive sessions.
- Keep prompts deterministic and reproducible.
- Never send secrets or private production data.
- Review the child output before acting on it.
