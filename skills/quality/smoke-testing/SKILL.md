---
name: quality-smoke-testing
description: >
  Use when the user asks about smoke testing, build verification testing (BVT), deployment health checks, canary testing, sanity testing, or CI/CD pipeline health checks. Do NOT use for: full regression testing (quality-regression-testing), acceptance testing (quality-acceptance-testing), or end-to-end testing (quality-e2e-testing).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, smoke-testing, phase-6]
---

# Smoke Testing

## Purpose
Validate that the most critical functionality of an application works after a deployment, build, or environment change. Smoke tests provide fast, reliable feedback that the system is stable enough for further testing or production release.

## Agent Protocol

### Trigger
User mentions smoke test, BVT, build verification, deployment health check, canary test, sanity check, or asks "is the build stable?"

### Input Context
- Deployment target (staging, production, canary)
- Changes included in the build
- Critical user journeys for the application
- Health endpoint specifications
- CI/CD pipeline stage

### Output Artifact
- Smoke test results (pass/fail with evidence)
- Deployment health report
- Rollback recommendation if critical failures found
- Smoke suite definition/CV configuration

### Response Format
Structured report:
1. Build/version under test
2. Environment details
3. Test results per smoke scenario (pass/fail/skip)
4. Overall verdict: PASS / FAIL / PARTIAL
5. Rollback recommendation if applicable

### Completion Criteria
- All smoke tests executed AND
- Results recorded with evidence AND
- Verdict communicated to deployment pipeline AND
- Rollback triggered automatically if pass rate < threshold

## Workflow

1. **Define smoke suite**: Identify critical-path tests that must pass
2. **Execute on deploy**: Run automatically as first CI/CD stage after deployment
3. **Verify instantly**: All tests must complete in < 5 minutes
4. **Gate or rollback**: Failure blocks promotion or triggers rollback
5. **Monitor continuously**: Post-deployment health checks continue for N minutes

## Rules
1. Smoke tests must complete in under 5 minutes
2. Every deployment must pass smoke tests before reaching users
3. Smoke tests must be 100% deterministic — zero tolerance for flakiness
4. A single smoke test failure = rollback or pipeline block (no partial acceptance)
5. Smoke suite is reviewed and updated every sprint to reflect current critical paths
6. Smoke tests must not require complex test data setup — use defaults or existing data

## References
- `references/bvt-strategy.md` — Bvt Strategy
- `references/deployment-health.md` — Deployment Health
- `references/smoke-automation.md` — Smoke Automation
- `references/smoke-testing-strategies.md` — Smoke Testing Strategies

## Handoff
After smoke testing, hand off to:
- `quality-regression-testing` — if smoke passes, run targeted regression
- `quality-acceptance-testing` — if smoke passes and UAT is scheduled
- `quality-e2e-testing` — for deeper end-to-end verification
