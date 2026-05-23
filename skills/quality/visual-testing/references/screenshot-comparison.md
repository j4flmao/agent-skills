# Screenshot Comparison

## Tools Comparison

| Tool | Free Tier | Cloud | CI Integration | Diff View | Max Resolution |
|------|-----------|-------|----------------|-----------|----------------|
| Percy | 5000 snapshots/mo | Yes | GitHub, GitLab, Bitbucket | Side-by-side + overlay | 4096×4096 |
| Chromatic | 5000 snapshots/mo | Yes | GitHub, GitLab, Bitbucket | Split + highlight | 5000×5000 |
| Applitools | 1000 checkpoints/mo | Yes | All major | Heatmap + side-by-side | Unlimited |
| Playwright Screenshot | Free | No | Manual | Pixelmatch (npm) | Unlimited |
| Cypress Screenshot Diff | Free | No | Manual | odiff, pixelmatch | Unlimited |
| Loki | Free | No | Manual | Pixelmatch | Unlimited |

## Playwright Screenshot Comparison

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
});
```

```typescript
// specs/visual/button.spec.ts
import { test, expect } from "@playwright/test";

test("primary button matches baseline", async ({ page }) => {
  await page.goto("/components/button");
  const button = page.getByRole("button", { name: "Submit" });
  await expect(button).toHaveScreenshot("primary-button.png", {
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  });
});

test("button hover state matches baseline", async ({ page }) => {
  await page.goto("/components/button");
  const button = page.getByRole("button", { name: "Submit" });
  await button.hover();
  await expect(button).toHaveScreenshot("primary-button-hover.png");
});
```

## Percy Integration

```typescript
// specs/visual/percy.spec.ts
import { test, expect } from "@playwright/test";
import percySnapshot from "@percy/playwright";

test("homepage visual regression", async ({ page }) => {
  await page.goto("/");
  await percySnapshot(page, "Homepage");
});

test("dashboard visual regression", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForSelector('[data-testid="metrics-loaded"]');
  await percySnapshot(page, "Dashboard");
});
```

```yaml
# .github/workflows/visual.yml
name: Visual Tests
on: [pull_request]
jobs:
  percy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx playwright install --with-deps
      - run: npx percy exec -- npx playwright test
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

## Pixelmatch (Open Source)

```javascript
// scripts/visual-diff.js
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "fs";

const baseline = PNG.sync.read(fs.readFileSync("baseline.png"));
const current = PNG.sync.read(fs.readFileSync("current.png"));
const diff = new PNG({ width: baseline.width, height: baseline.height });

const mismatchedPixels = pixelmatch(
  baseline.data,
  current.data,
  diff.data,
  baseline.width,
  baseline.height,
  { threshold: 0.1 }
);

const totalPixels = baseline.width * baseline.height;
const diffRatio = mismatchedPixels / totalPixels;

if (diffRatio > 0.01) {
  fs.writeFileSync("diff.png", PNG.sync.write(diff));
  console.error(`FAIL: ${(diffRatio * 100).toFixed(2)}% pixels differ`);
  process.exit(1);
} else {
  console.log(`PASS: ${(diffRatio * 100).toFixed(2)}% pixels differ`);
}
```

## Loki (Docker-based)

```bash
# Install
npx loki init

# Update baselines
npx loki update

# Test
npx loki test

# Approve changes
npx loki approve
```

```javascript
// loki.config.js
module.exports = {
  configurations: {
    "chrome.desktop": {
      target: "chrome.docker",
      width: 1280,
      height: 720,
    },
    "chrome.mobile": {
      target: "chrome.docker",
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
    },
  },
  stories: [
    { pattern: "src/**/*.stories.{js,tsx}" },
  ],
};
```

## Best Practices

| Practice | Why | Implementation |
|----------|-----|----------------|
| Fixed viewport | Prevents flaky diffs from window size | Set viewport in config |
| Disable animations | CSS animations cause false positives | `page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 0s !important; }' })` |
| Wait for data | Screenshot before data loads is useless | `waitForSelector`, `waitForResponse` |
| Consistent fonts | Font loading differences cause diff | Use system fonts or preload web fonts |
| Mask dynamic content | Dates, avatars, random data | Percy `percyCSS`, Playwright `mask` option |
| Ignore anti-aliasing | OS-level font rendering | Use proper threshold values |
| Test at breakpoints | Responsive design needs multiple screenshots | Test at 375, 768, 1280, 1920 |

## CI Pipeline

```yaml
name: Visual Regression
on: [pull_request]

jobs:
  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx playwright install --with-deps
      - run: npm run build-storybook
      - name: Run visual tests
        run: npx percy exec -- npx playwright test --config=e2e/visual.config.ts
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
      - name: Upload diffs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs
          path: test-results/
```

## Threshold Guidelines

| Element Type | Max Diff Ratio | Threshold |
|--------------|---------------|-----------|
| Static text | 0% | 0.0 |
| Icons | < 1% | 0.1 |
| Images | < 5% | 0.2 |
| Charts | < 3% | 0.1 |
| Maps | < 10% | 0.3 |
| Animations (disabled) | 0% | 0.0 |
| Animations (enabled) | N/A — disable instead | — |
