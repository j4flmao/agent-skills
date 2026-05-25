# Bundler Optimization

## Bundle Size Budgets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Entry JS (gzipped) | < 100KB | > 150KB | > 200KB |
| Entry CSS (gzipped) | < 20KB | > 40KB | > 60KB |
| Total page JS (gzipped) | < 300KB | > 500KB | > 1MB |
| Total page images | < 500KB | > 1MB | > 3MB |
| Build time (CI) | < 30s | > 60s | > 120s |

## Code Splitting Strategies

### Route-Based Splitting
```typescript
// Each route becomes a separate chunk
const Dashboard = lazy(() => import('./routes/Dashboard'))
const Settings = lazy(() => import('./routes/Settings'))
const Admin = lazy(() => import('./routes/Admin'))
```

### Vendor Splitting (Vite)
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split vendors by category
            if (id.includes('react')) return 'vendor-react'
            if (id.includes('lodash')) return 'vendor-lodash'
            if (id.includes('chart')) return 'vendor-charts'
            return 'vendor' // everything else
          }
        },
      },
    },
  },
})
```

### Webpack SplitChunks
```javascript
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendor',
        chunks: 'all',
      },
      common: {
        minChunks: 2,
        minSize: 0,
        name: 'common',
      },
    },
  },
}
```

## Tree Shaking Best Practices

```typescript
// ❌ Barrel files defeat tree shaking
// index.ts
export { Button } from './Button'
export { Card } from './Card'
export { Modal } from './Modal'

// ✅ Direct imports
import { Button } from './components/Button'

// ❌ Side effects in library code
import 'polyfill' // side effect — can't tree-shake

// ✅ Mark side-effect-free
// package.json
{ "sideEffects": false }

// ❌ CommonJS prevents tree shaking
const lodash = require('lodash')

// ✅ ESM enables tree shaking
import { debounce } from 'lodash-es'

// ✅ Pure annotations for bundler
const result = /*#__PURE__*/ createObject()
```

## Asset Optimization Pipeline

```typescript
// Vite: automatic image optimization via plugin
import { imagetools } from 'vite-imagetools'

export default defineConfig({
  plugins: [
    imagetools({
      defaultDirectives: (url) => {
        if (url.searchParams.has('webp')) {
          return new URLSearchParams('format=webp&quality=80')
        }
        return new URLSearchParams('quality=75')
      },
    }),
  ],
})
```

### CSS Optimization
```typescript
// Vite uses lightningcss by default
export default defineConfig({
  css: {
    lightningcss: {
      drafts: { customMedia: true },
    },
    transformer: 'lightningcss', // faster than postcss
  },
})
```

### Font Subsetting
```typescript
// Generate subset fonts at build time
// npm install -D glyphhanger
// glyphhanger --whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 --subset=*.woff2
// Or use Google Fonts with &text= parameter
<link href="https://fonts.googleapis.com/css2?family=Inter&text=Hello123" rel="stylesheet" />
```

## Compression

```typescript
// Vite: generate compressed assets at build time
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    viteCompression({
      algorithm: 'brotliCompress', // smaller than gzip
      threshold: 1024, // only compress > 1KB
    }),
  ],
})
```

## Build Analysis

```bash
# Vite
npx vite build --mode analyze

# Webpack
npm install -D webpack-bundle-analyzer
# Add plugin to webpack config

# General
npx source-map-explorer dist/assets/*.js
```

## Persistent Cache Configuration

```typescript
// Vite
export default defineConfig({
  cacheDir: './node_modules/.vite-cache',
  build: { rollupOptions: { cache: true } },
})

// Webpack
module.exports = {
  cache: {
    type: 'filesystem',
    buildDependencies: { config: [__filename] },
    version: '1.0',
  },
}
```

## Production Build Checklist

- [ ] Source maps disabled (or hidden for error reporting)
- [ ] Content hashes in all output filenames
- [ ] Vendor chunk(s) split from app code
- [ ] Route-based code splitting active
- [ ] Heavy libraries (charts, editors, maps) lazy-loaded
- [ ] CSS minified and extracted
- [ ] Images compressed (WebP/AVIF at build)
- [ ] Fonts subsetted to used characters
- [ ] Brotli/Gzip pre-compressed
- [ ] Tree shaking verified (no unused imports in bundle)
- [ ] Entry chunk < 200KB gzipped
