# Secret Detection

## GitLeaks

### Installation
```bash
brew install gitleaks
# or
go install github.com/gitleaks/gitleaks/v8@latest
```

### Configuration (.gitleaks.toml)
```toml
title = "Project secret scan"
extend = .gitleaks.toml  # extends default rules

[allowlist]
paths = [
  "(.git)",
  "(.test.*)",
  "(test/fixtures/)",
]

[[rules]]
id = "custom-jwt-secret"
description = "custom JWT signing secret"
regex = '''(?i)(jwt.?secret|signing.?key).{0,20}=['\"][^'\"]{10,}['\"]'''
tags = ["custom", "jwt"]
severity = "high"
```

### Commands
```bash
gitleaks detect --source . --config .gitleaks.toml -v
gitleaks protect --staged  # for pre-commit
gitleaks detect --no-git   # for non-git dirs
gitleaks detect --report-path gitleaks-report.json
```

### CI Integration
```yaml
- name: Secret Scan
  run: gitleaks detect --source . --config .gitleaks.toml --report-path gitleaks-report.json
- name: Upload Report
  uses: actions/upload-artifact@v4
  with:
    name: gitleaks-report
    path: gitleaks-report.json
```

## truffleHog

### Installation
```bash
pip install truffleHog
# or
docker run --rm -v "$PWD:/pwd" trufflesecurity/trufflehog:latest
```

### Commands
```bash
trufflehog git file://. --only-verified --fail
trufflehog filesystem . --only-verified
trufflehog git file://. --since-commit HEAD~1
```

### Verified Mode
Correlates detected strings against known credential formats: AWS keys (calls STS), GitHub tokens (calls API), Slack tokens, Google service accounts. Verified=true means credential is confirmed active. Always use `--only-verified` in CI to reduce false positives.

## Pre-commit Hooks

### .pre-commit-config.yaml
```yaml
repos:
- repo: https://github.com/gitleaks/gitleaks
  rev: v8.18.2
  hooks:
  - id: gitleaks
- repo: https://github.com/trufflesecurity/trufflehog
  rev: v3.78.0
  hooks:
  - id: trufflehog
    args: [--only-verified, --fail]
```

### Hook Behavior
- GitLeaks: scans staged files for potential secrets using regex patterns
- truffleHog: scans for verified secrets (confirmed active credentials)
- Order: GitLeaks first (fast regex scan), truffleHog second (deep entropy scan)
- Both must pass before commit is allowed
- Can skip with `SKIP=gitleaks git commit` in emergency (document reason)

## CI Scanning

### Pipeline Stages
1. Pre-commit (developer machine) — catch before push
2. PR scan (CI) — block on any verified secret
3. Full history scan (nightly) — catch historical leaks
4. Incident response — when leak is detected in production

### Reporting
- Verified secrets: immediate Slack/PagerDuty alert
- Potential secrets: email digest to security team
- False positives: add to allowlist with rationale
- Historical scan report: monthly review

### Prevention Patterns
- Use `.env.example` with placeholder values
- Never commit `.env` files (`.gitignore` enforcement)
- Use `pre-commit` framework for consistent hooks
- IDE plugins: `.env` file syntax highlighting with leak warning
- Code review checklist item: "any new secrets or credentials?"
