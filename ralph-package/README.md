# @weppy/ralph

`@weppy/ralph` is an independent orchestrator package for fresh-context AI agent execution.

## Scope

- File-backed job state under `.ralph-cache/` by default
- Adapter-based execution for Codex and Claude Code
- Ralph-owned validation, retry, completion, and resume rules
- Shared core with both CLI and MCP access layers
- Input files and images are passed as path references for the agent to inspect directly
- Run state and placeholder logs are written before agent execution starts

## Usage

```bash
ralph start \
  --title "Implement auth flow" \
  --agent custom-command \
  --workspace /path/to/project \
  --input docs/spec.md \
  --validate-cmd "npm test" \
  --max-retries 1

ralph status --workspace /path/to/project --json
ralph resume --workspace /path/to/project --max-iterations 5 --json
ralph result --workspace /path/to/project
ralph cancel --workspace /path/to/project
```

## Adapters

- `codex`: runs `codex exec`
- `claude-code`: runs `claude -p`
- `custom-command`: runs the shell command from `RALPH_CUSTOM_AGENT_COMMAND`

`custom-command` receives these environment variables:

- `RALPH_WORKSPACE_PATH`
- `RALPH_PROMPT_PATH`
- `RALPH_OUTPUT_PATH`
- `RALPH_RUN_DIRECTORY_PATH`

The command must write a valid `result.json` payload to `RALPH_OUTPUT_PATH`.

## Specs

- [개요](./specs/00-%EA%B0%9C%EC%9A%94.md)
- [아키텍처](./specs/10-%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98.md)
- [상태와 실행](./specs/20-%EC%83%81%ED%83%9C%EC%99%80-%EC%8B%A4%ED%96%89.md)
- [인터페이스](./specs/30-%EC%9D%B8%ED%84%B0%ED%8E%98%EC%9D%B4%EC%8A%A4.md)
- [구현 계획](./specs/40-%EA%B5%AC%ED%98%84%EA%B3%84%ED%9A%8D.md)

## Scripts

- `npm run check`
- `npm run build`
- `npm test`
