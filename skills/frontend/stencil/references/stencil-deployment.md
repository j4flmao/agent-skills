# Stencil Deployment

## Build Configuration

```tsx
// stencil.config.ts
import { Config } from '@stencil/core'

export const config: Config = {
  namespace: 'my-components',
  outputTargets: [
    { type: 'dist', esmLoaderPath: '../loader' },
    { type: 'dist-custom-elements', customElementsExportBehavior: 'auto-define' },
    { type: 'docs-readme' },
    { type: 'www', serviceWorker: null },
  ],
  extras: {
    // For better compatibility
    enableImportInjection: true,
    experimentalImportInjection: true,
  },
}
```

## Output Targets

| Target | Best For |
|--------|----------|
| `dist` | Lazy-loaded components via loader |
| `dist-custom-elements` | Bundled with other JS |
| `dist-hydrate-script` | SSR |
| `www` | Standalone app |

### Framework Bindings

```tsx
// stencil.config.ts with framework bindings
import { Config } from '@stencil/core'
import { reactOutputTarget } from '@stencil/react-output-target'
import { vueOutputTarget } from '@stencil/vue-output-target'
import { angularOutputTarget } from '@stencil/angular-output-target'

export const config: Config = {
  outputTargets: [
    { type: 'dist' },
    reactOutputTarget({ componentCorePackage: 'my-components', proxiesFile: '../react-lib/src/index.ts' }),
    vueOutputTarget({ componentCorePackage: 'my-components', proxiesFile: '../vue-lib/src/index.ts' }),
    angularOutputTarget({ componentCorePackage: 'my-components', proxiesFile: '../angular-lib/src/index.ts' }),
  ],
}
```

## NPM Publishing

```json
{
  "name": "@org/my-components",
  "version": "1.0.0",
  "main": "dist/index.cjs.js",
  "module": "dist/index.js",
  "es2015": "dist/esm/index.js",
  "es2017": "dist/esm/index.js",
  "types": "dist/types/index.d.ts",
  "collection": "dist/collection/collection-manifest.json",
  "collection:main": "dist/collection/index.js",
  "unpkg": "dist/my-components/my-components.js",
  "files": ["dist/", "loader/"],
  "sideEffects": false
}
```

## CDN Delivery

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@org/my-components/dist/my-components/my-components.esm.js"></script>
<script nomodule src="https://cdn.jsdelivr.net/npm/@org/my-components/dist/my-components/my-components.js"></script>
```

## SSR Setup

```tsx
// server/render.ts
import { renderToString } from '@stencil/core/hydrate'
import { readFile } from 'fs/promises'

export async function renderPage(url: string) {
  const html = await readFile('./dist/index.html', 'utf-8')
  const result = await renderToString(html, {
    url,
    removeScripts: false,
  })
  return result.html
}
```

## Performance Budget

| Asset | Target |
|-------|--------|
| Lazy loader | <1kB |
| Per component (lazy) | <3kB |
| Custom elements bundle | <10kB |
| Total design system | <50kB |

## Browser Support

```json
// stencil.config.ts
{
  "buildEs5": "prod",
  "extras": {
    "cssVarsShim": true,
    "dynamicImportShim": true,
    "shadowDomShim": true,
    "safari10": false,
    "scriptDataOptins": false,
    "appendChildSlotFix": false,
    "slotChildNodesFix": true,
    "cloneNodeFix": false,
    "__deprecated__initializeAppScrollNodes": false
  }
}
```

## CI/CD

```yaml
# .github/workflows/publish.yml
jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npm test
      - uses: JS-DevTools/npm-publish@v3
        with:
          token: ${{ secrets.NPM_TOKEN }}
```

## Component Documentation

```bash
npm run build  # Generates docs-readme output
# Each component gets a README.md with API, usage, CSS variables
```

## Deployment Checklist

- [ ] stencil.config.ts has correct output targets
- [ ] Framework bindings generated (React, Vue, Angular if needed)
- [ ] Package.json exports map configured
- [ ] Component docs generated and published
- [ ] Custom Elements Manifest up to date
- [ ] Build produces all targets: dist, loader, custom-elements
- [ ] Lazy loading works (loader script included)
- [ ] Shadow DOM styling verified in all target browsers
- [ ] Tree-shaking confirmed (only imported components bundled)
- [ ] Version bumped before publish
