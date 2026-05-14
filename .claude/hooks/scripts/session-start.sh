#!/bin/bash
# SessionStart hook: logs session metadata
# stdin: { "session_id": "...", "cwd": "...", ... }

input=$(cat)
sessionId=$(echo "$input" | jq -r '.session_id // "unknown"')
cwd=$(echo "$input" | jq -r '.cwd // ""')
matcher=$(echo "$input" | jq -r '.matcher // "startup"')
logDir="${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/logs"

mkdir -p "$logDir"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] SESSION START [$sessionId] cwd=$cwd matcher=$matcher" >> "$logDir/sessions.log"

exit 0
