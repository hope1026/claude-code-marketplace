---
name: plugin-creator
description: Guide for creating Claude Code plugins. Use when users want to create a new plugin (or update an existing plugin) that bundles skills, agents, hooks, MCP servers, or LSP servers for distribution via marketplace.
---

# Plugin Creator

This skill provides guidance for creating effective Claude Code plugins.

## Workflow

```
Phase 0: Check Official Documentation
   ↓ Fetch latest spec from official docs
Phase 1: Clarify Requirements
   ↓ Ask questions to understand plugin purpose
Phase 2: Create Plugin
   ↓ Generate plugin structure with manifest
Phase 3: Test & Verify
   ↓ Test with --plugin-dir flag
Phase 4: User Confirmation
   ↓ Report results and get approval
```

---

## Phase 0: Check Official Documentation

> **CRITICAL**: Always fetch the latest documentation before creating a plugin.

Use WebFetch to check the official Claude Code plugins documentation:

```
URLs:
- https://code.claude.com/docs/en/plugins (Plugin creation guide)
- https://code.claude.com/docs/en/plugins-reference (Complete reference)
- https://code.claude.com/docs/en/plugin-marketplaces (Marketplace distribution)
```

**What to verify:**
- Latest plugin.json schema and fields
- New features or deprecated options
- Directory structure requirements
- Component configuration (skills, agents, hooks, MCP, LSP)
- Distribution and versioning best practices

**Example WebFetch prompt:**
```
Extract the complete documentation about Claude Code plugins including:
plugin.json schema, directory structure, component configuration, and best practices.
```

After fetching, compare with the reference below and use the **latest official spec** for any discrepancies.

---

## Phase 1: Clarify Requirements

Before creating a plugin, gather necessary information. **Ask the user** if any are unclear:

| Question | Why It Matters |
|----------|----------------|
| What is the plugin's main purpose? | Defines the plugin name and description |
| What components does it need? | Determines which directories to create (skills/, agents/, hooks/) |
| Should it include skills (slash commands)? | Creates `skills/` directory |
| Should it include custom agents? | Creates `agents/` directory |
| Does it need hooks for automation? | Creates `hooks/hooks.json` |
| Does it need MCP server integrations? | Creates `.mcp.json` |
| Does it need LSP code intelligence? | Creates `.lsp.json` |
| Is this for personal use or distribution? | Affects versioning and documentation needs |

**Example questions to ask:**
- "What would you like to name this plugin?"
- "What skills/commands should this plugin provide?"
- "Do you need any automated actions (hooks) like auto-formatting or validation?"
- "Will this plugin connect to external services (MCP servers)?"

---

## Phase 2: Create Plugin

### Plugin Directory Structure

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json           # Required: plugin manifest
├── skills/                   # Optional: skill directories
│   └── skill-name/
│       └── SKILL.md
├── agents/                   # Optional: agent definitions
│   └── agent-name.md
├── hooks/                    # Optional: hook configurations
│   └── hooks.json
├── .mcp.json                 # Optional: MCP server configs
├── .lsp.json                 # Optional: LSP server configs
├── scripts/                  # Optional: utility scripts
└── README.md                 # Optional: documentation
```

> **IMPORTANT**: Only `plugin.json` goes inside `.claude-plugin/`. All other directories (skills/, agents/, hooks/) must be at the plugin root level.

### Where Plugins Can Be Used

| Method | Path | Use Case |
|--------|------|----------|
| Development | `claude --plugin-dir ./plugin` | Testing during development |
| User scope | `~/.claude/settings.json` | Personal plugins for all projects |
| Project scope | `.claude/settings.json` | Team plugins via version control |
| Marketplace | Via `/plugin install` | Distribution to community |

### plugin.json Template

```json
{
  "name": "{plugin-name}",
  "description": "{What this plugin does}",
  "version": "1.0.0",
  "author": {
    "name": "{Your Name}",
    "email": "{your@email.com}"
  },
  "homepage": "{https://docs.example.com}",
  "repository": "{https://github.com/user/plugin}",
  "license": "MIT",
  "keywords": ["{keyword1}", "{keyword2}"]
}
```

### Plugin Manifest Fields Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (kebab-case, no spaces). Becomes skill namespace |
| `version` | Recommended | Semantic version (e.g., "1.0.0") |
| `description` | Recommended | Brief explanation of plugin purpose |
| `author` | No | Object with `name`, `email`, `url` |
| `homepage` | No | Documentation URL |
| `repository` | No | Source code URL |
| `license` | No | License identifier (MIT, Apache-2.0, etc.) |
| `keywords` | No | Discovery tags for marketplace |
| `commands` | No | Additional command paths (string or array) |
| `agents` | No | Additional agent paths (string or array) |
| `skills` | No | Additional skill paths (string or array) |
| `hooks` | No | Hook config path or inline object |
| `mcpServers` | No | MCP config path or inline object |
| `lspServers` | No | LSP config path or inline object |

### Component Configuration

#### Skills (skills/)

Each skill is a directory containing `SKILL.md`:

```
skills/
└── my-skill/
    └── SKILL.md
```

Skills are invoked as `/plugin-name:skill-name`.

**SKILL.md template:**
```yaml
---
description: What this skill does. Use when...
disable-model-invocation: true
---

Instructions for Claude when this skill is active.
```

#### Agents (agents/)

Markdown files describing agent capabilities:

```markdown
---
description: What this agent specializes in
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a specialist in X.

## Workflow
1. First step
2. Second step

## Guidelines
- Important rule
```

#### Hooks (hooks/hooks.json)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format.sh"
          }
        ]
      }
    ]
  }
}
```

**Available hook events:**
- `PreToolUse` - Before tool calls
- `PostToolUse` - After tool calls
- `PostToolUseFailure` - After tool failure
- `PermissionRequest` - When permission dialog shown
- `UserPromptSubmit` - When user submits prompt
- `Notification` - When Claude sends notifications
- `Stop` - When Claude finishes responding
- `SubagentStart` / `SubagentStop` - Subagent lifecycle
- `SessionStart` / `SessionEnd` - Session lifecycle

#### MCP Servers (.mcp.json)

```json
{
  "mcpServers": {
    "my-server": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": {
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

#### LSP Servers (.lsp.json)

```json
{
  "go": {
    "command": "gopls",
    "args": ["serve"],
    "extensionToLanguage": {
      ".go": "go"
    }
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `${CLAUDE_PLUGIN_ROOT}` | Absolute path to plugin directory. Use in hooks, MCP, scripts |

---

## Phase 3: Test & Verify

After creating the plugin:

### 3.1 Test with --plugin-dir

Load your plugin for testing:

```bash
claude --plugin-dir ./my-plugin
```

Load multiple plugins:
```bash
claude --plugin-dir ./plugin-one --plugin-dir ./plugin-two
```

### 3.2 Verify Components

Check that:
- [ ] Plugin loads without errors (`claude --debug`)
- [ ] Skills appear with correct namespace (`/plugin-name:skill-name`)
- [ ] Agents appear in `/agents` list
- [ ] Hooks trigger correctly
- [ ] MCP servers start and tools appear
- [ ] LSP provides code intelligence (if applicable)

### 3.3 Validate Plugin

Run validation:

```bash
claude plugin validate ./my-plugin
```

Or in Claude Code:
```
/plugin validate ./my-plugin
```

### 3.4 Debug Issues

**Check debug output:**
```bash
claude --debug
```

**Common issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| Plugin not loading | Invalid plugin.json | Validate JSON syntax |
| Commands not appearing | Wrong directory structure | Move dirs to plugin root, not inside .claude-plugin/ |
| Hooks not firing | Script not executable | Run `chmod +x script.sh` |
| MCP server fails | Missing ${CLAUDE_PLUGIN_ROOT} | Use variable for all paths |
| Path errors | Absolute paths | Use relative paths starting with `./` |

---

## Phase 4: User Confirmation

After testing, report to user:

```
Plugin Created Successfully

Location: {path}/{plugin-name}/
Name: {plugin-name}
Description: {description}
Version: {version}

Components:
- [ ] Skills: {count} skill(s)
- [ ] Agents: {count} agent(s)
- [ ] Hooks: {yes/no}
- [ ] MCP Servers: {yes/no}
- [ ] LSP Servers: {yes/no}

Test Results:
- [ ] Plugin loads: claude --plugin-dir ./plugin
- [ ] Skills work: /{plugin-name}:{skill-name}
- [ ] Agents appear in /agents
- [ ] Hooks trigger correctly

Next Steps:
1. Test with: claude --plugin-dir ./{plugin-name}
2. Add to marketplace for distribution (optional)

Would you like to:
1. Make any modifications
2. Add more components (skills, agents, hooks)
3. Create marketplace entry for distribution
4. Confirm and finish
```

---

## Example Plugins

### Minimal Plugin (Skill Only)

```
my-tool/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    └── greet/
        └── SKILL.md
```

**plugin.json:**
```json
{
  "name": "my-tool",
  "description": "A simple greeting plugin",
  "version": "1.0.0"
}
```

**skills/greet/SKILL.md:**
```yaml
---
description: Greet the user warmly
disable-model-invocation: true
---

Greet the user and ask how you can help today.
```

### Full-Featured Plugin

```
enterprise-toolkit/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── code-review/
│   │   └── SKILL.md
│   └── deploy/
│       └── SKILL.md
├── agents/
│   ├── security-reviewer.md
│   └── performance-tester.md
├── hooks/
│   └── hooks.json
├── .mcp.json
├── scripts/
│   ├── lint.sh
│   └── format.sh
└── README.md
```

**plugin.json:**
```json
{
  "name": "enterprise-toolkit",
  "description": "Enterprise development tools with code review, deployment, and automation",
  "version": "2.1.0",
  "author": {
    "name": "Dev Team",
    "email": "dev@company.com"
  },
  "homepage": "https://docs.company.com/toolkit",
  "repository": "https://github.com/company/enterprise-toolkit",
  "license": "MIT",
  "keywords": ["enterprise", "deployment", "code-review", "automation"]
}
```

---

## Troubleshooting

### Plugin not loading
- Check `.claude-plugin/plugin.json` exists and is valid JSON
- Verify `name` field is kebab-case with no spaces
- Run `claude --debug` to see loading errors

### Skills not appearing
- Ensure `skills/` directory is at plugin root, NOT inside `.claude-plugin/`
- Check each skill has `SKILL.md` file
- Verify SKILL.md has valid frontmatter

### Hooks not working
- Verify scripts are executable (`chmod +x`)
- Use `${CLAUDE_PLUGIN_ROOT}` for all paths
- Check hook event names are correct (case-sensitive)

### MCP servers failing
- Use `${CLAUDE_PLUGIN_ROOT}` variable for paths
- Verify server binary exists and is executable
- Check debug output for connection errors

---

## Quick Reference

**Minimal plugin:**
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json     # {"name": "my-plugin", "version": "1.0.0"}
└── skills/
    └── hello/
        └── SKILL.md
```

**Test command:**
```bash
claude --plugin-dir ./my-plugin
```

**Use skill:**
```
/my-plugin:hello
```

**Validate:**
```bash
claude plugin validate ./my-plugin
```

**Distribution via marketplace:**
See https://code.claude.com/docs/en/plugin-marketplaces
