---
name: ai-council
description: Multi-AI collaboration using Codex CLI and Gemini CLI. Use when user says "AI council", "discuss among AIs", "get multiple AI opinions", "what do other AIs think", or needs diverse AI perspectives for complex decisions, architecture reviews, or problem solving.
---

# AI Council

Orchestrate discussions between multiple AI systems (Claude, Codex, Gemini) to reach well-reasoned consensus on complex problems.

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
| **Gemini** (Google) | gemini-3-pro | gemini-3-flash | Large context (1M), security review, agentic coding |

### Model Selection Guidelines
- **Planning/Architecture/Problem-solving**: Use top-tier models for best reasoning
- **General tasks/Quick queries**: Use faster models for efficiency

## Workflow

### 1. Frame the Problem
Clearly state the decision/problem and identify relevant context files.

### 2. Gather Perspectives

**Query Codex (use gpt-5.2-codex for complex decisions):**
```bash
codex exec "What's your recommended approach for [problem]? Focus on implementation trade-offs." --context-file <file>
```

**Query Gemini (use gemini-3-pro for architecture decisions):**
```bash
gemini -m gemini-3-pro "Analyze from architecture and security standpoints: [problem]. Context: $(cat <file>)"
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

### Architecture Decision (use top-tier models)
```bash
# Get Codex's view (gpt-5.2-codex default for complex tasks)
codex exec "Should we use Redux or Context API? $(cat src/App.tsx | head -50)"

# Get Gemini's view
gemini -m gemini-3-pro --include-directories ./src "Recommend Redux vs Context API with rationale"
```

### Code Review (general models fine)
```bash
codex exec --model gpt-5-codex-mini "Review for bugs and improvements" --context-file src/utils.ts
gemini -m gemini-3-flash "Security and performance review: $(cat src/utils.ts)"
```

### Bug Investigation
```bash
codex exec "What could cause this error? $(cat error.log | tail -30)"
gemini "Analyze potential root causes: $(cat error.log | tail -30)"
```

### Deep Reasoning (for complex problems)
```bash
# Use Gemini's deep thinking for iterative design or research
gemini -m gemini-2.5-deep-think "Design optimal solution for [complex problem]"
```

## Guidelines

- Summarize and synthesize, don't copy verbatim
- Give equal weight to well-reasoned arguments
- Acknowledge uncertainty when consensus isn't possible
- 2-3 rounds of discussion is usually sufficient
- Never send sensitive data (credentials, secrets) to external AIs
- Response times may vary (30+ seconds for complex queries)
