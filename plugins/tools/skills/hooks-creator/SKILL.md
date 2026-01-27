---
name: hooks-creator
description: Guide for creating Claude Code hooks. Use when users want to add hooks for automated formatting, validation, logging, notifications, or custom permission controls.
---

# Hooks Creator

This skill provides guidance for creating effective Claude Code hooks.

## Workflow

```
Phase 0: Check Official Documentation
   ↓ Fetch latest spec from official docs
Phase 1: Clarify Requirements
   ↓ Ask questions to understand hook purpose
Phase 2: Create Hook
   ↓ Add hook configuration to settings.json
Phase 3: Test & Verify
   ↓ Test hook execution and behavior
Phase 4: User Confirmation
   ↓ Report results and get approval
```

---

## Phase 0: Check Official Documentation

> **CRITICAL**: Always fetch the latest documentation before creating a hook.

Use WebFetch to check the official Claude Code hooks documentation:

```
URLs:
- https://code.claude.com/docs/en/hooks-guide (Getting started)
- https://code.claude.com/docs/en/hooks (Reference)
```

**What to verify:**
- Latest hook event types available
- Input/output JSON schema for each event
- Exit code behaviors
- Security considerations
- New features or deprecated options

**Example WebFetch prompt:**
```
Extract the complete documentation about Claude Code hooks including:
hook types, configuration, matchers, input schema, exit codes, and examples.
```

After fetching, compare with the reference below and use the **latest official spec** for any discrepancies.

---

## Phase 1: Clarify Requirements

Before creating a hook, gather necessary information. **Ask the user** if any are unclear:

| Question | Why It Matters |
|----------|----------------|
| What should trigger this hook? | Determines the hook event type |
| Which tool(s) should it apply to? | Defines the matcher pattern |
| What action should the hook perform? | Shapes the command/script |
| Should it block operations or just log? | Determines exit code behavior |
| User-level or project-level? | Determines storage location |
| Does it need access to tool input/output? | Affects script design |

**Example questions to ask:**
- "Should this hook run before or after the tool executes?"
- "Do you want to block certain operations or just log them?"
- "Should this apply to all projects or just this one?"
- "What specific conditions should trigger the action?"

---

## Phase 2: Create Hook

### Hook Events Reference

| Event | When it fires | Common use cases |
|-------|---------------|------------------|
| `PreToolUse` | Before tool calls | Validation, blocking, logging |
| `PostToolUse` | After tool calls | Formatting, verification, logging |
| `PermissionRequest` | When permission dialog shown | Auto-approve/deny specific actions |
| `UserPromptSubmit` | When user submits prompt | Input validation, preprocessing |
| `Notification` | When Claude sends notifications | Custom notification systems |
| `Stop` | When Claude finishes responding | Cleanup, final verification |
| `SubagentStart` | When subagent begins | Setup, initialization |
| `SubagentStop` | When subagent completes | Cleanup, result processing |
| `PreCompact` | Before compact operation | Backup, logging |
| `SessionStart` | When session starts/resumes | Environment setup |
| `SessionEnd` | When session ends | Cleanup, logging |
| `Setup` | When Claude runs with --init | Initial configuration |

### Hook Configuration Structure

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": "<regex-pattern>",
        "hooks": [
          {
            "type": "command",
            "command": "<shell-command-or-script>"
          }
        ]
      }
    ]
  }
}
```

### Where Hooks Live

| Location | Path | Scope |
|----------|------|-------|
| User | `~/.claude/settings.json` | All your projects |
| Project | `.claude/settings.json` | Current project only |
| Skill | In skill's frontmatter `hooks:` | When skill is active |
| Agent | In agent's frontmatter `hooks:` | When agent is active |

### Matcher Patterns

| Pattern | Matches |
|---------|---------|
| `""` (empty) | All tools |
| `"Bash"` | Bash tool only |
| `"Edit\|Write"` | Edit OR Write tools |
| `"Read.*"` | Tools starting with "Read" |
| `"*"` | All tools (wildcard) |

### Exit Code Behavior

| Exit Code | PreToolUse | PostToolUse | Other Events |
|-----------|------------|-------------|--------------|
| 0 | Continue | Continue | Continue |
| 2 | **Block operation** | N/A | Continue |
| Other | Warning, continue | Warning, continue | Warning, continue |

### Hook Input (stdin JSON)

**PreToolUse input:**
```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "ls -la",
    "description": "List files"
  }
}
```

**PostToolUse input:**
```json
{
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "old_string": "...",
    "new_string": "..."
  },
  "tool_response": {
    "success": true
  }
}
```

### Common Hook Patterns

#### 1. Command Logging

Log all Bash commands:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command' >> ~/.claude/bash-log.txt"
          }
        ]
      }
    ]
  }
}
```

#### 2. Auto-Formatting

Format TypeScript files after editing:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs -I {} sh -c 'echo {} | grep -q \"\\.ts$\" && npx prettier --write {}'"
          }
        ]
      }
    ]
  }
}
```

#### 3. File Protection

Block edits to sensitive files:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | grep -qE '(\\.env|package-lock\\.json|\\.git/)' && exit 2 || exit 0"
          }
        ]
      }
    ]
  }
}
```

#### 4. Read-Only SQL Validation

Block write operations in database queries:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/validate-readonly-sql.sh"
          }
        ]
      }
    ]
  }
}
```

**Script (`scripts/validate-readonly-sql.sh`):**
```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -iE '\\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\\b' > /dev/null; then
  echo "Blocked: Write operations not allowed" >&2
  exit 2
fi
exit 0
```

#### 5. Custom Notifications

Desktop notification when Claude needs input:

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude Code' 'Awaiting your input'"
          }
        ]
      }
    ]
  }
}
```

#### 6. Linting After Edits

Run linter after file modifications:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/run-linter.sh"
          }
        ]
      }
    ]
  }
}
```

#### 7. Subagent Lifecycle

Setup and cleanup for specific subagent:

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "db-agent",
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/setup-db-connection.sh"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "db-agent",
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/cleanup-db-connection.sh"
          }
        ]
      }
    ]
  }
}
```

---

## Phase 3: Test & Verify

After creating the hook:

### 3.1 Verify Configuration

Run `/hooks` to see registered hooks and their configuration.

### 3.2 Test Hook Execution

**For PreToolUse hooks:**
1. Trigger the tool that should activate the hook
2. Verify hook runs (check logs or output)
3. Test blocking behavior (exit 2) if applicable

**For PostToolUse hooks:**
1. Execute a tool that matches the hook
2. Verify post-processing occurs
3. Check file modifications if applicable

### 3.3 Test Edge Cases

- [ ] Hook handles missing input gracefully
- [ ] Exit codes work correctly
- [ ] Error messages appear when blocking
- [ ] No interference with normal operations

### 3.4 Debug Issues

**Check hook output:**
```bash
# Add debug logging to your hook
echo "Hook triggered: $(date)" >> ~/.claude/hook-debug.log
```

**Verify JSON parsing:**
```bash
# Test jq command with sample input
echo '{"tool_input":{"command":"ls"}}' | jq -r '.tool_input.command'
```

---

## Phase 4: User Confirmation

After testing, report to user:

```
✅ Hook Created Successfully

📁 Location: {settings.json path}
🎯 Event: {event type}
🔍 Matcher: {matcher pattern}
⚡ Action: {command description}

Test Results:
- [ ] Hook triggers correctly
- [ ] Exit codes work as expected
- [ ] No interference with normal operations
- [ ] Error handling works properly

Would you like to:
1. Make any modifications
2. Add additional hooks
3. Confirm and finish
```

---

## Security Considerations

**Important:** Hooks run automatically with your environment's credentials.

- [ ] Review hook commands before adding
- [ ] Avoid hooks that could exfiltrate data
- [ ] Be careful with hooks that modify files
- [ ] Test hooks in safe environment first
- [ ] Use project-level hooks for sensitive operations

---

## Troubleshooting

### Hook not triggering
- Check matcher pattern matches tool name exactly
- Verify event type is correct
- Run `/hooks` to confirm registration

### Hook blocks unexpectedly
- Check exit code logic
- Add debug logging to script
- Verify jq parsing works correctly

### Hook errors
- Ensure scripts are executable (`chmod +x`)
- Check script path is correct
- Verify jq is installed

---

## Quick Reference

**Minimal hook (user settings):**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Bash called' >> /tmp/hook.log"
          }
        ]
      }
    ]
  }
}
```

**Hook in agent/skill frontmatter:**
```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/format.sh"
  Stop:
    - hooks:
        - type: command
          command: "./scripts/cleanup.sh"
```

**Full validation script template:**
```bash
#!/bin/bash
# Read JSON input from stdin
INPUT=$(cat)

# Extract relevant fields
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Your validation logic here
if [[ "$COMMAND" =~ dangerous_pattern ]]; then
  echo "Blocked: Reason" >&2
  exit 2
fi

# Success
exit 0
```
