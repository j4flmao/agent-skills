# E2E in CI/CD pipelines

## 1. The Bottleneck
Running 500 browser tests in a single Github Actions runner can take 45 minutes. E2E tests are notoriously slow.

## 2. Playwright Sharding
Playwright can split your test suite across multiple CI machines to run them in parallel.
```bash
# Machine 1 runs:
npx playwright test --shard=1/3
# Machine 2 runs:
npx playwright test --shard=2/3
# Machine 3 runs:
npx playwright test --shard=3/3
```

## 3. Github Actions Example
```yaml
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shard }}/4
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report-${{ matrix.shard }}
          path: playwright-report/
```
