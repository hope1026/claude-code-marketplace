---
name: roblox-mcp-dev-guide
description: Guide for implementing and extending the Roblox MCP server (mcp-server/). Trigger when requests involve MCP tools/actions, dispatcher mapping, HTTP bridge behavior, sync indexing, type conversion, or server build/test workflows.
---

# Roblox MCP Dev Guide

## Use This Skill When
- User asks to add or modify MCP tools/actions in `mcp-server/`.
- User asks about `tool-dispatcher.ts`, quota/tier wiring, or consolidated tool definitions.
- HTTP bridge command flow or sync index behavior is involved.
- TypeScript server-side implementation, refactor, bugfix, or validation is requested.

## Do Not Use This Skill For
- Plugin-only Luau implementation with no server changes.
- Documentation-only sync work with no source changes (use `roblox-docs-sync-guide`).

## Working Scope
- Primary: `mcp-server/`
- Required cross-check when tool surface changes: `plugin/`, `deploy/`, `CLAUDE.md`

## Execution Workflow
1. Confirm scope and expected behavior.
- Identify target tool/action, expected result, and Basic/Pro impact.
2. Read code before editing.
- `mcp-server/src/tools/consolidated/*.ts`
- `mcp-server/src/utils/tool-dispatcher.ts`
- `mcp-server/src/utils/quota-checker.ts`
- `mcp-server/src/http-bridge.ts`
- Relevant tests under `mcp-server/src/**/__tests__` and `mcp-server/src/e2e`
3. Implement with existing patterns.
- Keep strict type safety and naming conventions.
- Avoid parameter polymorphism; split into explicit actions/tools when input modes differ.
4. Sync cross-repo contracts when tool/action changes.
- Update plugin handlers, tier maps, and docs references.
5. Validate.
- Run `cd mcp-server && npm run build`.
- Run targeted tests for changed behavior when available.
6. Report.
- Summarize changed files, behavior impact, validation, and residual risks.

## Required Cross-Repo Updates (Tool/Action Change)
- `mcp-server/src/tools/consolidated/<tool>.ts`: add action and parameter schema
- `mcp-server/src/utils/tool-dispatcher.ts`: add `DISPATCH_MAP` entry
- `mcp-server/src/utils/quota-checker.ts`: add to `PRO_TOOLS` if Pro
- `plugin/src/CommandHandlers/{Core,Pro}/*.luau`: implement handler
- `plugin/src/CommandHandlers/init.luau`: register handler and `PRO_ACTIONS`
- `plugin/src/ToolTiers.luau`: assign Basic/Pro tier
- `deploy/hope1026-roblox-mcp/plugins/weppy-roblox-mcp/skills/roblox-game-dev/references/mcp-tools.md`: sync tool reference
- `CLAUDE.md`: update tool count/category table when total changes

## Architecture Rules
### Command Flow
`AI Agent -> MCP (JSON-RPC) -> HTTP Bridge -> Roblox Plugin (HTTP polling)`

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

## Sync Module Rules (Critical)
### Full Sync Lifecycle
- Must follow `handleInitStart -> handleInitChunk (repeat) -> handleInitComplete`.
- Create `tmpIndex/tmpWriter` once at `start` and share across all chunks.
- Never recreate temp index per chunk.

### Index Merge Guarantees
- On `complete`, merge temp hash data into main index.
- Clear old hashes before full replacement (`clearAllHashes`).
- Convert temp root paths to explorer root during merge (`path.relative` + `path.resolve`).

### Hash Consistency
- `studioHash`: last content received from Studio.
- `fileHash`: last content written to disk.
- After Studio->File writes, update both hashes together.

## Constraints
- Keep total MCP tools under 100; prefer adding `action` to consolidated tools.
- Use `@modelcontextprotocol/sdk` and existing Express patterns.
- Target ES2022 with Node16 module settings.

## Validation Checklist
- [ ] Server behavior implemented and type-safe
- [ ] Dispatch and quota/tier mappings updated
- [ ] Plugin side updated when required
- [ ] Docs/tool-count sync completed when required
- [ ] `npm run build` passed
- [ ] Tests run or explicitly noted if skipped

## Output Contract
When using this skill, return:
- Scope handled
- Files changed
- Validation commands and outcomes
- Open risks or follow-up items
