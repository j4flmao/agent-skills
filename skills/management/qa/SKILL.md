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
version: "1.1.0"
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
| Unit | Developers | During development | Required (80%+ coverage) |
| Integration | Developers + QA | After unit tests | Required for critical paths |
| E2E | QA | Before release | Critical journeys only |
| Manual / Exploratory | QA | New features, complex UIs | Not automated |
| Regression | QA + CI | Every deployment | Automated suite |
| Smoke | CI | Every build | Full automation |

### Step 2: Test Case Design

**Equivalence Partitioning:**
Input: Age field (1-120)
Partitions:
  Valid: 1-120 (one test per boundary)
  Invalid: < 1 (e.g., 0, -5)
  Invalid: > 120 (e.g., 121, 200)
  Invalid: non-numeric (e.g., "abc")
Test cases: age=1, age=120, age=0, age=121, age="abc"

**Boundary Value Analysis:**
Input: Password length (8-100 chars)
Boundaries: 7, 8, 9, 99, 100, 101
Test cases: password="a"*7 (invalid), "a"*8 (valid), "a"*101 (invalid)

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

| Severity | Definition | Response |
|----------|------------|----------|
| Critical | System down, data loss, security breach | Stop release, fix immediately |
| Major | Feature broken, no workaround | Fix before next release |
| Minor | Feature works with limitations | Fix in current sprint or next |
| Trivial | Cosmetic, low impact | Fix when time permits |

### Step 5: Automation Strategy

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

### Step 6: Test Environment Management

Define test environments (dev, staging, integration, pre-prod). Maintain environment parity with production. Manage test data across environments. Coordinate environment availability with release schedule. Monitor environment health and reset periodic.

### Step 7: Test Execution and Reporting

Execute test cases in priority order. Track execution progress daily. Document test results with pass/fail counts. Report blockers immediately. Generate test summary report after each test cycle.

### Step 8: Regression Test Suite Management

Maintain regression suite: add tests for new features, remove redundant tests, update obsolete tests. Monitor suite execution time (< 30 min target). Review flaky tests weekly. Prioritize regression tests by risk and criticality.

### Step 9: Exploratory Testing Sessions

Schedule exploratory testing for new features and complex areas. Define charter (scope and focus). Set timebox (typically 60-90 min). Document findings as test notes or defect reports. Debrief with team.

### Step 10: Test Completion and Sign-off

Verify all planned tests executed. Review open defects and blocker status. Confirm acceptance criteria met. Produce test completion report. Obtain stakeholder sign-off for go/no-go decision.

## Framework / Methodologies

### Testing Framework Comparison

| Aspect | Waterfall / V-Model | Agile / Scrum | Shift-Left | Shift-Right | Risk-Based |
|--------|---------------------|---------------|------------|-------------|------------|
| Testing phase | After development | Throughout sprint | During development | Production | Throughout |
| Test planning | Detailed upfront | Continuous refinement | Before coding | After release | Risk-weighted |
| Test creation | Full test cases | ATDD/BDD acceptance criteria | Unit tests first | A/B tests, monitoring | Risk-based selection |
| Automation | Late automation | Built-in automation | From start | Monitoring | Critical paths only |
| Feedback cycle | Weeks | Days | Hours | Real-time | Varies |
| Best For | Regulated/contract | Product development | CI/CD pipelines | Production validation | Resource-limited |

### Decision Tree: Test Approach Selection

```
What is the project context?
  ├── Regulatory / compliance (FDA, PCI-DSS, SOC2)
  │   └── V-Model with formal test phases, traceability matrix, auditable documentation
  ├── Agile product development
  │   └── Agile testing: ATDD, automated regression, exploratory testing
  ├── Established product with CI/CD
  │   └── Shift-left: unit tests, static analysis, contract tests in pipeline
  ├── Production system with live users
  │   └── Shift-right: canary testing, feature flags, production monitoring
  └── Resource-constrained / quick delivery
      └── Risk-based testing: prioritize tests by probability × impact
```

### Test Design Technique Selection

| Technique | Best For | Defect Types Found | Effort | Coverage |
|-----------|----------|-------------------|--------|----------|
| Equivalence Partitioning | Input validation | Range/logic errors | Low | High |
| Boundary Value Analysis | Input boundaries | Off-by-one errors | Low | High |
| Decision Table | Business rules | Missing rule combinations | Medium | Very high |
| State Transition | Stateful workflows | Invalid state transitions | Medium | High |
| Pairwise Testing | Configuration combination | Interaction bugs | Medium | High |
| Use Case Testing | User workflows | Workflow breaks | Low | Medium |
| Error Guessing | Common error patterns | Implementation errors | Low | Low |
| Exploratory Testing | New features, complex UIs | Design/usability issues | Medium | Variable |
| Risk-Based Testing | Resource-constrained | High-impact defects | High | Risk-weighted |

## Common Pitfalls

### Pitfall 1: Testing Only Happy Paths
The most common testing mistake — covering only the expected workflow and missing error handling, edge cases, and boundary conditions. Every feature has at least as many error paths as happy paths. Test them all.

### Pitfall 2: Automating Everything
Automating unstable or frequently changing features creates high maintenance burden and brittle tests. Not everything benefits from automation. Manual testing and exploratory testing are essential for complex UIs, new features, and usability.

### Pitfall 3: Ignoring Test Data Management
Tests that depend on shared or dynamic test data are flaky and unreliable. Tests should create their own data or use dedicated test data sets. Test data should be consistent, predictable, and isolated between test runs.

### Pitfall 4: Flaky Tests Left Unaddressed
Flaky tests (pass/fail inconsistently) erode trust in the test suite. When developers see failing tests they ignore, they stop paying attention to real failures. Track flaky tests, quarantine them, and fix or remove them within a sprint.

### Pitfall 5: Testing in Production-Like Environment Too Late
Discovering environment differences (different configs, data, versions) late in the cycle causes last-minute surprises. Test environments should mirror production as closely as possible. Test in staging before release.

### Pitfall 6: Insufficient Non-Functional Testing
Focusing exclusively on functional testing while ignoring performance, security, usability, and reliability. Non-functional issues discovered in production are more expensive to fix. Include non-functional testing in the test strategy.

### Pitfall 7: Defect Reports Without Reproduction Steps
A defect report that says "it doesn't work" cannot be actioned. Every defect must include clear steps to reproduce, expected vs actual results, environment details, and supporting evidence.

### Pitfall 8: Regression Suite That Takes Hours
A regression suite that takes hours to run is rarely run. Developers skip it, CI pipelines get bypassed. Keep the suite fast (under 30 minutes). Split if needed — run critical tests on every commit, full suite nightly.

### Pitfall 9: Testing Without Requirements
Testing without clear acceptance criteria or requirements leads to subjective pass/fail decisions. Every test must have a clear expected result. If the requirement is unclear, clarify before testing.

### Pitfall 10: No Test Metrics Visibility
Running tests without tracking results, trends, and coverage means you have no data to improve. Track pass rate, coverage, defect density, and regression suite duration. Make metrics visible to the entire team.

## Best Practices

- **Test at every level**: Unit, integration, E2E, and manual testing each catch different defect types. Don't skip any level.
- **Write tests before code (TDD/ATDD)**: Tests as specifications drive better design and higher coverage.
- **Keep tests independent**: Tests should not depend on other tests or shared state. Each test sets up and cleans up its own data.
- **Use the test pyramid**: Many unit tests, fewer integration tests, few E2E tests. Each level has different speed and reliability characteristics.
- **Make tests readable**: Test names should describe the scenario. Assertions should be clear. Tests are documentation.
- **Treat test code as production code**: Same standards — version control, code review, linting, maintainability.
- **Run tests fast**: Fast tests get run more often. Optimize slow tests. Parallelize test execution.
- **Fix flaky tests immediately**: A flaky test is worse than no test. It erodes trust and trains developers to ignore failures.
- **Review test coverage quarterly**: Coverage isn't the only metric, but it's a useful indicator. Review and set targets.
- **Track defect escape rate**: Defects found in production vs testing. Use this to improve test coverage and techniques.
- **Automate regression, explore new features**: Regression is repetitive and well-understood — ideal for automation. New features need human exploration.
- **Test in production-like environments**: Environment differences cause test failures and false confidence. Invest in environment parity.

## Templates & Tools

### Test Plan Template

```yaml
test_plan:
  feature: Order Management Module
  version: 1.0
  scope:
    in_scope:
      - Order creation (web UI + API)
      - Order search and filtering
      - Order status management
      - Order export (CSV, PDF)
    out_of_scope:
      - Payment processing
      - Inventory management
      - User administration
  test_levels:
    unit:
      target: 85% line coverage
      responsibility: Developers
    integration:
      focus: Order service API, database, external search service
    e2e:
      journeys:
        - Create order → process payment → confirm order
        - Search orders → export results
        - Cancel order → verify refund
    regression:
      scope: All existing order functionality
      frequency: Every deployment
    smoke:
      scope: Create order, search orders
      frequency: Every build
  environments:
    - development: Developer machines, local DB
    - staging: Staging cluster (us-east-1), test data set
    - integration: Integration sandbox, real third-party APIs
  test_data:
    - Predefined customer accounts (buyer, admin, support)
    - Product catalog subset (50 products)
    - Sample orders (pending, confirmed, cancelled, shipped)
    - Test credit card numbers
```

### Test Case Template

```yaml
test_case:
  id: TC-ORD-001
  title: Create order with valid items
  feature: Order Creation
  priority: High
  prerequisites:
    - User is logged in as a buyer
    - At least 3 products with sufficient inventory exist
  test_data:
    - product_ids: ["PROD-001", "PROD-002", "PROD-003"]
    - quantity: 2
    - shipping_address: "123 Test St"
  steps:
    - step: Navigate to product catalog
      expected: Product list displayed
    - step: Add PROD-001 to cart (qty: 2)
      expected: Cart shows item with correct quantity and price
    - step: Add PROD-002 to cart (qty: 1)
      expected: Cart shows 2 items, total updated
    - step: Proceed to checkout
      expected: Checkout form displayed with shipping and payment sections
    - step: Enter shipping address and select shipping method
      expected: Shipping cost calculated and displayed
    - step: Enter valid payment details
      expected: Payment method accepted
    - step: Submit order
      expected: Order confirmation displayed with order ID
    - step: Verify order in order history
      expected: Order appears with status "Confirmed"
```

### Defect Report Template

```yaml
defect:
  id: BUG-ORD-042
  title: Order confirmation email not sent for international orders
  severity: Major
  priority: P1
  environment:
    browser: Chrome 124
    os: Windows 11
    app_version: v2.1.3
    deployment: staging
  steps_to_reproduce:
    - Log in as buyer with international shipping address
    - Add product to cart and proceed to checkout
    - Enter international shipping address
    - Complete payment
    - Submit order
    - Check email inbox
  expected: Order confirmation email received within 60 seconds
  actual: No email received. No email entry in the email service logs.
  attachments:
    - logs/email-service-error-2026-04-15.log
    - screenshots/order-confirmation-screen.png
  workaround: Order is created successfully in the system. Manual email sent by support.
  root_cause_analysis: Email service not configured for international address format
```

## Case Studies

### Case Study 1: Fintech — Test Automation Transformation
A fintech company had manual-only testing with release cycles of 4 weeks. They implemented Playwright for E2E, Pytest for API testing, and integrated tests into the CI pipeline. Regression suite ran in 12 minutes. Release cycle reduced to weekly. Production defects dropped 60%. Key success factor: dedicated automation team for 3 months to build the initial framework.

### Case Study 2: E-Commerce Platform — Flaky Test Crisis
A growing e-commerce platform had 1,200 E2E tests with a 40% flake rate. Tests failed randomly, developers ignored failures, and defects leaked to production. The team spent 2 sprints quarantining flaky tests, fixing root causes (test data isolation, timing, environment dependency), and reducing the flake rate to 3%. The remaining test suite went from 1,200 to 400 reliable tests — with better coverage.

### Case Study 3: Healthcare — Risk-Based Testing for Compliance
A healthcare SaaS company needed to release quickly while maintaining HIPAA compliance. They implemented risk-based testing: critical path tests (authentication, authorization, data access) ran on every commit; full regression ran nightly; compliance audit suite ran weekly. This balanced speed and compliance. Audit findings related to testing were reduced by 80%.

### Case Study 4: Retail — Shift-Left with Contract Testing
A retail company implemented consumer-driven contract testing (Pact) for microservices. Integration issues between services dropped 90%. Developer feedback cycle reduced from days to minutes. The contract test suite caught breaking changes before they reached staging.

## Rules

- Unit tests must be written by developers — QA reviews coverage reports
- Test cases must include at least one positive and one negative scenario per requirement
- Defect severity is based on user impact, not technical complexity
- Automation ROI is measured by execution time saved vs maintenance cost
- Regression suite must run in under 30 minutes — split if larger
- Every defect must have steps to reproduce — "it doesn't work" is not a defect report
- Test environment must match production configuration as closely as possible
- Flaky tests must be fixed or removed within one sprint
- Test data must be isolated between test runs — no shared mutable state
- Test coverage targets apply to new code, not just overall
- Acceptance criteria must be defined before testing begins
- Test automation code follows same standards as production code
- Test results must be visible to the entire team
- Exploratory testing must be timeboxed and chartered

## References

- references/defect-severity-matrix.md — Defect Severity & Priority Matrix
- references/qa-advanced.md — QA Advanced Topics
- references/qa-fundamentals.md — QA Fundamentals
- references/test-case-examples.md — Test Case Examples
- references/test-design-techniques.md — Test Design Techniques
- references/test-plan-template.md — Test Plan Template
- references/qa-strategy-planning.md — QA Strategy and Planning Guide
- references/qa-test-automation-framework.md — Test Automation Framework Reference

## Handoff
After completing this skill:
- Next skill: **qc** — to enforce code quality gates and standards
- Pass context: test strategy, test cases, defect reports, coverage targets
