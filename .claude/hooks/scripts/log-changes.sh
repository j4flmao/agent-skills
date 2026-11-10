#!/bin/bash
# PostToolUse hook: logs file writes/edits to session log (path only, never file content)
# stdin: { "tool_name": "Write|Edit", "tool_input": { "file_path": "..." }, "session_id": "..." }
# Pure bash (no jq). session_id is sanitized so it cannot escape the log directory.

input=$(cat)
field() {
  local re="\"$1\"[[:space:]]*:[[:space:]]*\"(([^\"\\\\]|\\\\.)*)\""
  [[ "$input" =~ $re ]] && printf '%s' "${BASH_REMATCH[1]}"
}
tool=$(field tool_name)
filePath=$(field file_path)
[ -z "$filePath" ] && filePath=$(field filePath)
sessionId=$(field session_id | tr -cd 'A-Za-z0-9_-')
sessionId=${sessionId:-unknown}
logDir="${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/logs"

mkdir -p "$logDir"
printf '[%s] [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "${tool//[$'\n\r']/ }" "${filePath//[$'\n\r']/ }" >> "$logDir/session-$sessionId.log"

exit 0
