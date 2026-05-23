# Secret Detection

## GitLeaks

### Installation
```bash
brew install gitleaks
go install github.com/gitleaks/gitleaks/v8@latest
docker pull zricethezav/gitleaks:latest
```

### Configuration (.gitleaks.toml)
```toml
title = "Project secret scan"
extend = .gitleaks.toml

[allowlist]
paths = [
  "(.git)",
  "(.test.*)",
  "(test/fixtures/)",
  "(vendor/)",
  "(node_modules/)",
]

[[rules]]
id = "custom-jwt-secret"
description = "custom JWT signing secret"
regex = '''(?i)(jwt.?secret|signing.?key).{0,20}=['\"][^'\"]{10,}['\"]'''
tags = ["custom", "jwt"]
severity = "high"

[[rules]]
id = "custom-api-endpoint"
description = "internal API endpoint with key"
regex = '''https?://internal\.[^/]+/api/[^'\"\s]{10,}'''
tags = ["custom", "api"]
severity = "medium"
```

### Commands
```bash
gitleaks detect --source . --config .gitleaks.toml -v
gitleaks protect --staged
gitleaks detect --no-git
gitleaks detect --report-path gitleaks-report.json --report-format sarif
gitleaks detect --source . --log-opts="..origin/main"
gitleaks detect --source . --since=2024-01-01
```

### CI Integration
```yaml
- name: Secret Scan
  run: gitleaks detect --source . --config .gitleaks.toml --report-path gitleaks-report.json --report-format sarif
- uses: actions/upload-artifact@v4
  with:
    name: gitleaks-report
    path: gitleaks-report.json
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: gitleaks-report.json
```

## truffleHog

### Installation
```bash
pip install truffleHog
docker run --rm -v "$PWD:/pwd" trufflesecurity/trufflehog:latest
```

### Commands
```bash
trufflehog git file://. --only-verified --fail
trufflehog filesystem . --only-verified
trufflehog git file://. --since-commit HEAD~1
trufflehog github --org=myorg --repo=myrepo --token=$GH_TOKEN
trufflehog s3 --bucket=my-bucket
```

### Verified Mode
Correlates detected strings against known credential formats: AWS keys (calls STS.GetCallerIdentity), GitHub tokens (calls API), Slack tokens, Google service accounts, Stripe keys, SendGrid keys. Verified=true means credential is confirmed active. Always use `--only-verified` in CI to reduce false positives.

## ggshield (GitGuardian)

### Installation
```bash
pip install ggshield
brew install gitguardian/tap/ggshield
```

### Commands
```bash
ggshield scan pre-commit
ggshield scan ci
ggshield scan path . --verbose
ggshield secret scan pypi <package-name>
```

### Features
300+ detector types covering API keys, tokens, and credentials from 200+ services. Incident management dashboard for tracking and triaging. Integrates with GitHub, GitLab, Bitbucket. Higher detection coverage than GitLeaks for SaaS API keys.

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
- repo: https://github.com/gitguardian/ggshield
  rev: v1.25.0
  hooks:
  - id: ggshield
    language_version: python3
    args: [-m, ggshield, secret, scan, pre-commit]
```

### Hook Behavior
GitLeaks first (fast regex scan), ggshield second (broad coverage, 300+ detectors), truffleHog last (deep entropy + verified scan). All must pass. Skip only with documented emergency reason via `SKIP=<hook>`.

## CI Scanning Pipeline
1. Pre-commit (dev machine): catch before push
2. PR scan (CI): block on any verified secret
3. Full history scan (nightly): catch historical leaks
4. Incident response: when leak detected in production

### Reporting
Verified secrets: immediate Slack/PagerDuty alert. Potential secrets: email digest to security team. False positives: add to allowlist with rationale. Historical scan report: monthly review.

### Prevention Patterns
- `.env.example` with placeholder values, never real credentials
- `.env` files enforced in `.gitignore` with pre-commit check
- `pre-commit` framework for consistent hooks across team
- IDE plugins: `.env` file highlighting with leak warnings
- Code review checklist: "any new secrets or credentials?"
- ESLint rule: `no-process-env` for direct env var access
- Shellcheck: detect env var leaks in shell scripts
