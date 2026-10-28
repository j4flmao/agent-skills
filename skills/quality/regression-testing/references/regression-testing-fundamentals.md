# Regression Testing Fundamentals

Regression testing checks that changes (features, fixes, refactors, dependency or configuration updates) have not broken behavior that previously worked. This reference covers the core concepts: what a regression suite contains, levels of regression testing, selection approaches, suite health and how it fits into CI/CD. Deeper treatments: `test-selection.md`, `risk-based-selection.md`, `flaky-test-management.md`, `regression-suites.md`, `regression-metrics.md`.

## Sources of Regressions

| Source | Example |
|--------|---------|
| Code changes | Refactor alters an edge case |
| Dependency updates | Library changes default behavior |
| Configuration and feature flags | New default flag value disables a path |
| Data and schema changes | Migration changes nullability |
| Infrastructure | Runtime/OS/browser version changes |
| Third-party APIs | Provider changes response format |

Regression testing must cover more than code diffs: dependency bumps and config changes need the same safety net.

## What a Regression Suite Contains

| Layer | Content | Speed |
|-------|---------|-------|
| Unit tests | Business logic, edge cases, past bug reproductions | Seconds |
| Integration/API tests | Service + DB, API contracts | Minutes |
| Contract tests | Provider/consumer compatibility | Minutes |
| UI/E2E tests | Critical user journeys only | Minutes to tens of minutes |
| Visual regression | Screenshot diffs of key components/pages | Minutes |
| Non-functional | Performance baselines, accessibility checks | Varies |

Every fixed defect should add a test at the lowest level that reproduces it, so the same bug cannot silently return.

## Regression Test Selection

| Approach | Description | Trade-off |
|----------|-------------|-----------|
| Retest all | Run the entire suite | Safest, slowest |
| Change-based / test impact analysis | Run tests that depend on changed files/modules (dependency graph, coverage maps) | Fast; misses indirect effects (config, data) |
| Risk-based | Prioritize critical, complex, frequently failing areas | Needs maintained risk ratings |
| Prioritization | Run all, but most valuable first for faster failure feedback | Still full cost, earlier signal |

Common combination: impact-based selection on pull requests, full suite on main/nightly, plus a fixed smoke set always.

Monorepo tools provide affected-target detection (Nx `affected`, Turborepo filters, Bazel query, Gradle build cache). Jest `--changedSince` and Vitest `--changed` offer file-level selection for JavaScript projects.

## Tiered Execution in CI/CD

| Trigger | Scope | Time budget (team-defined) |
|---------|-------|----------------------------|
| Pre-commit / local | Affected unit tests, lint | Seconds |
| Pull request | Affected unit + integration, smoke E2E, contract tests | Short enough not to block flow |
| Merge to main | Full unit/integration, broader E2E | Longer |
| Nightly / pre-release | Full E2E, visual, performance, cross-browser | Longest |
| Post-deploy | Smoke tests and synthetic monitoring in each environment | Minutes |

```yaml
# GitHub Actions excerpt: affected tests on PRs, full suite on main
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - name: Affected tests (PR)
        if: github.event_name == 'pull_request'
        run: npx nx affected -t test --base=origin/${{ github.base_ref }}
      - name: Full suite (main)
        if: github.ref == 'refs/heads/main'
        run: npx nx run-many -t test
```

## Suite Health

| Problem | Effect | Practice |
|---------|--------|----------|
| Flaky tests | Teams ignore failures | Detect via reruns/history, quarantine with owner and deadline, fix root cause (timing, shared state, order dependence) |
| Slow suite | Feedback delayed, people skip tests | Parallelize/shard, move checks to lower levels, remove redundant E2E |
| Redundant tests | Maintenance cost | Remove duplicates covered at lower levels |
| Obsolete tests | False failures after intended changes | Update or delete with the feature change |
| Weak assertions | Tests pass despite bugs | Mutation testing on critical modules |

Automatic retries can hide flakiness; if used, record and report retried passes rather than treating them as clean.

## Writing Good Regression Tests

- Deterministic: control time, randomness (seeded), and external services (mocks/containers).
- Independent: each test sets up and cleans its own data; can run in any order and in parallel.
- Behavior-focused: assert observable outcomes, not implementation details, so refactors do not cause false failures.
- Clear failure messages pointing to the broken behavior.
- Named after the behavior or the bug they guard (`refund_rejects_amount_above_captured_total`).

## Visual and Snapshot Regression

- Visual tools (Playwright `toHaveScreenshot`, Chromatic, Percy) catch layout regressions; stabilize fonts, animations and dynamic data.
- Keep snapshot tests small and reviewed; large auto-updated snapshots become rubber stamps.

## Measuring Effectiveness

- Escaped regressions per release (bugs in previously working functionality found after release).
- Time from commit to regression signal.
- Flaky rate and quarantine count.
- Share of fixed defects that received a regression test.

## Checklist

- [ ] Every bug fix adds a regression test at the lowest effective level
- [ ] Dependency and config changes run the regression suite
- [ ] Impact-based selection on PRs, full suite on main/nightly
- [ ] Smoke tests after each deployment
- [ ] Flaky tests quarantined with owners and deadlines
- [ ] Suite duration tracked; slow layers pushed down the pyramid
- [ ] Escaped regressions reviewed to improve coverage
