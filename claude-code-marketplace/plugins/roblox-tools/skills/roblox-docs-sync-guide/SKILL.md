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
- `en`: `deploy/publish/hope1026-roblox-mcp/README.md`
- `ko`: `deploy/publish/hope1026-roblox-mcp/docs/ko/README.md`
- `ja`: `deploy/publish/hope1026-roblox-mcp/docs/ja/README.md`
- `es`: `deploy/publish/hope1026-roblox-mcp/docs/es/README.md`
- `pt-br`: `deploy/publish/hope1026-roblox-mcp/docs/pt-br/README.md`
- `id`: `deploy/publish/hope1026-roblox-mcp/docs/id/README.md`

## Source of Truth (Read First)
### MCP server side (TypeScript)
- `mcp-server/src/tools/consolidated/*.ts` — tool schemas and definitions
- `mcp-server/src/utils/tool-dispatcher.ts` — action→plugin command mapping
- `mcp-server/src/utils/tier-checker.ts` — Pro/Basic tier gate

### Plugin side
- `plugin/src/CommandHandlers/init.luau` (PRO_ACTIONS is the source of truth for tier)

## Documentation Targets

### Main README (all languages)
- `deploy/publish/hope1026-roblox-mcp/README.md`
- `deploy/publish/hope1026-roblox-mcp/docs/ko/README.md`
- `deploy/publish/hope1026-roblox-mcp/docs/ja/README.md`
- `deploy/publish/hope1026-roblox-mcp/docs/es/README.md`
- `deploy/publish/hope1026-roblox-mcp/docs/pt-br/README.md`
- `deploy/publish/hope1026-roblox-mcp/docs/id/README.md`

### Installation guide (all languages)
- `deploy/publish/hope1026-roblox-mcp/docs/en/installation/README.md`
- `deploy/publish/hope1026-roblox-mcp/docs/ko/installation/README.md`
- `deploy/publish/hope1026-roblox-mcp/docs/ja/installation/README.md`
- `deploy/publish/hope1026-roblox-mcp/docs/es/installation/README.md`
- `deploy/publish/hope1026-roblox-mcp/docs/pt-br/installation/README.md`
- `deploy/publish/hope1026-roblox-mcp/docs/id/installation/README.md`

### Pro upgrade guide (all languages)
- `deploy/publish/hope1026-roblox-mcp/docs/en/pro-upgrade.md`
- `deploy/publish/hope1026-roblox-mcp/docs/ko/pro-upgrade.md`
- `deploy/publish/hope1026-roblox-mcp/docs/ja/pro-upgrade.md`
- `deploy/publish/hope1026-roblox-mcp/docs/es/pro-upgrade.md`
- `deploy/publish/hope1026-roblox-mcp/docs/pt-br/pro-upgrade.md`
- `deploy/publish/hope1026-roblox-mcp/docs/id/pro-upgrade.md`

### Tool overview (all languages)
- `deploy/publish/hope1026-roblox-mcp/docs/en/tools/overview.md`
- `deploy/publish/hope1026-roblox-mcp/docs/ko/tools/overview.md`
- `deploy/publish/hope1026-roblox-mcp/docs/ja/tools/overview.md`
- `deploy/publish/hope1026-roblox-mcp/docs/es/tools/overview.md`
- `deploy/publish/hope1026-roblox-mcp/docs/pt-br/tools/overview.md`
- `deploy/publish/hope1026-roblox-mcp/docs/id/tools/overview.md`

### Setup guide (all languages)
- `deploy/publish/roblox-plugin-package/weppy-roblox-mcp/SETUP-GUIDE-en.md`
- `deploy/publish/roblox-plugin-package/weppy-roblox-mcp/SETUP-GUIDE-ko.md`
- `deploy/publish/roblox-plugin-package/weppy-roblox-mcp/SETUP-GUIDE-ja.md`
- `deploy/publish/roblox-plugin-package/weppy-roblox-mcp/SETUP-GUIDE-es.md`
- `deploy/publish/roblox-plugin-package/weppy-roblox-mcp/SETUP-GUIDE-pt-br.md`
- `deploy/publish/roblox-plugin-package/weppy-roblox-mcp/SETUP-GUIDE-id.md`

### Plugin localization (all languages)
- `plugin/src/Localization/en.luau`
- `plugin/src/Localization/ko.luau`
- `plugin/src/Localization/ja.luau`
- `plugin/src/Localization/es.luau`
- `plugin/src/Localization/pt-br.luau`
- `plugin/src/Localization/id.luau`

### Gumroad product entry
- `deploy/docs/gumroad/GUMROAD-PRODUCT-ENTRY-GUIDE.md`

### Global project docs (when tool totals/categories change)
- `CLAUDE.md`
- `deploy/publish/hope1026-roblox-mcp/CHANGELOG.md`

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
- [ ] Localization keys updated for all 6 languages
- [ ] Gumroad product entry description updated if Pro features changed

## Output Contract
When using this skill, return:
- Number of tools/actions added, removed, reclassified
- Affected categories
- Files updated
- Verification results and any unresolved discrepancies

## Important Constraints
- Keep total MCP tools under 100 and ensure docs do not imply otherwise.
- Do not write tool count numbers (72, 140, 132, etc.) in any user-facing text or manifests. This includes README, marketplace.json, plugin.json, CHANGELOG, and Gumroad descriptions. Tool/action counts change frequently during development and stale numbers mislead users.
- Preserve existing language quality; do not rewrite unrelated translated text.
- If a translation cannot be confidently updated, keep structure intact and call out the gap explicitly.
