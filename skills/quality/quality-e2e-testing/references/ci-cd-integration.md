# E2E Tests in CI/CD Pipelines

Running browser end-to-end tests (Playwright-focused, with notes for Cypress) in CI: where they sit in the pipeline, sharding and merged reports, environments and test data, artifacts for debugging, and policies for flaky tests. Flake root-cause techniques are in `flaky-test-mitigation.md`; network mocking in `playwright-mocking.md`.

## Where E2E Tests Belong

| Stage | Suite | Goal |
|-------|-------|------|
| Pull request | Smoke / critical-path subset against an ephemeral or preview environment | Fast feedback (aim for minutes) |
| Merge to main | Full E2E suite, sharded | Regression protection |
| Post-deploy (staging/production) | Small smoke suite with synthetic accounts | Verify the deployment |
| Nightly | Cross-browser, mobile viewports, visual regression | Broad coverage without slowing PRs |

Tag tests (`@smoke`, `@critical`) and select with `--grep @smoke`.

## Playwright Configuration for CI

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,              // fail if test.only was committed
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['blob'], ['github']] : [['html']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' }, dependencies: ['setup'] },
  ],
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- Log in once in a setup project and reuse `storageState` instead of logging in through the UI in every test.
- Traces on first retry give full DOM snapshots, network, and console logs for failures without slowing passing runs.

## Sharded Run with Merged Report (GitHub Actions)

```yaml
name: e2e
on:
  pull_request:
  push: { branches: [main] }

permissions:
  contents: read

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --shard=${{ matrix.shard }}/${{ strategy.job-total }}
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report
          retention-days: 7

  merge-reports:
    needs: e2e
    if: ${{ !cancelled() }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true
      - run: npx playwright merge-reports --reporter html ./all-blob-reports
      - uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report
          retention-days: 14
```

- Artifact names must be unique per shard with `upload-artifact@v4`.
- Install only needed browsers; alternatively run in the official Playwright Docker image (`mcr.microsoft.com/playwright:<version>-noble`) matching your `@playwright/test` version to skip installation.
- Balance shards by test duration; with `fullyParallel: true` Playwright splits at the test level.

## Cypress Notes

- Parallelization and load balancing across machines use Cypress Cloud (`--record --parallel`) or community alternatives; without them, split spec files manually per matrix job.
- Use the `cypress-io/github-action` for install, caching, and start/wait-on of the app server.

## Environments

| Option | Pros | Cons |
|--------|------|------|
| App started inside the CI job (`webServer`) | Simple, isolated | Needs DB/services (Docker Compose or Testcontainers) |
| Ephemeral preview environment per PR | Production-like | Provisioning time and cost |
| Shared staging | Realistic integrations | Contention, data collisions, flaky due to other deploys |

Wait for readiness explicitly (health endpoint) before starting tests; never `sleep` a fixed time.

## Test Data Strategy

- Each test creates the data it needs through APIs or seed scripts and uses unique identifiers (e.g. suffix with worker index and timestamp) so parallel tests do not collide.
- Avoid tests depending on each other's state or order.
- Reset or isolate databases per run (fresh container, transaction rollback, or tenant per run).
- Third-party dependencies (payments, email): use provider sandboxes or mock at the network layer (`page.route`) for most tests; keep a few contract-level tests against sandboxes.

## Flaky Test Policy

- Retries (`retries: 2`) keep pipelines usable but hide problems: report tests that passed only on retry as "flaky" (Playwright marks them) and track them.
- Quarantine: move persistently flaky tests to a non-blocking job with an owner and deadline (Playwright's skip-and-mark annotation or a `@quarantine` tag), rather than deleting or ignoring.
- Review flaky-rate trends weekly; a rising rate signals environment or architecture problems.

## Debugging Failures in CI

- Download the HTML report artifact; open traces with `npx playwright show-trace trace.zip` or the hosted trace viewer.
- Use the `github` reporter for inline failure annotations on PRs.
- Record the app's server logs as artifacts alongside test results.

## Deployment Gates

```
build → unit/integration tests → deploy to preview/staging → E2E smoke (blocking) → deploy prod → prod smoke → (auto-rollback on failure)
```

Production smoke tests use dedicated synthetic accounts, avoid side effects (or clean them up), and should be safe to run repeatedly.

## Pitfalls

- Running the full suite on every PR with no sharding, creating 45-minute feedback loops.
- Shared staging data causing order-dependent failures.
- Outdated action versions: use `actions/checkout@v4` or newer; the v3 artifact upload/download actions were deprecated and no longer work on GitHub.com.
- Browser binaries not matching the Playwright package version (install with the same version via `npx playwright install`).

## Checklist

- [ ] Tiered suites: PR smoke, main full, post-deploy smoke, nightly cross-browser
- [ ] Sharding with merged HTML report
- [ ] Traces/screenshots/videos retained on failure
- [ ] Auth state reused via setup project
- [ ] Isolated, unique test data per test
- [ ] Flaky tests tracked and quarantined with owners
- [ ] Current action versions; minimal workflow permissions
