---
name: gemini-cli
description: Query Google Gemini AI via Gemini CLI. Use when user says "ask Gemini", needs large-scale codebase analysis, security vulnerability analysis, architecture review, or wants a second opinion on complex problems.
---

# Gemini CLI

## Instructions

Collaborate with Google Gemini AI using the Gemini CLI. Gemini is strong at large-context analysis, codebase review, deep reasoning, and security analysis.

### Basic Query (Auto default)
```bash
gemini "<question>"
# or explicit auto alias
gemini -m auto "<question>"
```

### Model Selection (verified from local Gemini CLI v0.28.0)

Prefer `Auto` unless there is a clear reason to pin a model.

| Model Input | Meaning | Recommendation |
|-------------|---------|----------------|
| `auto` (or omit `-m`) | Auto routing (`auto-gemini-*`) | **Default** |
| `pro` | Pro model family | Planning/architecture/deep analysis |
| `flash` | Fast model family | General coding tasks |
| `flash-lite` | Lowest-cost lightweight family | Simple tasks |

Concrete model IDs present in this CLI build:
- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-3-pro-preview`
- `gemini-3-flash-preview`

Important:
- Actual runtime availability depends on auth/account/quota/preview access.
- If an explicit model fails, retry with `Auto`.

### Quick Availability Check (requires Gemini auth)
```bash
# Auto path (recommended)
gemini -m auto -p "Reply with OK"

# Optional explicit probes
gemini -m pro -p "Reply with OK"
gemini -m flash -p "Reply with OK"
```

### Selection Guidelines
- Planning/problem-solving: `gemini -m pro` (or keep `auto` first)
- General tasks: `auto` (or `flash` for speed-sensitive tasks)
- Large codebase: `auto` first, then `pro` if needed

```bash
# Complex analysis (pinned)
gemini -m pro "<complex architecture question>"

# Quick general query (default auto)
gemini "<general question>"
```

### Query with Code File
```bash
cat <filepath> | gemini "<analyze this code>"
```

### Include Multiple Directories
```bash
gemini --include-directories ./src,./lib "<analyze project structure>"
```

### Enable Web Search
```bash
gemini --web-search "<latest library trends>"
```

### Key Options
- `-m, --model`: Select model or alias (`auto`, `pro`, `flash`, `flash-lite`)
- `-i, --interactive`: Interactive mode for multi-turn conversations
- `--include-directories`: Directories to include in analysis context
- `--approval-mode yolo`: Auto-approve file modifications (use with caution)

### Response Handling
1. Do not relay Gemini's response verbatim - summarize key points.
2. Compare with Claude's analysis and provide synthesized insights.
3. When opinions differ, explain both perspectives.

### Important Notes
- Consider API rate limits - call only when necessary.
- Response time may be long (30+ seconds for complex analysis).
- Never send sensitive information (API keys, passwords, secrets).
- Gemini has a large context window - leverage it for comprehensive analysis.

## Examples

### Security Review
```bash
gemini -m pro "Analyze security vulnerabilities in this code: $(cat src/auth.ts)"
```

### Performance Optimization
```bash
gemini "How can I improve the time complexity of this algorithm? $(cat src/utils/sort.ts)"
```

### Architecture Review
```bash
gemini --include-directories ./src "Analyze architecture patterns and suggest improvements for this project"
```

### Research with Web Search
```bash
gemini --web-search "What are the latest best practices for React Server Components?"
```
