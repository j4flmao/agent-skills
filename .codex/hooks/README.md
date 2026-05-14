# Codex hooks overview

Hooks inject deterministic scripts into the Codex lifecycle. Behind feature flag in `config.toml`:

```toml
[features]
codex_hooks = true
```

## Where Codex looks for hooks

- `~/.codex/hooks.json`
- `~/.codex/config.toml` (inline `[hooks]` table)
- `<repo>/.codex/hooks.json`
- `<repo>/.codex/config.toml` (inline `[hooks]` table)

Project-local hooks load only when the project `.codex/` layer is trusted. Multiple sources merge.

## Config shape (hooks.json)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .codex/hooks/session_start.py",
            "statusMessage": "Loading session context"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .codex/hooks/pre_tool_use.py",
            "statusMessage": "Checking command"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .codex/hooks/post_tool_use.py",
            "statusMessage": "Reviewing output"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 .codex/hooks/stop.py",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

## Config shape (config.toml inline)

```toml
[[hooks.PreToolUse]]
matcher = "^Bash$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = "python3 .codex/hooks/pre_tool_use.py"
timeout = 30
statusMessage = "Checking Bash command"
```

## Supported events

| Event | Matcher filters | Scope |
|-------|-----------------|-------|
| `SessionStart` | source (startup/resume/clear) | session |
| `PreToolUse` | tool name | turn |
| `PermissionRequest` | tool name | turn |
| `PostToolUse` | tool name | turn |
| `UserPromptSubmit` | not supported | turn |
| `Stop` | not supported | turn |

## Protocol

Every hook receives JSON on stdin. Exit 0 with JSON on stdout to return a decision. Exit 2 with stderr to block.

### Common input

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript",
  "cwd": "/repo",
  "hook_event_name": "PreToolUse",
  "model": "gpt-5.5"
}
```

### Common output fields

```json
{
  "continue": true,
  "stopReason": "optional",
  "systemMessage": "optional"
}
```

Exit 0 with no output = allow/continue. Exit 2 with stderr = block.
