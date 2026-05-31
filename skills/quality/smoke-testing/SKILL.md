---
name: quality-smoke-testing
description: >
  Use when the user asks about smoke testing, build verification testing (BVT), deployment health checks, canary testing, sanity testing, or CI/CD pipeline health checks. Do NOT use for: full regression testing (quality-regression-testing), acceptance testing (quality-acceptance-testing), or end-to-end testing (quality-e2e-testing).
version: "2.0.0"
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
Validate that the most critical functionality of an application works after a deployment, build, or environment change. Smoke tests provide fast, reliable feedback that the system is stable enough for further testing or production release. This skill covers smoke suite design, CI/CD gate integration, rollback automation, and environment-specific strategies.

## Agent Protocol

### Trigger
User mentions smoke test, BVT, build verification, deployment health check, canary test, sanity check, or asks "is the build stable?"

### Input Context
- Deployment target (staging, production, canary)
- Changes included in the build
- Critical user journeys for the application
- Health endpoint specifications
- CI/CD pipeline stage and rollback capabilities

### Output Artifact
- Smoke test suite definition with pass/fail thresholds
- Deployment health report
- Rollback recommendation if critical failures found
- CI/CD pipeline configuration with smoke stage

### Response Format
Structured report with:
1. Build/version under test and environment details
2. Test results per smoke scenario (pass/fail/skip)
3. Overall verdict: PASS / FAIL / PARTIAL
4. Rollback recommendation and trigger if applicable
5. Execution time and threshold compliance

### Completion Criteria
- All smoke tests executed within time budget
- Results recorded with evidence (logs, screenshots)
- Verdict communicated to deployment pipeline
- Rollback triggered automatically if pass rate < threshold

## Workflow

1. **Define smoke suite**: Identify critical-path tests (infrastructure health, core services, critical user journeys). Keep under 25 tests
2. **Classify criticality**: Mark tests as critical (100% pass required) or non-critical (95% threshold). Critical failures trigger rollback
3. **Configure thresholds**: Set critical threshold to 100%, non-critical to 95%. Infrastructure failures stop the pipeline
4. **Execute on deploy**: Run automatically as first CI/CD stage after deployment. Complete in under 5 minutes
5. **Evaluate results**: Critical failure → automatic rollback. Non-critical failure below 95% → block promotion. All pass → continue
6. **Monitor post-deployment**: Continue health checks for 15-30 minutes after deployment. Auto-rollback on sustained degradation
7. **Maintain suite**: Review smoke tests monthly. Add tests for new critical paths. Remove obsolete tests. Verify determinism

## Architecture / Decision Trees

### Test Inclusion Decision Tree

```
Is this a critical business path?
├── YES → Can the system function without it?
│   ├── NO → Include as critical smoke test
│   └── YES → Include as non-critical smoke test
└── NO → Move to regression suite

Can it run in under 30 seconds?
├── YES → Keep in smoke suite
└── NO → Can it be split/optimized?
    ├── YES → Optimize and keep
    └── NO → Move to regression suite

Is it 100% deterministic?
├── YES → Keep in smoke suite
└── NO → Fix flakiness or remove
```

### Environment Configuration Decision Tree

```
Deployment target?
├── Staging → Full smoke suite (write operations OK)
│   ├── Threshold: 100% critical, 95% non-critical
│   └── Rollback: Automatic
├── Canary → Core smoke (read-only + limited write)
│   ├── Threshold: 100% all tests
│   └── Rollback: Canary drain
└── Production → Read-only smoke suite
    ├── Threshold: 100% all tests
    └── Rollback: Automatic full rollback
```

## Common Pitfalls

1. **Suite bloat**: More than 25 tests becomes slow. Prune aggressively — smoke tests are gates, not comprehensive validators
2. **Non-deterministic tests**: Zero tolerance for flakiness. Fix or remove immediately
3. **Complex test data**: Smoke tests requiring complex setup are fragile. Use defaults or existing seed data
4. **Environment-specific failures**: Tests passing in staging but failing in production have configuration issues
5. **No rollback automation**: Smoke failures must trigger automatic rollback, not manual review
6. **Write operations in production**: Production smoke tests must be read-only — never modify production data
7. **Stale credentials**: Expired smoke test credentials cause false failures. Rotate regularly
8. **Overlapping coverage**: Multiple tests verifying the same path waste time. Deduplicate
9. **Missing production verification**: Deploying to production without running smoke tests is risky
10. **No monitoring integration**: Smoke test results must feed into metrics and alerting systems

## Best Practices

1. Keep smoke suite small: 10-25 tests, under 5 minutes, focused on critical paths
2. Every smoke test must be 100% deterministic — non-deterministic tests erode trust
3. Classify tests as critical (100% pass required) or non-critical (95% threshold)
4. Run full smoke suite in staging, read-only smoke in production
5. Connect smoke results to automatic rollback and alerting systems
6. Use dedicated smoke test service accounts with limited permissions
7. Review and update smoke suite monthly to reflect current critical paths
8. Run smoke tests in parallel for speed, but each test must be independent
9. Use infrastructure health checks + core service checks + critical user journeys for complete coverage
10. Continue monitoring after deployment — initial smoke pass doesn't guarantee long-term health

## Compared With

| Aspect | Smoke Testing | Regression Testing | Health Checks |
|--------|--------------|-------------------|---------------|
| Scope | Critical paths | Complete suite | Single component |
| Duration | < 5 minutes | Minutes to hours | < 1 second |
| Frequency | Per deployment | Per change + scheduled | Continuous |
| Tests | 10-25 | 100-10000+ | 1-3 per service |
| Action on fail | Rollback | Block merge | Alert |
| Determinism | 100% required | < 1% flakiness OK | OK to be intermittent |
| Data | Defaults/seed | Complex setup | None |

## Performance Considerations

- Target: 5 minutes maximum for the entire smoke suite
- Each test: under 30 seconds. If slower, optimize or move to regression
- Use parallel execution for concurrent tests
- Reuse HTTP connections and auth tokens across tests in the same suite
- Pre-warm containers and connections before smoke test execution
- Allocate 15-20% buffer time for network latency and intermittent slowdowns
- Monitor execution time trend — growing suite execution time indicates bloat

## Rules

1. Smoke tests must complete in under 5 minutes — 300 seconds total maximum
2. Every deployment must pass smoke tests before reaching users — no exceptions
3. Smoke tests must be 100% deterministic — zero tolerance for flakiness. Fix immediate removal
4. A single critical smoke test failure triggers automatic rollback or pipeline block
5. Smoke suite must be reviewed and updated every sprint to reflect current critical paths
6. Smoke tests must not require complex test data setup — use defaults or existing seed data
7. Production smoke tests must be read-only — never create, update, or delete production data
8. Each smoke test must be independent — no shared state or ordering dependencies
9. Infrastructure tests must run first — if infrastructure is down, skip functional tests
10. Smoke test results must be recorded with evidence (response times, status codes, logs)
11. Smoke test credentials must be rotated every 90 days and stored in secrets management
12. Non-critical failure rate below 95% blocks promotion but does not trigger rollback
13. Post-deployment health monitoring must continue for at least 15 minutes after smoke pass
14. Smoke tests must be version-controlled alongside application code and pipeline config
15. No more than 25 tests in the smoke suite — exceeding this requires pruning
16. Rollback from smoke failure must be tested quarterly to verify automation works

## References
- references/bvt-strategy.md — Build Verification Testing (BVT)
- references/canary-testing.md — Canary Testing
- references/deployment-health.md — Deployment Health Checks
- references/health-check-patterns.md — Health Check Patterns
- references/smoke-automation.md — Smoke Test Automation
- references/smoke-testing-advanced.md — Smoke Testing Advanced Topics
- references/smoke-testing-architecture.md — Smoke Testing Architecture and System Design
- references/smoke-testing-fundamentals.md — Smoke Testing Fundamentals
- references/smoke-testing-strategies.md — Smoke Testing Strategies
- references/smoke-testing-strategy.md — Smoke Testing Strategy and Decision Frameworks

## Handoff
After smoke testing, hand off to:
- `quality-regression-testing` — if smoke passes, run targeted regression on affected areas
- `quality-acceptance-testing` — if smoke passes and UAT is scheduled
- `quality-e2e-testing` — for deeper end-to-end verification of critical journeys
- `quality-load-testing` — if smoke reveals performance concerns
