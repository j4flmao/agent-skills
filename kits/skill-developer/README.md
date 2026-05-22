# Skill Developer Kit

## Purpose
Create new skills following the j4flmao-org skill template. This kit provides quick reference, validation commands, and scaffolding scripts for skill developers.

## Quick Reference

### Template File
The canonical skill template is at `skill-template.md` in the repository root. Every new skill must follow this structure.

### New Skill Checklist
- [ ] Choose a unique kebab-case name for your skill directory
- [ ] Create `skills/<your-skill-name>/SKILL.md`
- [ ] Populate all required frontmatter fields: name, description, version, author, license, type
- [ ] Write the skill content following the template structure
- [ ] Add any supporting reference files to the skill directory
- [ ] Add `<!-- SKILL_COMPRESSED -->` footer as the last line
- [ ] Update agent configuration files (opencode.json, .clinerules, etc.)
- [ ] Update the README skill inventory table
- [ ] Run validation commands

### Naming Conventions
- **Skill directories**: lowercase-kebab-case (e.g., `my-awesome-skill`)
- **Skill files**: `SKILL.md` — exact casing required
- **Reference files**: lowercase-kebab-case with appropriate extension
- **Agent configs**: Per-agent conventions (`.clinerules`, `.cursorrules`, etc.)

## generate-skill.sh
Scaffolds a new skill directory with template SKILL.md and updates agent configs.

```bash
#!/usr/bin/env bash
# generate-skill.sh — Scaffold a new skill
# Usage: ./generate-skill.sh <skill-name> <category>

set -euo pipefail

NAME="${1:?Usage: $0 <skill-name> <category>}"
CATEGORY="${2:-uncategorized}"
DIR="skills/$NAME"

if [ -d "$DIR" ]; then
  echo "Error: Skill '$NAME' already exists at $DIR"
  exit 1
fi

mkdir -p "$DIR"

cat > "$DIR/SKILL.md" << TEMPLATE
---
name: ${NAME//-/ }
description:
version: 1.0.0
author: j4flmao
license: MIT
type: skill
category: $CATEGORY
tags: []
references: []
---

TEMPLATE

echo "Created skill at $DIR/SKILL.md"
echo "Next steps:"
echo "  1. Edit $DIR/SKILL.md — add description and content"
echo "  2. Add reference files if needed"
echo "  3. Run validate-skill.sh $NAME"
```

### generate-skill.ps1
PowerShell equivalent for scaffolding a new skill.

```powershell
# generate-skill.ps1 — Scaffold a new skill
# Usage: ./generate-skill.ps1 <skill-name> <category>

param(
  [Parameter(Mandatory=$true, Position=0)]
  [string]$Name,
  [Parameter(Position=1)]
  [string]$Category = "uncategorized"
)

$dir = "skills\$Name"

if (Test-Path $dir) {
  Write-Error "Skill '$Name' already exists at $dir"
  exit 1
}

New-Item -ItemType Directory -Path $dir -Force | Out-Null
$displayName = $Name -replace '-', ' '

@"
---
name: $displayName
description:
version: 1.0.0
author: j4flmao
license: MIT
type: skill
category: $Category
tags: []
references: []
---
"@ | Set-Content -Path "$dir\SKILL.md"

Write-Host "Created skill at $dir\SKILL.md"
Write-Host "Next steps:"
Write-Host "  1. Edit $dir\SKILL.md — add description and content"
Write-Host "  2. Add reference files if needed"
Write-Host "  3. Run validate-skill.ps1 $Name"
```

## validate-skill.sh
Validates a skill's frontmatter, sections, references, and compression footer.

```bash
#!/usr/bin/env bash
# validate-skill.sh — Validate a skill for correctness
# Usage: ./validate-skill.sh <skill-name>

set -euo pipefail

NAME="${1:?Usage: $0 <skill-name>}"
FILE="skills/$NAME/SKILL.md"

if [ ! -f "$FILE" ]; then
  echo "Error: $FILE not found"
  exit 1
fi

errors=0

echo "=== Frontmatter Check ==="
for field in name description version author license type; do
  if grep -q "^$field:" "$FILE"; then
    echo "  [+] $field"
  else
    echo "  [X] $field — MISSING"
    ((errors++))
  fi
done

echo "=== Compression Footer ==="
if tail -1 "$FILE" | grep -q "SKILL_COMPRESSED"; then
  echo "  [+] Footer present"
else
  echo "  [X] SKILL_COMPRESSED footer missing"
  ((errors++))
fi

echo "=== Reference Files ==="
refs=$(grep -oP '(?<=references:\s*\[)[^\]]*' "$FILE" 2>/dev/null | tr ',' '\n' | tr -d '" ')
if [ -n "$refs" ]; then
  while IFS= read -r ref; do
    ref=$(echo "$ref" | xargs)
    if [ -f "skills/$NAME/$ref" ]; then
      echo "  [+] $ref"
    else
      echo "  [X] $ref — NOT FOUND"
      ((errors++))
    fi
  done <<< "$refs"
else
  echo "  (no references)"
fi

echo ""
if [ $errors -eq 0 ]; then
  echo "[+] All checks passed!"
else
  echo "[X] $errors error(s) found"
  exit 1
fi
```

### validate-skill.ps1
PowerShell equivalent for skill validation.

```powershell
# validate-skill.ps1 — Validate a skill for correctness
# Usage: ./validate-skill.ps1 <skill-name>

param(
  [Parameter(Mandatory=$true, Position=0)]
  [string]$Name
)

$file = "skills\$Name\SKILL.md"
$errors = 0

if (-not (Test-Path $file)) {
  Write-Error "$file not found"
  exit 1
}

Write-Host "=== Frontmatter Check ==="
foreach ($field in @("name","description","version","author","license","type")) {
  if (Select-String -Path $file -Pattern "^$field:" -Quiet) {
    Write-Host "  [+] $field"
  } else {
    Write-Host "  [X] $field — MISSING"
    $errors++
  }
}

Write-Host "=== Compression Footer ==="
$content = Get-Content -Path $file -Tail 1
if ($content -match "SKILL_COMPRESSED") {
  Write-Host "  [+] Footer present"
} else {
  Write-Host "  [X] SKILL_COMPRESSED footer missing"
  $errors++
}

if ($errors -eq 0) { Write-Host "`n[+] All checks passed!" }
else { Write-Host "`n[X] $errors error(s) found"; exit 1 }

## Generate Skill Script Pattern

A standalone PowerShell script that takes `skill-name` and `category` as parameters, creates the directory structure with `references/`, generates `SKILL.md` from template with proper frontmatter, and updates master-orchestrator routing.

```powershell
# generate-skill-pattern.ps1 — Scaffold a new skill with full setup
param(
  [Parameter(Mandatory=$true, Position=0)]
  [string]$SkillName,
  [Parameter(Mandatory=$true, Position=1)]
  [string]$Category,
  [string]$Author = "j4flmao",
  [string]$License = "MIT"
)

$dir = "skills\$Category\$SkillName"
if (Test-Path $dir) { Write-Error "Skill '$SkillName' already exists at $dir"; exit 1 }

# Create directory structure
New-Item -ItemType Directory -Path "$dir\references" -Force | Out-Null
$displayName = $SkillName -replace '-', ' '

# Generate SKILL.md from template
@"
---
name: $displayName
description: >
  TODO: Add description for $displayName
version: 1.0.0
author: $Author
license: $License
type: skill
category: $Category
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [$Category]
---

# $displayName

## Purpose
TODO: Describe what this skill does.

## Agent Protocol

### Trigger
TODO: What user request activates this skill.

### Input Context
TODO: What context does the agent need.

### Output Artifact
TODO: What does this skill produce.

### Response Format
No preamble. No postamble. Compress output.

### Max Response Length
4096 tokens

## Workflow

### Step 1: TODO
Description of first step.

### Step 2: TODO
Description of second step.

### Step 3: TODO
Description of third step.

## Rules

1. TODO: Rule one.
2. TODO: Rule two.
3. TODO: Rule three.

## References

## Handoff
TODO: Which skill to hand off to next.
"@ | Set-Content -Path "$dir\SKILL.md"

# Update master-orchestrator routing
$orchestrator = "skills/core/master-orchestrator/SKILL.md"
if (Test-Path $orchestrator) {
  $content = Get-Content $orchestrator -Raw
  if ($content -notmatch $SkillName) {
    Add-Content $orchestrator "`n- `${{SkillName}}: $displayName ($Category)"
    Write-Host "[UPDATE] Added $SkillName to master-orchestrator"
  }
}

Write-Host "`n=== Skill Created ==="
Write-Host "Location: $dir\SKILL.md"
Write-Host "References: $dir\references\"
Write-Host "`nNext steps:"
Write-Host "  1. Edit $dir\SKILL.md — add description, workflow, rules"
Write-Host "  2. Add reference files to $dir\references\"
Write-Host "  3. Run validate-skill-pattern.ps1 $SkillName"
```

## Validate Skill Script Pattern

A validation script that checks frontmatter completeness, section presence, reference file existence, and compression footer.

```powershell
# validate-skill-pattern.ps1 — Comprehensive skill validation
param(
  [Parameter(Mandatory=$true, Position=0)]
  [string]$SkillName,
  [string]$SkillsDir = "skills"
)

$file = "$SkillsDir\$SkillName\SKILL.md"
$errors = @()
$warnings = @()

if (-not (Test-Path $file)) {
  Write-Error "File not found: $file"
  exit 1
}

$content = Get-Content $file

# Check frontmatter fields
Write-Host "=== Frontmatter Validation ==="
$required = @("name", "description", "version", "author", "license", "type", "compatibility", "tags")
foreach ($field in $required) {
  if ($content -match "^$field:") {
    Write-Host "  [+] $field"
  } else {
    Write-Host "  [X] $field — MISSING"
    $errors += $field
  }
}

# Check required sections
Write-Host "=== Section Validation ==="
$sections = @("## Purpose", "## Trigger", "## Workflow", "## Rules", "## References")
foreach ($section in $sections) {
  if ($content -match [regex]::Escape($section)) {
    Write-Host "  [+] $section"
  } else {
    Write-Host "  [W] $section — missing (optional)"
    $warnings += $section
  }
}

# Check compression footer
Write-Host "=== Compression Footer ==="
$lastLine = $content[-1]
if ($lastLine -match "SKILL_COMPRESSED|No preamble|many token") {
  Write-Host "  [+] Footer present"
} else {
  Write-Host "  [X] Compression footer missing"
  $errors += "footer"
}

# Check reference files
Write-Host "=== Reference Files ==="
$refDir = "$SkillsDir\$SkillName\references"
if (Test-Path $refDir) {
  $refs = Get-ChildItem $refDir
  if ($refs.Count -gt 0) {
    foreach ($ref in $refs) {
      Write-Host "  [+] $($ref.Name)"
    }
  } else {
    Write-Host "  (empty references directory)"
  }
} else {
  Write-Host "  (no references directory)"
}

Write-Host "`n=== Summary ==="
if ($errors.Count -eq 0) {
  Write-Host "[PASS] All checks passed!" -ForegroundColor Green
} else {
  Write-Host "[FAIL] $($errors.Count) error(s): $($errors -join ', ')" -ForegroundColor Red
}
if ($warnings.Count -gt 0) {
  Write-Host "[WARN] $($warnings.Count) warning(s): $($warnings -join ', ')" -ForegroundColor Yellow
}
exit ($errors.Count -gt 0 ? 1 : 0)
```
```
