# SAST/DAST Fundamentals

## Overview
Static Application Security Testing (SAST) and Dynamic Application Security Testing (DAST) are complementary security testing approaches. SAST analyzes source code for vulnerabilities without executing it (white-box). DAST tests running applications for vulnerabilities from the outside (black-box). Together they provide comprehensive application security coverage.

## Core Concepts

### Concept 1: SAST (Static Analysis)
- Analyzes source code, bytecode, or binaries without execution
- Detects vulnerabilities early in SDLC (shift-left)
- Scans: SQL injection, XSS, buffer overflows, insecure crypto, hardcoded secrets
- Tools: Semgrep, SonarQube, CodeQL, Checkmarx, Fortify, Snyk Code
- **True positives**: Real vulnerabilities found by the tool
- **False positives**: Incorrectly flagged as vulnerable (SAST has high FP rate)
- **False negatives**: Vulnerabilities the tool misses

### Concept 2: DAST (Dynamic Analysis)
- Tests running applications from the outside (no source code access)
- Finds vulnerabilities accessible to an attacker
- Scans: XSS, SQL injection, CSRF, authentication issues, misconfigurations
- Tools: OWASP ZAP, Burp Suite, Acunetix, Qualys Web App Scanner
- **True positives**: Verifiable vulnerabilities
- **False positives**: Lower than SAST, but still present
- **Context-aware**: Finds issues SAST can't (runtime configuration, third-party components)

### Concept 3: SAST vs DAST Comparison
| Aspect | SAST | DAST |
|--------|------|------|
| Phase | Early (commit, build) | Late (staging, pre-prod) |
| Access needed | Source code | Running application |
| Scan speed | Fast (minutes) | Slower (minutes-hours) |
| False positives | Higher | Lower |
| Coverage | All code paths | Only reachable paths |
| Config detection | Limited | Good |
| Third-party vulns | Limited (SCA needed) | Runtime detection |

### Concept 4: CI/CD Integration
- **SAST** in CI: Run on every PR/commit, block on critical/high findings
- **DAST** in CI: Run on staging/preview deployment, block on verified findings
- **Gate vs non-gate**: Some teams block builds on findings; others only alert
- **Baseline**: Compare against known findings to avoid regressions
- **Delta scanning**: Only scan changed code for faster feedback

## Implementation Guide

### Step 1: SAST Configuration
```yaml
# .semgrep.yml
rules:
  - id: sql-injection
    patterns:
      - pattern: "execute($QUERY)"
      - metavariable-regex:
          metavariable: $QUERY
          regex: ".*\\$.*"
    message: "Potential SQL injection: use parameterized queries"
    severity: ERROR
    languages: [python, javascript]

  - id: hardcoded-secret
    patterns:
      - pattern-either:
          - pattern: "password = \"$PASS\""
          - pattern: "api_key = \"$KEY\""
      - pattern-not: "password = os.getenv(\"$VAR\")"
    message: "Hardcoded secret detected"
    severity: ERROR
    languages: [python]

  - id: debug-endpoint
    patterns:
      - pattern: "@app.route(\"/debug\")"
    message: "Debug endpoint exposed in production"
    severity: WARNING
    languages: [python]
```

### Step 2: DAST Configuration (OWASP ZAP)
```yaml
# zap-config.yml
env:
  contexts:
    - name: "Web App"
      urls: ["https://staging.example.com"]
      authentication:
        method: "browser"
        login_url: "https://staging.example.com/login"
        login_data: "username={{USER}}&password={{PASS}}"

params:
  scan_policy: "API-Scan"  # or "Default Policy"
  spider:
    max_depth: 5
    max_children: 100
  active_scan:
    policy_definition:
      - id: 40012  # SQL Injection
        threshold: "MEDIUM"
        strength: "HIGH"
      - id: 40014  # XSS
        threshold: "LOW"
        strength: "HIGH"
      - id: 90019  # CSRF
        threshold: "MEDIUM"
```

### Step 3: SAST in GitHub Actions
```yaml
name: SAST Scan
on: [pull_request]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: semgrep/semgrep-action@v1
        with:
          config: p/default
          publishToken: ${{ secrets.SEMGREP_APP_TOKEN }}
          auditOn: push
      - name: Check blocking findings
        run: |
          if grep -q "blocking" semgrep_results.sarif; then
            echo "Blocking findings detected!"
            exit 1
          fi
```

### Step 4: DAST in CI Pipeline
```yaml
name: DAST Scan
on:
  deployment_status:
    states: [success]

jobs:
  zap-scan:
    if: github.event.deployment_status.environment == 'staging'
    runs-on: ubuntu-latest
    steps:
      - name: ZAP Scan
        uses: zaproxy/action-full-scan@v0.4.0
        with:
          target: ${{ github.event.deployment_status.target_url }}
          rules_file_name: zap-config.yml
          cmd_options: "-a"
```

## Best Practices
- Run SAST on every PR/commit — fast feedback prevents vulnerabilities from reaching main
- Run DAST on staging/preview before production deployment
- Triage SAST findings: automated tools generate noise, manual review separates real from false
- Use consistent severity ratings and remediation SLAs
- SAST + DAST + SCA (software composition analysis) for comprehensive coverage
- Establish baseline and track delta — don't overwhelm teams with existing findings
- Customize rule sets to your tech stack and risk profile
- Train developers to understand and fix findings
- Integrate results into existing workflows (Jira, Slack, ticketing system)
- Regular tool updates — new vulnerability patterns are discovered constantly

## Common Pitfalls
- Relying on SAST or DAST alone — they find different vulnerability classes
- Ignoring false negatives — no tool catches everything
- Running SAST only at release (too late for remediation)
- Blindly trusting automated scan results (especially SAST false positives)
- No baseline management — same findings reported every scan, causing alert fatigue
- Scanning without authentication — misses most application vulnerabilities
- Not customizing scan configurations to the application
- Blocking builds on low-severity findings unnecessarily

## Key Points
- SAST analyzes source code without execution (early, fast, high FP rate)
- DAST tests running applications from outside (later, contextual, lower FP rate)
- SAST and DAST are complementary — use both for comprehensive coverage
- SAST in CI per PR; DAST on staging before production
- Always scan with authenticated sessions to find real vulnerabilities
- Establish baselines and track deltas to reduce noise
- Integrate findings into developer workflows (Jira, PR comments)
- Customize rules for your tech stack and risk profile
- SAST + DAST + SCA + manual review provides defense in depth
