# Visual Testing Fundamentals

## Overview
Visual testing verifies that the user interface renders correctly by comparing screenshots against baselines. It catches visual regressions that functional tests miss: CSS changes, layout shifts, font changes, color mismatches, responsive breakpoint issues, and cross-browser rendering differences.

## Core Concepts

### Concept 1: Visual Regression Testing
Compare screenshots of UI components across versions. A baseline screenshot is captured when the UI is known to be correct. Subsequent tests compare new screenshots against the baseline. Differences are flagged as potential regressions for human review.

### Concept 2: Baseline Management
Baselines are the "truth" — correct renderings to compare against. Store baselines in version control alongside test code. Update baselines when visual changes are intentional. Strategies: per-component baselines, per-page baselines, per-viewport baselines.

### Concept 3: Diff Thresholds
Not all pixel differences are bugs. Anti-aliasing, font rendering, and OS-level differences cause minor pixel variations. Set thresholds: max diff pixels (e.g., 100 pixels), max diff ratio (e.g., 0.1%), and color difference tolerance (e.g., 0.2 on a 0-1 scale).

### Concept 4: Screenshot Strategies
- **Full page**: Capture entire scrollable page. Good for comprehensive checks. Slow for long pages.
- **Viewport**: Capture visible area at specific viewport sizes. Good for responsive testing.
- **Element**: Capture specific component or element. Fast, focused, good for component libraries.
- **Story**: Capture individual component states from Storybook. Excellent for design system testing.

## Framework Comparison

| Feature | Playwright | Cypress + Percy | Chromatic | Applitools | Loki |
|---------|-----------|----------------|-----------|------------|------|
| Integration | Built-in | Plugin | Storybook | SDK | Standalone |
| Hosting | Self-hosted | Percy Cloud | Chromatic Cloud | Applitools Cloud | Self-hosted |
| Pricing | Free (OSS) | Freemium | Freemium | Paid | Free |
| Diff detection | Pixel comparison | Smart (Percy CSS) | Smart (Chromatic) | AI-powered (Eyes) | Pixel comparison |
| Cross-browser | Yes (Chromium, FF, WebKit) | Limited | Limited | Yes | Chromium only |
| Responsive testing | Built-in viewports | Manual screenshots | Built-in | Built-in | Manual |
| Baseline storage | Git LFS / file system | Percy Cloud | Chromatic | Applitools | File system |
| CI integration | Native | GitHub/GitLab | GitHub/GitLab | GitHub/GitLab | GitHub Actions |
| Best for | Full project visual testing | E2E + visual | Design system / Storybook | Enterprise visual AI | Open-source projects |

## Implementation Guide

### Step 1: Set Up Playwright Screenshot Tests
```typescript
// tests/visual/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Homepage visual regression', () => {
  test('homepage matches baseline — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveSapshot('homepage-desktop.png', {
      maxDiffPixels: 200,
      threshold: 0.2,
    });
  });

  test('homepage matches baseline — mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveSapshot('homepage-mobile.png', {
      maxDiffPixels: 200,
      threshold: 0.2,
    });
  });

  test('login form matches baseline', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('[data-testid="login-form"]');
    const form = page.locator('[data-testid="login-form"]');
    await expect(form).toHaveSapshot('login-form.png');
  });
});
```

### Step 2: Playwright Visual Test Configuration
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  snapshotDir: './visual-snapshots',
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 500,
      threshold: 0.2,
      animations: 'disabled',
      scale: 'device',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox', viewport: { width: 1280, height: 720 } },
    },
  ],
});
```

### Step 3: CI Integration
```yaml
name: Visual Regression Tests
on: [pull_request]

jobs:
  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      - name: Generate screenshots
        run: npx playwright test --project=chromium
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-diffs
          path: test-results/
```

## Baseline Management

### When to Update Baselines
- New feature adds or changes UI
- Design system update (button styles, spacing, typography)
- Intentional layout change
- Content update (accepted with stakeholders)

### Baseline Update Workflow
```bash
# Update baselines locally
npx playwright test --update-snapshots

# Verify changes are intentional
# Review diff images in test-results/

# Commit new baselines
git add visual-snapshots/
git commit -m "test(visual): update baselines for new header design"
```

## Best Practices
- Use element-level screenshots (not full page) for component-focused testing
- Disable animations and transitions for consistent screenshots
- Set appropriate diff thresholds based on your tolerance for false positives
- Test at multiple viewport sizes for responsive design coverage
- Store baselines in version control alongside test code
- Review visual diffs manually before accepting new baselines
- Run visual tests in CI on every PR but only fail on meaningful differences
- Use data-testid attributes to mask dynamic content (dates, user names, ads)
- Combine visual testing with functional assertions for comprehensive coverage

## Common Pitfalls
- High false positive rate from dynamic content (dates, timers, ads)
- Baselines that are never updated (accumulate outdated references)
- Full-page screenshots for every test (slow, high false positives)
- Ignoring anti-aliasing differences between operating systems
- Testing on headless vs headed browser (rendering differences)
- No element isolation — testing pages with too many dynamic elements
- Running visual tests on every commit (expensive, can be slower)
- Not masking dynamic content (counters, timestamps, user-specific data)

## Key Points
- Visual testing catches CSS/layout bugs that functional tests miss
- Playwright has built-in screenshot comparison (no third-party needed)
- Use element-level screenshots for component-focused testing
- Set appropriate diff thresholds to balance sensitivity and false positives
- Store baselines in version control; update intentionally
- Mask dynamic content with data-testid or fixed values
- Test at multiple viewports for responsive design confidence
- Disable animations for consistent screenshots
