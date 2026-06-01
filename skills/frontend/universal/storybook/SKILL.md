---
name: frontend-storybook
description: >
  Use this skill when the user says 'storybook', 'component documentation', 'visual testing', 'storybook addon', 'CSF', 'component story'. This skill enforces CSF (Component Story Format) 3.x standards, accessible stories, interaction testing, and addon integration. Applies to any frontend stack.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, storybook, phase-3, universal]
---

# Frontend Storybook

## Purpose
Create, maintain, and optimize Storybook stories using CSF 3.x format with interaction tests, accessibility checks, and addon-driven workflows. Covers setup across React/Vue/Angular/Svelte, visual testing via Chromatic, custom theming, and documentation mode.

## Agent Protocol

### Trigger
Exact phrases: "write stories", "storybook", "CSF", "component story", "storybook addon", "visual test", "story for", "stories for", "storybook setup", "interaction test", "chromatic", "storybook docs", "storybook theme", "storybook decorator"

### Input Context
- Check for `.storybook/main.js` or `main.ts` to detect existing Storybook config
- Determine CSF version (2.x vs 3.x) from existing stories or package.json Storybook version
- Identify the component framework (React, Vue, Angular, Svelte, Web Components) for framework-specific story patterns
- Check for existing addons in `.storybook/main.js` under `addons` array
- Verify whether `autodocs` is enabled globally or per-component
- Check for existing Chromatic or visual testing setup

### Output Artifact
No file output unless requested.

### Response Format
1. Output stories in CSF 3.x `.stories.tsx`/`.stories.ts` format (default export with `meta`, named exports for stories)
2. Include `import` statements and `meta` object with `component`, `title`, `tags`, `argTypes`
3. For interactive stories, use `play` function from `@storybook/test`
4. When suggesting addon config, output the full addon registration snippet
5. When configuring Chromatic, output the full CI workflow YAML
6. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Story follows CSF 3.x: `const meta = { component } satisfies Meta<typeof Component>` with named story exports
- [ ] Stories cover default/empty state, loading state, error state, edge cases (long text, missing props, zero data)
- [ ] Accessibility tests via `@storybook/addon-a11y` included in at least one story per component
- [ ] Interaction tests via `play` function for any component with user input or animations
- [ ] Responsive/layout stories use `parameters.viewport` to test mobile/tablet/desktop
- [ ] Documentation tab (`@storybook/addon-docs`) configured with autodocs for the component
- [ ] No hardcoded strings — use `args` mapping for story variations
- [ ] Chromatic or visual regression tests configured for PR pipeline

### Max Response Length
120 lines per component story set.

## Storybook Architecture / Decision Trees

### Story Organization Decision Tree
```
How many components?
  |-- 1-10 components -->
  |     Simple structure: Components/Button, Components/Card
  |     Co-locate stories with components (Button.stories.tsx next to Button.tsx)
  |
  |-- 10-50 components -->
  |     Feature-based grouping: Feature/Orders/OrderList, Feature/Orders/OrderCard
  |     Group by domain, not by type
  |
  |-- 50+ components (design system) -->
        Nested structure: DesignSystem/Buttons/Primary, DesignSystem/Buttons/Secondary
        Each variant gets its own story
        Atomic structure: Atoms, Molecules, Organisms
```

### Story Coverage Decision Tree
```
What states does the component have?
  |-- Default / empty state -->
  |     STORY REQUIRED: shows component with no data
  |     Example: empty list, empty card, placeholder text
  |
  |-- Loading state -->
  |     STORY REQUIRED: skeleton or spinner
  |     Example: SkeletonList, LoadingButton
  |
  |-- Error state -->
  |     STORY REQUIRED: error message, retry action
  |     Example: ErrorCard, ErrorForm
  |
  |-- Edge cases -->
  |     STORY REQUIRED: long text, missing props, zero data, overflow
  |     Example: VeryLongText, MissingImage, SingleItem
  |
  |-- Interactive behavior -->
  |     STORY REQUIRED if component has user input
  |     Use play() function to simulate clicks, typing, hover
  |
  |-- Responsive variants -->
        STORY REQUIRED: mobile (375px), tablet (768px), desktop (1280px)
        Use parameters.viewport
```

---

## Workflow

### Step 1: Initialize or Verify Setup
```bash
npx storybook@latest init --type react    # or vue3, angular, nextjs, sveltekit
```
Check `.storybook/main.ts` for required addons:

| Addon | Package | Purpose |
|-------|---------|---------|
| Essentials | `@storybook/addon-essentials` | Docs, Controls, Actions, Viewport, Backgrounds |
| Interactions | `@storybook/addon-interactions` | Play function testing |
| Accessibility | `@storybook/addon-a11y` | aXe-based accessibility audits |
| Themes | `@storybook/addon-themes` | Theme switching toolbar |
| Designs | `@storybook/addon-designs` | Figma design embeds |

### Step 2: Configure Preview
```ts
// .storybook/preview.ts
const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
    viewport: { viewports: NEW_VIEWPORTS },
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  decorators: [withThemeFromJSXProvider({ themes: { light, dark }, defaultTheme: 'light', Provider: ThemeProvider })],
  tags: ['autodocs'],
};
```

### Step 3: Write Stories (CSF 3.x)
```tsx
const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Button>;

export const Primary: Story = { args: { variant: 'primary', children: 'Click Me' } };
export const Disabled: Story = { args: { ...Primary.args, disabled: true } };
export const Loading: Story = { args: { ...Primary.args, loading: true } };
```

### Step 4: Add Interaction Tests
```tsx
import { userEvent, within, expect, fn } from '@storybook/test';

export const Interactive: Story = {
  args: { onClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    expect(args.onClick).toHaveBeenCalled();
  },
};
```

### Step 5: Visual Testing with Chromatic
```bash
npm i -D chromatic
npx chromatic --project-token=<token>
```
```yml
# .github/workflows/chromatic.yml
- run: npx chromatic --project-token=${{ secrets.CHROMATIC_TOKEN }}
```

### Step 6: Verify Accessibility
Run `a11y` plugin scan in Storybook UI or via CLI:
```bash
npx test-storybook --coverage
```
Fix violations: missing ARIA labels, insufficient color contrast, missing focus indicators.

### Step 7: Documentation Mode
Enable `autodocs: 'tag'` in `main.ts`. Add `tags: ['autodocs']` to each meta. For custom docs:

```tsx
// Button.docs.mdx
import { Meta, Story, Canvas, Controls } from '@storybook/blocks';
<Meta of={ButtonStories} />
<Canvas><Story of={ButtonStories.Primary} /></Canvas>
<Controls of={ButtonStories.Primary} />
```

### Step 8: MSW Integration for Data Stories
```tsx
import { http, HttpResponse } from 'msw'
import { initialize, mswLoader } from 'msw-storybook-addon'

initialize()

const meta = {
  component: OrderList,
  loaders: [mswLoader],
} satisfies Meta<typeof OrderList>

export const WithOrders: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/orders', () => {
          return HttpResponse.json([{ id: '1', name: 'Order 1', total: 100 }])
        }),
      ],
    },
  },
}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/orders', () => {
          return HttpResponse.json([])
        }),
      ],
    },
  },
}
```

## Common Pitfalls

1. **CSF 2.x `storiesOf` API**: Always use CSF 3.x. Never use `storiesOf` — removed in Storybook 8.
2. **Direct addon imports in stories**: Use `parameters` or `decorators` in meta — never `import from '@storybook/addon-*'`.
3. **Missing `autodocs` tag**: Without `tags: ['autodocs']` or global enable, docs tab won't generate.
4. **Real API calls in stories**: Always mock data/services. Use MSW or static fixtures.
5. **`any` type for props**: Derive from component's props type. Use `StoryObj<typeof meta>`.
6. **Hardcoded viewport sizes**: Use `parameters.viewport` with named viewports from config.
7. **Skipping a11y**: Run aXe on every component — catch contrast, label, and ARIA issues early.

## Compared With

| Feature | Storybook | Ladle | Histoire | Catalog |
|---------|----------|-------|----------|---------|
| Framework support | React, Vue, Angular, Svelte, Web Components | React only | Vue only | Any (static) |
| CSF 3.x | Yes | Yes | No | N/A |
| Interaction testing | Built-in | Limited | Limited | No |
| A11y addon | Yes | No | No | No |
| Visual testing (Chromatic) | Built-in | Third-party | Third-party | No |
| Bundle size (SB) | Large | Small | Small | Minimal |
| MSW integration | Yes | Yes | No | No |

## Performance Considerations

- Storybook dev server can be slow for large component libraries (500+ stories). Use `storyStoreV7: true` for lazy compilation
- Chromatic snapshots run on CI — limit to changed stories per PR to reduce snapshot time
- MSW handlers intercept API calls in stories — no real network requests during testing
- Bundle size of Storybook itself is irrelevant to production (dev-only tool)
- `@storybook/test` package is small (~3KB) and only used in story files

## Accessibility Considerations

- `@storybook/addon-a11y` runs aXe on every story automatically — fix violations before merging
- Test with keyboard navigation in the Stories panel (Tab, Enter, Escape)
- Ensure color contrast passes WCAG AA (4.5:1) for all stories
- Test focus management in interactive stories (play functions)
- Verify ARIA labels and roles in the Accessibility panel

## Rules
- Always use CSF 3.x syntax — never CSF 2.x `storiesOf` API
- Never import from `@storybook/addon-*` directly in story files — use `parameters` or `decorators` in the meta export
- Always set `tags: ['autodocs']` in meta to generate documentation automatically
- Always mock external data/service calls in stories — never hit real APIs
- Never use `any` type for story props — derive from the component's props type
- Keep stories co-located with the component (`Button.stories.tsx` next to `Button.tsx`) unless the project centralizes them
- Always test at minimum 3 viewports: mobile (375px), tablet (768px), desktop (1280px)
- Always wrap async interactions in `play` with `await` — missing await = flaky tests

## References
  - references/addons-testing.md — Addons & Testing Reference
  - references/addons.md — Storybook Addons Reference
  - references/story-writing.md — Story Writing Reference
  - references/storybook-setup.md — Storybook Setup Reference
  - references/visual-testing.md — Visual Testing Reference
  - references/writing-stories.md — Writing Stories Reference
## Handoff
No artifact produced unless requested.
Next skill: `frontend-pwa` (if the component needs offline support or a service worker)
Carry forward: Component prop types, existing story examples, addon list from config

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.
