# Storybook Setup Reference

## Installation

```bash
# Automatic (recommended)
npx storybook@latest init --type <react|vue|angular|svelte|nextjs|vite>

# Manual for existing project
npx storybook@latest add @storybook/react-vite

# Verify
npx storybook --version
```

## Directory Structure

```
.storybook/
├── main.ts          # Core config: stories, addons, framework, build
├── preview.ts       # Global decorators, parameters, globals
├── preview-head.html  # Inject into <head> of Storybook iframe
├── manager-head.html  # Inject into <head> of Storybook UI
└── theme.ts         # Custom Storybook UI theme

src/
├── components/
│   ├── Button.tsx
│   └── Button.stories.tsx   # Co-located stories
└── stories/                 # Or centralized stories directory
    └── Introduction.stories.mdx
```

## `main.ts` Config

```ts
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-essentials',      // Docs, Controls, Actions, Viewport, Backgrounds
    '@storybook/addon-interactions',     // Play function testing
    '@storybook/addon-a11y',             // Accessibility audits
    '@storybook/addon-themes',           // Theme switching toolbar
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',                     // 'tag' = enable via `tags: ['autodocs']`
  },
  staticDirs: ['../public'],            // Serve static assets
  core: {
    disableTelemetry: true,
  },
};

export default config;
```

## `preview.ts` Config

```ts
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import { withThemeFromJSXProvider } from '@storybook/addon-themes';
import { GlobalStyles, lightTheme, darkTheme } from '../src/theme';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
      },
    },
    a11y: {
      config: { rules: [{ id: 'color-contrast', enabled: true }] },
    },
  },
  decorators: [
    withThemeFromJSXProvider({
      themes: { light: lightTheme, dark: darkTheme },
      defaultTheme: 'light',
      Provider: ThemeProvider,
      GlobalStyles,
    }),
  ],
  tags: ['autodocs'],
};

export default preview;
```

## Framework-Specific Setup

### React + Vite
```bash
npx storybook@latest init --type react
```

### Vue 3 + Vite
```bash
npx storybook@latest init --type vue3
```

### Angular
```bash
npx storybook@latest init --type angular
```

### Next.js
```bash
npx storybook@latest init --type nextjs
# Adds @storybook/nextjs framework
```

### SvelteKit
```bash
npx storybook@latest init --type sveltekit
```

## Environment Variables

```ts
// .storybook/main.ts
const config: StorybookConfig = {
  env: (config) => ({
    ...config,
    STORYBOOK_ENV: 'true',
    API_URL: process.env.API_URL || 'http://localhost:3000',
  }),
};
```

## TypeScript Path Aliases

```ts
// .storybook/main.ts
import { mergeConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const config: StorybookConfig = {
  viteFinal: async (config) =>
    mergeConfig(config, {
      plugins: [tsconfigPaths()],
    }),
};
```

## Build & Deploy

```bash
# Build static Storybook
npm run build-storybook -o storybook-static

# Deploy to Chromatic (visual testing)
npx chromatic --project-token=<token>

# Deploy to GitHub Pages
npx storybook-to-ghpages
```

## Upgrade

```bash
# Check current version
npx storybook@latest info

# Upgrade to latest
npx storybook@latest upgrade

# Migrate config
npx storybook@latest automigrate
```
