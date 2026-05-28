# QC Process Framework

## Overview

The Quality Control Process Framework defines a structured, repeatable approach to implementing and operating quality control across the software development lifecycle. This framework covers the full spectrum from defining quality standards to measuring outcomes and continuously improving the process.

## Framework Architecture

### Core Pillars

| Pillar | Description | Primary Artifacts |
|--------|-------------|-------------------|
| Standards Definition | Establish coding standards, quality criteria, and threshold values | Coding standards document, quality gate definitions |
| Automated Enforcement | Implement tooling to enforce standards without human intervention | CI pipeline configuration, lint/statically analysis rules |
| Human Review | Structured peer and formal review processes | Review checklists, inspection protocols |
| Measurement & Reporting | Track quality metrics and make them visible | Dashboards, quality reports, trend analysis |
| Continuous Improvement | Use quality data to refine standards and process | Quarterly reviews, process improvement backlog |

### Framework Maturity Model

| Level | Name | Characteristics | Key Metrics |
|-------|------|-----------------|-------------|
| 0 | Absent | No quality standards defined | No metrics |
| 1 | Ad-hoc | Informal standards, inconsistent enforcement | Spot checks |
| 2 | Defined | Written standards, basic linting in CI | Coverage %, lint errors |
| 3 | Enforced | Quality gates block non-compliant code, automated checks | Gate pass rate, build health |
| 4 | Measured | Full dashboard, trend analysis, technical debt tracking | TD ratio, defect density trend |
| 5 | Optimizing | Predictive quality models, AI-assisted review, continuous feedback | Quality prediction accuracy |

### Process Flow

```
Input: Source code changes (PR/commit)
  │
  ▼
Stage 1: Developer Local Checks
  ├── Pre-commit hooks (lint, format)
  ├── Local test run (changed files)
  └── Self-review checklist
  │
  ▼
Stage 2: CI Automated Gates
  ├── Gate 1: Compilation/build
  ├── Gate 2: Lint (zero errors required)
  ├── Gate 3: Unit tests + coverage threshold
  ├── Gate 4: Static analysis (SonarQube)
  ├── Gate 5: Dependency vulnerability scan
  └── Gate 6: Security hotspot check
  │
  ▼
Stage 3: Peer Review
  ├── Reviewer assigned (auto or manual)
  ├── Reviewer uses quality checklist
  ├── Discussion and change requests
  └── Approval or rejection
  │
  ▼
Stage 4: Merge & Deploy
  ├── All gates pass
  ├── At least one approval
  ├── No unresolved discussions
  └── Branch up to date with target
  │
  ▼
Stage 5: Post-Merge Quality
  ├── Integration tests
  ├── Nightly full analysis
  ├── Quality metrics update
  └── Technical debt register update
```

## Standards Definition

### Coding Standards Categories

| Category | Examples | Enforcement |
|----------|----------|-------------|
| Naming conventions | camelCase, PascalCase, snake_case | Linter rules |
| Formatting | Indentation, line length, spacing | Formatter (Prettier, Black, gofmt) |
| Language idioms | Error handling patterns, null safety | Static analysis rules |
| Architecture patterns | Layering, dependency injection, module boundaries | ArchUnit, dependency analysis |
| Security | Input validation, output encoding, auth checks | Security linters (ESLint security plugin, Bandit) |
| Performance | Loop optimization, memory management, async patterns | Performance lint rules |
| Documentation | JSDoc, inline comments, README updates | Docstring linters |

### Threshold Setting Guidelines

| Metric | Threshold Range | Determined By |
|--------|-----------------|---------------|
| Code coverage (overall) | 60-90% | Team capacity, legacy code volume |
| Code coverage (new code) | 80-95% | Industry best practice |
| Cyclomatic complexity | 10-15 per function | Language, domain complexity |
| Cognitive complexity | 15-20 per function | Code readability requirements |
| Duplication | 2-5% | Monorepo size, codebase age |
| Test success rate | 100% | Non-negotiable |
| Lint errors | 0 | Non-negotiable |
| Lint warnings | 50-200 | Codebase maturity |
| Dependency vulnerabilities (critical) | 0 | Non-negotiable |
| Dependency vulnerabilities (high) | 0-3 | Risk appetite |
| Technical debt ratio | 5-20% | Business context |

### Quality Standards Documentation Template

```yaml
standard:
  id: QC-STD-001
  title: TypeScript Coding Standards
  version: 2.1
  applies_to:
    - all TypeScript projects
    - frontend and backend services
  rules:
    - id: TS-001
      category: naming
      rule: Variables and functions must use camelCase
      enforcement: ESLint camelcase rule
      severity: error
    - id: TS-002
      category: naming
      rule: Classes and interfaces must use PascalCase
      enforcement: ESLint @typescript-eslint/naming-convention
      severity: error
    - id: TS-003
      category: types
      rule: Explicit return types required on public functions
      enforcement: ESLint @typescript-eslint/explicit-function-return-type
      severity: warning
    - id: TS-004
      category: error-handling
      rule: Promises must have catch handlers
      enforcement: ESLint @typescript-eslint/no-floating-promises
      severity: error
    - id: TS-005
      category: complexity
      rule: Maximum cyclomatic complexity per function is 10
      enforcement: ESLint complexity rule
      severity: error
  exception_process:
    - documented_in: ADR or ticket
    - approved_by: Tech lead
    - expires_in: 6 months
```

## Automated Enforcement Architecture

### Pipeline Integration Points

| Pipeline Stage | Check | Tool | Fail Action |
|----------------|-------|------|-------------|
| Pre-commit | Staged files formatting, lint | husky, lint-staged | Block commit |
| Push | Branch lint, test for changed files | GitHub Actions / GitLab CI | Block push |
| PR creation | Full lint, test, coverage | CI pipeline | Block merge |
| PR merge | SonarQube quality gate | SonarQube API | Block merge |
| Nightly | Full scan, dependency audit | Scheduled job | Create JIRA ticket |
| Release | Security scan, license compliance | Snyk, FOSSA | Block release |

### Tool Selection Decision Matrix

| Tool Category | JS/TS | Python | Go | Rust | Java |
|---------------|-------|--------|----|------|------|
| Linter | ESLint | Ruff | golangci-lint | Clippy | Checkstyle |
| Formatter | Prettier | Black | gofmt | rustfmt | Prettier |
| Static Analysis | SonarQube | SonarQube | SonarQube | Clippy | SonarQube |
| Coverage | Jest/Vitest | pytest-cov | go test -cover | cargo-tarpaulin | JaCoCo |
| Mutation Testing | Stryker | mutmut | go-mutesting | mutab | PIT |
| Dependency Audit | npm audit | pip-audit | govulncheck | cargo-audit | OWASP DC |
| Security SAST | CodeQL | Bandit | gosec | cargo-audit | FindSecBugs |
| License Check | license-checker | pip-licenses | go-license | cargo-deny | License Maven |
| Complexity | ESLint | Radon | cyclop | clippy | PMD |
| Duplication | jscpd | pylint | dupl | cargo-insta | PMD |

### Graded Enforcement Strategy

| Quality Aspect | CI Fails | Nightly Alert | Dashboard Only |
|----------------|----------|---------------|----------------|
| Compile error | ✓ | | |
| Lint error | ✓ | | |
| Coverage below threshold | ✓ | | |
| New bug in SonarQube | ✓ | | |
| Critical dependency vuln | ✓ | | |
| High dependency vuln | | ✓ | |
| Coverage trend negative | | | ✓ |
| TD ratio increasing | | | ✓ |
| Warning count rising | | | ✓ |
| Test count decreasing | | | ✓ |

### Security Scan Integration

```yaml
security_scanning:
  SAST:
    tool: CodeQL
    frequency: per PR + nightly
    severity_threshold: error
    blocking: true
  SCA:
    tool: npm audit / cargo audit / govulncheck
    frequency: per build
    severity_threshold: critical + high
    blocking: critical only
  Secrets:
    tool: truffleHog / GitLeaks
    frequency: per push + nightly
    blocking: true
  License:
    tool: FOSSA / cargo-deny
    frequency: nightly + per release
    blocking: per release only
  Container:
    tool: Trivy / Clair
    frequency: nightly + per release
    severity_threshold: high
    blocking: per release only
```

## Human Review Integration

### Where Humans Add Value

| Quality Aspect | Automation | Human |
|----------------|------------|-------|
| Style/formatting | ✓ | |
| Syntax correctness | ✓ | |
| Test coverage | ✓ | |
| Simple bug patterns | ✓ | |
| Architecture adherence | | ✓ |
| Design trade-offs | | ✓ |
| Edge cases and scenarios | | ✓ |
| Performance considerations | Partially | ✓ |
| Security logic flaws | Partially | ✓ |
| Business logic correctness | | ✓ |
| Readability and maintainability | Partially | ✓ |
| API design quality | Partially | ✓ |

### Balancing Automation and Human Review

The optimal quality process uses automation for everything that can be mechanically verified, freeing human reviewers to focus on design, architecture, business logic, and non-obvious defects. A good heuristic: if you can write a rule for it, automate it. If it requires judgment, context, or domain knowledge, keep a human in the loop.

### Human Review Effectiveness Factors

| Factor | Impact on Review Quality | Recommendation |
|--------|-------------------------|----------------|
| Review size | High — larger diffs find fewer defects per line | Keep PRs under 400 lines |
| Review speed | High — rushed reviews miss defects | Minimum 30 min, max 2 hours |
| Reviewer expertise | High — domain expert finds more bugs | Assign domain-relevant reviewers |
| Checklist usage | Medium — checklists reduce missed items | Use a standard checklist |
| Review time pressure | High — deadline pressure reduces effectiveness | Never skip review for deadlines |
| Author preparation | Medium — self-reviewed code has fewer defects | Require self-review before PR |
| Tool integration | Medium — inline tools improve UX | Use GitHub/GitLab review tools |

## Measurement & Reporting Framework

### Quality Metrics Taxonomy

| Metric Category | Example Metrics | Collection Method | Reporting Cadence |
|-----------------|-----------------|-------------------|-------------------|
| Gate compliance | Gate pass rate, override count | CI pipeline API | Real-time dashboard |
| Coverage | Line, branch, function coverage | Coverage tool output | Per build + trend |
| Defect density | Defects per KLOC | Defect tracker | Per release |
| Technical debt | TD ratio, remediation cost | SonarQube API | Nightly |
| Complexity | Cyclomatic, cognitive, NPATH | Static analysis | Nightly |
| Duplication | Duplicated lines % | Static analysis | Nightly |
| Dependencies | Vuln count, outdated packages | Package audit | Per build |
| Test health | Test count, pass rate, duration | CI pipeline | Per build |
| Review metrics | Review time, approval rate | Code host API | Weekly |
| Build metrics | Build pass rate, duration | CI pipeline | Per build |

### Quality Score Calculation

The overall quality score provides a single number that combines multiple dimensions:

```
QualityScore = 0.25 × CoverageScore + 0.20 × GateScore + 0.20 × TDRatioScore
               + 0.15 × DefectDensityScore + 0.10 × ComplexityScore + 0.10 × DependencyScore
```

Each dimension score is normalized to 0-100:

```
CoverageScore = min(actual_coverage / target_coverage × 100, 100)
GateScore = gate_pass_rate × 100
TDRatioScore = max(100 - td_ratio × 10, 0)  // TD ratio of 10% = 0, 0% = 100
DefectDensityScore = max(100 - defects_per_kloc × 20, 0)  // 5/KLOC = 0, 0/KLOC = 100
ComplexityScore = max(100 - (avg_complexity - 5) × 10, 0)  // avg 5 = 100, avg 15 = 0
DependencyScore = max(100 - critical_vulns × 20 - high_vulns × 5, 0)
```

### Dashboard Implementation Guide

```yaml
dashboard:
  overview_panel:
    - quality_score: {gauge, current value}
    - gate_status: {traffic light, pass/fail}
    - build_health: {status badge, pass/fail}
    - open_td_items: {counter, high/medium/low}
  trend_panel:
    - coverage_trend: {line chart, 8 weeks}
    - td_ratio_trend: {line chart, 8 weeks}
    - defect_density_trend: {line chart, 4 releases}
    - build_duration_trend: {line chart, 4 weeks}
  detail_panel:
    - top_td_items: {table, severity/module/effort}
    - module_breakdown: {bar chart, coverage per module}
    - team_velocity: {bar chart, PR throughput per team}
    - quality_by_team: {heatmap, team vs metric}
  alert_panel:
    - gate_failures_last_24h: {list}
    - coverage_regression: {alert when -5% in 2 weeks}
    - td_ratio_change: {alert when +2% in 2 weeks}
```

## Continuous Improvement Cycle

### Quality Retrospective Template

```yaml
retrospective:
  period: Q2 2026
  quality_score: {current vs previous}
  metric_deltas:
    - metric: coverage
      change: +3%
      driver: New code coverage enforcement
    - metric: td_ratio
      change: -2%
      driver: TD sprint allocation
    - metric: defect_density
      change: -0.5/KLOC
      driver: Peer review checklist improvement
  wins:
    - Zero production incidents related to code quality
    - Gate pass rate improved from 82% to 94%
  improvements_needed:
    - Dependency audit not running on all services
    - Coverage on legacy modules still below target
  action_items:
    - action: Enable dependency audit for all services
      owner: DevOps team
      deadline: 2026-07-15
    - action: Create legacy module coverage plan
      owner: Engineering leads
      deadline: 2026-07-30
```

### Process Improvement Backlog

| ID | Improvement | Impact | Effort | Status |
|----|-------------|--------|--------|--------|
| QI-01 | Add mutation testing to CI pipeline | High | 2 weeks | In progress |
| QI-02 | Implement automated TD register updates | Medium | 1 week | Planned |
| QI-03 | Introduce cognitive complexity alongside cyclomatic | High | 3 days | Done |
| QI-04 | Create quality score trend dashboard | Medium | 1 week | Backlog |
| QI-05 | Automate SonarQube quality gate exception expiry | Low | 2 days | Backlog |

### Quarterly Tool Review Checklist

- Are all current tools still best-in-class? (research options)
- Are there new tools in the ecosystem worth evaluating?
- Are any rules producing excessive false positives?
- Do threshold values still reflect team capability and product maturity?
- Is the quality dashboard still used by the team? (check analytics)
- Are any checks redundant? (consolidate if yes)
- Do new language features or framework versions require rule updates?
- Is the review process still effective? (survey team sentiment)

## Exception Management

### Exception Categories

| Category | Example | Validity Period | Approval |
|----------|---------|-----------------|----------|
| Technical limitation | Linter rule conflicts with framework requirement | Permanent (with documented rationale) | Tech lead |
| Business urgency | Time-sensitive market opportunity | Single release | Engineering manager |
| Legacy compatibility | Existing code that cannot be changed without breaking change | Until refactored | Tech lead + EM |
| Performance trade-off | Optimization requires violating complexity limit | Until performance need passes | Architect |
| Experimental feature | Deliberately exploratory code | 1 sprint | Tech lead |

### Exception Tracking Process

```
1. Developer identifies need for exception
2. Developer completes exception request form
3. Request is reviewed by tech lead (or engineering manager for business urgency)
4. If approved: exception is logged, tracked, and a remediation date is set
5. Exception is visible on quality dashboard
6. Before remediation date, automated reminder is sent
7. If exception expires without remediation: quality gate is re-enabled
8. Repeated exceptions to same rule trigger rule review
```

### Exception Request Form

```yaml
exception_request:
  id: QC-EX-{seq}
  created: {date}
  requestor: {name}
  team: {team_name}
  gate: {gate_name}
  rule: {rule_id}
  file_or_module: {path}
  reason:
    type: technical_limitation / business_urgency / legacy / performance / experimental
    description: {detailed justification}
  duration:
    type: indefinite / time_bound
    expiry: {date if time_bound}
    sprint: {sprint if time_bound}
  mitigation: {compensating controls}
  approvals:
    tech_lead: {name, date, signature}
    engineering_manager: {name, date, signature}
  status: draft / submitted / approved / rejected / expired
```

## Communication and Culture

### Quality Communication Cadence

| Audience | Message | Channel | Frequency |
|----------|---------|---------|-----------|
| Engineering team | Current quality score, top TD items, wins | Slack / email | Weekly |
| Engineering managers | Trend analysis, cross-team comparisons | Management report | Bi-weekly |
| CTO/VP Engineering | Quality score, incidents prevented, ROI | Executive summary | Monthly |
| Whole company | Quality impact on product reliability | All-hands, update | Quarterly |
| New engineers | Quality standards, tooling, expectations | Onboarding document | Once |

### Building a Quality Culture

- Celebrate quality wins publicly, not just feature releases
- Include quality metrics in sprint reviews and demos
- Make quality part of the engineering onboarding program
- Encourage refactoring as part of regular work, not a separate project
- Recognize teams that improve their quality score consistently
- Blame the process, not the person, when gates fail
- Create quality champions in each team who advocate for standards
- Share quality improvement stories in internal tech talks
- Link quality directly to customer outcomes (fewer bugs = happier users)
- Make quality visible: dashboard on a TV in the team area

### Quality Champions Program

Each team designates a quality champion responsible for:
- Advocating quality standards within the team
- Reviewing and updating team-level quality checklists
- Triaging technical debt items from the register
- Attending monthly quality champion sync meetings
- Auditing one other team's quality practices per quarter
- Suggesting process improvements based on team feedback
- Mentoring new team members on quality practices

## Role Definitions

### Quality Engineer

| Responsibility | Activities |
|----------------|------------|
| Tool administration | Maintain linter configs, SonarQube rules, CI quality steps |
| Metrics analysis | Monitor quality dashboard, identify trends and anomalies |
| Process definition | Draft quality standards, review checklists, gate definitions |
| Auditing | Perform periodic quality audits of teams and projects |
| Training | Conduct quality tool training for developers |
| Advocacy | Promote quality best practices across the organization |

### Quality Champion (per team)

| Responsibility | Activities |
|----------------|------------|
| Team advocacy | Promote quality standards within the team |
| Checklist maintenance | Keep team-level review checklists current |
| TD triage | Lead weekly technical debt triage for the team |
| Metrics awareness | Review team quality metrics and share with team |
| Cross-team sync | Attend monthly quality champion meetings |
| Onboarding | Mentor new team members on quality practices |

### Engineering Manager (related to quality)

| Responsibility | Activities |
|----------------|------------|
| Resource allocation | Ensure time for technical debt reduction |
| Standards enforcement | Support quality gate decisions |
| Cultural support | Recognize quality improvements, avoid blame |
| Metrics review | Review team quality metrics in 1:1s |
| Exception approval | Approve business urgency gate exceptions |

## Integration with Other Processes

### Quality and Agile

| Agile Event | Quality Integration |
|-------------|---------------------|
| Sprint planning | Include top 2-3 TD items from register in sprint backlog |
| Daily standup | Quick quality dashboard check (30 seconds) |
| Sprint review | Show quality score change, new TD items identified |
| Sprint retrospective | Discuss quality process improvements |
| Backlog refinement | Review TD register, update effort estimates |
| Definition of ready | Story must include acceptance criteria (testable) |
| Definition of done | Story must pass all quality gates |

### Quality and DevOps

| DevOps Practice | Quality Integration |
|-----------------|---------------------|
| CI/CD | Quality gates in pipeline, automated checks |
| Infrastructure as code | Lint and validate IaC (Terraform, CloudFormation) |
| Monitoring | Error budget tracking, SLI/SLO alignment |
| Incident management | Root cause includes quality process gap analysis |
| Feature flags | Canary releases with quality monitoring |
| Deployment | Progressive delivery with automated quality checks |

### Quality and Security

| Security Practice | Quality Integration |
|-------------------|---------------------|
| SAST | Integrated into CI quality gates |
| SCA | Dependency scanning in build pipeline |
| Secrets detection | Pre-commit hook + PR check |
| Threat modeling | Review output informs quality test cases |
| Security review | Special security review for critical components |
| Compliance | Quality metrics mapped to compliance controls |

## Escalation Matrix

| Issue | First Response | Escalation | Timeframe |
|-------|---------------|------------|-----------|
| Gate bypass attempt | Developer's tech lead | Engineering manager | < 4 hours |
| Repeated gate failures (3+) | Tech lead investigation | Engineering manager review | < 24 hours |
| Quality score drop > 10% | Quality engineer analysis | VP Engineering report | < 1 week |
| Production incident from quality gap | Root cause analysis | Process change | < 2 weeks |
| Tooling failure | DevOps team | Vendor support | < 24 hours |
| Standards dispute | Tech lead arbitration | Architecture board | < 1 week |

## Tools and Automation Catalog

### Recommended Tool Stack by Organization Size

| Organization Size | Recommended Tools | Investment |
|-------------------|-------------------|------------|
| Startup (< 20 engineers) | ESLint/Ruff + Prettier/Black + GitHub Actions | Free / low cost |
| Growing (20-100 engineers) | + SonarQube Cloud + Snyk + CodeCov | $$ |
| Enterprise (100+ engineers) | + SonarQube Server + Snyk + Checkmarx + Grafana | $$$ |
| Large Enterprise (500+ engineers) | + Full SAST/DAST + Custom dashboard + AI review | $$$$ |

## Key Performance Indicators

| KPI | Target | Measurement | Leading Indicator |
|-----|--------|-------------|-------------------|
| Gate pass rate | > 90% | PRs passing all gates / total PRs | Coverage trend positive |
| Quality score | > 80 | Composite quality score | TD ratio decreasing |
| Defect density | < 2/KLOC | Bugs / KLOC per release | Complexity increasing |
| Build duration | < 15 min | CI pipeline duration | Test count increasing |
| Review throughput | < 24 hours | Time from PR to merge | PR size decreasing |
| Exception rate | < 5% | Exceptions / total PRs | Exception count stable |
| TD ratio | < 10% | Remediation cost / dev cost | New TD items per sprint |

## Glossary

| Term | Definition |
|------|------------|
| Quality Gate | A set of conditions that code must satisfy before proceeding to the next stage |
| Technical Debt Ratio | Ratio of remediation cost to development cost, expressed as a percentage |
| Cyclomatic Complexity | Measure of program complexity based on number of linearly independent paths |
| Cognitive Complexity | Measure of how hard code is to understand for a human reader |
| Remediation Cost | Estimated effort to fix all identified quality issues, typically in person-days |
| Gate Override | Authorized bypass of a quality gate with documented exception |
| Defect Density | Number of confirmed defects per thousand lines of code (KLOC) |
| New Code | Code added or modified in the current analysis period (typically PR or sprint) |
| Quality Score | Composite metric combining multiple quality dimensions into a single number |
| SQALE | Software Quality Assessment based on Lifecycle Expectations — a method for TD estimation |
| Code Smell | Surface-level indication of a deeper problem in the code |
| Mutation Testing | Testing the quality of tests by introducing faults and checking if tests catch them |

## References

- ISO/IEC 25010:2011 — Systems and software Quality Requirements and Evaluation
- SQALE Method — Software Quality Assessment based on Lifecycle Expectations
- CISQ — Consortium for Information and Software Quality standards
- SonarQube documentation — Quality gates, rules, and metrics
- Google Testing Blog — Code coverage best practices
- Martin Fowler — Technical debt quadrant and management strategies
- OWASP — Secure coding practices and vulnerability classification
