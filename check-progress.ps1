$base = "d:/j4flmao-org/skills/harness-engineering"
$dirs = Get-ChildItem $base -Directory
foreach ($d in $dirs) {
    $name = $d.Name
    $hasSKILL = Test-Path (Join-Path $d.FullName "SKILL.md")
    $refPath = Join-Path $d.FullName "references"
    $refCount = 0
    if (Test-Path $refPath) {
        $refCount = @(Get-ChildItem $refPath -File).Count
    }
    Write-Host "$name | SKILL.md=$hasSKILL | refs=$refCount"
}
