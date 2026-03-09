---
name: roblox-mcp-dev-guide
description: Guide for implementing and extending the Roblox MCP server (mcp-server/). Trigger when requests involve MCP tools/actions, dispatcher mapping, HTTP bridge behavior, sync indexing, type conversion, or server build/test workflows.
---

# Roblox MCP Dev Guide

## Use This Skill When
- User asks to add or modify MCP tools/actions in `mcp-server/`.
- User asks about dispatcher mapping, tier wiring, or consolidated tool definitions.
- HTTP bridge command flow or sync index behavior is involved.
- TypeScript server-side implementation, refactor, bugfix, or validation is requested.

## Do Not Use This Skill For
- Plugin-only Luau implementation with no server changes.
- Documentation-only sync work with no source changes (use `roblox-docs-sync-guide`).

## Working Scope
- Primary: `mcp-server/`, `scripts/codegen/`
- SSOT: `tools.yaml` (도구/action 정의의 단일 진실 소스)
- Generated: `mcp-server/src/generated/` (dispatch-map, tier-map, route-map, category-map)
- Required cross-check when tool surface changes: `plugin/`, `deploy/`, `CLAUDE.md`

## Execution Workflow
1. Confirm scope and expected behavior.
- Identify target tool/action, expected result, and Basic/Pro impact.
2. Read code before editing.
- `tools.yaml` — SSOT for all tool/action definitions
- `mcp-server/src/tools/consolidated/*.ts` — tool schemas and definitions
- `mcp-server/src/generated/` — codegen 자동 생성 파일 (dispatch-map, tier-map, route-map, category-map)
- `mcp-server/src/utils/tool-dispatcher.ts` — generated dispatch-map import
- `mcp-server/src/utils/tier-checker.ts` — generated tier-map import
- `mcp-server/src/http-bridge.ts` — HTTP bridge (Express)
- `mcp-server/src/sync/` — file sync (LRU + watcher)
- `mcp-server/src/server.ts` — MCP stdio server
- Relevant tests under `mcp-server/src/**/__tests__/` and `mcp-server/src/e2e/`
3. Implement with existing patterns.
- Keep strict type safety and naming conventions.
- Avoid parameter polymorphism; split into explicit actions/tools when input modes differ.
4. Sync cross-repo contracts when tool/action changes.
- Update plugin handlers, tier maps, and docs references.
5. Validate.
- Run `cd mcp-server && npm run build`.
- Run targeted tests: `cd mcp-server && npm test`.
6. Report.
- Summarize changed files, behavior impact, validation, and residual risks.

## Required Cross-Repo Updates (Tool/Action Change)
- `tools.yaml`: SSOT에 action 추가 (도구, action명, tier, route, category 등)
- `npm run codegen` 실행: dispatch-map, tier-map, route-map, category-map (TypeScript) + ProActions.generated.luau 자동 생성
- `mcp-server/src/tools/consolidated/<tool>.ts`: add action and parameter schema (필요 시)
- `plugin/src/CommandHandlers/{Core,Pro}/*.luau`: implement handler
- `plugin/src/CommandHandlers/init.luau`: HANDLER_REGISTRY에 핸들러 등록
- `deploy/publish/hope1026-roblox-mcp/plugins/weppy-roblox-mcp/skills/roblox-game-dev/references/mcp-tools.md`: sync tool reference
- `CLAUDE.md`: update tool count/category table when total changes

## Architecture Rules
### Command Flow
`AI Agent -> MCP (JSON-RPC stdio) -> HTTP Bridge (Express) -> Roblox Plugin (HTTP polling)`

### Key Dependencies
- `@modelcontextprotocol/sdk` — MCP protocol SDK
- `express` — HTTP server
- `chokidar` — File watching
- `lru-cache` — LRU cache

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
- Target Node.js 18+ (see `mcp-server/package.json` `engines` field).
- Build with `npm run build` and production bundle with `npm run build:prod`.
- File paths: use `path.join()` / `path.resolve()` and avoid hardcoded separators.
- Keep scripts shell-safe across macOS/Linux and avoid OS-specific assumptions.

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

## Constants and Enums
- Repeated string literals used as enums or option values must be defined as named constants.
- In TypeScript: use `const` objects with string-literal union types (or enums where appropriate).
- Co-locate constants near usage: define them in the package/file where they are primarily used, not in a global constants file.
  - Example: popup position constants belong in the module that handles popup logic, not in a shared `constants.ts`.
- When a constant is shared across multiple modules, place it in the lowest common ancestor directory.
- Never scatter the same magic string across multiple files; extract it once and reference everywhere.

## Constraints
- Keep total MCP tools under 100; prefer adding `action` to consolidated tools.
- Use `@modelcontextprotocol/sdk` and existing Express patterns.
- Target Node.js 18+ with TypeScript ESM output.

## Validation Checklist
- [ ] Server behavior implemented and type-safe
- [ ] `tools.yaml` updated and `npm run codegen` run
- [ ] Dispatch and tier mappings generated
- [ ] Plugin side updated when required
- [ ] Docs/tool-count sync completed when required
- [ ] `npm run build` passed
- [ ] `npm test` run or explicitly noted if skipped

## Output Contract
When using this skill, return:
- Scope handled
- Files changed
- Validation commands and outcomes
- Open risks or follow-up items
