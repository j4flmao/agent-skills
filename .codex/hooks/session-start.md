# SessionStart hook

Fires when a session begins or resumes. Can inject additional developer context.

Matcher filters on source: `startup`, `resume`, `clear`.

## Event-specific input

| Field | Type | Meaning |
|-------|------|---------|
| `source` | string | startup or resume |

## Python script

```python
#!/usr/bin/env python3
# .codex/hooks/session_start.py
import sys, json, os

data = json.load(sys.stdin)
source = data.get("source", "")
repo_root = data.get("cwd", ".")

conventions_file = os.path.join(repo_root, ".codex/CONVENTIONS.md")
additional_context = ""

if os.path.isfile(conventions_file):
    with open(conventions_file) as f:
        additional_context = f.read()

# JSON output: additionalContext injected as developer context
result = {
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": additional_context
    }
}
print(json.dumps(result))
```

## PowerShell script

```powershell
# .codex/hooks/session_start.ps1
param ([Parameter(ValueFromPipeline = $true)][string]$InputJson)

if (-not $InputJson) { $InputJson = [Console]::In.ReadToEnd() }
$data = $InputJson | ConvertFrom-Json

$conventionsPath = Join-Path $data.cwd ".codex/CONVENTIONS.md"
$context = ""
if (Test-Path $conventionsPath) { $context = Get-Content $conventionsPath -Raw }

$result = @{
    hookSpecificOutput = @{
        hookEventName = "SessionStart"
        additionalContext = $context
    }
}
$result | ConvertTo-Json -Compress
```

## Response format

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Load workspace conventions before editing."
  }
}
```

Plain text on stdout is also added as developer context.
