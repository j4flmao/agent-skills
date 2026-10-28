# Quality Assurance Fundamentals

Quality assurance (QA) is the set of practices that build confidence a product meets its requirements and users' needs: preventing defects through process, and detecting them through testing. This reference covers QA vs QC vs testing, test levels and types, the test pyramid, defect lifecycle, entry/exit criteria and core metrics. Detailed templates live in `test-plan-template.md`, `test-design-techniques.md` and `defect-severity-matrix.md`.

## QA, QC and Testing

| Term | Focus | Examples |
|------|-------|----------|
| Quality assurance | Process: prevent defects | Definition of done, code review, requirements review, test strategy |
| Quality control | Product: find defects | Inspections, test execution, release checks |
| Testing | Activity within QC (and QA) | Unit, integration, system, acceptance tests |

Quality is a whole-team responsibility; QA specialists enable it with strategy, tooling, risk analysis and exploratory skill rather than being the only gate.

## Testing Principles (ISTQB-style)

1. Testing shows the presence of defects, not their absence.
2. Exhaustive testing is impossible; prioritize by risk.
3. Early testing saves effort (shift left: review requirements and designs).
4. Defects cluster in a few modules.
5. Repeating the same tests finds fewer new defects; evolve tests.
6. Testing is context dependent (medical device vs marketing site).
7. Absence of defects does not mean the product is useful (validate against user needs).

## Test Levels

| Level | Scope | Typical owner |
|-------|-------|---------------|
| Unit / component | Function, class, component in isolation | Developers |
| Integration | Interfaces between components, DB, APIs | Developers and QA |
| System | Whole system against requirements (functional and non-functional) | QA |
| Acceptance | Fitness for business use (UAT, contract, operational acceptance) | Business users, product |

## Test Types

| Type | Purpose |
|------|---------|
| Functional | Does it do what the requirements say? |
| Non-functional | Performance, security, usability, accessibility, reliability, compatibility |
| Regression | Did changes break existing behavior? |
| Smoke / sanity | Is the build stable enough to test further? |
| Exploratory | Simultaneous learning, test design and execution guided by charters |
| Confirmation (re-test) | Is a reported defect actually fixed? |

## Test Pyramid and Variants

```
        /  E2E UI  \        few, slow, brittle, high confidence per test
       / Integration \      moderate number; APIs, contracts, DB
      /     Unit      \     many, fast, cheap, precise feedback
```

Guidelines:
- Push checks to the lowest level that can catch the defect.
- Keep E2E tests for critical user journeys only.
- The "testing trophy" variant emphasizes integration tests for frontend apps; the principle is the same: balance confidence, speed and maintenance.

## Static Testing

Reviews and analysis without executing code: requirement reviews (ambiguity, testability), design reviews, code review, linters and static analysis (SAST). Defects found here are the cheapest to fix.

## Test Design Basics

| Technique | Use |
|-----------|-----|
| Equivalence partitioning | Group inputs that behave the same; test one per group |
| Boundary value analysis | Test at and around edges (min-1, min, max, max+1) |
| Decision tables | Combinations of conditions and actions |
| State transition | Systems with states (order lifecycle) |
| Pairwise / combinatorial | Many parameters, limited combinations |
| Error guessing / checklists | Experience-based |

Details and worked examples: `test-design-techniques.md`.

## Defect Lifecycle

```
New -> Triaged -> Assigned -> In progress -> Fixed -> Ready for test -> Verified -> Closed
                     |                                      |
                     +-> Rejected / Duplicate / Deferred    +-> Reopened
```

A good defect report: title stating the problem, environment and build, steps to reproduce, expected vs actual result, evidence (logs, screenshots, request IDs), severity, and frequency.

Severity (impact) and priority (urgency of fixing) are separate; a typo on the homepage can be low severity, high priority.

## Entry and Exit Criteria

| Criteria | Examples |
|----------|----------|
| Entry (start testing) | Build deployed to test environment, smoke tests pass, test data available, requirements baselined |
| Exit (stop/release) | Planned tests executed, no open critical/high defects (or accepted with sign-off), coverage targets met for risk areas, performance and security checks passed |

## Core Metrics

| Metric | What it tells you | Caveat |
|--------|-------------------|--------|
| Defect escape rate (production defects / total found) | Effectiveness of pre-release testing | Needs consistent defect classification |
| Defects by severity and component | Hotspots | Do not use to rank people |
| Test pass rate and flakiness rate | Suite health | High pass rate with flaky tests is misleading |
| Requirements/risk coverage | Whether important areas are tested | Code coverage alone is not quality |
| Mean time to detect / to fix | Feedback speed | |
| Lead time and change failure rate (DORA) | Delivery performance including quality | |

## QA in Agile and DevOps

- QA participates in refinement: acceptance criteria written as testable examples (Given/When/Then).
- Tests automated in the same sprint as the feature; regression suite runs in CI.
- Definition of done includes tests, review and documentation.
- Production monitoring, feature flags and canary releases extend quality assurance past deployment.

## Checklist

- [ ] Test strategy defines levels, types and risk priorities
- [ ] Requirements reviewed for testability before development
- [ ] Test pyramid balance with fast feedback in CI
- [ ] Defect workflow and severity definitions agreed
- [ ] Entry/exit criteria defined per release
- [ ] Metrics focus on escapes, coverage of risk, and flakiness
