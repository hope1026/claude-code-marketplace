---
name: review-ralph
description: Review changed work with a resumable findings loop. Use when the user asks for review, code review, PR review, or a thorough quality pass over code, docs, configs, or tests.
---

# Review Ralph

This is a manual review workflow for Codex. There is no Stop hook in this environment, so state must live in `.task-cache/review/`.

## Review Cache

```text
.task-cache/
└── review/
    ├── findings/
    │   └── {review-id}.md
    ├── state/
    │   └── {review-id}.json
    ├── logs/
    │   └── {review-id}.log
    ├── handoff/
    │   └── {review-id}-handoff.md
    └── current-review.txt
```

## Workflow

### Phase 1: Scope

1. Identify the requested review scope.
2. If the user did not specify one, inspect changed files first.
3. Prefer reviewing actual diffs and touched files before broad commentary.

Useful commands:

```bash
git status --short
git diff --name-only
git diff --stat
```

### Phase 2: Findings File

Create the review cache and write the source-of-truth findings file.

```bash
mkdir -p .task-cache/review/findings .task-cache/review/state .task-cache/review/logs .task-cache/review/handoff
echo "<review-id>" > .task-cache/review/current-review.txt
```

Suggested findings format:

```markdown
# Review: {title}

**Review ID:** {review-id}
**Status:** in-progress | complete
**Scope:** {scope}

## Findings
### REV-001
- **Status:** open | fixed | deferred
- **File:** path:line
- **Issue:** {description}
- **Risk:** {why it matters}
- **Fix:** {summary}
- **Verification:** {how it was checked}
```

### Phase 3: Review Loop

1. Read the changed work carefully.
2. Record findings ordered by severity.
3. Re-check after each fix.
4. Update both the findings file and the state JSON.

State file example:

```json
{
  "status": "active",
  "review_id": "review-20260307-example",
  "phase": "Fix + Re-check",
  "remaining": 2,
  "pending_items": [
    "Handle null guard regression",
    "Add missing test coverage"
  ],
  "detail_path": ".task-cache/review/findings/review-20260307-example.md"
}
```

### Phase 4: Finalize

- Set `remaining` to `0` and `status` to `complete` when done.
- If there are no findings, say so explicitly and still create a complete state snapshot.

## Review Criteria

- correctness
- regression risk
- missing edge-case handling
- incomplete implementation
- missing or stale tests
- project convention drift

## Response Rules

- Findings first.
- Include file and line references whenever possible.
- Keep summary secondary.
- If no findings exist, state that explicitly and mention residual risks or test gaps.
