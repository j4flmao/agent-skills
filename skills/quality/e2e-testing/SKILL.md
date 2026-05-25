---
name: quality-e2e-testing
description: >
  Use this skill when setting up E2E testing, end-to-end tests, Playwright, Cypress, browser tests, user flow tests, or integration tests. This skill enforces: framework selection (Playwright preferred), page object model, test isolation, parallel execution, CI integration, and visual assertions. Do NOT use for: unit testing, API-only tests, or performance/load testing.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, testing, phase-10]
---

# Quality E2E Testing

## Purpose
Configure and write reliable end-to-end browser tests with framework selection, page objects, parallel execution, and CI integration.

## Agent Protocol

### Trigger
Exact user phrases: "E2E test", "end-to-end", "Playwright", "Cypress", "Selenium", "browser test", "integration test", "user flow test", "test automation", "page object", "test isolation".

### Input Context
Before activating, verify:
- Application type (SPA, SSR, static site, mobile web)
- Target browsers (Chromium, Firefox, WebKit)
- CI platform (GitHub Actions, GitLab CI, Jenkins)
- Existing test framework and coverage

### Output Artifact
E2E testing strategy with framework selection, page object patterns, and CI pipeline configuration.

### Response Format
```yaml
# Framework selection with rationale
# Test structure and page object hierarchy
```
```typescript
// Page object example
// CI pipeline configuration
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Framework selected (Playwright recommended for new projects)
- [ ] Page object model defined for all key pages
- [ ] Test isolation strategy established (per-test state reset)
- [ ] Parallel execution configured (sharding or worker pools)
- [ ] CI pipeline with E2E test stage configured
- [ ] Visual assertions set up (screenshot diff)
- [ ] Test data strategy defined (fixtures, API seeding, factories)

### Max Response Length
200 lines of configuration and test patterns.

## Workflow

### Step 1: Framework Selection
Playwright: cross-browser (Chromium, Firefox, WebKit), native async, network mocking, visual diffing, codegen, auto-wait. Cypress: easier debugging, time-travel, rich interactive runner, but Chromium-only + flakier cross-browser. Selenium: last resort — only if legacy compatibility required. Recommendation: Playwright for new projects.

### Step 2: Project Setup
```bash
npm init playwright@latest
```

Directory structure: `e2e/` with `pages/` (page objects), `fixtures/` (test data), `specs/` (test files), `utils/` (helpers, custom assertions). Global setup file for auth state (login once, reuse across tests).

### Step 3: Page Object Model
```typescript
export class LoginPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto("/login"); }
  async fillEmail(email: string) { await this.page.fill('[data-testid="email"]', email); }
  async fillPassword(password: string) { await this.page.fill('[data-testid="password"]', password); }
  async submit() { await this.page.click('[data-testid="submit"]'); }
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }
}
```

### Step 4: Test Isolation
Each test starts with a clean state. Reset database before test run (not per-test if slow). Use `test.beforeEach` for auth + navigation. API-mock external services. Never share page or context between tests. Use `test.describe.serial` only when sequential execution is explicitly required (rare).

### Step 5: Parallel Execution
Playwright: worker pool (default: CPU cores). Sharding in CI: `npx playwright test --shard=1/4`. Each shard runs a subset of tests independently. Test retries: 1–2 retries in CI for flaky tests — but target zero flakiness. Mark flaky tests with `test.fixme()` and track.

### Step 6: CI Integration
```yaml
# GitHub Actions example
- name: Run E2E tests
  run: npx playwright test
  env:
    CI: true
    BASE_URL: ${{ secrets.E2E_BASE_URL }}
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-report
    path: playwright-report/
```

### Step 7: Visual Assertions
```typescript
await expect(page).toHaveScreenshot("homepage.png", {
  maxDiffPixels: 100,
  threshold: 0.2,
});
```
Store baselines in version control. Update baselines intentionally: `npx playwright test --update-snapshots`.

## Rules
- data-testid attributes for selectors — never CSS classes or text content
- One assertion per test (logical assertion — not literal expect call)
- Page objects expose business actions, not UI implementations
- Tests are independent and parallelizable by default
- Global setup for auth — per-test setup for data
- Never use `page.waitFor` — use auto-waiting locators
- Screenshot diff threshold: 0.2 (prevent false positives)
- Retry flaky tests in CI, but flag and fix them

## References
- `references/cypress-guide.md` — Cypress Guide
- `references/framework-selection.md` — Framework Selection
- `references/playwright-guide.md` — Playwright Guide
- `references/test-patterns.md` — Test Patterns

## Handoff
`quality-visual-testing` for visual regression setup alongside E2E tests.
`quality-contract-testing` for API contract verification.
Carry forward: test config, page objects, CI pipeline config.
