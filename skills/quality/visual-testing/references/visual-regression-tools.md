# Visual Regression Tools

## Tool Selection Guide

| Tool | Type | Cost | CI Native | Review Workflow | Best For |
|------|------|------|-----------|-----------------|----------|
| Percy | Cloud SaaS | Free tier (5K/mo) | Yes | PR integration, approval flow | Teams wanting managed review |
| Chromatic | Cloud SaaS | Free tier (5K/mo) | Yes | Storybook integration, UI review | Storybook-heavy projects |
| Applitools | Cloud SaaS | Paid (1K free) | Yes | AI-based matching, Ultrafast Grid | Cross-browser + visual |
| BackstopJS | Open source | Free | Manual | HTML report, local review | Open source, no budget |
| Loki | Open source | Free | Manual | Docker-based, CLI | Component libraries |
| Playwright | Built-in | Free | Manual | Baseline files in repo | Teams already using Playwright |
| Cypress | Built-in | Free | Manual | Base image in repo | Teams already using Cypress |
| Happo | Cloud SaaS | Paid | Yes | Cross-browser, GIF diff | Animations |

## Percy

### Setup

```bash
npm install --save-dev @percy/cli @percy/playwright
```

```typescript
// percy.config.js
export default {
  version: 2,
  snapshot: {
    widths: [375, 1280, 1920],
    minHeight: 1024,
    percyCSS: `
      iframe, .animated { display: none; }
      [data-visual-test="skip"] { visibility: hidden; }
    `,
  },
  discovery: {
    allowedHostnames: ["fonts.googleapis.com"],
    networkIdleTimeout: 100,
  },
};
```

### Review Workflow
1. PR opened → Percy runs snapshots
2. Percy compares against baseline
3. PR check shows pass/fail
4. Reviewer opens Percy dashboard to inspect diffs
5. Reviewer approves or requests changes
6. On merge, snapshots become new baseline
7. Baseline auto-managed by branch history

## Chromatic

### Setup

```bash
npx chromatic init
```

```typescript
// .chromatic/config.json
{
  "projectId": "Project:xxx",
  "buildScriptName": "build-storybook",
  "storybookConfigDir": ".storybook",
  "onlyChanged": true,
  "exitZeroOnChanges": true,
  "autoAcceptChanges": "main",
  "patch": true,
  "zip": true
}
```

### Storybook Integration

```typescript
// Button.stories.ts
import { Button } from "./Button";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Button> = {
  component: Button,
  parameters: {
    chromatic: {
      disableSnapshot: false,
      delay: 500,
      pauseAnimationAtEnd: true,
      diffThreshold: 0.2,
      viewports: [375, 1280],
    },
  },
};

export default meta;

export const Primary: StoryObj<typeof Button> = {
  args: { variant: "primary", children: "Submit" },
};

export const Disabled: StoryObj<typeof Button> = {
  args: { variant: "primary", children: "Submit", disabled: true },
  parameters: {
    chromatic: { disableSnapshot: false },
  },
};
```

## Applitools Eyes

```typescript
// specs/visual/applitools.spec.ts
import { test as base } from "@playwright/test";
import {
  BatchInfo,
  Configuration,
  EyesRunner,
  VisualGridRunner,
  BrowserType,
} from "@applitools/eyes-playwright";

const runner = new VisualGridRunner({ testConcurrency: 5 });
const batch = new BatchInfo({ name: "Homepage" });

const configuration = new Configuration();
configuration.setBatch(batch);
configuration.addBrowsers(
  { name: BrowserType.CHROME, width: 1280, height: 720 },
  { name: BrowserType.FIREFOX, width: 1280, height: 720 },
  { name: BrowserType.SAFARI, width: 375, height: 812 },
);

const test = base.extend({
  eyes: async ({ page }, use) => {
    const eyes = new Eyes(runner, configuration);
    await eyes.open(page, "My App", test.info().title);
    await use(eyes);
    await eyes.close();
  },
});

export { expect } from "@playwright/test";

test("homepage visual test", async ({ page, eyes }) => {
  await page.goto("/");
  await eyes.check("Homepage", Target.window().fully());
});
```

## BackstopJS

```javascript
// backstop.json
{
  "id": "my_app",
  "viewports": [
    { "name": "phone", "width": 375, "height": 812 },
    { "name": "tablet", "width": 768, "height": 1024 },
    { "name": "desktop", "width": 1280, "height": 720 }
  ],
  "scenarios": [
    {
      "label": "Homepage",
      "url": "http://localhost:3000",
      "referenceUrl": "http://staging.example.com",
      "readySelector": "[data-testid='page-loaded']",
      "delay": 500,
      "misMatchThreshold": 0.1,
      "requireSameDimensions": true
    },
    {
      "label": "Login Page",
      "url": "http://localhost:3000/login",
      "selectors": ["viewport"],
      "readyEvent": null,
      "delay": 0,
      "misMatchThreshold": 0.05
    }
  ],
  "paths": {
    "bitmaps_reference": "backstop_data/bitmaps_reference",
    "bitmaps_test": "backstop_data/bitmaps_test",
    "html_report": "backstop_data/html_report",
    "ci_report": "backstop_data/ci_report"
  },
  "engine": "playwright",
  "report": ["browser", "CI"],
  "debug": false
}
```

## CI Integration Matrix

| Tool | GitHub Actions | GitLab CI | CircleCI | Bitbucket |
|------|---------------|-----------|----------|-----------|
| Percy | ✅ Native action | ✅ Native | ✅ Orb | ✅ Pipe |
| Chromatic | ✅ GitHub app | ✅ Manual | ✅ Orb | ✅ Manual |
| Applitools | ✅ SDK | ✅ SDK | ✅ Orb | ✅ Manual |
| BackstopJS | ✅ Docker | ✅ Docker | ✅ Docker | ✅ Docker |
| Loki | ✅ Docker | ✅ Docker | ✅ Docker | ✅ Docker |

## Cost vs. Value

| Team Size | Recommended Tool | Monthly Cost | Why |
|-----------|-----------------|--------------|-----|
| 1-5 devs | Percy free tier | $0 | 5000 snapshots/mo is enough |
| 5-20 devs | Percy Team | ~$400 | Unlimited snapshots, parallel CI |
| 20+ devs | Chromatic | ~$1000 | Storybook native, UI review workflow |
| Enterprise | Applitools | Custom | AI matching, unlimited resolutions |
| OSS/No budget | Playwright screenshots | $0 | Built-in, no extra service dependency |
