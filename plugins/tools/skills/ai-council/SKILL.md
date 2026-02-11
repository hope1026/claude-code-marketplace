---
name: ai-council
description: Multi-AI collaboration using Codex CLI and Gemini CLI. Use when user says "AI council", "discuss among AIs", "get multiple AI opinions", "what do other AIs think", or needs diverse AI perspectives for complex decisions, architecture reviews, or problem solving.
---

# AI Council

Orchestrate discussions between multiple AI systems (Claude, Codex, Gemini) to reach a well-reasoned consensus on complex problems.

## Prerequisites

Verify both CLI tools are installed:

```bash
codex --version
gemini --version
```

## AI Strengths & Models

| AI | Model (Planning) | Model (General) | Strengths |
|----|------------------|-----------------|-----------|
| **Claude** | claude-opus-4-5 | claude-sonnet-4 | Nuanced reasoning, safety, detailed explanations |
| **Codex** (OpenAI) | gpt-5.2-codex | gpt-5-codex-mini | Code generation, practical solutions, long-horizon tasks |
| **Gemini** (Google) | `auto` (default), `pro` if needed | `auto` (default), `flash` if needed | Large context, security review, agentic coding |

### Gemini Model Notes
- Prefer `auto` first (`gemini` without `-m` is effectively Auto behavior).
- Use `pro` only when higher reasoning depth is clearly needed.
- Use `flash` only when speed is more important than depth.
- If a pinned model fails (quota/access), retry with `auto`.

## Workflow

### 1. Frame the Problem
Clearly state the decision/problem and identify relevant context files.

### 2. Gather Perspectives

**Query Codex (use gpt-5.2-codex for complex decisions):**
```bash
codex exec "What's your recommended approach for [problem]? Focus on implementation trade-offs." --context-file <file>
```

**Query Gemini (Auto default):**
```bash
gemini "Analyze from architecture and security standpoints: [problem]. Context: $(cat <file>)"
```

Optional explicit pinning for hard cases:
```bash
gemini -m pro "Analyze from architecture and security standpoints: [problem]. Context: $(cat <file>)"
```

### 3. Synthesize
- Compare all AI responses
- Identify agreements (high confidence)
- Identify disagreements (needs deeper analysis)
- Ask follow-ups if needed

### 4. Report Consensus

## Output Format

```markdown
## Multi-AI Consensus Report

### Problem Statement
[Description]

### AI Perspectives

**Claude:** [Your analysis]
**Codex:** [Summary]
**Gemini:** [Summary]

### Agreement
- [Point 1]
- [Point 2]

### Discussion Points
| Topic | Claude | Codex | Gemini |
|-------|--------|-------|--------|

### Recommendation
[Final synthesized recommendation]

### Next Steps
1. [Action 1]
2. [Action 2]
```

## Examples

### Architecture Decision (use top-tier models only when needed)
```bash
# Get Codex's view (gpt-5.2-codex default for complex tasks)
codex exec "Should we use Redux or Context API? $(cat src/App.tsx | head -50)"

# Get Gemini's view (Auto first)
gemini --include-directories ./src "Recommend Redux vs Context API with rationale"
```

### Code Review (general defaults)
```bash
codex exec --model gpt-5-codex-mini "Review for bugs and improvements" --context-file src/utils.ts
gemini "Security and performance review: $(cat src/utils.ts)"
```

### Bug Investigation
```bash
codex exec "What could cause this error? $(cat error.log | tail -30)"
gemini "Analyze potential root causes: $(cat error.log | tail -30)"
```

### Deep Reasoning (pin only if necessary)
```bash
# Prefer auto first; pin to pro only when depth is required
gemini -m pro "Design an optimal solution for [complex problem]"
```

## Guidelines

- Summarize and synthesize, do not copy verbatim.
- Give equal weight to well-reasoned arguments.
- Acknowledge uncertainty when consensus is not possible.
- 2-3 rounds of discussion are usually sufficient.
- Never send sensitive data (credentials, secrets) to external AIs.
- Response times may vary (30+ seconds for complex queries).
