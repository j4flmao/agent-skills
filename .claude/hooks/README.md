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

Blocks destructive commands anywhere in a Bash command line (also after `&&`, `;`, `|`, `sudo`, `env`, `xargs`):

- recursive `rm` (`-r`, `-R`, `-rf`, `-fr`, `-r -f`, `--recursive`) of `/`, `/*`, `~`, `$HOME`, `.`, `..`, `*`, system directories (`/etc`, `/usr`, `/var`, …) or a Windows drive root
- `rm --no-preserve-root`, `mkfs*`, `wipefs`, `shred`, `dd of=/dev/…`
- recursive `chmod`/`chown` on system paths, `find / -delete`, fork bombs

- **Matcher**: `Bash` (runs on every Bash call; the script decides)
- **Script**: `scripts/block-destructive.sh` — pure bash, no `jq`, so it never fails open when `jq` or `grep -P` is missing
- **Behavior**: Returns `permissionDecision: "deny"` on match, `exit 0` otherwise
- **Limits**: a pattern blocker, not a sandbox. Obfuscated commands (variables, `eval`, scripts written to disk first) can evade it; keep Claude Code's permission prompts on.

### PostToolUse: log-changes

Logs every Write/Edit tool invocation to `.claude/hooks/logs/session-<id>.log`.

- **Matcher**: `Write|Edit`
- **Script**: `scripts/log-changes.sh` — logs the path only (never file content); `session_id` is sanitized to `[A-Za-z0-9_-]` so it cannot escape the log directory

### SessionStart: session-start

Logs session metadata to `.claude/hooks/logs/sessions.log`.

- **Matcher**: all (`*`)
- **Script**: `scripts/session-start.sh`

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

- Scripts are bash and need no extra tools: read stdin with `cat`, extract fields with bash regex (`[[ ... =~ ... ]]`), never `jq` or `grep -P`, which are missing on many machines and would make a blocker fail open
- Escape `\` and `"` before putting any value into stdout JSON
- Sanitize values used in file names; strip newlines from values written to logs
- Return decisions via stdout JSON or exit 0 for allow/no-op
- Log files are written to `.claude/hooks/logs/` (gitignored)
