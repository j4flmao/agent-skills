# Hooks — Claude Code automation

## Overview

Hooks fire at lifecycle points. Input arrives on stdin as JSON. Output via stdout JSON or exit code.

| Event | Fires | Matches on |
|-------|-------|------------|
| `SessionStart` | Session begins/resumes | how started: `startup`, `resume`, `clear`, `compact` |
| `PreToolUse` | Before tool call executes | tool name |
| `PostToolUse` | After tool call succeeds | tool name |
| `PostToolUseFailure` | After tool call fails | tool name |
| `Stop` | Claude finishes responding | always |
| `SessionEnd` | Session terminates | why ended: `clear`, `resume`, `logout` |

## Configured hooks

See `.claude/settings.json` for full wiring.

### PreToolUse: block-destructive

Blocks `rm -rf` on system directories (`/root`, `/etc`, `/home`, `/`).

- **Matcher**: `Bash`
- **Scripts**: `scripts/block-destructive.sh` / `.ps1`
- **Behavior**: Returns `permissionDecision: "deny"` on match, `exit 0` otherwise

### PostToolUse: log-changes

Logs every Write/Edit tool invocation to `.claude/hooks/logs/session-<id>.log`.

- **Matcher**: `Write|Edit`
- **Scripts**: `scripts/log-changes.sh` / `.ps1`

### SessionStart: session-start

Logs session metadata to `.claude/hooks/logs/sessions.log`.

- **Matcher**: all (`*`)
- **Scripts**: `scripts/session-start.sh` / `.ps1`

## Hook JSON format

### Common input fields

```json
{
  "session_id": "uuid",
  "cwd": "/path/to/cwd",
  "transcript_path": "/path/to/transcript.json",
  "permission_mode": "default"
}
```

### PreToolUse input

```json
{
  "tool_name": "Bash",
  "tool_input": { "command": "rm -rf /target" },
  "tool_call_id": "call_abc123"
}
```

### PreToolUse output (deny)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Destructive command blocked by hook"
  }
}
```

### PreToolUse output (allow)

Exit code 0. No stdout JSON needed.

## Script conventions

- `.sh` files: read stdin with `cat`, parse with `jq`
- `.ps1` files: read stdin with `[Console]::In.ReadToEnd()`, parse with `ConvertFrom-Json`
- Return decisions via stdout JSON or exit 0 for allow/no-op
- Log files written to `.claude/hooks/logs/`
