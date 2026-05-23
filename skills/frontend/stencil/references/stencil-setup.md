# Stencil Setup Guide

## Prerequisites

```bash
# Node.js 18+
node --version

# Install Stencil CLI globally (optional)
npm install -g @stencil/core
```

## New Project

```bash
# Create a new component library
npm init stencil
# Select: component (library) — reusable web components
# Or: app — full application
cd my-components
npm install
npm start  # http://localhost:3333
```

## Project Structure

```
my-components/
  src/
    components/
      my-button/
        my-button.tsx
        my-button.css
        my-button.e2e.ts
        my-button.spec.ts
      my-card/
        my-card.tsx
        my-card.css
    global/
      app.css              # Global/shared styles
    index.html             # Dev server preview
    utils/
      format.ts
      validation.ts
  dist/                    # Build output
    my-components/
      my-button.js
      my-card.js
    loader/
      index.js             # Lazy loader
    cdn/
  www/                     # Generated dev output
  docs/                    # Auto-generated docs
  stencil.config.ts
  package.json
  tsconfig.json
```

## Configuration

```ts
// stencil.config.ts
import { Config } from '@stencil/core'

export const config: Config = {
  namespace: 'my-components',
  taskQueue: 'async',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
      dir: 'dist',
    },
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'auto-define-custom-elements',
      externalRuntime: false,
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null,
    },
  ],
  testing: {
    browserHeadless: 'new',
  },
  extras: {
    enableImportInjection: true,
  },
}
```

## Build Output Targets

| Target | Purpose | When to Use |
|--------|---------|-------------|
| `dist` | Lazy-loaded bundles + loader | CDN or npm distribution |
| `dist-custom-elements` | Single-file custom elements | Tree-shakeable imports |
| `www` | Dev server + static site | Prototyping, full app |
| `docs-readme` | Auto-generate README per component | Component documentation |
| `docs-json` | JSON API documentation | Integration with Doc tools |
| `dist-hydrate-script` | SSR / prerendering | Static site generation |

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react",
    "jsxFactory": "h",
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

## CLI Commands

```bash
npm run build          # Production build
npm start              # Dev server with hot reload
npm test               # Run unit tests
npm run e2e            # Playwright e2e tests

# Generate component
npx stencil generate my-component
# or create manually
```

## Framework Bindings

### React

```bash
npm install my-components
```

```tsx
import { MyButton, MyCard } from 'my-components'
// No special setup needed for React — it's a web component
```

### Vue 3

```ts
// main.ts
import { defineCustomElements } from 'my-components/loader'
defineCustomElements()
```

### Angular

```ts
// app.module.ts
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { defineCustomElements } from 'my-components/loader'

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule { }

defineCustomElements()
```

### Vanilla HTML (CDN)

```html
<script src="https://cdn.jsdelivr.net/npm/my-components/dist/my-components/my-components.esm.js"
        type="module"></script>

<my-button variant="primary">Click Me</my-button>
```

## Testing

### Unit Test (Jest)

```tsx
import { newSpecPage } from '@stencil/core/testing'
import { MyButton } from './my-button'

it('renders with label', async () => {
  const page = await newSpecPage({
    components: [MyButton],
    html: `<my-button variant="primary">Click</my-button>`,
  })
  expect(page.root).toEqualHtml(`
    <my-button variant="primary">
      <mock:shadow-root>
        <button class="btn btn--primary"><slot></slot></button>
      </mock:shadow-root>
      Click
    </my-button>
  `)
})
```

### E2E (Playwright)

```ts
import { test, expect } from '@stencil/playwright'

test('button click emits event', async ({ page }) => {
  await page.setContent('<my-button>Click</my-button>')
  const btn = page.locator('my-button')
  await btn.click()
  expect(btn).toHaveClass(/clicked/)
})
```

## Debugging

- Chrome DevTools: web components appear as custom elements in the Elements panel
- Shadow DOM content is inspectable in DevTools (show user agent shadow DOM)
- Enable verbose logging in stencil.config.ts: `{ enableLogging: true }`
- Use `console.log` inside `componentWillRender` for lifecycle debugging

## Browser Support

| Feature | Support |
|---------|---------|
| Shadow DOM (v1) | Chrome 53+, Firefox 63+, Safari 10.1+, Edge 79+ |
| Custom Elements (v1) | Chrome 54+, Firefox 63+, Safari 10.1+, Edge 79+ |
| ES Modules | Chrome 61+, Firefox 60+, Safari 11+, Edge 79+ |
| IE 11 | Not supported (Stencil 4+ dropped IE11) |
