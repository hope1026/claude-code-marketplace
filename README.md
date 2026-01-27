# Claude Code Marketplace

A plugin marketplace for Claude Code. Add this marketplace to your projects and install plugins to extend Claude Code's capabilities.

## Adding the Marketplace

### From GitHub

```shell
/plugin marketplace add hope1026/claude-code-marketplace
```

### From Git URL

```shell
/plugin marketplace add https://github.com/hope1026/claude-code-marketplace.git
```

### From Local Path

```shell
/plugin marketplace add ./path/to/claude-code-marketplace
```

## Installing Plugins

After adding the marketplace, install plugins:

```shell
# Install tools plugin
/plugin install tools@hanbyeol-plugins

# Install claude-status plugin
/plugin install claude-status@hanbyeol-plugins

# Install roblox-tools plugin
/plugin install roblox-tools@hanbyeol-plugins

# Install unity-tools plugin
/plugin install unity-tools@hanbyeol-plugins

# Install unity-package-tools plugin
/plugin install unity-package-tools@hanbyeol-plugins
```

Or use the interactive UI:

```shell
/plugin
```

Then select plugins from the **Discover** tab.

---

## Available Plugins

### tools

Development tools for creating Claude Code extensions including skills, agents, hooks, and AI collaboration workflows.

#### Skills

| Skill | Description | Usage |
|-------|-------------|-------|
| `skill-creator` | Guide for creating Claude Code skills | `/tools:skill-creator` |
| `agent-creator` | Guide for creating Claude Code agents | `/tools:agent-creator` |
| `hooks-creator` | Guide for creating Claude Code hooks | `/tools:hooks-creator` |
| `plugin-creator` | Guide for creating Claude Code plugins | `/tools:plugin-creator` |
| `ai-council` | Multi-AI collaboration (Claude, Codex, Gemini) | `/tools:ai-council` |
| `codex-cli` | OpenAI Codex CLI integration | `/tools:codex-cli` |
| `gemini-cli` | Google Gemini CLI integration | `/tools:gemini-cli` |

**Install:**
```shell
/plugin install tools@hanbyeol-plugins
```

---

### claude-status

Real-time status bar plugin that displays useful information during your Claude Code session. Automatically activates after installation.

**Displayed Information:**
- **Model** - Current model (Opus, Sonnet, Haiku)
- **Context** - Token usage with progress bar
- **Cost** - Session cost (USD)
- **5h Session Limit** - 5-hour session usage and reset time
- **7d Usage** - 7-day usage statistics
- **Tools** - Currently running and completed tools
- **Agent** - Running subagent information
- **Todos** - Current tasks and progress
- **Cache Hit** - Cache hit rate

**Install:**
```shell
/plugin install claude-status@hanbyeol-plugins
```

---

### roblox-tools

Development tools for Roblox MCP servers and Studio plugin creation. Includes Luau scripting patterns, Studio integration, and Rojo workflows.

#### Agents

| Agent | Description | Model |
|-------|-------------|-------|
| `roblox-mcp-engineer` | MCP server (TypeScript) development. Handles mcp-server/ code, tool implementation, HTTP Bridge, and type conversion. Use for "MCP server", "TypeScript", or "tool implementation" requests. | Sonnet |
| `roblox-plugin-engineer` | Roblox Studio plugin (Luau) development. Handles plugin/ code, CommandHandler implementation, SSE client, and type conversion. Use for "plugin", "Luau", or "handler implementation" requests. | Sonnet |

**Install:**
```shell
/plugin install roblox-tools@hanbyeol-plugins
```

---

### unity-tools

General Unity development tools for C# scripting, prefab management, scene workflows, and debugging.

#### Agents

| Agent | Description | Model |
|-------|-------------|-------|
| `unity-engineer` | Unity package development engineer for implementing C# code following strict coding conventions. Use for Runtime/Editor code, creating providers, implementing features, or fixing bugs. | Opus |
| `unity-code-reviewer` | Unity C# code reviewer that validates code against project conventions, naming rules, folder structure, and best practices. Use after code changes to ensure compliance. | Sonnet |

**Install:**
```shell
/plugin install unity-tools@hanbyeol-plugins
```

---

### unity-package-tools

Development tools for Unity package creation, UPM workflows, Asset Store submission, and Editor scripting.

#### Skills

| Skill | Description | Usage |
|-------|-------------|-------|
| `unity-package-development` | Guide for Unity package development and maintenance. Use for UPM packages, package.json manifests, versioning, documentation, testing, publishing (including Asset Store), and distribution. | `/unity-package-tools:unity-package-development` |

#### Agents

| Agent | Description | Model |
|-------|-------------|-------|
| `unity-package-publisher` | Unity package publishing assistant for documentation, changelogs, and release preparation. Use when preparing packages for UPM or Asset Store distribution. | Sonnet |
| `unity-package-reviewer` | Unity package validation and compliance checker. Verifies structure, versioning, documentation, marketing assets, and guideline compliance for UPM or Asset Store submission. | Sonnet |

**Install:**
```shell
/plugin install unity-package-tools@hanbyeol-plugins
```

---

## Directory Structure

```
claude-code-marketplace/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace manifest
├── plugins/
│   ├── tools/                    # tools plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── skills/
│   │       ├── skill-creator/
│   │       ├── agent-creator/
│   │       ├── hooks-creator/
│   │       ├── plugin-creator/
│   │       ├── ai-council/
│   │       ├── codex-cli/
│   │       └── gemini-cli/
│   ├── claude-status/            # claude-status plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── src/                  # TypeScript source
│   │   └── out/                  # Build output
│   ├── roblox-tools/             # roblox-tools plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── agents/
│   │       ├── roblox-mcp-engineer.md
│   │       └── roblox-plugin-engineer.md
│   ├── unity-tools/              # unity-tools plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── agents/
│   │   │   ├── unity-engineer.md
│   │   │   └── unity-code-reviewer.md
│   │   └── rules/
│   │       ├── unity-conventions.md
│   │       └── unity-uitoolkit-style.md
│   └── unity-package-tools/      # unity-package-tools plugin
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── skills/
│       │   └── unity-package-development/
│       │       ├── SKILL.md
│       │       └── references/
│       └── agents/
│           ├── unity-package-publisher.md
│           └── unity-package-reviewer.md
└── README.md
```

## Creating Your Own Plugin

1. Create a new plugin folder in `plugins/`
2. Add `.claude-plugin/plugin.json` manifest
3. Place skills in `skills/` folder, agents in `agents/` folder
4. Register the plugin in `.claude-plugin/marketplace.json`

### Plugin Manifest Example

```json
{
  "name": "my-plugin",
  "description": "My awesome plugin",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

### Registering Plugin in Marketplace

Add to the `plugins` array in `.claude-plugin/marketplace.json`:

```json
{
  "name": "my-plugin",
  "source": "./plugins/my-plugin",
  "description": "My awesome plugin description"
}
```

## References

- [Discover and Install Plugins](https://code.claude.com/docs/en/discover-plugins)
- [Create Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Plugin Reference](https://code.claude.com/docs/en/plugins-reference)

## License

MIT License
