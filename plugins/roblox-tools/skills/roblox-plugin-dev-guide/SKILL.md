---
name: roblox-plugin-dev-guide
description: Guide for implementing and extending the Roblox Studio plugin (plugin/). Trigger when requests involve CommandHandlers, routing/registration, polling flow, type/path conversion, Basic/Pro policy, or plugin-side validation.
---

# Roblox Plugin Dev Guide

## Use This Skill When
- User asks to add or modify plugin behavior in `plugin/`.
- Command handler implementation or registration is required.
- Polling client, command routing, path resolution, or type conversion is involved.
- Basic/Pro gating, stub behavior, or plugin-side integration needs updates.

## Do Not Use This Skill For
- Server-only Go work with no plugin changes.
- Docs-only synchronization with no code changes (use `roblox-docs-sync-guide`).

## Working Scope
- Primary: `plugin/`
- Required cross-check when handler contracts change: `mcp-server/`, `deploy/`, `CLAUDE.md`

## Execution Workflow
1. Confirm scope and affected command contract.
- Identify handler name/action, expected output, and tier impact.
2. Read code before editing.
- `plugin/src/CommandHandlers/init.luau`
- `plugin/src/CommandHandlers/{Core,Pro}/*.luau`
- `plugin/src/Utils/TypeConverter.luau`
- `plugin/src/Utils/PathResolver.luau`
- `plugin/src/PollingClient.luau`
- `plugin/src/Localization/`
3. Implement with existing Luau patterns.
- Keep deterministic handler output shape.
- Avoid polymorphic optional parameters for different input modes; use explicit actions.
- Use robust `pcall` error handling.
- Ensure all user-visible UI text is localized through `plugin/src/Localization/` keys.
- For disabled interactive UI (button/toggle/menu), handle input attempts by showing the user what action is required; if no action is available, explain why it is disabled.
4. Sync cross-repo contracts when handler/action changes.
- Update MCP dispatcher/tier mapping and docs references.
5. Validate.
- Run `cd plugin && rojo serve` for integration checks.
- Build package when needed: `cd plugin && rojo build -o build/WeppyRobloxMCP.rbxm`.
6. Report.
- Summarize changed files, behavior impact, validation, and residual risks.

## Required Cross-Repo Updates (Handler/Action Change)
- `plugin/src/CommandHandlers/{Core,Pro}/*.luau`: implement handler
- `plugin/src/CommandHandlers/init.luau`: register handler and `PRO_ACTIONS`
- `mcp-server/internal/tools/<tool>.go`: add action and parameter schema
- `mcp-server/internal/dispatcher/dispatcher.go`: add `dispatchMap` entry
- `mcp-server/internal/tier/checker.go`: add to `proActions` if Pro
- `CLAUDE.md`: update tool count/category table when total changes

## API and Safety Rules
- Consult official Roblox API docs for new API usage:
  - `https://create.roblox.com/docs/reference/engine`
- Block forbidden paths:
  - `CoreGui`, `CorePackages`, `RobloxScript`, `RobloxScriptSecurity`
- Escape/validate user input used in scripts or path lookups.
- Return structured responses for every handler call.

## UI Localization and Disabled Interaction Rules
- Localize every user-visible string in plugin UI.
- Never hardcode visible strings in UI components when a localization key can be used.
- Add new keys to `plugin/src/Localization/en.luau` first, then propagate to other language files.
- Disabled UI must not fail silently on input.
- If a disabled control receives click/input, provide user guidance for the required next step.
- If no next step exists, explicitly explain the disabled reason in UI feedback.

## Sync Module Rules (Critical)
### Full Sync Protocol
- Plugin sends `/sync/init` with phases: `start -> chunk (repeat) -> complete`.
- Chunk payload may include tree only on first chunk.
- Yield between chunks (`task.wait()`) to avoid Studio freeze.
- Empty Lua table encoding edge case is expected; server-side normalization must remain compatible.

### Reverse Sync
- Sequence must be: `pauseTracking -> apply changes -> update hashes -> resumeTracking`.
- Update applied instance hashes to prevent echo loops.

## Constants and Enums
- Repeated string literals used as enums, option values, or configuration keys must be defined as named constants in a dedicated `Constants.luau` (or `Enums.luau`) module.
- Co-locate constants near usage: place the constants file in the feature folder where they are primarily used, not in a single global constants file.
  - Example: `plugin/src/UI/MainWidget/Tabs/MCPTab/Constants.luau` for popup positions, not `plugin/src/Constants.luau`.
- Luau constant pattern:
  ```lua
  -- Constants.luau
  local Constants = {}
  Constants.PopupPosition = {
      TopLeft = "TopLeft",
      TopRight = "TopRight",
      BottomLeft = "BottomLeft",
      BottomRight = "BottomRight",
  }
  Constants.PopupPosition.ALL = {"TopLeft", "TopRight", "BottomLeft", "BottomRight"}
  Constants.PopupPosition.DEFAULT = Constants.PopupPosition.TopRight
  return Constants
  ```
- When a constant is shared across multiple feature folders, place it in the lowest common ancestor directory.
- Never scatter the same magic string across multiple files; extract it once and reference everywhere.
- Use `table.freeze()` on constant tables to prevent accidental mutation.

## Constraints
- Keep total MCP tools under 100; prefer action expansion over top-level tool growth.
- Use `HttpService:RequestAsync` for polling requests.
- Use `HttpService:JSONEncode/JSONDecode` for payload handling.
- Follow existing Luau style and existing plugin patterns.

## Validation Checklist
- [ ] Handler implemented with consistent success/error shape
- [ ] Handler registry and `PRO_ACTIONS` updated
- [ ] MCP dispatcher/tier mappings updated when needed
- [ ] Docs/tool-count sync completed when required
- [ ] User-visible UI text is fully localized via `plugin/src/Localization/`
- [ ] Disabled interaction input returns guidance or explicit disabled reason
- [ ] Runtime/build validation performed or explicitly noted if skipped

## Output Contract
When using this skill, return:
- Scope handled
- Files changed
- Validation commands and outcomes
- Open risks or follow-up items
