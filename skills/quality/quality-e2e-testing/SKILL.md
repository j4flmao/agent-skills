---
name: quality-e2e-testing
description: >
  Use this skill when the user says 'e2e strategy', 'which flows should be e2e', 'flaky e2e tests', 'e2e quarantine', 'mock or real backend in e2e', 'e2e test data', 'e2e in CI gating', 'network conditions in e2e', 'accessibility checks in e2e'. It defines how an organization uses end-to-end tests: journey selection, environment and data strategy, network control, flakiness policy, CI gating and reporting. Do NOT use for: writing the suite scaffolding and page objects (use e2e-testing), Playwright API specifics (use qa-e2e-playwright), visual regression baselines (use quality/visual-testing), fault-injection experiments (use qa-chaos-engineering).
version: "3.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, testing, e2e, playwright, flakiness, ci]
---

# Quality E2E Testing Strategy

## Purpose
Use end-to-end tests where only they can give confidence — critical user journeys across the real stack — and keep them deterministic, fast enough to gate merges, and trusted. Everything that can be verified lower in the pyramid (unit, integration, contract) is tested there instead.

## Agent Protocol

### Trigger
"e2e strategy", "what to cover with e2e", "flaky tests", "quarantine", "e2e test data", "mock vs real backend", "e2e CI gate", "slow e2e suite", "network throttling test", "a11y in e2e".

### Input Context
- Architecture (SPA/SSR, services, third parties) and environments available.
- Current suite size, duration, flake rate, and what failures escaped to production.
- Release process (trunk-based, release trains) and who owns the suite.

### Output Artifact
E2E strategy: journey inventory, environment/data plan, flakiness policy, CI gating rules.

### Response Format
```
Journeys (tier 1 = gate): {journey -> why e2e}
Environment: {ephemeral preview | shared staging | prod smoke}
Data: {API seeding per test | snapshot restore} ; third parties: {mocked at network | sandbox}
Flake policy: {retry=1 in CI, quarantine after N flaky runs, owner + SLA}
CI: {PR: tier 1 sharded <= X min; nightly: full + cross-browser}
Metrics: {flake rate, duration P50/P90, escaped defects}
```

## What Belongs in E2E

| Test it E2E | Test it lower |
|-------------|---------------|
| Sign-up/login, checkout/payment, core create-edit-share flow | Validation rules, formatting, edge cases (unit) |
| Flows crossing several services and the browser | Service-to-service schemas (contract tests) |
| Auth/session/cookie behaviour, redirects | DB queries and repositories (integration) |
| Critical regressions that escaped before | Visual details (visual tests) |

Rank journeys by business impact × change frequency; tier 1 (gating) usually fits in 10–30 tests.

## Environment & Data

| Option | Pros | Cons |
|--------|------|------|
| Ephemeral per-PR environment | Isolated, realistic | Infra cost, startup time |
| Shared staging | Cheap | Data collisions, drift, other teams' deploys |
| Local stack (docker compose) in CI | Deterministic | Less realistic infra |
| Production smoke (read-only or test tenant) | Real config | Must never mutate real data |

Rules:
- Each test creates the data it needs via API/fixtures with unique identifiers; never depend on another test's data.
- Third parties (payments, email, SMS) via sandbox accounts or network-level mocks; keep one nightly run against sandboxes to catch contract drift.
- Reset or isolate by tenant/user rather than wiping shared databases mid-run.

## Network Control
- Stub third-party and non-deterministic endpoints (`page.route` in Playwright, `cy.intercept` in Cypress).
- Test degraded conditions deliberately: slow responses (delay in route handler), offline (`context.setOffline(true)`), error codes (500/429) to verify user-facing error states.
- CPU/network throttling via Chrome DevTools Protocol works only in Chromium; treat it as a Chromium-only check.

## Accessibility Checks in E2E

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('checkout page has no detectable WCAG A/AA violations', async ({ page }) => {
  await page.goto('/checkout');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
```
Automated scans catch only part of accessibility issues; keep manual keyboard/screen-reader checks for key flows.

## Flakiness Policy

| Practice | Rule |
|----------|------|
| Retries | At most 1–2 in CI, never locally; every "passed on retry" is recorded as flaky |
| Quarantine | Test flaky N times in a window → tagged `@quarantine`, excluded from the gate, ticket with owner and fix SLA |
| Root causes | Hard waits, shared data, order dependence, animation timing, unmocked third parties, clock/timezone |
| Evidence | Traces/videos/screenshots on failure uploaded as CI artifacts |
| Budget | Track flake rate per test; a quarantined test that is not fixed by SLA is deleted or rewritten lower in the pyramid |

Common fixes: web-first assertions instead of sleeps; wait for the specific network response (`page.waitForResponse`); disable animations in test builds; freeze time (`page.clock` in Playwright) for date-dependent UI.

## CI Gating

```
PR / merge queue:  tier-1 journeys, 1 browser, sharded, target ≤ ~15 min, blocks merge
Main post-merge:   full suite, main browsers
Nightly:           full suite × browsers/devices + third-party sandboxes + a11y scans
Post-deploy:       production smoke (read-only / test tenant), triggers rollback alert
```

## Metrics
- Suite duration (P50/P90) and queue time.
- Flake rate = runs passing only on retry ÷ total runs, per test.
- Escaped defects: production bugs in flows that have E2E coverage (indicates weak assertions).
- Coverage of tier-1 journey inventory (not line coverage).

## Anti-Patterns

| Anti-pattern | Fix |
|--------------|-----|
| E2E for every edge case | Push down to unit/integration |
| Shared staging data | Per-test seeded data |
| Unlimited retries hiding flakes | Retry ≤ 2 + quarantine with owner |
| Real third-party calls in gating runs | Network mocks; sandboxes nightly |
| Suite too slow to gate | Tier journeys, shard, move rest to nightly |
| Nobody owns failures | Owning team per journey |

## Checklist
- [ ] Journey inventory with tiers and owners
- [ ] Data isolation strategy documented
- [ ] Third parties mocked in gating runs
- [ ] Flake policy (retry, quarantine, SLA) enforced in CI
- [ ] Artifacts (trace/video) on failure
- [ ] Metrics dashboard: duration, flake rate, escaped defects

## References
- `references/playwright-mocking.md` — network mocking patterns
- `references/flaky-test-mitigation.md` — flake root causes and fixes
- `references/visual-regression.md` — screenshot assertions in E2E
- `references/ci-cd-integration.md` — pipelines, sharding, artifacts
- `references/anti-patterns.md` — E2E anti-patterns
