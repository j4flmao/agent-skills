---
name: quality-acceptance-testing
description: >
  Use when the user asks about user acceptance testing (UAT), alpha/beta testing, business scenario testing, acceptance criteria, Gherkin, specification by example, or sign-off processes. Do NOT use for: unit testing (quality-unit-testing), integration testing (quality-integration-testing), or regression testing (quality-regression-testing).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, acceptance-testing, phase-6]
---

# Acceptance Testing

## Purpose
Validate that the system meets business requirements, user needs, and acceptance criteria through structured UAT, alpha/beta programs, business scenario testing, and automated acceptance tests.

## Agent Protocol

### Trigger
User mentions acceptance testing, UAT, alpha/beta testing, user sign-off, business scenarios, Gherkin scenarios, or specification by example.

### Input Context
- User stories or feature specifications
- Acceptance criteria (Gherkin or otherwise)
- Business process flows
- Target user profiles for beta programs
- Environment availability (staging, production-like)

### Output Artifact
- UAT test scenarios and results
- Alpha/beta feedback reports
- Business scenario coverage matrix
- Signed-off acceptance test report

### Response Format
Structured report with:
1. Test scenarios mapped to user stories/requirements
2. Execution results and status
3. Blocking vs non-blocking issues
4. Sign-off recommendation
5. Risks and open items

### Completion Criteria
- All acceptance criteria exercised AND
- Blocking issues resolved or documented as known deviations AND
- Stakeholder sign-off received OR explicit deferral documented

## Workflow

1. **Analyze requirements**: Extract acceptance criteria from user stories, epics, business flows
2. **Design scenarios**: Create Gherkin scenarios, business flow tests, UAT scripts
3. **Prepare environment**: Configure UAT environment, set up test data, onboard users
4. **Execute**: Run UAT sessions, manage beta programs, execute business scenarios
5. **Evaluate**: Assess results against acceptance criteria, track defects
6. **Sign-off**: Present results to stakeholders, obtain formal acceptance

## Rules
1. Acceptance criteria must be defined BEFORE testing begins — no testing against ambiguous requirements
2. Every user story must have at least one positive and one negative Gherkin scenario
3. UAT users must represent real user roles — not developers or QA
4. Business scenarios must cover happy path, alternate flows, and exception paths
5. All acceptance test results must be traceable back to specific requirements
6. Blocking defects stop sign-off — document workarounds if accepting with known issues

## References
- `references/uat-process.md` — User Acceptance Testing process
- `references/alpha-beta.md` — Alpha and beta testing programs
- `references/business-scenarios.md` — Business scenario testing
- `references/acceptance-criteria.md` — Acceptance criteria and Gherkin

## Handoff
After acceptance testing completion, hand off to:
- `quality-regression-testing` — for regression suite updates from accepted changes
- `quality-e2e-testing` — for end-to-end automation of accepted scenarios
- `quality-smoke-testing` — for BVT smoke test inclusion of critical paths
