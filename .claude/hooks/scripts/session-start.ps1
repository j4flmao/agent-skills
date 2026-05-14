# SessionStart hook: logs session metadata
# stdin: { "session_id": "...", "cwd": "...", ... }

$input = [Console]::In.ReadToEnd() | ConvertFrom-Json
$sessionId = if ($input.session_id) { $input.session_id } else { "unknown" }
$cwd = if ($input.cwd) { $input.cwd } else { "" }
$matcher = if ($input.matcher) { $input.matcher } else { "startup" }

$logDir = Join-Path (Get-Location) ".claude/hooks/logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

"$([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss')) SESSION START [$sessionId] cwd=$cwd matcher=$matcher" | Out-File -FilePath "$logDir/sessions.log" -Append

exit 0
