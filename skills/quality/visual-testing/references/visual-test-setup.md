# Visual Test Setup

## Percy + Playwright Setup

```bash
npm install @percy/cli @percy/playwright --save-dev
npx percy exec -- npx playwright test
```

```typescript
// playwright.config.ts
import { percySnapshot } from "@percy/playwright";

test("homepage visual", async ({ page }) => {
  await page.goto("/");
  await percySnapshot(page, "Homepage", {
    widths: [375, 768, 1280],
  });
});
```

## Percy + Cypress Setup

```bash
npm install @percy/cli @percy/cypress --save-dev
```

```javascript
// cypress/support/e2e.js
import '@percy/cypress';

// Test
cy.visit('/');
cy.percySnapshot('Homepage', { widths: [375, 768, 1280] });
```

## Chromatic + Storybook Setup

```bash
npx chromatic --project-token=<token>
```

```typescript
// .storybook/main.ts
export default {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
};
```

Chromatic auto-discovers all stories. No per-snapshot configuration needed — every story is a snapshot. Use `chromatic` parameter in stories to disable or delay:

```typescript
export default {
  parameters: {
    chromatic: { disableSnapshot: true },
  },
};
```

## Applitools Setup

```bash
npm install @applitools/eyes-playwright --save-dev
```

```typescript
import { Eyes } from "@applitools/eyes-playwright";

const eyes = new Eyes();
await eyes.open(page, "App Name", "Test Name");
await eyes.check("Homepage", Target.window().fully());
await eyes.close();
```

## Diff Thresholds

| Component Type | Threshold | Rationale |
|---------------|-----------|-----------|
| Icons | 0% | Pixel-perfect required |
| Typography | 0.1% | Anti-aliasing variation |
| Buttons, Inputs | 0.1% | Minor sub-pixel rendering |
| Cards, Surfaces | 0.2% | Shadow rendering variation |
| Images, Media | 0.5% | Compression artifacts |
| Full pages | 0.3% | Aggregate of all elements |

Percy diff level: `"strict"` (0% diff), `"major"` (1% diff), `"minor"` (5% diff).

## Snapshot Clipping for Dynamic Content

```typescript
await percySnapshot(page, "Header", {
  clip: { x: 0, y: 0, width: 1440, height: 80 },
  // Or use DOM snapshot:
  domTransformation: (document) => {
    document.querySelector("[data-testid='date']")?.remove();
    return document;
  },
});
```
