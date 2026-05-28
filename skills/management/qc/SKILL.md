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
version: "1.1.0"
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

## Quality Report: {scope}
### Gate Status: PASS / FAIL
| Metric | Threshold | Actual | Status |
|--------|-----------|--------|--------|
| ... | ... | ... | ... |
### Violations
{list of violations with file:line}
### Action Items
{list of required fixes}

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
    warnings: 100
security:
  critical: 0
  high: 0
  medium: 5
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
```yaml
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

## Pre-Merge Checklist
- Code compiles without errors
- Lint passes (zero errors)
- Tests pass (unit + integration)
- Code coverage meets threshold
- No TODOs or FIXMEs without ticket reference
- No commented-out code
- No secrets or credentials in code
- Error handling covers all paths
- Documentation updated (README, API docs, ADR)
- Changelog entry added (if applicable)

### Step 5: Technical Debt Management

| Category | Examples | Action |
|----------|----------|--------|
| P0 — Critical | Security vulnerability, data corruption | Fix immediately, stop the line |
| P1 — High | Performance bottleneck, missing error handling | Fix this sprint |
| P2 — Medium | Code duplication, dead code | Schedule within 2 sprints |
| P3 — Low | Style inconsistencies, naming issues | Fix opportunistically |

## Technical Debt Register
| ID | Area | Issue | Severity | Effort | Sprint |
|----|------|-------|----------|--------|--------|
| TD-01 | PaymentService | Cyclomatic complexity 24 | High | 3d | Sprint 5 |
| TD-02 | UserModule | 15% duplication in validators | Medium | 1d | Sprint 6 |
| TD-03 | ApiClient | No retry logic on 5xx | Critical | 0.5d | Sprint 4 |

### Step 6: CI Quality Automation

```yaml
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint
      - run: npm run test -- --coverage
      - run: npm audit --audit-level=high
      - uses: sonarsource/sonarqube-scan-action@v2
```

### Step 7: Quality Dashboard Setup

Define a quality dashboard visible to the entire team containing:
- Current gate pass/fail status per branch
- Coverage trend chart (last 4 sprints)
- Technical debt backlog size trend
- Defect density per module
- Lint error count over time
- Dependency vulnerability count
- Build health (pass rate, duration)

### Step 8: Pull Request Quality Gates

Automate quality checks in PR workflow:
- Gate 1: Lint check (must pass)
- Gate 2: Unit tests with coverage (must meet threshold)
- Gate 3: SonarQube quality gate (no new bugs, smells, vulnerabilities)
- Gate 4: Dependency check (no critical vulnerabilities)
- Gate 5: Required reviewers based on changed files pattern (CODEOWNERS)

### Step 9: Quality Review Cadence

Schedule recurring quality reviews:
- Daily: CI pipeline health check
- Weekly: Technical debt triage (30 min)
- Sprint review: Quality metrics retrospective
- Monthly: Quality process improvement
- Quarterly: Tooling and threshold review

### Step 10: Enforcement and Escalation

Define escalation path for quality violations:
- Gate failure in PR: Blocked merge, author must fix
- Repeated gate failure (3+ times): Team lead notified
- Production incident due to quality gap: Root cause analysis, process update
- Exception request: Requires documented justification, security review, expiry date

## Framework / Methodologies

### Quality Control Framework Comparison

| Aspect | ISO 25010 | SQALE | CISQ | SonarQube Way |
|--------|-----------|-------|------|---------------|
| Origin | ISO standard | Maintainability model | Consortium standard | Open-source |
| Dimensions | 8 quality characteristics | 7 maintainability factors | 4 code quality metrics | 5 axes (reliability, security, maintainability, coverage, duplications) |
| Scoring | Weighted sub-characteristics | Remediation cost | Automated measurement | Rating A-E per axis |
| Best for | Formal assessments | Technical debt cost estimation | Enterprise procurement | Day-to-day CI enforcement |
| Complexity | High | Medium | Low | Low |

### Decision Tree: Choose Quality Approach

```
What is your primary goal?
  ├── Enforce minimum standards in CI
  │   └── Use SonarQube Quality Gate with tool-specific linters
  │       └── Language? JS/TS → ESLint + Jest + SonarQube
  │       └── Python → Ruff + pytest-cov + SonarQube
  │       └── Go → golangci-lint + go test + govulncheck
  │       └── Rust → clippy + cargo-tarpaulin + cargo-audit
  ├── Measure and reduce technical debt
  │   └── Use SQALE model with remediation cost estimation
  │       └── Track TD ratio (remediation cost / development cost)
  │       └── Target: TD ratio < 5%
  ├── Prepare for external audit or compliance
  │   └── Use ISO 25010 with full documentation
  │       └── Map controls to quality characteristics
  │       └── Generate compliance evidence automatically
  └── Procurement or vendor evaluation
      └── Use CISQ automated measurement
          └── Request SBOM with CISQ metrics
```

### Integration Maturity Model

| Level | Stage | Characteristics | Automation |
|-------|-------|-----------------|------------|
| 1 | Initial | No standards, manual reviews | None |
| 2 | Managed | Basic linter, coverage targets | Pre-commit hooks |
| 3 | Defined | Quality gates in CI, rules defined | PR checks |
| 4 | Measured | Dashboard, trend analysis, TD tracking | Automated reporting |
| 5 | Optimizing | AI-assisted review, predictive quality | Continuous improvement |

### Quality Gates by SDLC Phase

| Phase | Gate | Minimum Pass |
|-------|------|--------------|
| Design | Architecture review, ADR | All concerns addressed |
| Development | Pre-commit hooks, local lint | Zero errors |
| Pull request | CI quality gates, peer review | All gates pass |
| Staging | Integration tests, security scan | All critical pass |
| Production | Smoke tests, canary analysis | Zero errors |
| Post-release | Monitoring, error budgets | SLO within budget |

## Common Pitfalls

### Pitfall 1: Coverage Without Assertion Quality
Raising coverage thresholds without ensuring test quality leads to worthless tests. Teams write getter/setter tests that exercise code but assert nothing meaningful. Always pair coverage targets with mutation testing (Stryker, PIT) to measure assertion effectiveness.

### Pitfall 2: Ignoring New Code Coverage
Setting only overall coverage targets allows teams to meet thresholds by covering only legacy code while new code remains untested. Always separate overall and new code coverage. New code coverage should be 10% higher than overall.

### Pitfall 3: Complexity Limits Without Context
Applying a blanket cyclomatic complexity limit of 10 everywhere ignores legitimate complexity in state machines, parsers, or complex business rules. Use complexity limits with exemptions for well-documented cases, or use cognitive complexity instead.

### Pitfall 4: Alert Fatigue from Too Many Rules
Enabling every lint rule creates noise that desensitizes the team. Important violations get lost in hundreds of warnings. Start with the strict preset, then selectively disable low-value rules. Keep warning count manageable (< 100 warnings in the entire codebase).

### Pitfall 5: Technical Debt Register Abandonment
Teams create a technical debt register during the first quality initiative and never update it. The register becomes stale and irrelevant. Integrate TD tracking into the sprint planning process. Review and update the register every sprint.

### Pitfall 6: Manual Override Culture
If quality gates can be bypassed with a manager's approval, engineers will stop respecting them. Make overrides rare, documented, time-boxed, and visible to the entire team. An override that expires in 7 days is more honest than an indefinite exception.

### Pitfall 7: One-Time Quality Initiative
Running a quality improvement sprint and declaring victory creates a temporary spike that decays. Quality is a continuous practice, not a project. Embed quality checks in every stage of development. Automate enforcement to prevent regression.

### Pitfall 8: Blaming Instead of Fixing
Using quality metrics to evaluate individual performance creates perverse incentives — engineers game the numbers instead of improving quality. Quality data is process data, not people data. Focus metrics on the system, not individuals.

### Pitfall 9: Ignoring Third-Party Dependencies
Focusing quality efforts exclusively on first-party code while ignoring npm packages, PyPI dependencies, and container base images leaves significant risk unaddressed. Run `npm audit`, `cargo audit`, `govulncheck`, and container scanning in CI. Maintain an SBOM for every release.

### Pitfall 10: Over-Automation of Reviews
Automating every aspect of code review (format, lint, complexity, coverage) can create a false sense of security. Automated tools catch style and obvious bugs but miss architectural issues, design problems, and subtle logic errors. Automated gates are a floor, not a ceiling.

## Best Practices

- **Enforce gates at PR time, not at commit time**: Developers should be able to commit and push freely; gates block merge, not work.
- **Separate overall vs new code coverage**: New code should meet a higher threshold (90%) than legacy code (80%) to prevent quality drift.
- **Use incremental analysis**: Only analyze changed files in PRs, not the entire codebase. Full analysis runs nightly.
- **Track quality trends, not snapshots**: A single snapshot is misleading. Track 4-week rolling averages for coverage, defect density, and technical debt.
- **Integrate quality into the definition of done**: A story is not done until quality gates pass. This prevents end-of-sprint quality crunches.
- **Automate everything that can be automated**: Manual quality checks should be the exception, not the rule. Humans review design and architecture; machines enforce style and standards.
- **Make quality visible**: Display gate status, coverage, and TD trends on a team dashboard. Use CI badges in the README. Celebrate quality improvements publicly.
- **Triage technical debt every sprint**: Dedicate 30 minutes per sprint to review and prioritize the top 5 technical debt items. Assign owners and sprint targets.
- **Ratchet quality forward**: When fixing a file, leave it better than you found it. If coverage dips, the next PR on that file must restore it. No net quality regression.
- **Conduct regular tooling reviews**: Quality tools evolve fast. Review your toolchain quarterly. What was best-in-class 6 months ago may now be outdated.

## Templates & Tools

### Quality Gate Exception Form

```yaml
exception_id: QE-{date}-{n}
requestor: {name}
gate: {gate_name}
reason: {business justification}
duration: {expiry date or sprint}
approved_by: {manager/lead}
status: open / approved / rejected / expired
mitigation: {compensating controls if any}
```

### Technical Debt Register Template

```yaml
register:
  - id: TD-{n}
    module: {service/module name}
    description: {clear description of the debt}
    category: design / test / documentation / security / performance
    severity: critical / high / medium / low
    effort_estimate: {person-days}
    identified_by: {name}
    identified_date: {date}
    sprint_target: {sprint}
    owner: {team or person}
    status: backlog / triaged / in_progress / fixed / verified / accepted
    remediation_notes: {optional notes}
```

### Quality Dashboard Configuration (Grafana)

```json
{
  "dashboard": {
    "panels": [
      {"title": "Coverage Trend", "type": "graph", "target": "avg_coverage"},
      {"title": "Gate Status", "type": "stat", "target": "gate_pass_rate"},
      {"title": "TD Ratio", "type": "gauge", "target": "td_ratio"},
      {"title": "Defect Density", "type": "heatmap", "target": "defects_per_kloc"},
      {"title": "Build Health", "type": "table", "target": "build_duration_health"}
    ]
  }
}
```

### PR Quality Check GitHub Action

```yaml
name: Quality Gate
on: pull_request
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --coverage
      - uses: sonarsource/sonarqube-quality-gate-action@v2
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
      - run: npm audit --audit-level=high
```

## Case Studies

### Case Study 1: Fintech Startup — From Quality Crisis to Consistent Delivery
A 40-person fintech startup faced frequent production incidents due to untested code, high complexity, and unchecked dependencies. They implemented quality gates in CI: 80% coverage, zero lint errors, zero critical dependencies, complexity < 15. After 3 months, production incidents dropped 70%. After 6 months, deployment frequency doubled. Key success factor: executive sponsorship made gates non-negotiable.

### Case Study 2: E-Commerce Platform — Technical Debt Turnaround
A mature e-commerce platform had accumulated 18 months of technical debt with a TD ratio of 32%. They established a quality register, allocated 20% of every sprint to TD reduction, and used SQALE remediation cost to prioritize. In 2 quarters, TD ratio dropped to 8%. The key insight: measuring remediation cost in currency (dollars) made the business case for quality improvement self-evident.

### Case Study 3: SaaS Enterprise — Gate Exception Spiral
An enterprise SaaS company allowed blanket exceptions to quality gates for critical customer deployments. Within 3 months, 80% of deployments used exception overrides. Quality metrics collapsed. The fix: implementing a time-boxed exception system with automatic expiry, visibility to the CTO, and a mandatory follow-up remediation plan. Exceptions dropped to < 5% of deployments within 6 weeks.

### Case Study 4: Open-Source Library — Community Quality Standards
An open-source project with 500+ contributors needed consistent quality across PRs from external contributors. They implemented automated quality gates: lint, test coverage > 75%, no new SonarQube issues. Maintainers reviewed only code that passed automated gates. PR merge time decreased from 14 days to 3 days, and defect rate dropped 45%.

## Rules

- Quality gates are non-negotiable for production deployments — no manual override
- Coverage thresholds apply to new code, not just overall — prevent regression
- Complexity limits vary by language (10 for most, 15 for Go error handling)
- Technical debt must be tracked in a register, not scattered across TODOs
- Peer review checklist must pass before merge — automate checks where possible
- Quality metrics must be visible to the whole team (dashboard, CI badge)
- One quality gate exception requires a documented justification and remediation date
- Coverage without test quality is meaningless — review test assertions, not just lines
- New code must meet higher quality standards than legacy code
- Quality gate exceptions must expire — indefinite exceptions become the norm
- Quality data is process data, not people data — never use for performance evaluation
- Automated quality gates are a minimum floor, not a maximum ceiling
- Third-party dependencies must be scanned every build
- Technical debt register must be reviewed every sprint
- Quality improvement initiatives must have measurable targets

## References

- references/inspection-process.md — Formal inspection process with roles and defect classification
- references/qc-advanced.md — QC advanced topics including microservices, security, and DevOps
- references/qc-checklists.md — Comprehensive checklists for code review, security, and deployment
- references/qc-fundamentals.md — Core QC concepts and terminology
- references/quality-gates-matrix.md — Quality gate definitions per language (JS, Python, Go, Rust)
- references/technical-debt-register.md — Technical debt register template with severity and effort
- references/qc-process-framework.md — QC process framework and maturity model
- references/qc-metrics-dashboard.md — Metrics-driven quality dashboards and KPIs

## Handoff
After completing this skill:
- Next skill: **code-review** — detailed code review on the implementation
- Pass context: quality gate results, violation list, technical debt register
