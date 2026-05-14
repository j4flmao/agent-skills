# PreToolUse hook

Fires before a tool call executes. Can allow, deny, or block the command.

Matcher filters on tool name: `Bash`, `apply_patch`, `Edit`, `Write`, `mcp__*`.

## Event-specific input

| Field | Type | Meaning |
|-------|------|---------|
| `turn_id` | string | Active turn id |
| `tool_name` | string | Bash, apply_patch, or MCP name |
| `tool_use_id` | string | Tool-call id |
| `tool_input` | JSON | Tool-specific; Bash uses `tool_input.command` |

## Python script

```python
#!/usr/bin/env python3
# .codex/hooks/pre_tool_use.py
import sys, json

data = json.load(sys.stdin)
command = data.get("tool_input", {}).get("command", "")

# Block destructive commands
blocked = ["rm -rf /", "dd if=", ":(){ :|:& };:", "> /dev/sda"]
for pattern in blocked:
    if pattern in command:
        result = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": "Destructive command blocked by hook."
            }
        }
        print(json.dumps(result))
        sys.exit(0)

# Allow everything else (exit 0 with no output = allow)
sys.exit(0)
```

## PowerShell script

```powershell
# .codex/hooks/pre_tool_use.ps1
param ([Parameter(ValueFromPipeline = $true)][string]$InputJson)

if (-not $InputJson) { $InputJson = [Console]::In.ReadToEnd() }
$data = $InputJson | ConvertFrom-Json
$command = $data.tool_input.command

$blocked = @("rm -rf /", "dd if=", ":(){ :|:& };:", "> /dev/sda")
foreach ($pattern in $blocked) {
    if ($command -match [regex]::Escape($pattern)) {
        $result = @{
            hookSpecificOutput = @{
                hookEventName = "PreToolUse"
                permissionDecision = "deny"
                permissionDecisionReason = "Destructive command blocked by hook."
            }
        }
        return $result | ConvertTo-Json -Compress
    }
}
# Allow: exit 0 with no output
```

## Allow/deny response

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Destructive command blocked by hook."
  }
}
```

Also supports legacy block format:

```json
{
  "decision": "block",
  "reason": "Destructive command blocked by hook."
}
```

Exit 0 with no output = allow. Exit 2 with stderr = block with that message.
