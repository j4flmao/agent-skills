# Lit Deployment

## Build Configuration

```bash
npm install lit @lit-labs/ssr
```

### Vite

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: 'my-components',
    },
    rollupOptions: {
      external: ['lit', 'lit/decorators.js'],
    },
  },
})
```

### Webpack

```js
// webpack.config.js
module.exports = {
  entry: './src/index.ts',
  output: { filename: 'bundle.js', path: path.resolve(__dirname, 'dist') },
  resolve: { extensions: ['.ts', '.js'] },
  module: { rules: [{ test: /\.ts$/, use: 'ts-loader' }] },
  externals: { lit: 'lit' },
}
```

## SSR Setup

```typescript
// server/render.js
import { render } from '@lit-labs/ssr/lib/render-with-global-dom-shim.js'
import { html } from 'lit'
import './components/my-components.js'

async function renderPage(url) {
  const body = await render(html`<my-app url=${url}></my-app>`)
  return `<!DOCTYPE html>
    <html><head><title>Lit App</title></head>
    <body>${body}
      <script type="module" src="/assets/app.js"></script>
    </body></html>`
}
```

## Deployment Targets

### Unpkg/CDN

```html
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/my-components@1.0.0/dist/index.js'
</script>
```

### NPM Package Publishing

```json
{
  "name": "@org/my-components",
  "version": "1.0.0",
  "main": "dist/index.js",
  "module": "dist/index.js",
  "exports": {
    ".": { "import": "./dist/index.js", "default": "./dist/index.js" },
    "./button": { "import": "./dist/button.js" }
  },
  "files": ["dist"],
  "customElements": "dist/custom-elements.json"
}
```

## Performance Budget

| Asset | Target |
|-------|--------|
| Lit runtime | ~5kB min+gz |
| Per component | <2kB |
| Total component bundle | <50kB |
| SSR time | <100ms |

## Browser Support

```json
{
  "browserslist": [
    "last 2 versions",
    "not dead",
    "not ie 11",
    "safari >= 12"
  ]
}
```

## Custom Elements Manifest

```bash
npm install @custom-elements-manifest/analyzer
npx cem analyze --globs "src/**/*.ts"
# Generates custom-elements.json
```

## Delivery Optimization

| Technique | Implementation |
|-----------|---------------|
| Import maps | Map bare specifiers to CDN |
| Module/nomodule | ES module only (no legacy fallback) |
| HTTP/2 | CDN for dependency serving |
| Preconnect | `<link rel="modulepreload">` for critical components |
| Code splitting | Dynamic import for non-critical components |

## Deployment Checklist

- [ ] Custom Elements Manifest generated
- [ ] Package exports map configured
- [ ] Lit external in bundle (not duplicated)
- [ ] SSR rendering tested (if used)
- [ ] Browser targets set in browserslist
- [ ] Component names prefixed to avoid conflicts
- [ ] TypeScript declarations generated
- [ ] Source maps disabled in production
- [ ] Import maps configured for CDN delivery
- [ ] Shadow DOM polyfill not needed (modern browsers only)
