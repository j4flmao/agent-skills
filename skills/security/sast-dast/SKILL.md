---
name: security-sast-dast
description: >
  Use this skill when asked about SAST, DAST, static analysis, dynamic analysis, code scanning, SonarQube, Semgrep, Checkmarx, Fortify, OWASP ZAP, or Burp Suite. This skill enforces: SAST tool integration with custom rule writing, DAST scanning with authenticated sessions, false positive triage workflow, and CI pipeline gate configuration. Do NOT use for: dependency scanning (SBOM), container image scanning, or runtime security monitoring.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, testing, phase-10]
---

# Security SAST/DAST

## Purpose
Build a security scanning pipeline with static analysis rule sets, dynamic analysis scenarios, false positive management, and CI gating.

## Agent Protocol

### Trigger
Exact user phrases: "SAST", "DAST", "static analysis", "dynamic analysis", "code scanning", "SonarQube", "Semgrep", "Checkmarx", "Fortify", "OWASP ZAP", "Burp Suite", "security scan pipeline", "code quality gate", "scan results", "false positive".

### Input Context
Before activating, verify:
- Programming languages and frameworks in the codebase
- CI/CD platform (GitHub Actions, GitLab CI, Jenkins, CircleCI)
- SAST tool preference or existing tool (Semgrep, SonarQube, CodeQL, Checkmarx)
- DAST target environment (staging URL, authentication method, API endpoints)
- Existing scan frequency and gate thresholds

### Output Artifact
Security scanning pipeline configuration as YAML and rule set files.

### Response Format
```yaml
# SAST pipeline step
# Semgrep rules
# Quality gate thresholds
```
```bash
# DAST scan script
# CI integration snippet
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] SAST tool configured with language-appropriate rule packs
- [ ] Custom rules written for project-specific patterns
- [ ] False positive triage workflow defined
- [ ] DAST scan configured with authenticated session handling
- [ ] CI pipeline gates set with severity thresholds
- [ ] Scan results correlated between SAST and DAST findings

### Max Response Length
300 lines of configuration and rules.

## Workflow

### Step 1: SAST Tool Selection
Semgrep: best for custom rule writing, multi-language, fast. SonarQube: best for quality gates, technical debt tracking, broad language support. CodeQL: best for deep interprocedural analysis, variant analysis. Checkmarx/Fortify: enterprise-grade with compliance reporting. Default choice: Semgrep for SAST + SonarQube for quality gates.

### Step 2: Rule Configuration
Enable built-in rule packs: Semgrep `p/security-audit`, `p/owasp-top-ten`, `p/command-injection`. Write custom rules for project-specific patterns: hardcoded secrets, dangerous function usage, missing authorization checks, SQL injection via ORM bypass. Rule severity: ERROR (must fix), WARN (should fix), INFO (suggested). False positives: tag with `fp` metadata and documented reason.

### Step 3: CI Integration
SAST runs on every PR — diff-aware scanning for changed files only. Full scan on main branch daily. Quality gates: 0 ERROR severity findings, WARN count must not increase, coverage threshold for new code. DAST runs on staging deployment — weekly full scan, on-demand for critical releases. Pipeline blocks on critical findings.

### Step 4: DAST Scanning
OWASP ZAP: automated scan with API context, authenticated session management via bearer token or form auth. Burp Suite: manual testing with targeted scope. Scan profile: spider (crawl all pages), active scan (inject payloads), fuzzing (parameter mutation). Exclude logout, password change, and high-volume endpoints from active scanning.

### Step 5: False Positive Management
Triage workflow: automated deduplication → security review → mark as FP/WONT-FIX/ACCEPTED-RISK. Store decisions in `.sast-fps.yml` per project. Suppress known FP with reason comment and expiry date. Review suppressed rules quarterly.

### Step 6: Results Correlation
Map SAST findings to affected endpoints in DAST scope. Prioritize findings that appear in both analyses. Track finding age: 0-7 days (active), 7-30 days (aging), 30+ days (overdue). Generate weekly trend report by severity and category.

## Rules
- SAST runs on every PR diff, not full codebase
- DAST targets staging only — never production
- Custom Semgrep rules stored in `.semgrep/rules/` with tests
- False positives documented with rationale, not silently suppressed
- Quality gate blocks on any ERROR severity finding
- DAST excludes destructive endpoints (DELETE, mass-update)
- Scan results stored for 90 days minimum

## References
- `references/sast-practices.md` — Semgrep, SonarQube, CodeQL, rule writing, CI integration
- `references/dast-practices.md` — OWASP ZAP, Burp Suite, authentication scanning, CI pipeline

## Handoff
`security-api-security` for API-specific scanning and protection rules
`devops-ci-cd` for pipeline integration and deployment gates
