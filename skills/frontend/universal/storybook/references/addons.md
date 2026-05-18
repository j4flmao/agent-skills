# Storybook Addons Reference

## Essential Addons

Installed via `@storybook/addon-essentials`:

| Addon                   | Purpose                              |
|-------------------------|--------------------------------------|
| `@storybook/addon-docs`  | Auto-generated documentation tabs   |
| `@storybook/addon-controls` | Interactive prop controls         |
| `@storybook/addon-actions`  | Event handler logging             |
| `@storybook/addon-viewport` | Responsive viewport switcher      |
| `@storybook/addon-backgrounds` | Background color toggles       |
| `@storybook/addon-toolbars` | Global toolbar (theme, locale)   |
| `@storybook/addon-measure` | Measurement overlay tool          |
| `@storybook/addon-outline` | CSS outline overlay               |

## Interactions Addon

```bash
npm i -D @storybook/addon-interactions @storybook/test
```

```tsx
// Button.stories.tsx
import { userEvent, within, expect, fn } from '@storybook/test';

export const SubmitForm: Story = {
  args: { onSubmit: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Email');
    await userEvent.type(input, 'test@example.com');
    await userEvent.click(canvas.getByRole('button'));

    // Wait for async validation
    await expect(canvas.queryByText('Invalid email')).toBeNull();
    expect(args.onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' });
  },
};
```

## Accessibility Addon

```bash
npm i -D @storybook/addon-a11y
```

```tsx
export const Accessible: Story = {
  args: { ...Primary.args },
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'aria-required-attr', enabled: true },
        ],
      },
      element: '#storybook-root',
    },
  },
};
```

## Themes Addon

```bash
npm i -D @storybook/addon-themes
```

```ts
// .storybook/preview.ts
import { withThemeFromJSXProvider } from '@storybook/addon-themes';
import { ThemeProvider, lightTheme, darkTheme } from '../src/theme';

export const decorators = [
  withThemeFromJSXProvider({
    themes: {
      light: lightTheme,
      dark: darkTheme,
      highContrast: highContrastTheme,
    },
    defaultTheme: 'light',
    Provider: ThemeProvider,
    GlobalStyles: () => null,
  }),
];
```

## Docs Addon

### Autodocs

```tsx
// Per-component enable
const meta = { tags: ['autodocs'] } satisfies Meta<typeof Component>;

// Global enable
// .storybook/preview.ts
const preview: Preview = { tags: ['autodocs'] };
```

### Custom Docs Page

```tsx
// Button.docs.mdx
import { Meta, Story, Canvas, Controls, Source } from '@storybook/blocks';
import * as ButtonStories from './Button.stories';

<Meta of={ButtonStories} />

# Button

Primary action component used throughout the app.

<Canvas>
  <Story of={ButtonStories.Primary} />
</Canvas>

## Props

<Controls of={ButtonStories.Primary} />

## Usage

<Source code={`<Button variant="primary">Click</Button>`} language="tsx" />
```

## StoryShots (Snapshot Testing)

```bash
npm i -D @storybook/addon-storyshots @storybook/addon-storyshots-puppeteer
```

```ts
// storyshots.test.ts
import initStoryshots from '@storybook/addon-storyshots';

initStoryshots({
  framework: 'react',
  configPath: './.storybook',
});
```

## Design Addon

```bash
npm i -D @storybook/addon-designs
```

```tsx
export const Primary: Story = {
  args: { ...Primary.args },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/file/xxx/Component?node-id=123',
    },
  },
};
```

## Custom Addon (Quick Scaffold)

```ts
// .storybook/MyAddon.ts
import { addons, types } from '@storybook/manager-api';

addons.register('my-addon', () => {
  addons.add('my-addon/panel', {
    title: 'My Panel',
    type: types.PANEL,
    render: ({ active }) =>
      active ? <div>Custom panel content</div> : null,
  });
});
```

## Addon Performance Impact

| Addon                  | Bundle Size | Render Impact |
|------------------------|-------------|---------------|
| essentials             | ~200 KB      | Minimal       |
| interactions           | ~50 KB       | Moderate      |
| a11y                   | ~80 KB       | Heavy (runs axe-core) |
| themes                 | ~10 KB       | Minimal       |
| designs                | ~20 KB       | Minimal       |
| storyshots             | ~150 KB      | Build-time only |

## Recommended Addon Stack

```
@storybook/addon-essentials          # Always
@storybook/addon-interactions        # Always (interaction tests)
@storybook/addon-a11y                # Always (accessibility)
@storybook/addon-themes              # If theming exists
@storybook/addon-designs             # If Figma designs exist
storybook-addon-performance          # If profiling needed
```
