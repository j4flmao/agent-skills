---
name: frontend-storybook
description: >
  Use this skill when the user says 'storybook', 'component documentation', 'visual testing', 'storybook addon', 'CSF', 'component story'. This skill enforces CSF (Component Story Format) 3.x standards, accessible stories, interaction testing, and addon integration. Applies to any frontend stack.
version: "1.0.0"
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
Create, maintain, and optimize Storybook stories using CSF 3.x format with interaction tests, accessibility checks, and addon-driven workflows.

## Agent Protocol

### Trigger
Exact phrases: "write stories", "storybook", "CSF", "component story", "storybook addon", "visual test", "story for", "stories for", "storybook setup", "interaction test"

### Input Context
- Check for `.storybook/main.js` or `main.ts` to detect existing Storybook config
- Determine CSF version (2.x vs 3.x) from existing stories or package.json Storybook version
- Identify the component framework (React, Vue, Angular, Svelte, Web Components) for framework-specific story patterns
- Check for existing addons in `.storybook/main.js` under `addons` array

### Output Artifact
No file output unless requested.

### Response Format
1. Output stories in CSF 3.x `.stories.tsx`/`.stories.ts` format (default export with `meta`, named exports for stories).
2. Include `import` statements and `meta` object with `component`, `title`, `tags`, `argTypes`.
3. For interactive stories, use `play` function from `@storybook/testing-library`.
4. When suggesting addon config, output the full addon registration snippet.
5. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Story follows CSF 3.x: `const meta = { component } satisfies Meta<typeof Component>` with named story exports
- [ ] Stories cover default/empty state, loading state, error state, edge cases (long text, missing props, zero data)
- [ ] Accessibility tests via `@storybook/addon-a11y` included in at least one story per component
- [ ] Interaction tests via `play` function for any component with user input or animations
- [ ] Responsive/layout stories use `parameters.viewport` to test mobile/tablet/desktop
- [ ] Documentation tab (`@storybook/addon-docs`) configured with autodocs for the component
- [ ] No hardcoded strings — use `args` mapping for story variations

### Max Response Length
120 lines per component story set.

## Workflow

### Step 1: Verify Setup
Check `.storybook/main.js` for required addons: `@storybook/addon-essentials`, `@storybook/addon-interactions`, `@storybook/addon-a11y`, `@storybook/addon-docs`. If missing, output the install command and config update.

### Step 2: Define Meta
Create the default export with `component`, `title` (nested: `Components/Button`), `tags: ['autodocs']`, and `argTypes` for each prop. Use `satisfies Meta<typeof Component>` for type safety.

### Step 3: Write Stories
Export named constants for each variant: `export const Primary: Story = { args: { variant: 'primary' } }`. Cover: default, hover, active, disabled, loading, and any prop-driven variant. Use `render` function for complex compositions.

### Step 4: Add Interaction Tests
Add `play({ canvasElement })` using `within`, `userEvent`, `expect` from `@storybook/test`. Test click handlers, form inputs, focus management, and animation completion.

### Step 5: Verify Accessibility
Run `a11y` plugin scan in the Storybook UI or via `test-storybook` CLI. Fix any violations before marking complete.

## Rules
- Always use CSF 3.x syntax — never CSF 2.x `storiesOf` API.
- Never import from `@storybook/addon-*` directly in story files — use `parameters` or `decorators` in the meta export.
- Always set `tags: ['autodocs']` in meta to generate documentation automatically.
- Always mock external data/service calls in stories — never hit real APIs.
- Never use `any` type for story props — derive from the component's props type.
- Keep stories co-located with the component (`Button.stories.tsx` next to `Button.tsx`) unless the project centralizes them.

## References
- `references/storybook-setup.md`
- `references/writing-stories.md`
- `references/visual-testing.md`
- `references/addons.md`

## Handoff
No artifact produced unless requested.
Next skill: `frontend-pwa` (if the component needs offline support or a service worker)
Carry forward: Component prop types, existing story examples, addon list from config
