#!/bin/bash
# PreToolUse hook: blocks rm -rf on root, system dirs, and dangerous flags
# stdin: { "tool_name": "Bash", "tool_input": { "command": "..." }, ... }
# stdout: { "hookSpecificOutput": { "permissionDecision": "deny", ... } } or exit 0

input=$(cat)

command=$(echo "$input" | jq -r '.tool_input.command // ""')

if echo "$command" | grep -qP '(?<!\w)rm\s+(-rf?|--recursive)(\s+|/)'; then
  if echo "$command" | grep -qP '(/\s*$|/root\s|/etc\s|/home\s)'; then
    jq -n '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": "Destructive rm blocked: targets system directory"
      }
    }'
    exit 0
  fi
fi

exit 0
