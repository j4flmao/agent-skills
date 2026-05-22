# Git Log Parsing Reference

## Standard Git Log Commands

```bash
# All commits since last tag
git log --oneline {last-tag}..HEAD

# Full message format for parsing
git log --format="%H%n%an%n%ae%n%ai%n%s%n%b%n---" {from}..{to}

# With author and date
git log --format="%s (%an, %ar)" {from}..{to}

# Count commits per type
git log --format="%s" {from}..{to} | grep -oE '^(feat|fix|refactor|perf|chore|docs|test|style|BREAKING)' | sort | uniq -c | sort -rn
```

## Parsing Conventional Commits

Commit format: `type(scope): description`

```bash
# Extract features (feat:)
git log --grep="^feat" --format="- feat(%an): %s" {from}..{to}

# Extract fixes (fix:)
git log --grep="^fix" --format="- fix(%an): %s" {from}..{to}

# Extract breaking changes
git log --grep="BREAKING CHANGE" --format="- %s" {from}..{to}

# Get commits with full body (for breaking change notes)
git log --format="%s%n%b---" {from}..{to}
```

## Grouping by Type

```bash
# PowerShell grouping
$commits = git log --format="%s" {from}..{to}
$groups = @{}
foreach ($c in $commits) {
  $type = if ($c -match '^(feat|fix|refactor|perf|chore|docs|test|style)') { $matches[1] }
          elseif ($c -match 'BREAKING') { 'breaking' } else { 'other' }
  $groups[$type] += @($c)
}
```

## Commit Type Classification

| Pattern | Section | Include? |
|---------|---------|----------|
| `^feat:` | Added | Yes |
| `^feat.*BREAKING` | BREAKING | Yes, forced to top |
| `^fix:` | Fixed | Yes |
| `^refactor:` | Changed | Yes |
| `^perf:` | Changed | Yes |
| `^docs:` | Changed (minor) | Optional |
| `^test:` | — | No |
| `^chore:` | — | No |
| `^style:` | — | No |
| `BREAKING CHANGE` | BREAKING | Yes |

## Version Detection

```bash
# Last release tag
git describe --tags --abbrev=0

# All version tags sorted
git tag --sort=v:refname | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+'

# Commits between two tags
git log --oneline v1.0.0..v1.1.0
```

## Change Summary Statistics

```bash
echo "Files changed: $(git diff --stat {from}..{to} | tail -1 | grep -oE '[0-9]+ file')"
echo "Insertions: $(git diff --numstat {from}..{to} | awk '{sum+=$1} END {print sum}')"
echo "Deletions: $(git diff --numstat {from}..{to} | awk '{sum+=$2} END {print sum}')"
```
