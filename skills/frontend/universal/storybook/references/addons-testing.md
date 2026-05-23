# Addons & Testing Reference

## Essential Addon Stack

| Addon | Install | Purpose |
|-------|---------|---------|
| `@storybook/addon-essentials` | Bundled with init | Docs, Controls, Actions, Viewport, Backgrounds |
| `@storybook/addon-interactions` | `npm i -D` | Play function testing with debugging panel |
| `@storybook/addon-a11y` | `npm i -D` | Accessibility violation detection |
| `@storybook/addon-themes` | `npm i -D` | Theme switching toolbar (light/dark) |
| `@storybook/addon-designs` | `npm i -D` | Embed Figma designs alongside stories |

## Interaction Testing

### Setup
```ts
// .storybook/main.ts
addons: ['@storybook/addon-interactions'],
```

### Basic Click Test
```tsx
import { userEvent, within, expect, fn } from '@storybook/test';

export const ClickTest: Story = {
  args: { onClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    expect(args.onClick).toHaveBeenCalledOnce();
  },
};
```

### Form Input Test
```tsx
export const InputTest: Story = {
  args: { onChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');
    await userEvent.type(input, 'Hello');
    expect(args.onChange).toHaveBeenCalled();
    expect(input).toHaveValue('Hello');
  },
};
```

### Async Test
```tsx
export const AsyncSubmit: Story = {
  args: { onSubmit: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    // Wait for async response
    await expect(canvas.findByText('Success')).toBeResolved();
  },
};
```

## Accessibility Testing

### Per-Story Configuration
```tsx
export const AccessibleButton: Story = {
  args: { ...Primary.args },
  parameters: {
    a11y: {
      config: { rules: [{ id: 'color-contrast', enabled: true }] },
      element: '#storybook-root',
    },
  },
};
```

### Global Config in preview.ts
```ts
parameters: {
  a11y: {
    config: {
      rules: [
        { id: 'color-contrast', enabled: true },
        { id: 'aria-required-attr', enabled: true },
        { id: 'label', enabled: true },
      ],
    },
  },
},
```

### CI Testing
```bash
npx test-storybook --coverage
```
Fails pipeline on a11y violations. Combine with interaction tests for full coverage.

## Visual Testing with Chromatic

### Setup
```bash
npm i -D chromatic
npx chromatic --project-token=<token>
```

### GitHub Actions Workflow
```yml
# .github/workflows/chromatic.yml
name: Chromatic
on: push
jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - run: npm ci
      - run: npx chromatic --project-token=${{ secrets.CHROMATIC_TOKEN }}
```

### Skipping Snapshots
```tsx
export const SkipSnapshot: Story = {
  args: { ...Primary.args },
  parameters: { chromatic: { disableSnapshot: true } },
};
```

### Anti-Flicker Configuration
```ts
// .storybook/preview.ts
parameters: {
  chromatic: {
    pauseAnimationAtEnd: true,
    diffThreshold: 0.1,
  },
},
```

## Snapshot Testing with `test-storybook`

```bash
npm i -D @storybook/test-runner
```

```json
{
  "scripts": {
    "test-storybook": "test-storybook",
    "test-storybook:ci": "test-storybook --maxWorkers 2 --coverage"
  }
}
```

```ts
// .storybook/test-runner.ts
import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  async postVisit(page, story) {
    const context = await getStoryContext(page, story);
    if (context.parameters?.a11y?.config?.rules?.length) {
      const violations = await page.evaluate(() => (window as any).__STORYBOOK_A11Y_VIOLATIONS__);
      expect(violations).toHaveLength(0);
    }
  },
};
export default config;
```

## Addon Performance Impact

| Addon | Bundle Size | Render Impact |
|-------|-------------|---------------|
| essentials | ~200 KB | Minimal |
| interactions | ~50 KB | Moderate (play functions) |
| a11y | ~80 KB | Heavy (runs aXe on render) |
| themes | ~10 KB | Minimal |
| designs | ~20 KB | Minimal |

## Recommended Addon Stack

```ts
addons: [
  '@storybook/addon-essentials',
  '@storybook/addon-interactions',
  '@storybook/addon-a11y',
  '@storybook/addon-themes',
  '@storybook/addon-designs',
],
```
