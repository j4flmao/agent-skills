# QA Strategy Planning

## Overview

QA strategy planning defines the approach, scope, resources, and governance for testing activities across the software development lifecycle. A well-defined QA strategy ensures comprehensive test coverage, efficient resource utilization, and measurable quality outcomes. This reference provides frameworks, templates, and decision models for building effective QA strategies.

## QA Strategy Framework

### Core Components

| Component | Description | Key Questions |
|-----------|-------------|---------------|
| Quality Vision | Definition of quality for the product | What does quality mean for this product? What is acceptable? |
| Test Levels | Which levels are tested and how | What is tested at unit, integration, system, and acceptance levels? |
| Test Types | Which test types are performed | Functional, performance, security, usability, accessibility? |
| Test Coverage | What is covered and what is not | What features, modules, risk areas are covered? What is explicitly excluded? |
| Test Environment | Where testing happens | What environments are available? How is parity maintained? |
| Test Data | What data is used | Production-like data? Synthetic data? Data privacy? |
| Automation Strategy | What is automated and what is manual | What is automated? What is the automation framework? What is the maintenance plan? |
| Tooling | Which tools are used | Test management, automation, defect tracking, CI integration |
| Metrics | How quality is measured | Pass rate, coverage, defect density, escape rate, MTBF |
| Governance | How the strategy is enforced | Review process, sign-off criteria, exception process |

### QA Strategy Document Structure

```yaml
qa_strategy:
  document_id: QA-STRAT-001
  product: Order Management Platform
  version: 2.0
  effective_date: 2026-04-01
  author: QA Lead

  sections:
    - section: 1. Introduction
      content: Purpose of this document, scope, audience, and key definitions

    - section: 2. Quality Vision and Objectives
      content:
        vision: Zero critical defects in production
        objectives:
          - obj: Release with confidence every sprint
            metrics: [pass_rate > 99%, defect_escape_rate < 2%]
          - obj: Fast feedback on quality
            metrics: [regression_suite < 30 min, unit_tests < 5 min]
          - obj: Continuous improvement
            metrics: [defect_density decreasing, escape_rate decreasing]

    - section: 3. Test Levels and Coverage
      content:
        unit:
          scope: All services, all modules
          target_coverage: 85% line, 80% branch
          responsibility: Developers
          tools: Jest, Pytest, Go Test
        integration:
          scope: Service interfaces, database, external APIs
          approach: Contract testing + integration test suite
          responsibility: Developers + QA
          tools: Pact, Testcontainers
        system:
          scope: Critical user journeys, API workflows
          approach: Automated E2E + manual exploratory
          responsibility: QA
          tools: Playwright, Postman/Newman
        acceptance:
          scope: Business acceptance criteria
          approach: Automated acceptance tests + UAT
          responsibility: QA + Product Owner
          tools: Cucumber, SpecFlow

    - section: 4. Test Types
      types:
        functional: Full coverage of acceptance criteria
        regression: Automated, every build + full suite nightly
        smoke: Every build, critical paths
        performance: Quarterly + per major release
        security: SAST in CI, DAST quarterly, pentest annually
        accessibility: WCAG 2.1 AA compliance
        usability: Per major feature release
        compatibility: Latest 2 browser versions, iOS/Android latest

    - section: 5. Environments
      environments:
        - name: Development
          purpose: Developer testing
          refresh: Continuous
        - name: Feature
          purpose: Feature-level testing
          refresh: Per feature branch
        - name: Staging
          purpose: Integration and regression
          refresh: Nightly
        - name: Pre-Production
          purpose: Performance and UAT
          refresh: Per release
        - name: Production
          purpose: Monitoring and shift-right
          refresh: Live

    - section: 6. Test Data Strategy
      approach: Synthetic test data generation
      data_sets:
        - smoke_test: Small dataset (10 customers, 50 products)
        - regression: Medium dataset (500 customers, 1000 products)
        - performance: Large dataset (100K customers, 500K orders)
      data_refresh: Nightly from anonymized production snapshot
      data_privacy: All synthetic, no PII

    - section: 7. Automation Strategy
      what_to_automate:
        - Regression test suite
        - Smoke tests
        - API contract tests
        - Critical user journeys
      what_not_to_automate:
        - Visual regression (handled by Percy)
        - Exploratory testing
        - One-time test scenarios
        - Complex UI interactions (frequent changes)
      framework: Playwright (E2E), Pytest (API), Jest (Unit)
      ci_integration: GitHub Actions, parallel execution

    - section: 8. Metrics and Targets
      metrics:
        - metric: Test pass rate
          target: "> 99%"
          collection: Per test run
        - metric: Code coverage
          target: "> 85% line, > 80% branch"
          collection: Per build
        - metric: Defect escape rate
          target: "< 2% of total defects"
          collection: Per release
        - metric: Regression suite duration
          target: "< 30 minutes"
          collection: Per run
        - metric: Flaky test rate
          target: "< 1%"
          collection: Weekly
        - metric: Automation coverage
          target: "> 80% of regression"
          collection: Quarterly

    - section: 9. Risk Management
      approach: Risk-based testing prioritization
      risk_matrix:
        - risk: Low test coverage in legacy module
          probability: High
          impact: High
          mitigation: Increase risk-based testing, phased coverage improvement
        - risk: Flaky tests in CI
          probability: Medium
          impact: Medium
          mitigation: Flaky test quarantine process
```

## Test Planning Process

### Test Planning Activities

| Activity | Input | Output | Timing | Owner |
|----------|-------|--------|--------|-------|
| Requirements analysis | User stories, AC, specs | Testable requirements, gaps identified | Before sprint | QA |
| Test strategy definition | Product vision, risks | Test strategy document | Quarterly | QA Lead |
| Test estimation | Story points, complexity | Test effort estimate | Sprint planning | QA |
| Test case design | Acceptance criteria | Test cases | During refinement | QA |
| Test data preparation | Data requirements | Test datasets | Before testing | QA + DevOps |
| Environment readiness | Environment requirements | Provisioned environments | Before testing | DevOps |
| Test execution | Test cases, test data | Test results | During sprint | QA |
| Defect reporting | Test execution | Defect reports | During testing | QA |
| Test metrics reporting | Execution data | Test summary report | End of sprint | QA |
| Retrospective | Metrics, feedback | Improvement actions | Sprint retro | Team |

### Test Estimation Techniques

| Technique | Description | Best For | Accuracy |
|-----------|-------------|----------|----------|
| Work breakdown | Break testing into tasks, estimate each | Detailed planning | High |
| Three-point | Best case, worst case, most likely | Complex features | Medium |
| Affinity estimation | Group similar-sized items together | Large backlogs | Medium |
| Historical data | Use past velocity data | Established teams | High |
| Percentage of dev | Testing = X% of development effort | Quick estimation | Low |
| Test case count | Number of test cases × avg execution time | Manual testing | Medium |
| Complexity-based | Assign test effort based on feature complexity | Risk-based | Medium |

### Risk-Based Test Estimation

```yaml
risk_based_estimation:
  feature: Payment Processing
  risk_assessment:
    - dimension: business_criticality
      rating: 5/5 (revenue-critical)
    - dimension: technical_complexity
      rating: 4/5 (multiple integrations)
    - dimension: change_frequency
      rating: 2/5 (stable API)
    - dimension: historical_defect_density
      rating: 3/5 (moderate defect history)
  risk_score: 14/20
  test_effort_multiplier: 1.5x (higher than baseline)

  baseline_effort:
    per_story: 4 hours (happy path + basic negative)
  risk_adjustment:
    high_risk: +50% (add edge cases, boundary analysis, error guessing)
    medium_risk: +25% (add negative scenarios)
    low_risk: standard (happy path only)
    
  total_estimate:
    stories: 8
    baseline: 32 hours
    risk_adjusted: 48 hours
```

### Test Planning Timeline

```yaml
test_planning_timeline:
  feature: Checkout Redesign
  sprints: 3
  pre_development:
    - activity: Requirements review and gap analysis
      duration: 2 days
      owner: QA Lead
    - activity: Test strategy alignment with product
      duration: 1 day
      owner: QA + PO
    - activity: Test environment setup
      duration: 3 days
      owner: DevOps
    - activity: Test data preparation
      duration: 2 days
      owner: QA
  sprint_1:
    - activity: Test case design for sprint 1 stories
      duration: 3 days
      owner: QA
    - activity: Unit test code review
      duration: Ongoing
      owner: QA
    - activity: Test execution — sprint 1 features
      duration: 3 days
      owner: QA
    - activity: Defect reporting and triage
      duration: Ongoing
      owner: QA + Dev
  sprint_2:
    - activity: Test case design for sprint 2 stories
      duration: 2 days
      owner: QA
    - activity: Regression test update
      duration: 1 day
      owner: QA
    - activity: Test execution — sprint 2 features
      duration: 3 days
      owner: QA
    - activity: Integration testing
      duration: 2 days
      owner: QA + Dev
  sprint_3:
    - activity: Full regression test
      duration: 2 days
      owner: QA
    - activity: Performance testing
      duration: 1 day
      owner: QA
    - activity: UAT support
      duration: 2 days
      owner: QA + PO
    - activity: Security review
      duration: 1 day
      owner: Security + QA
    - activity: Test completion report
      duration: 0.5 day
      owner: QA
```

## Test Design Techniques

### Detailed Technique Guide

| Technique | Description | When to Use | Coverage Analysis |
|-----------|-------------|-------------|-------------------|
| Equivalence Partitioning | Divide input into equivalence classes where one test represents the class | Input validation, range checking | Each partition tested once |
| Boundary Value Analysis | Test boundaries of equivalence classes | All numeric/range inputs | Tests boundaries of each partition |
| Decision Table | Map business rules to combinations of conditions and actions | Complex business rules | All condition combinations covered |
| State Transition | Test transitions between states in a state machine | Workflows, stateful processes | All states and transitions tested |
| Use Case Testing | Test end-to-end user workflows | User journeys, acceptance | Covers happy path + alternatives |
| Pairwise Testing | Test all pairs of parameter values | Configuration testing | All pairs of values tested |
| Classification Tree | Hierarchical partitioning of input domains | Complex input domains | Systematic input space coverage |
| Orthogonal Arrays | Statistical selection of test combinations | Large parameter spaces | Efficient coverage with minimal tests |
| Error Guessing | Intuitive testing based on experience | All testing | Depends on tester expertise |
| Exploratory Testing | Simultaneous learning, test design, and execution | New features, complex UIs | Variable |

### Decision Table Example

```
Conditions:
  C1: User is authenticated? (Y/N)
  C2: User has admin role? (Y/N)
  C3: Resource belongs to user? (Y/N)

Actions:
  A1: Allow read access
  A2: Allow write access
  A3: Allow delete access
  A4: Deny access

Decision Table:
  | Rule | C1 | C2 | C3 | A1 | A2 | A3 | A4 |
  |------|----|----|----|----|----|----|----|
  | 1    | N  | —  | —  |    |    |    | X  |
  | 2    | Y  | Y  | —  | X  | X  | X  |    |
  | 3    | Y  | N  | Y  | X  | X  |    |    |
  | 4    | Y  | N  | N  | X  |    |    |    |

Test cases derived:
  TC-01: Unauthenticated user → Deny all (Rule 1)
  TC-02: Admin, any resource → Full access (Rule 2)
  TC-03: Auth user, own resource → Read + Write (Rule 3)
  TC-04: Auth user, other resource → Read only (Rule 4)
```

### State Transition Example

```
States: [DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED]

Transitions:
  DRAFT → SUBMITTED (submit order)
  DRAFT → CANCELLED (cancel from draft)
  SUBMITTED → APPROVED (approve order)
  SUBMITTED → REJECTED (reject order)
  SUBMITTED → CANCELLED (cancel submitted order)
  APPROVED → SHIPPED (ship order)
  APPROVED → CANCELLED (cancel approved order before shipping)

Invalid transitions:
  DRAFT → APPROVED (cannot approve without submission)
  SUBMITTED → SHIPPED (cannot ship without approval)
  CANCELLED → SUBMITTED (cannot submit cancelled order)
  APPROVED → SUBMITTED (cannot go back)

Test cases:
  TC-01: DRAFT → SUBMITTED → APPROVED → SHIPPED (happy path)
  TC-02: DRAFT → CANCELLED (cancel before submit)
  TC-03: DRAFT → SUBMITTED → REJECTED (rejection flow)
  TC-04: DRAFT → SUBMITTED → CANCELLED (cancel after submit)
  TC-05: DRAFT → SUBMITTED → APPROVED → CANCELLED (cancel before ship)
  TC-06: DRAFT → APPROVED (invalid — should fail)
  TC-07: SUBMITTED → SHIPPED (invalid — should fail)
```

## Test Environment Strategy

### Environment Architecture

```yaml
environment_architecture:
  development:
    purpose: Developer local testing
    configuration: Docker Compose, local DB
    data: Minimal seed data
    accessibility: Developer machines
    refresh: On demand
    
  feature:
    purpose: Feature branch testing
    configuration: Ephemeral Kubernetes namespace
    data: Subset of staging data
    accessibility: Per feature branch
    refresh: Per branch creation
    
  staging:
    purpose: Integration and regression testing
    configuration: Full stack, reduced redundancy
    data: Anonymized production snapshot (daily)
    accessibility: QA, Dev, Product
    refresh: Daily
    
  pre_production:
    purpose: Performance testing and UAT
    configuration: Production mirror, same capacity
    data: Anonymized production snapshot (weekly)
    accessibility: QA, Performance team
    refresh: Before major releases
    
  production:
    purpose: Live service
    configuration: Full production stack
    data: Live data
    accessibility: Operations, on-call
    refresh: Live
```

### Environment Parity Checklist

```
Environment Parity Checklist:
  [ ] Same application version deployed
  [ ] Same configuration management applied
  [ ] Same database system and version
  [ ] Same caching layer (Redis/Memcached)
  [ ] Same message queue system
  [ ] Same search service (Elasticsearch)
  [ ] Same CDN configuration
  [ ] Same DNS and routing configuration
  [ ] Same monitoring and logging
  [ ] Same feature flag state (or can control)
  [ ] Same third-party service integrations (or mocks)
  [ ] Same load balancer configuration
  [ ] Same authentication/authorization system
  [ ] Same TLS/SSL certificates
  [ ] Same storage system configuration
  [ ] Same container orchestration configuration
  [ ] Same resource limits and scaling config
```

## Test Data Strategy

### Test Data Sources

| Source | Description | Best For | Challenges |
|--------|-------------|----------|------------|
| Synthetic data | Generated by scripts, factories | Unit/integration tests | May not reflect real data patterns |
| Production snapshot | Anonymized copy of production data | Performance, regression | Data privacy, size |
| Production clone | Direct copy with masking | Performance, UAT | Data privacy, storage cost |
| Generated from schema | Data generated from API schemas | Contract tests | May miss edge cases |
| Manual creation | Hand-crafted test data | Specific edge cases | Time-consuming, not scalable |
| Crowdsourced | Data from real user testing | UAT, usability | Privacy, consent |

### Test Data Management Principles

```
Principle 1: Isolate test data
  - Tests should not share mutable data
  - Each test (or parallel group) creates its own data
  - Clean up after test execution

Principle 2: Document data dependencies
  - What data is required for each test?
  - What preconditions must exist?
  - How is data created and cleaned up?

Principle 3: Version test data
  - Test data sets should be versioned alongside code
  - Track schema changes that affect data
  - Migrate test data when schema changes

Principle 4: Mask sensitive data
  - No PII, credentials, or secrets in test data
  - Use deterministic masking for consistency
  - Validate masking effectiveness

Principle 5: Refresh test data regularly
  - Stale test data causes false failures
  - Schedule automated data refresh
  - Verify data freshness in CI
```

## Test Metrics and KPI Framework

### QA Metrics Taxonomy

| Metric Category | Metrics | Collection | Target |
|-----------------|---------|------------|--------|
| Coverage | Line coverage, branch coverage, function coverage | CI pipeline | > 85% line, > 80% branch |
| Execution | Pass rate, fail rate, skip rate | Test runner | > 99% pass rate |
| Efficiency | Test execution time, automation ROI | CI pipeline | Regression < 30 min |
| Defect | Defect density, escape rate, reopen rate | Defect tracker | Escape rate < 2% |
| Flakiness | Flaky test count, flake rate | CI + monitoring | < 1% flake rate |
| Automation | Automation coverage %, script count | Test framework | > 80% of regression |
| Environment | Environment uptime, data freshness | Monitoring | > 99% uptime |
| Team | Test creation rate, review coverage | Project management | Consistent trend |

### Quality Dashboard

```yaml
quality_dashboard:
  overview:
    - test_pass_rate: 99.2% (target: > 99%)
    - code_coverage: 86% line, 81% branch (target: 85/80)
    - defect_escape_rate: 1.8% (target: < 2%)
    - regression_duration: 22 min (target: < 30 min)
    - flaky_test_rate: 0.8% (target: < 1%)
    
  trend_metrics:
    - metric: pass_rate
      chart: line (4 weeks)
      current: 99.2%
      trend: UP
    - metric: coverage
      chart: line (8 weeks)
      current: 86%
      trend: UP
    - metric: escape_rate
      chart: line (6 releases)
      current: 1.8%
      trend: DOWN
    
  defect_breakdown:
    by_severity:
      critical: 0
      major: 3
      minor: 8
      trivial: 12
    by_module:
      checkout: 5
      payment: 8
      search: 4
      user_profile: 6
    
  automation_health:
    total_tests: 1250
    automated: 1080 (86%)
    manual: 170
    flaky_tests: 8 (quarantined)
    suite_duration: 22 min
```

## Defect Management Process

### Defect Lifecycle

```
NEW → TRIAGE → ASSIGNED → FIXING → VERIFIED → CLOSED
  ↓                      ↓          ↓
REJECTED           REOPENED    REOPENED (if not fixed)
  ↓
DEFERRED (by severity/priority)
```

### Defect Triage Process

```
Triage Cadence: Daily (during active testing)

Triage Participants:
  - QA Lead (facilitator)
  - Engineering Manager (resource decisions)
  - Product Owner (priority decisions)
  - Relevant developer (technical assessment)

Triage Criteria:
  1. Reproducibility: Can the defect be consistently reproduced?
  2. Severity: What is the user impact?
  3. Priority: When must this be fixed?
  4. Impact: How many users affected?
  5. Workaround: Can users work around it?
  6. Scope: Does it affect other features?

Triage Decisions:
  - Accept: Assign to developer for fix
  - Defer: Move to next release with justification
  - Reject: Not a valid defect (document reasoning)
  - Duplicate: Link to existing defect
  - Not Reproducible: Add steps and request more info
```

### Root Cause Analysis Template

```yaml
root_cause_analysis:
  defect: BUG-ORD-042
  title: Order confirmation email not sent
  severity: Major
  analysis:
    symptom: No email sent for international orders
    timeline:
      - Introduced: v2.1.0 (new address validation module)
      - Detected: v2.1.3 (QA testing)
    root_cause: Address validation for international addresses throws exception that is caught but logged at WARN level (not ERROR), so monitoring didn't trigger
    contributing_factors:
      - No test coverage for international address format
      - Exception handling swallows the error
      - Monitoring thresholds not set for email delivery
    corrective_actions:
      - action: Fix email service to handle international address format
        owner: dev-team
        deadline: 2 days
      - action: Add test coverage for international address formats
        owner: qa-team
        deadline: 1 sprint
      - action: Add monitoring alert for email queue backlog
        owner: devops
        deadline: 1 week
```

## Test Completion and Sign-off

### Test Completion Criteria

```
Entry Criteria for Test Completion:
  [ ] All planned test cases executed
  [ ] No open Critical or High severity defects
  [ ] All Medium severity defects have documented workaround or fix plan
  [ ] Regression suite passes (99%+ pass rate)
  [ ] Code coverage meets threshold
  [ ] Performance tests pass SLOs
  [ ] Security scan complete with no critical findings
  [ ] Acceptance criteria met for all stories
  [ ] UAT completed for critical user journeys
  [ ] Test summary report produced

Exit Criteria for Release:
  [ ] All entry criteria met
  [ ] Go/no-go decision made by stakeholders
  [ ] Known defects documented in release notes
  [ ] Risk assessment completed for unresolved issues
  [ ] Rollback plan verified
  [ ] Post-release monitoring configured
```

### Test Summary Report Template

```yaml
test_summary_report:
  release: v2.1.3
  period: 2026-04-01 to 2026-04-15
  feature: Order Management Redesign
  summary:
    total_test_cases: 450
    passed: 446
    failed: 3
    blocked: 1
    pass_rate: 99.1%
    automation_coverage: 86%
  defects:
    total_found: 23
    by_severity:
      critical: 0
      major: 3
      minor: 8
      trivial: 12
    fixed: 20
    deferred: 3
    reopened: 0
  coverage:
    line_coverage: 86%
    branch_coverage: 81%
    requirement_coverage: 94%
  regression:
    suite_size: 1080 tests
    duration: 22 minutes
    pass_rate: 99.3%
  risks:
    - risk: 3 deferred defects (all minor)
      impact: Low — workarounds documented
      mitigation: Scheduled for next release
  recommendation: PROCEED WITH RELEASE
  sign_off:
    qa_lead: signed
    engineering_manager: pending
    product_owner: pending
```

## References

- ISTQB — Certified Tester Foundation Level Syllabus
- ISO 25010:2011 — Quality model for software product measurement
- ISO 29119 — Software Testing Standards
- IEEE 829 — Standard for Software and System Test Documentation
- TMap Next — Test Management Approach
- Cem Kaner — Testing Computer Software
- Crispin & Gregory — Agile Testing: A Practical Guide
- Roman, A. — Thinking-Driven Testing
- Whittaker, J. — Exploratory Software Testing
- Fewster & Graham — Software Test Automation
- COP (Context-Driven Testing) — Seven Basic Principles
- Google Testing Blog — Testing articles and best practices
- ThoughtWorks Technology Radar — Testing tools and techniques
- ASTM — American Society for Testing and Materials standards
