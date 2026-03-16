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
- Server-only TypeScript work with no plugin changes.
- Docs-only synchronization with no code changes (use `roblox-docs-sync-guide`).

## Working Scope
- Primary: `plugin/`
- Required cross-check when handler contracts change: `mcp-server/`, `deploy/`, `CLAUDE.md`

## Execution Workflow
1. Confirm scope and affected command contract.
- Identify handler name/action, expected output, and tier impact.
2. Read code before editing.
- `tools.yaml` — SSOT for all tool/action definitions
- `plugin/src/CommandHandlers/init.luau` — HANDLER_REGISTRY (handler registry)
- `plugin/src/Generated/ProActions.generated.luau` — auto-generated list of Pro actions
- `plugin/src/CommandHandlers/{Core,Pro}/*.luau`
- `plugin/src/Utils/TypeConverter.luau`
- `plugin/src/Utils/PathResolver.luau`
- `plugin/src/Utils/StringDecoder.luau`
- `plugin/src/PollingClient.luau`
- `plugin/src/Localization/`
- `plugin/scripts/deploy/build-plugin.sh`
- `plugin/scripts/obfuscate/string-inventory.json`
- `plugin/scripts/obfuscate/encrypt-strings.mjs`
- `plugin/scripts/obfuscate/verify-obfuscation.mjs`
3. Implement with existing Luau patterns.
- Keep deterministic handler output shape.
- Avoid polymorphic optional parameters for different input modes; use explicit actions.
- Use robust `pcall` error handling.
- Ensure all user-visible UI text is localized through `plugin/src/Localization/` keys.
- If localization is not required, default handler/protocol strings to English.
- For disabled interactive UI (button/toggle/menu), handle input attempts by showing the user what action is required; if no action is available, explain why it is disabled.
4. Sync cross-repo contracts when handler/action changes.
- Update MCP dispatcher/tier mapping and docs references.
5. Validate.
- Run `cd plugin && rojo serve` for integration checks.
- Build package when needed: `cd plugin && ./scripts/deploy/build-plugin.sh`
- Use `cd plugin && ./scripts/deploy/build-plugin.sh --deploy-local` for local Studio deployment.
6. Report.
- Summarize changed files, behavior impact, validation, and residual risks.

## Build and Obfuscation Rules
- Production plugin artifacts must be built through `plugin/scripts/deploy/build-plugin.sh`, not direct `rojo build`.
- Treat `.build-src/` as the only mutable build workspace. Do not modify tracked source files just to inject build-only values.
- Production builds run two protection steps before `rojo build`:
  - `plugin/scripts/obfuscate/encrypt-strings.mjs`
  - `darklua process` with `plugin/.darklua.prod.json`
- Sensitive string inventory is managed in `plugin/scripts/obfuscate/string-inventory.json`.
- Runtime decode support for encrypted strings lives in `plugin/src/Utils/StringDecoder.luau`.
- Local deploy mode (`--deploy-local`) is debug-friendly:
  - skip string encryption
  - run `darklua` when available
  - continue with a warning when `darklua` is not installed
- Production builds require `darklua` and `node` to be available.
- When adding new sensitive endpoints, hostnames, IPs, or external URLs in plugin code:
  - update `string-inventory.json`
  - ensure the target file can safely require `StringDecoder`
  - rerun the production build and obfuscation verification

## Required Cross-Repo Updates (Handler/Action Change)
- `tool-codegen/tools.yaml`: add the action to the SSOT manifest (tool, action name, tier, route, handler, paramAliases, etc.)
- `cd mcp-server && npm run codegen`: regenerate these four generated files
  - `mcp-server/src/generated/dispatch-map.generated.ts`
  - `mcp-server/src/generated/tier-map.generated.ts`
  - `mcp-server/src/generated/route-map.generated.ts`
  - `plugin/src/Generated/ProActions.generated.luau`
- `plugin/src/CommandHandlers/{Core,Pro}/*.luau`: implement handler
- `plugin/src/CommandHandlers/init.luau`: register the handler in `HANDLER_REGISTRY` (`PRO_ACTIONS` is imported from Generated automatically)
- `mcp-server/src/tools/consolidated/<tool>.ts`: add action and parameter schema when needed
- `cd mcp-server && npm run codegen:check` or `./tool-codegen/verify-sync.sh`: verify generated-file drift
- `CLAUDE.md`: update if the tool surface or codegen workflow description changes

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
- If a string is not part of localized UI, use English as the default language for handler errors and protocol-facing messages.
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
- For release-quality plugin builds, do not bypass the obfuscation pipeline with a direct `rojo build`.

## Validation Checklist
- [ ] Handler implemented with consistent success/error shape
- [ ] Handler registered in HANDLER_REGISTRY (PRO_ACTIONS auto-generated via codegen)
- [ ] `tools.yaml` updated and `npm run codegen` run when action added/changed
- [ ] Run `npm run codegen:check` or `./tool-codegen/verify-sync.sh` when drift verification is needed
- [ ] Docs/tool-count sync completed when required
- [ ] User-visible UI text is fully localized via `plugin/src/Localization/`
- [ ] Disabled interaction input returns guidance or explicit disabled reason
- [ ] Runtime/build validation performed or explicitly noted if skipped
- [ ] If new sensitive plugin strings were added, `plugin/scripts/obfuscate/string-inventory.json` was updated
- [ ] Production build validation used `./scripts/deploy/build-plugin.sh`
- [ ] Obfuscation verification passed (`verify-obfuscation.mjs` or equivalent build output)

## Output Contract
When using this skill, return:
- Scope handled
- Files changed
- Validation commands and outcomes
- Open risks or follow-up items
