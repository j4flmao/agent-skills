$base = "d:/j4flmao-org/skills/harness-engineering"
$dirs = Get-ChildItem $base -Directory | Sort-Object Name
foreach ($d in $dirs) {
    Write-Host ""
    Write-Host "=== $($d.Name) ==="
    $rp = Join-Path $d.FullName "references"
    if (Test-Path $rp) {
        $files = Get-ChildItem $rp -File
        foreach ($f in $files) {
            Write-Host "  $($f.Name) ($($f.Length) bytes)"
        }
        if ($files.Count -eq 0) { Write-Host "  (empty)" }
    } else {
        Write-Host "  NO references/ dir"
    }
}
