# Visual Testing Advanced Topics

## Introduction
Advanced visual testing covers AI-powered visual diff detection, Storybook integration for component-level visual testing, cross-browser visual matrix testing, visual testing in design systems, dynamic content masking, and performance optimization for large visual test suites.

## Storybook Integration with Chromatic
```typescript
// .storybook/preview.ts — Visual test configuration
import { withScreenshot } from 'storycap';

export const decorators = [withScreenshot];

export const parameters = {
  screenshot: {
    viewports: {
      mobile: { width: 375, height: 667 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1280, height: 720 },
    },
    waitFor: 'networkidle',
  },
};
```

```typescript
// Button.stories.ts — Component stories with visual test targets
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    screenshot: {
      variants: {
        default: {},
        hover: { hoverSelector: 'button' },
        focus: { focusSelector: 'button' },
        active: { clickSelector: 'button' },
      },
    },
  },
};

export const Primary: StoryObj<typeof Button> = {
  args: { variant: 'primary', label: 'Primary Button' },
};

export const Disabled: StoryObj<typeof Button> = {
  args: { variant: 'primary', label: 'Disabled', disabled: true },
};
```

## Dynamic Content Masking
```typescript
// Mask dynamic content before screenshot
test('dashboard with masked dynamic data', async ({ page }) => {
  await page.goto('/dashboard');

  // Mask user-specific data
  await page.evaluate(() => {
    document.querySelectorAll('[data-dynamic]').forEach(el => {
      el.textContent = 'MASKED';
    });
  });

  // Hide cursor
  await page.addStyleTag({
    content: '* { caret-color: transparent !important; }',
  });

  await expect(page).toHaveScreenshot('dashboard.png', {
    mask: [
      page.locator('[data-testid="user-avatar"]'),
      page.locator('[data-testid="live-timer"]'),
      page.locator('[data-testid="random-ad"]'),
    ],
  });
});
```

## Cross-Browser Visual Matrix
```yaml
# Run visual tests across browser/viewport matrix
visual_test_matrix:
  browsers: [chromium, firefox, webkit]
  viewports:
    - { width: 375, height: 667 }   # Mobile
    - { width: 768, height: 1024 }  # Tablet
    - { width: 1280, height: 720 }  # Desktop
    - { width: 1920, height: 1080 } # Large desktop
```

## Performance Optimization
- Use element-level screenshots instead of full-page
- Batch visual tests by component, not by page
- Run visual tests only on changed components (via git diff)
- Use parallel execution for independent visual tests
- Store baselines in Git LFS for large snapshot files
- Cache baseline comparisons — skip unchanged components

## Key Points
- Integrate visual testing with Storybook for component-level coverage
- Mask dynamic content (dates, avatars, ads) to reduce false positives
- Run visual tests across browser/viewport matrix for comprehensive coverage
- Use Chromatic for AI-powered diff detection in Storybook projects
- Optimize performance: element-level, batching, parallel execution
- Cache baseline comparisons for unchanged components
- Design system visual testing validates component library consistency
