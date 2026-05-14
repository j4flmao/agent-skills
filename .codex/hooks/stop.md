# Stop hook

Fires when a Codex turn completes. Can request continuation or signal stop.

Matcher is not supported for this event; always fires.

## Event-specific input

| Field | Type | Meaning |
|-------|------|---------|
| `turn_id` | string | Active turn id |
| `stop_hook_active` | boolean | Whether this turn was already continued by Stop |
| `last_assistant_message` | string or null | Latest assistant response text |

## Python script

```python
#!/usr/bin/env python3
# .codex/hooks/stop.py
import sys, json

data = json.load(sys.stdin)
stop_active = data.get("stop_hook_active", False)
last_msg = data.get("last_assistant_message", "") or ""

# Already continued once? Stop.
if stop_active:
    print(json.dumps({"continue": False}))
    sys.exit(0)

# Found TODO markers? Continue to resolve them.
if "TODO" in last_msg or "FIXME" in last_msg or "HACK" in last_msg:
    result = {
        "decision": "block",
        "reason": "Found TODO/FIXME markers. Continue to resolve them."
    }
    print(json.dumps(result))
    sys.exit(0)

# Normal stop
print(json.dumps({"continue": True}))
```

## PowerShell script

```powershell
# .codex/hooks/stop.ps1
param ([Parameter(ValueFromPipeline = $true)][string]$InputJson)

if (-not $InputJson) { $InputJson = [Console]::In.ReadToEnd() }
$data = $InputJson | ConvertFrom-Json

if ($data.stop_hook_active) {
    return (@{ continue = $false } | ConvertTo-Json -Compress)
}

$lastMsg = if ($data.last_assistant_message) { $data.last_assistant_message } else { "" }

if ($lastMsg -match "TODO|FIXME|HACK") {
    $result = @{
        decision = "block"
        reason = "Found TODO/FIXME markers. Continue to resolve them."
    }
    return $result | ConvertTo-Json -Compress
}

@{ continue = $true } | ConvertTo-Json -Compress
```

## Response format

Continue the turn:

```json
{
  "decision": "block",
  "reason": "Run one more pass over the failing tests."
}
```

Stop the turn (takes precedence over other Stop hooks):

```json
{
  "continue": false
}
```

`decision: "block"` does not reject the turn. It tells Codex to continue and creates a new continuation prompt using `reason` as the prompt text.
