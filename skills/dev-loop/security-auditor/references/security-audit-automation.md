# Security Audit Automation

## Automated Scanning Tools

### SAST (Static Analysis Security Testing)
```yaml
# .github/workflows/sast.yml
jobs:
  sast:
    steps:
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript, typescript
          queries: security-and-quality
      - uses: github/codeql-action/analyze@v3
      - run: semgrep --config=auto --error .
      - run: eslint-plugin-security --format sarif
```

### DAST (Dynamic Analysis Security Testing)
```yaml
jobs:
  dast:
    steps:
      - uses: zaproxy/action-full-scan@v0
        with:
          target: ${{ env.STAGING_URL }}
          rules_file_name: .zap/rules.tsv
          cmd_options: '-a -j'
```

### Dependency Scanning
```yaml
jobs:
  dependency-scan:
    steps:
      - uses: actions/dependency-review-action@v3
      - run: |
          npm audit --audit-level=high
          trivy fs --severity CRITICAL,HIGH .
```

## CI/CD Integration

### Pre-Merge Gates
| Check | Tool | Block Level |
|-------|------|-------------|
| SAST scan | CodeQL, Semgrep | All findings > MEDIUM |
| Dependency audit | npm audit, Trivy | CRITICAL, HIGH |
| Secrets detection | TruffleHog, Gitleaks | All findings |
| License compliance | FOSSA, Snyk | Blocked licenses |

### Pipeline Stages
```
Commit → SAST → Dependency Scan → Build → DAST (Staging) → Deploy
         ↓                        ↓                    ↓
      Fail if >MEDIUM        Fail if CRITICAL     Fail if HIGH
```

## Secrets Detection

### Pre-commit Hook
```bash
#!/bin/sh
gitleaks detect --source . --verbose
```

### CI Scanning
```yaml
- uses: trufflesecurity/trufflehog@v3
  with:
    extra_args: --only-verified --fail
```

## Vulnerability Management

### Automated Remediation
```yaml
# renovate.json
{
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"],
    "reviewers": ["team:security"]
  },
  "packageRules": [
    {
      "matchUpdateTypes": ["pin", "digest"],
      "automerge": true
    }
  ]
}
```

### Reporting
- Generate SARIF reports from all scanners
- Upload to GitHub Security tab
- Create Jira tickets for CRITICAL findings
- Weekly security dashboard with trend analysis

## Compliance Automation

### Policy as Code
```rego
# policy/security.rego
package security

deny[msg] {
  input.kind == "Deployment"
  not input.spec.template.spec.containers[_].securityContext.runAsNonRoot
  msg := "Containers must run as non-root"
}
```

### Evidence Collection
- Automated compliance report generation
- Continuous control monitoring
- Audit trail for all security events
- Evidence attachment to compliance tickets
