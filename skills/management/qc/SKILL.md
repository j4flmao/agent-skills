---
name: qc
description: >
  Use this skill when the user says 'code quality', 'quality gate', 'static
  analysis', 'coding standards', 'peer review', 'code coverage', 'cyclomatic
  complexity', 'lint rules', 'technical debt', 'quality metrics', 'quality
  dashboard', 'SonarQube', 'ESLint', 'quality checklist', or needs quality
  control. Covers: quality gates, static analysis enforcement, coding standards,
  peer review process, quality metrics, and technical debt management.
  Do NOT use for: test planning (use qa), performance optimization, or code
  review (use code-review).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, qc, quality]
---

# Quality Control

## Purpose
Enforce code quality standards through quality gates, static analysis, peer reviews, and quality metrics automation.

## Agent Protocol

### Trigger
Exact user phrases: "code quality", "quality gate", "static analysis", "coding standards", "peer review", "code coverage", "cyclomatic complexity", "lint rules", "technical debt", "quality metrics", "quality dashboard", "SonarQube", "ESLint", "quality checklist", "quality gate failing", "coverage threshold".

### Input Context
Before activating, verify:
- The language/stack is known (for tool selection).
- The current quality tooling is known (linter, static analysis, coverage).
- The threshold values are defined or need to be defined.

### Output Artifact
No file output. This skill produces text guidance, quality gate configurations, or quality reports.

### Response Format
Answer exactly:
```
## Quality Report: {scope}
### Gate Status: PASS / FAIL
| Metric | Threshold | Actual | Status |
|--------|-----------|--------|--------|
| ... | ... | ... | ... |
### Violations
{list of violations with file:line}
### Action Items
{list of required fixes}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanations of why quality matters.

### Completion Criteria
This skill is complete when:
- [ ] Quality gates are defined with measurable thresholds for the specific stack.
- [ ] Each violation is identified with file, line, and rule.
- [ ] Actionable fixes are specified for each failing gate.
- [ ] Technical debt items are prioritized by severity and effort.

### Max Response Length
Quality report: 25 lines. Gate configuration: 20 lines.

## Workflow

### Step 1: Define Quality Gates

| Metric | Threshold | Tool |
|--------|-----------|------|
| Code coverage | >= 80% (overall), >= 90% (new code) | Istanbul, JaCoCo, cargo-tarpaulin |
| Cyclomatic complexity | <= 10 per function | ESLint complexity, Radon |
| Duplication | < 3% | SonarQube, PMD |
| Code smells | 0 blocker/critical | SonarQube, CodeClimate |
| Security hotspots | 0 | SonarQube, CodeQL |
| Test success rate | 100% | CI pipeline |
| Lint errors | 0 | ESLint, Ruff, golangci-lint |
| Dependency vulnerabilities | 0 critical/high | npm audit, cargo audit, govulncheck |

### Step 2: Quality Gate Configuration

```yaml
# .quality-gates.yml
gates:
  coverage:
    overall: 80
    new_code: 90
  complexity:
    max_per_function: 10
    max_per_file: 50
  duplication:
    max_percent: 3
  lint:
    errors: 0
    warnings: 100  # advisory only
security:
  critical: 0
  high: 0
  medium: 5      # must be addressed within sprint
```

### Step 3: Static Analysis Configuration per Stack

**TypeScript / JavaScript:**
```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/strict"],
  "rules": {
    "complexity": ["error", 10],
    "max-lines-per-function": ["warn", 50],
    "no-console": "error"
  }
}
```

**Python:**
```toml
[tool.ruff]
line-length = 100
select = ["E", "F", "I", "N", "W", "C90"]
[tool.ruff.mccabe]
max-complexity = 10
```

**Go:**
```bash
# .golangci.yml
linters:
  enable:
    - errcheck
    - gosimple
    - govet
    - staticcheck
    - cyclop
    - dupl
linters-settings:
  cyclop:
    max-complexity: 10
```

### Step 4: Peer Review Quality Checklist
```
## Pre-Merge Checklist
- [ ] Code compiles without errors
- [ ] Lint passes (zero errors)
- [ ] Tests pass (unit + integration)
- [ ] Code coverage meets threshold
- [ ] No TODOs or FIXMEs without ticket reference
- [ ] No commented-out code
- [ ] No secrets or credentials in code
- [ ] Error handling covers all paths
- [ ] Documentation updated (README, API docs, ADR)
- [ ] Changelog entry added (if applicable)
```

### Step 5: Technical Debt Management

| Category | Examples | Action |
|----------|----------|--------|
| **P0 — Critical** | Security vulnerability, data corruption | Fix immediately, stop the line |
| **P1 — High** | Performance bottleneck, missing error handling | Fix this sprint |
| **P2 — Medium** | Code duplication, dead code | Schedule within 2 sprints |
| **P3 — Low** | Style inconsistencies, naming issues | Fix opportunistically |

```
## Technical Debt Register
| ID | Area | Issue | Severity | Effort | Sprint |
|----|------|-------|----------|--------|--------|
| TD-01 | PaymentService | Cyclomatic complexity 24 | High | 3d | Sprint 5 |
| TD-02 | UserModule | 15% duplication in validators | Medium | 1d | Sprint 6 |
| TD-03 | ApiClient | No retry logic on 5xx | Critical | 0.5d | Sprint 4 |
```

### Step 6: CI Quality Automation
```yaml
# .github/workflows/quality.yml
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint
      - run: npm run test -- --coverage
      - run: npm audit --audit-level=high
      - uses: sonarsource/sonarqube-scan-action@v2
```

## Rules
- Quality gates are non-negotiable for production deployments — no manual override
- Coverage thresholds apply to new code, not just overall — prevent regression
- Complexity limits vary by language (10 for most, 15 for Go error handling)
- Technical debt must be tracked in a register, not scattered across TODOs
- Peer review checklist must pass before merge — automate checks where possible
- Quality metrics must be visible to the whole team (dashboard, CI badge)
- One quality gate exception requires a documented justification and remediation date
- Coverage without test quality is meaningless — review test assertions, not just lines

## References
- `references/quality-gates-matrix.md` — quality gates per language with tool-specific configs
- `references/technical-debt-register.md` — technical debt tracking template
- `references/inspection-process.md` — Code inspection process and peer review checklists
- `references/qc-checklists.md` — Quality control checklists per development phase

## Handoff
After completing this skill:
- Next skill: **code-review** — detailed code review on the implementation
- Pass context: quality gate results, violation list, technical debt register
