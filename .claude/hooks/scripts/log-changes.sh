#!/bin/bash
# PostToolUse hook: logs file writes/edits to session log
# stdin: { "tool_name": "Write|Edit", "tool_input": { "file_path": "..." }, ... }

input=$(cat)
tool=$(echo "$input" | jq -r '.tool_name')
filePath=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.filePath // ""')
sessionId=$(echo "$input" | jq -r '.session_id // "unknown"')
logDir="${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/logs"

mkdir -p "$logDir"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$tool] $filePath" >> "$logDir/session-$sessionId.log"

exit 0
