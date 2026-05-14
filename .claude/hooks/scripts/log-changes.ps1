# PostToolUse hook: logs file writes/edits to session log
# stdin: { "tool_name": "Write|Edit", "tool_input": { "file_path": "..." }, ... }

$input = [Console]::In.ReadToEnd() | ConvertFrom-Json
$tool = $input.tool_name
$filePath = if ($input.tool_input.file_path) { $input.tool_input.file_path } else { $input.tool_input.filePath }
$sessionId = if ($input.session_id) { $input.session_id } else { "unknown" }

$logDir = Join-Path (Get-Location) ".claude/hooks/logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

"$([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss')) [$tool] $filePath" | Out-File -FilePath "$logDir/session-$sessionId.log" -Append

exit 0
