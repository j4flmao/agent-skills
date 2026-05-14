# PostToolUse hook

Fires after a tool call produces output. Can inject context, block continuation, or log results.

Matcher filters on tool name: `Bash`, `apply_patch`, `Edit`, `Write`, `mcp__*`.

## Event-specific input

| Field | Type | Meaning |
|-------|------|---------|
| `turn_id` | string | Active turn id |
| `tool_name` | string | Bash, apply_patch, or MCP name |
| `tool_use_id` | string | Tool-call id |
| `tool_input` | JSON | Tool-specific input |
| `tool_response` | JSON | Tool-specific output |

## Python script

```python
#!/usr/bin/env python3
# .codex/hooks/post_tool_use.py
import sys, json
from datetime import datetime

data = json.load(sys.stdin)
command = data.get("tool_input", {}).get("command", "")
exit_code = data.get("tool_response", {}).get("exit_code", 0)
tool_name = data.get("tool_name", "")

# Log command for audit
log_entry = {
    "timestamp": datetime.utcnow().isoformat(),
    "tool": tool_name,
    "command": command,
    "exit_code": exit_code
}
with open(".codex/hooks/audit.log", "a") as f:
    f.write(json.dumps(log_entry) + "\n")

# If command failed, inject context about it
if exit_code and exit_code != 0:
    result = {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": f"Command exited with code {exit_code}. Review stderr before continuing."
        }
    }
    print(json.dumps(result))
    sys.exit(0)

# Success, no action needed
sys.exit(0)
```

## PowerShell script

```powershell
# .codex/hooks/post_tool_use.ps1
param ([Parameter(ValueFromPipeline = $true)][string]$InputJson)

if (-not $InputJson) { $InputJson = [Console]::In.ReadToEnd() }
$data = $InputJson | ConvertFrom-Json
$response = $data.tool_response
$exitCode = if ($response.exit_code) { $response.exit_code } else { 0 }

if ($exitCode -ne 0) {
    $result = @{
        hookSpecificOutput = @{
            hookEventName = "PostToolUse"
            additionalContext = "Command exited with code $exitCode. Review stderr before continuing."
        }
    }
    return $result | ConvertTo-Json -Compress
}
# Exit 0 = continue
```

## Response format

```json
{
  "decision": "block",
  "reason": "The Bash output needs review before continuing.",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "The command updated generated files."
  }
}
```

`decision: "block"` does not undo the command. It replaces the tool result with feedback text and continues the model from there. Return `continue: false` to stop normal processing.
