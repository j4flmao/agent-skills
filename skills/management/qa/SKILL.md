---
name: qa
description: >
  Use this skill when the user says 'test strategy', 'test plan', 'test case',
  'test scenario', 'equivalence partitioning', 'boundary value analysis',
  'defect report', 'test metrics', 'regression testing', 'smoke test',
  'automation strategy', 'test coverage', or needs quality assurance.
  Covers: test strategy, test case design, defect management, test metrics,
  automation strategy, and regression testing. Do NOT use for: code quality
  standards (use qc), performance testing (use performance-profiler).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, qa, testing]
---

# Quality Assurance

## Purpose
Design and manage testing activities: test strategy, test case design, defect management, test metrics, and automation strategy.

## Agent Protocol

### Trigger
Exact user phrases: "test strategy", "test plan", "test case", "test scenario", "equivalence partitioning", "boundary value analysis", "defect report", "test metrics", "regression testing", "smoke test", "automation strategy", "test coverage", "QA plan", "test execution", "exploratory testing".

### Input Context
Before activating, verify:
- The feature or system under test is known.
- The test level is clear (unit, integration, E2E, manual, exploratory).
- Existing artifacts are available (user stories, acceptance criteria, technical specs).

### Output Artifact
Writes test plan or test cases to `docs/tests/` or produces structured text.

### Response Format
Answer exactly:
```
## Test Plan: {feature}
### Scope
- In scope: {list}
- Out of scope: {list}
### Test Levels
- Unit: {coverage target}
- Integration: {key integration points}
- E2E: {critical user journeys}
### Test Data
{data setup requirements}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanations of testing theory.

### Completion Criteria
This skill is complete when:
- [ ] Test plan covers scope, test levels, environment, and data.
- [ ] Test cases cover happy path, negative path, edge cases, and error paths.
- [ ] Defect reports include steps to reproduce, expected vs actual, severity.
- [ ] Automation strategy defines what to automate and what not to.
- [ ] Test metrics are defined with measurable targets.

### Max Response Length
Test plan: 30 lines. Test cases: 5 lines per case. Defect report: 10 lines.

## Workflow

### Step 1: Test Strategy

| Test Level | Who | When | Automation |
|------------|-----|------|------------|
| **Unit** | Developers | During development | Required (80%+ coverage) |
| **Integration** | Developers + QA | After unit tests | Required for critical paths |
| **E2E** | QA | Before release | Critical journeys only |
| **Manual / Exploratory** | QA | New features, complex UIs | Not automated |
| **Regression** | QA + CI | Every deployment | Automated suite |
| **Smoke** | CI | Every build | Full automation |

### Step 2: Test Case Design

**Equivalence Partitioning:**
```
Input: Age field (1-120)
Partitions:
  Valid: 1-120 (one test per boundary)
  Invalid: < 1 (e.g., 0, -5)
  Invalid: > 120 (e.g., 121, 200)
  Invalid: non-numeric (e.g., "abc")
Test cases: age=1, age=120, age=0, age=121, age="abc"
```

**Boundary Value Analysis:**
```
Input: Password length (8-100 chars)
Boundaries: 7, 8, 9, 99, 100, 101
Test cases: password="a"*7 (invalid), "a"*8 (valid), "a"*101 (invalid)
```

### Step 3: Test Case Template
```
ID: TC-{n}
Title: {what is being tested}
Precondition: {required state or data}
Steps:
  1. {step}
  2. {step}
Expected: {expected result}
Test Data: {specific values}
Priority: High / Medium / Low
```

### Step 4: Defect Management

```
## Defect Report
ID: BUG-{n}
Severity: Critical / Major / Minor / Trivial
Priority: P0 / P1 / P2 / P3
Environment: {OS, browser, version}
Steps to Reproduce:
  1. {step}
  2. {step}
Expected: {what should happen}
Actual: {what actually happens}
Attachments: {logs, screenshots}
```

| Severity | Definition | Response |
|----------|------------|----------|
| Critical | System down, data loss, security breach | Stop release, fix immediately |
| Major | Feature broken, no workaround | Fix before next release |
| Minor | Feature works with limitations | Fix in current sprint or next |
| Trivial | Cosmetic, low impact | Fix when time permits |

### Step 5: Automation Strategy
```
## Automation Strategy

### Automate (high ROI)
- Regression test suite
- Smoke tests for every build
- API contract tests
- Critical user journeys (login, checkout, payment)

### Do NOT Automate (low ROI)
- Visual regression (use dedicated tools)
- One-time test scenarios
- Complex UI interactions that change frequently
- Exploratory testing

### Framework Selection
| Language | Framework | Preferred For |
|----------|-----------|---------------|
| TypeScript | Playwright | E2E, web apps |
| Python | Pytest | API, backend |
| Go | Testify | Go services |
| Rust | cargo test | Rust services |
```

## Rules
- Unit tests must be written by developers — QA reviews coverage reports
- Test cases must include at least one positive and one negative scenario per requirement
- Defect severity is based on user impact, not technical complexity
- Automation ROI is measured by execution time saved vs maintenance cost
- Regression suite must run in under 30 minutes — split if larger
- Every defect must have steps to reproduce — "it doesn't work" is not a defect report
- Test environment must match production configuration as closely as possible

## References
- `references/test-design-techniques.md` — equivalence partitioning, BVA, state transition, pairwise testing
- `references/defect-severity-matrix.md` — severity and priority guidelines with examples

## Handoff
After completing this skill:
- Next skill: **qc** — to enforce code quality gates and standards
- Pass context: test strategy, test cases, defect reports, coverage targets
