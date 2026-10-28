# Advanced Quality Control: Mutation Testing, Flaky Test Management and Test Suite Health

Techniques to judge and improve the quality of the quality controls themselves: mutation testing to measure test effectiveness beyond coverage, systematic flaky-test management, and suite health metrics. Fundamentals are in `qc-fundamentals.md`; gates in `quality-gates-matrix.md`.

## Why Coverage Is Not Enough

Line/branch coverage shows code was executed, not that tests would detect a wrong result. A test with no assertions can reach 100 % coverage. Mutation testing measures whether tests fail when the code is deliberately broken.

## Mutation Testing

The tool creates mutants (small code changes) and runs the tests against each:

| Mutation operator | Example |
|---|---|
| Conditional boundary | `<` → `<=` |
| Negate conditional | `==` → `!=` |
| Arithmetic | `+` → `-` |
| Return value | `return x` → `return null` / `0` / empty |
| Remove call | delete a void method call |
| Boolean literal | `true` → `false` |

Results: killed (a test failed — good), survived (no test noticed — gap), no coverage, timeout, equivalent (mutant behaves identically; cannot be killed).

```
mutation score = killed / (total − equivalent)
```

### Tools

| Language | Tool |
|---|---|
| Java/JVM | PIT (pitest) |
| JavaScript/TypeScript, C#, Scala | Stryker (StrykerJS, Stryker.NET, Stryker4s) |
| Python | mutmut, Cosmic Ray |
| Rust | cargo-mutants |
| Go | go-mutesting, gremlins |

StrykerJS example:

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "vitest",
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts"],
  "incremental": true,
  "thresholds": { "high": 80, "low": 60, "break": 50 },
  "reporters": ["html", "clear-text", "progress"]
}
```

PIT with Maven:

```bash
mvn org.pitest:pitest-maven:mutationCoverage -DtargetClasses='com.acme.pricing.*' -DmutationThreshold=70
```

### Rollout Strategy

- Mutation testing is CPU-expensive (tests run once per mutant). Start with critical modules (pricing, auth, billing).
- Run incrementally on changed code in PRs (Stryker `incremental`, PIT history files, `cargo mutants --in-diff`), full runs nightly.
- Set a `break` threshold only after establishing a baseline; raise gradually.
- Review surviving mutants: each is either a missing assertion/test, dead code, or an equivalent mutant to mark as ignored.

## Flaky Tests

A flaky test passes and fails on the same code. Flakiness erodes trust: teams start re-running until green and ignore real failures.

### Common Causes

| Cause | Example | Fix |
|---|---|---|
| Async timing | Fixed `sleep`, racing UI updates | Await conditions/events; framework auto-waiting |
| Shared state | Tests depend on order, global singletons, shared DB rows | Isolate data per test, reset state, randomize order to detect |
| Time and timezone | Tests break at midnight or DST | Inject a clock; fixed timezone in CI |
| Randomness | Unseeded random data | Seed and log seeds; property tests with reproducible seeds |
| External services | Real network calls | Mocks, contract tests, local containers |
| Resource limits | Parallel tests exhaust ports/connections | Dynamic ports, bounded parallelism |
| Concurrency bugs in code | Real race conditions | Treat as product bug, not test noise |

### Detection

- CI reruns of failed tests and recording tests that pass on retry as "flaky" (many CI systems and test reporters support this natively).
- Scheduled "stress" runs: execute the suite repeatedly on the same commit; flag tests with mixed outcomes.
- Track flake rate per test: failures on retry-pass / total runs over a window.

### Policy

1. Detected flaky test → automatically quarantined (still runs, does not block merges) with a ticket to the owning team.
2. Fix SLA (e.g. two weeks); after that, delete or rewrite the test with an explicit decision.
3. Quarantine list size is a tracked metric; it should trend down.
4. Retries in CI are a detection mechanism, not a fix; never allow unlimited retries.

Example with pytest (`pytest-rerunfailures`):

```bash
uv run pytest -q --reruns 2 --reruns-delay 1 -p no:randomly   # detect via rerun report
uv run pytest -q -p randomly                                   # pytest-randomly: shuffle order to expose coupling
```

Playwright: `retries` in config plus the HTML report's "flaky" status; `--repeat-each=20` on a suspect test to reproduce.

## Test Suite Health Metrics

| Metric | Target direction |
|---|---|
| Mutation score on critical modules | Up |
| Flaky test rate / quarantine size | Down |
| Suite duration (p50/p95) | Stable or down; long suites get skipped |
| Tests per defect escaped (did a test exist?) | Escapes analyzed for missing tests |
| Assertion density / tests without assertions | No assertion-free tests |
| Test-to-code change ratio in PRs | Changes to logic come with test changes |

## Test Impact Analysis

Run only tests affected by a change (build-graph based in Bazel/Nx/Gradle, or coverage-mapping tools) for fast PR feedback, with full suites on main/nightly to catch what the mapping misses.

## Pitfalls
- Using coverage percentage as the quality goal.
- Running full mutation testing on every PR across the whole codebase (too slow; teams disable it).
- Retrying flaky tests silently without tracking.
- Quarantine without owners or deadlines (becomes a graveyard).

## Checklist
- [ ] Mutation testing on critical modules, incremental in PRs, full nightly
- [ ] Surviving mutants triaged into tests, dead-code removal or ignores
- [ ] Flaky detection, automatic quarantine with owner and SLA
- [ ] Order randomization and stress runs to expose coupling
- [ ] Suite health metrics reviewed with the quality dashboard
