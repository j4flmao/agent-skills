# Performance Bundling & Build Optimization

## Bundle Analysis

```bash
# Tools to analyze bundles
npx vite-bundle-analyzer
npx source-map-explorer dist/assets/*.js
npx webpack-bundle-analyzer dist/stats.json
```

## Code Splitting Strategies

### Route-Level Splitting

```typescript
// React
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))

// Vue
const routes = [
  { path: '/dashboard', component: () => import('./pages/Dashboard.vue') },
]

// Angular
{ path: 'dashboard', loadComponent: () => import('./Dashboard.component').then(m => m.DashboardComponent) }
```

### Component-Level Splitting

```typescript
const HeavyChart = lazy(() => import('./HeavyChart'))
const PDFViewer = lazy(() => import('./PDFViewer'))

// Interaction-triggered
async function handleExport() {
  const { exportPDF } = await import('./utils/pdf-export')
  exportPDF(data)
}
```

## Bundling Configuration

### Vite

```js
// vite.config.js
export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
    chunkSizeWarningLimit: 100,
    cssCodeSplit: false,
    sourcemap: false,
  },
})
```

### Webpack

```js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: { test: /[\\/]node_modules[\\/]/, name: 'vendor', chunks: 'all' },
        common: { minChunks: 2, priority: -10 },
      },
    },
    minimizer: ['...', new CssMinimizerPlugin()],
  },
}
```

## Bundle Budget

| Asset | Target |
|-------|--------|
| Initial JS (compressed) | <200kB |
| Initial CSS (compressed) | <50kB |
| Largest image | <100kB |
| Total page weight | <1MB |
| Per route chunk | <50kB |

## Tree Shaking

```typescript
// ✅ Good — named imports allow tree shaking
import { Button } from './ui'
import { useAuth } from './auth'

// ❌ Bad — barrel imports prevent tree shaking
import * as UI from './ui'

// ✅ Good — direct imports
import Button from './ui/Button'
```

## Compression

```nginx
# nginx — enable brotli first, gzip fallback
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_comp_level 6;

# Brotli (nginx >= 1.11.5 with brotli module)
brotli on;
brotli_types text/plain text/css application/json application/javascript;
```

## Preload & Prefetch

```html
<!-- Preload critical resources -->
<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin>
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high">

<!-- Prefetch likely navigation -->
<link rel="prefetch" href="/dashboard" as="document">
<link rel="prefetch" href="/dashboard.js" as="script">
```
