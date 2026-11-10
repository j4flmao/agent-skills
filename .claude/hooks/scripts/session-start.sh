#!/bin/bash
# SessionStart hook: logs session metadata
# stdin: { "session_id": "...", "cwd": "...", "source": "..." }
# Pure bash (no jq); values are stripped of newlines so they cannot forge log lines.

input=$(cat)
field() {
  local re="\"$1\"[[:space:]]*:[[:space:]]*\"(([^\"\\\\]|\\\\.)*)\""
  [[ "$input" =~ $re ]] && printf '%s' "${BASH_REMATCH[1]}"
}
sessionId=$(field session_id | tr -cd 'A-Za-z0-9_-')
cwd=$(field cwd)
source=$(field source)
logDir="${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/logs"

mkdir -p "$logDir"
printf '[%s] SESSION START [%s] cwd=%s source=%s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "${sessionId:-unknown}" "${cwd//[$'\n\r']/ }" "${source:-startup}" >> "$logDir/sessions.log"

exit 0
