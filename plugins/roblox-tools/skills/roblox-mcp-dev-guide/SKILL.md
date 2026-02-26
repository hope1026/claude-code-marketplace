---
name: roblox-mcp-dev-guide
description: Guide for implementing and extending the Roblox MCP server (mcp-server-go/). Trigger when requests involve MCP tools/actions, dispatcher mapping, HTTP bridge behavior, sync indexing, type conversion, or server build/test workflows.
---

# Roblox MCP Dev Guide

## Use This Skill When
- User asks to add or modify MCP tools/actions in `mcp-server-go/`.
- User asks about dispatcher mapping, tier wiring, or consolidated tool definitions.
- HTTP bridge command flow or sync index behavior is involved.
- Go server-side implementation, refactor, bugfix, or validation is requested.

## Do Not Use This Skill For
- Plugin-only Luau implementation with no server changes.
- Documentation-only sync work with no source changes (use `roblox-docs-sync-guide`).

## Working Scope
- Primary: `mcp-server-go/`
- Required cross-check when tool surface changes: `plugin/`, `deploy/`, `CLAUDE.md`

## Execution Workflow
1. Confirm scope and expected behavior.
- Identify target tool/action, expected result, and Basic/Pro impact.
2. Read code before editing.
- `mcp-server-go/internal/tools/*.go` — tool schemas and definitions
- `mcp-server-go/internal/dispatcher/dispatcher.go` — action→plugin command mapping
- `mcp-server-go/internal/tier/checker.go` — Pro/Basic tier gate
- `mcp-server-go/internal/bridge/bridge.go` — HTTP bridge (gin)
- `mcp-server-go/internal/sync/` — file sync (LRU + watcher)
- `mcp-server-go/internal/server/mcp.go` — MCP stdio server
- Relevant tests under `mcp-server-go/internal/**/*_test.go` and `mcp-server-go/internal/e2e/`
3. Implement with existing patterns.
- Keep strict type safety and naming conventions.
- Avoid parameter polymorphism; split into explicit actions/tools when input modes differ.
4. Sync cross-repo contracts when tool/action changes.
- Update plugin handlers, tier maps, and docs references.
5. Validate.
- Run `cd mcp-server-go && go build ./...`.
- Run targeted tests: `cd mcp-server-go && go test ./...`.
6. Report.
- Summarize changed files, behavior impact, validation, and residual risks.

## Required Cross-Repo Updates (Tool/Action Change)
- `mcp-server-go/internal/tools/<tool>.go`: add action and parameter schema
- `mcp-server-go/internal/dispatcher/dispatcher.go`: add `dispatchMap` entry
- `mcp-server-go/internal/tier/checker.go`: add to `proActions` if Pro
- `plugin/src/CommandHandlers/{Core,Pro}/*.luau`: implement handler
- `plugin/src/CommandHandlers/init.luau`: register handler and `PRO_ACTIONS`
- `CLAUDE.md`: update tool count/category table when total changes

## Architecture Rules
### Command Flow
`AI Agent -> MCP (JSON-RPC stdio) -> HTTP Bridge (gin) -> Roblox Plugin (HTTP polling)`

### Key Dependencies
- `github.com/mark3labs/mcp-go` — MCP protocol SDK
- `github.com/gin-gonic/gin` — HTTP server
- `github.com/fsnotify/fsnotify` — File watching
- `github.com/hashicorp/golang-lru/v2` — LRU cache

### Security Defaults
- Bind to `127.0.0.1:3002` only.
- Keep rate limit at 450 requests/minute unless explicitly requested.
- Keep timeout at 30 seconds unless explicitly requested.
- Escape Lua strings (`\\`, `\"`, `\n`, `\r`, `\0`) when emitting script payloads.

### Type Conversion Expectations
- `{x, y, z}` -> `Vector3`
- `{r, g, b}` in 0-255 -> `Color3.fromRGB`
- `{r, g, b}` in 0-1 -> `Color3.new`
- 12-number array -> `CFrame`
- `{xScale, xOffset, yScale, yOffset}` -> `UDim2`
- `"Enum.*"` string -> Enum value

### Cross-Platform Build
- `CGO_ENABLED=0` — no external C dependencies
- 5 targets: `linux/amd64`, `linux/arm64`, `darwin/amd64`, `darwin/arm64`, `windows/amd64`
- File paths: use `filepath.Join()` and `filepath.ToSlash()`
- Build script: `mcp-server-go/scripts/build.sh`

## Sync Module Rules (Critical)
### Full Sync Lifecycle
- Must follow `handleInitStart -> handleInitChunk (repeat) -> handleInitComplete`.
- Create temp index/writer once at `start` and share across all chunks.
- Never recreate temp index per chunk.

### Index Merge Guarantees
- On `complete`, merge temp hash data into main index.
- Clear old hashes before full replacement.
- Convert temp root paths to explorer root during merge.

### Hash Consistency
- `studioHash`: last content received from Studio.
- `fileHash`: last content written to disk.
- After Studio->File writes, update both hashes together.

## Constraints
- Keep total MCP tools under 100; prefer adding `action` to consolidated tools.
- Use `mcp-go` SDK and existing gin patterns.
- Target Go 1.21+ with single native binary output.

## Validation Checklist
- [ ] Server behavior implemented and type-safe
- [ ] Dispatch and tier mappings updated
- [ ] Plugin side updated when required
- [ ] Docs/tool-count sync completed when required
- [ ] `go build ./...` passed
- [ ] `go test ./...` run or explicitly noted if skipped

## Output Contract
When using this skill, return:
- Scope handled
- Files changed
- Validation commands and outcomes
- Open risks or follow-up items
