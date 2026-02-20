---
name: roblox-docs-sync-guide
description: Guide for keeping Roblox MCP documentation in sync with code changes. Trigger when tools/actions/tiers/counts change and multilingual docs, tool references, or release docs must be updated consistently.
---

# Roblox Docs Sync Guide

## Use This Skill When
- Tool/action definitions changed in `mcp-server/`.
- Basic/Pro classification changed in plugin handler or tier files.
- Tool counts/categories changed and docs may be stale.
- Release documentation must stay aligned across supported languages.

## Do Not Use This Skill For
- Feature implementation with no documentation impact.
- Isolated copy edits unrelated to tool/action/tier truth.

## Supported Languages
- `en`: `README.md` (root)
- `ko`: `docs/ko/README.md`
- `ja`: `docs/ja/README.md`
- `es`: `docs/es/README.md`
- `pt-br`: `docs/pt-br/README.md`
- `id`: `docs/id/README.md`

## Source of Truth (Read First)
### MCP server side
- `mcp-server/src/tools/consolidated/*.ts`
- `mcp-server/src/utils/tool-dispatcher.ts`
- `mcp-server/src/utils/quota-checker.ts`

### Plugin side
- `plugin/src/CommandHandlers/init.luau`
- `plugin/src/ToolTiers.luau`

## Documentation Targets
### Tool overview (all languages)
- `deploy/publish/hope1026-roblox-mcp/docs/en/tools/overview.md`
- `deploy/publish/hope1026-roblox-mcp/docs/ko/tools/overview.md`
- `deploy/publish/hope1026-roblox-mcp/docs/ja/tools/overview.md`
- `deploy/publish/hope1026-roblox-mcp/docs/es/tools/overview.md`
- `deploy/publish/hope1026-roblox-mcp/docs/pt-br/tools/overview.md`
- `deploy/publish/hope1026-roblox-mcp/docs/id/tools/overview.md`

### Skill tool reference
- `deploy/publish/hope1026-roblox-mcp/plugins/weppy-roblox-mcp/skills/roblox-game-dev/references/mcp-tools.md`

### Upgrade guide (when counts/tier value changes)
- `deploy/publish/hope1026-roblox-mcp/docs/*/pro-upgrade.md`

### Global project docs (when tool totals/categories change)
- `CLAUDE.md`

## Execution Workflow
1. Read source-of-truth files.
- Never infer tool list from memory.
2. Build a change matrix.
- Added tools/actions
- Removed tools/actions
- Renamed tools/actions
- Basic/Pro reclassification
- Description/category changes
3. Update all affected docs.
- Keep table format, ordering, and style consistent.
- Apply changes across all supported language variants where required.
4. Validate consistency.
- Check counts, categories, and Basic/Pro tags across all updated files.
- Ensure each tool appears once per reference surface.
5. Report summary.
- Include totals and per-category impact.

## Language Selector Rule
All README language selectors must stay consistent.
- Active language entry should be bold, not linked.
- Cross-links must remain valid and relative-path correct.

## Verification Checklist
- [ ] All changed tools/actions reflected in docs
- [ ] No removed tools remain in docs
- [ ] No duplicates introduced
- [ ] Basic/Pro classification matches source files
- [ ] Tool counts/categories synchronized (including `CLAUDE.md` when needed)
- [ ] Language selector format preserved

## Output Contract
When using this skill, return:
- Number of tools/actions added, removed, reclassified
- Affected categories
- Files updated
- Verification results and any unresolved discrepancies

## Important Constraints
- Keep total MCP tools under 100 and ensure docs do not imply otherwise.
- Preserve existing language quality; do not rewrite unrelated translated text.
- If a translation cannot be confidently updated, keep structure intact and call out the gap explicitly.
