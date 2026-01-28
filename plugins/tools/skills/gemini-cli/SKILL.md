---
name: gemini-cli
description: Query Google Gemini AI via Gemini CLI. Use when user says "ask Gemini", needs large-scale codebase analysis, security vulnerability analysis, architecture review, or wants a second opinion on complex problems.
---

# Gemini CLI

## Instructions

Collaborate with Google Gemini AI using the Gemini CLI. Gemini excels at large-scale context analysis, comprehensive codebase reviews, deep reasoning, and security analysis.

### Basic Query
```bash
gemini "<question>"
```

### Model Selection

| Model | Use Case | Speed |
|-------|----------|-------|
| `gemini-3-pro` | Complex reasoning, planning | Slower |
| `gemini-3-flash` | General coding tasks (default) | Fast |
| `gemini-2.5-deep-think` | Deep reasoning, math, science | Slowest |
| `gemini-2.5-pro` | Large context analysis (1M tokens) | Medium |
| `gemini-2.5-flash` | Quick tasks, high throughput | Fast |
| `gemini-2.5-flash-lite` | Simple tasks, lowest cost | Fastest |

**Model Selection Guidelines:**
- **Planning/Problem-solving**: Use `gemini-3-pro` or `gemini-2.5-deep-think`
- **General tasks**: Use `gemini-3-flash` (default)
- **Large codebase**: Use `gemini-2.5-pro` (1M token context)

```bash
# Complex analysis
gemini -m gemini-3-pro "<complex architecture question>"

# Deep reasoning (iterative design, research)
gemini -m gemini-2.5-deep-think "<deep reasoning question>"

# Quick general query (default)
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
- `-m, --model`: Select model (gemini-3-pro, gemini-3-flash, gemini-2.5-deep-think, etc.)
- `-i, --interactive`: Interactive mode for multi-turn conversations
- `--include-directories`: Directories to include in analysis context
- `--approval-mode yolo`: Auto-approve file modifications (use with caution)

### Response Handling
1. Do not relay Gemini's response verbatim - summarize key points
2. Compare with Claude's analysis and provide synthesized insights
3. When opinions differ, explain both perspectives

### Important Notes
- Consider API rate limits - call only when necessary
- Response time may be long (30+ seconds for complex analysis)
- Never send sensitive information (API keys, passwords, secrets)
- Gemini has a large context window - leverage it for comprehensive analysis

## Examples

### Security Review
```bash
gemini -m gemini-3-pro "Analyze security vulnerabilities in this code: $(cat src/auth.ts)"
```

### Performance Optimization
```bash
gemini "How can I improve the time complexity of this algorithm? $(cat src/utils/sort.ts)"
```

### Architecture Review
```bash
gemini --include-directories ./src "Analyze the architecture patterns and suggest improvements for this project"
```

### Research with Web Search
```bash
gemini --web-search "What are the latest best practices for React Server Components?"
```
