# Testing CI/CD Integration

## CI Test Configuration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }

      - run: npm ci

      # Lint first — fastest feedback
      - run: npm run lint

      # Type check
      - run: npm run typecheck

      # Unit + component tests
      - run: npm run test:unit -- --coverage

      # E2E tests
      - run: npm run build
      - run: npx playwright install --with-deps
      - run: npm run test:e2e

      # Accessibility
      - run: npx pa11y-ci --sitemap https://staging.example.com/sitemap.xml
```

## Coverage Enforcement

```yaml
      - run: npm run test:coverage
        env:
          CI: true
        # Fail if coverage below threshold
```

```js
// vitest.config.ts
test: {
  coverage: {
    thresholds: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
}
```

## Parallel Test Execution

```yaml
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - run: npx vitest run --shard=${{ matrix.shard }}/${{ strategy.jobs.test.strategy.matrix.shard.max }}
```

```yaml
  e2e:
    strategy:
      fail-fast: false
      matrix:
        project: [chromium, firefox, webkit]
    steps:
      - run: npx playwright test --project=${{ matrix.project }}
```

## Visual Regression Testing

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  snapshotDir: './__snapshots__',
  expect: { toMatchSnapshot: { threshold: 0.1 } },
})
```

```typescript
test('homepage matches snapshot', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixels: 100,
  })
})
```

## Test Retries

```yaml
      - run: npx playwright test --retries=2
```

```ts
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
})
```

## CI Performance Optimization

| Technique | Benefit |
|-----------|---------|
| Dependency caching | -60% install time |
| Test sharding | Parallel execution |
| Only test changed files | Fast feedback |
| Fail-fast lint | Early failure |
| Artifact retention | Debug failures |
| Test ordering | Deterministic runs |

## Pre-commit Hooks

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "vitest related --run"],
    "*.{css,scss}": ["stylelint --fix"]
  }
}
```
