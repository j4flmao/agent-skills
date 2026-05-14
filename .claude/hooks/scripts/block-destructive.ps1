# PreToolUse hook: blocks rm -rf on root, system dirs, and dangerous flags
# stdin: { "tool_name": "Bash", "tool_input": { "command": "..." }, ... }
# stdout: { "hookSpecificOutput": { "permissionDecision": "deny", ... } } or exit 0

$input = [Console]::In.ReadToEnd() | ConvertFrom-Json
$command = $input.tool_input.command

if ($command -match '\brm\s+(-rf?|--recursive).*(/root|/etc|/home\s)') {
    $result = @{
        hookSpecificOutput = @{
            hookEventName = "PreToolUse"
            permissionDecision = "deny"
            permissionDecisionReason = "Destructive rm blocked: targets system directory"
        }
    }
    $result | ConvertTo-Json
    exit 0
}

exit 0
