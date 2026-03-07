# aiagent-plugins

Monorepo for AI agent distribution assets.

## Packages

- `claude-code-marketplace/`: Claude Code marketplace root with `.claude-plugin/marketplace.json`
- `codex-plugins/`: Codex skill collection rooted at `.agents/skills/`
- `ralph-package/`: independent `@weppy/ralph` package with CLI and MCP scaffold

## Notes

- Claude marketplace consumers should point at `claude-code-marketplace/`, not the monorepo root.
- Codex users should consume skills from `codex-plugins/.agents/skills/`.
