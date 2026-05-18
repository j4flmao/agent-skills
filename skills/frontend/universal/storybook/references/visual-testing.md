# Visual Testing Reference

## Chromatic Setup

```bash
npm i -D chromatic
npx chromatic --project-token=<token>
```

```yml
# .github/workflows/chromatic.yml
name: Chromatic
on: push
jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx chromatic --project-token=${{ secrets.CHROMATIC_TOKEN }}
```

## Visual Test Thresholds

| Check            | Threshold       |
|------------------|-----------------|
| Pixel diff       | 0% (no changes) |
| Layout shift     | 0px             |
| Missing stories  | 0               |
| Accessibility    | 0 violations    |

## Snapshot Testing with `test-storybook`

```bash
npm i -D @storybook/test-runner
```

```ts
// .storybook/test-runner.ts
import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  async postVisit(page, story) {
    const context = await getStoryContext(page, story);
    // Assert no a11y violations after interactions
    if (context.parameters?.a11y?.config?.rules?.length) {
      const violations = await page.evaluate(() =>
        (window as any).__STORYBOOK_A11Y_VIOLATIONS__
      );
      expect(violations).toHaveLength(0);
    }
  },
};

export default config;
```

```json
// package.json scripts
{
  "test-storybook": "test-storybook",
  "test-storybook:ci": "test-storybook --maxWorkers 2 --coverage"
}
```

## Visual Regression with Playwright

```ts
// e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test';

const STORIES = [
  '/iframe.html?id=components-button--primary',
  '/iframe.html?id=components-button--disabled',
  '/iframe.html?id=components-button--loading',
];

test.describe('Visual regression', () => {
  for (const story of STORIES) {
    test(story, async ({ page }) => {
      await page.goto(`http://localhost:6006${story}`);
      await expect(page).toHaveScreenshot({ fullPage: true });
    });
  }
});
```

## Locators for Visual Tests

```ts
// Use data-testid in stories for targeted screenshots
export const Primary: Story = {
  args: { ...Primary.args },
  parameters: {
    snapshot: { selector: '[data-testid="button"]' },
  },
};
```

## Auto-Screenshot on PR

```yml
# .github/workflows/visual-test.yml
name: Visual Tests
on: pull_request
jobs:
  screenshot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build-storybook
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test e2e/visual-regression.spec.ts
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results
          path: test-results/
```

## Thresholds & Anti-Flicker

```ts
// storybook/preview.ts — disable animations during snapshots
const preview: Preview = {
  parameters: {
    chromatic: {
      disableSnapshot: false,
      pauseAnimationAtEnd: true,
      diffThreshold: 0.1,
    },
  },
};
```

## Story-level Snapshot Control

```tsx
export const SkipSnapshot: Story = {
  args: { ...Primary.args },
  parameters: {
    chromatic: { disableSnapshot: true },
  },
};
```

## Tools Comparison

| Tool        | Open Source | CI Integration | Cloud Hosting | Diff Review UI |
|-------------|-------------|----------------|---------------|----------------|
| Chromatic   | No          | Native         | Yes           | Yes            |
| Percy       | No          | Native         | Yes           | Yes            |
| Playwright  | Yes         | Manual         | No            | No             |
| Loki        | Yes         | Manual         | No            | No             |
| Happo       | No          | Native         | Yes           | Yes            |
