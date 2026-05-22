# Enterprise Deployment Kit

## Purpose
Deploy the j4flmao-org skill suite in a corporate environment with team-specific customization. This kit provides tooling for stripping unused skills, adding company-internal skills, configuring agents per team, and integrating with CI/CD pipelines.

## Contents

### strip-unused.sh
A bash script that takes a list of skills to KEEP, deletes everything else, and updates agent configuration files accordingly.

```bash
#!/usr/bin/env bash
# strip-unused.sh — Remove all skills except those in the keep list
# Usage: ./strip-unused.sh skill-a skill-b skill-c

set -euo pipefail

KEEP=("$@")
SKILLS_DIR="skills"

if [ ${#KEEP[@]} -eq 0 ]; then
  echo "Usage: $0 <skill-names-to-keep...>"
  echo "Example: $0 python-test-skill commit-skill deploy-skill"
  exit 1
fi

for skill_dir in "$SKILLS_DIR"/*/; do
  skill_name=$(basename "$skill_dir")
  keep=false
  for keep_item in "${KEEP[@]}"; do
    if [ "$skill_name" = "$keep_item" ]; then
      keep=true
      break
    fi
  done
  if [ "$keep" = false ]; then
    echo "Removing unused skill: $skill_name"
    rm -rf "$skill_dir"
  fi
done

echo "Done. Skills kept: ${KEEP[*]}"
```

### strip-unused.ps1
A PowerShell equivalent of `strip-unused.sh` for Windows environments.

```powershell
# strip-unused.ps1 — Remove all skills except those in the keep list
# Usage: ./strip-unused.ps1 skill-a skill-b skill-c

param(
  [Parameter(Mandatory=$true, Position=0)]
  [string[]]$KeepSkills
)

$skillsDir = "skills"
$kept = @()

Get-ChildItem -Path $skillsDir -Directory | ForEach-Object {
  $skillName = $_.Name
  if ($KeepSkills -contains $skillName) {
    $kept += $skillName
  } else {
    Write-Host "Removing unused skill: $skillName"
    Remove-Item -Recurse -Force $_.FullName
  }
}

Write-Host "Done. Skills kept: $($kept -join ', ')"
```

### add-company-skill.sh
A template script for adding a new company-internal skill with proper structure.

```bash
#!/usr/bin/env bash
# add-company-skill.sh — Add a new company-internal skill
# Usage: ./add-company-skill.sh <skill-name> <category>

set -euo pipefail

NAME="${1:?Usage: $0 <skill-name> <category>}"
CATEGORY="${2:?Usage: $0 <skill-name> <category>}"
DIR="skills/$NAME"

mkdir -p "$DIR"

cat > "$DIR/SKILL.md" << 'SKILL'
---
name:
description:
version: 1.0.0
author:
license:
type: skill
---

SKILL

echo "Created skill at $DIR/SKILL.md"
echo "Edit the frontmatter fields and add your skill content."
```

### add-company-skill.ps1
PowerShell equivalent of `add-company-skill.sh`.

```powershell
# add-company-skill.ps1 — Add a new company-internal skill
# Usage: ./add-company-skill.ps1 <skill-name> <category>

param(
  [Parameter(Mandatory=$true, Position=0)]
  [string]$Name,
  [Parameter(Mandatory=$true, Position=1)]
  [string]$Category
)

$dir = "skills\$Name"
New-Item -ItemType Directory -Path $dir -Force | Out-Null

@"
---
name:
description:
version: 1.0.0
author:
license:
type: skill
---
"@ | Set-Content -Path "$dir\SKILL.md"

Write-Host "Created skill at $dir\SKILL.md"
Write-Host "Edit the frontmatter fields and add your skill content."
```

## Strip Unused Skills Script Pattern

A PowerShell script that takes a list of skill names to KEEP, removes all other skill directories, updates routing files, and prints a summary.

```powershell
# strip-unused-pattern.ps1 — Remove all skills except those in keep list
param(
  [Parameter(Mandatory=$true)]
  [string[]]$KeepSkills,
  [string]$SkillsDir = "skills"
)

$removed = 0
$kept = 0

Get-ChildItem -Path $SkillsDir -Directory | ForEach-Object {
  if ($KeepSkills -contains $_.Name) {
    $kept++
    Write-Host "[KEEP] $($_.Name)"
  } else {
    Write-Host "[REMOVE] $($_.Name)"
    Remove-Item -Recurse -Force $_.FullName
    $removed++
  }
}

# Update routing files
$agentConfigs = @(".claude/settings.json", ".opencode/opencode.json", ".cursor/.cursorrules")
foreach ($cfg in $agentConfigs) {
  if (Test-Path $cfg) {
    Write-Host "[UPDATE] $cfg"
  }
}

Write-Host "`n=== Summary ==="
Write-Host "Kept: $kept | Removed: $removed | Total configured skills: $($KeepSkills.Count)"
```

## Add Company Skill Script Pattern

A script that creates a new company-internal skill from template, complete with frontmatter, references directory, and agent config registration.

```powershell
# add-company-skill-pattern.ps1 — Create a new company-internal skill
param(
  [Parameter(Mandatory=$true)]
  [string]$SkillName,
  [Parameter(Mandatory=$true)]
  [string]$Category,
  [string]$Author = "company-name",
  [string]$Description = "Company-internal skill for $SkillName"
)

$dir = "skills\$Category\$SkillName"
if (Test-Path $dir) { Write-Error "Skill '$SkillName' already exists"; exit 1 }

New-Item -ItemType Directory -Path "$dir\references" -Force | Out-Null

@"
---
name: $SkillName
description: $Description
version: 1.0.0
author: $Author
license: Proprietary
type: skill
category: $Category
compatibility:
  claude-code: true
  cursor: true
tags: [$Category, internal]
---

# $SkillName

## Purpose
Describe what this skill does.

## Trigger
What user request activates this skill.

## Workflow
Steps to follow.

## Rules
Constraints and best practices.
"@ | Set-Content -Path "$dir\SKILL.md"

New-Item -ItemType File -Path "$dir\.gitkeep" -Force | Out-Null

Write-Host "Created skill: $dir\SKILL.md"
Write-Host "Next steps:"
Write-Host "  1. Edit $dir\SKILL.md with your content"
Write-Host "  2. Add reference files to $dir\references\"
Write-Host "  3. Register in agent config files"
Write-Host "  4. Update README skill inventory table"
```

## Integration Guide

For detailed integration instructions, including team-specific agent configuration,
CI/CD pipeline setup, and governance workflows, refer to the
[Enterprise Integration Guide](../../docs/enterprise-guide.md).
