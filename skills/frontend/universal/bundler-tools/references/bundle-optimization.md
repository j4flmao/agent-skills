# Bundle Optimization

Code splitting, tree shaking, asset pipeline, caching strategies, and performance budgets.

---

## Code Splitting Strategies

### Route-based (SPA)
```ts
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
```

### Library chunking
```ts
splitChunks: {
  cacheGroups: {
    vendor: { test: /[\\/]node_modules[\\/]/, name: 'vendor', chunks: 'all' },
    charts: { test: /[\\/]node_modules[\\/](chart|d3)[\\/]/, name: 'charts', chunks: 'all' },
  },
},
```

### Component-level
Lazy-load heavy components only when rendered (modals, drawers, rich text editors, data grids).

---

## Tree Shaking Configuration

### package.json
```json
{
  "sideEffects": false,
  "exports": {
    ".": "./src/index.ts",
    "./Button": "./src/Button.tsx",
    "./utils": "./src/utils.ts"
  }
}
```

### Barrel files — AVOID
```ts
// Bad — barrel file exports everything, bundler may not tree-shake
export { Button } from './Button';
export { Card } from './Card';
export { Modal } from './Modal';

// Good — direct imports
import { Button } from '@/components/Button';
```

### Pure annotations
```ts
const Result = /*#__PURE__*/ heavyComputation(data);
```

---

## Asset Pipeline

| Asset | Optimization | Tool |
|-------|-------------|------|
| JavaScript | Minify + tree shake | esbuild / terser |
| CSS | Minify + unused removal | lightningcss / purgecss |
| Images | Compress + resize + WebP/AVIF | sharp / squoosh |
| Fonts | Subset + WOFF2 | glyphhanger / fonttools |
| SVG | Clean + minify | svgo |

---

## Caching Strategy

### Filename hashing
```ts
output: {
  filename: '[name].[contenthash:8].js',
  chunkFilename: '[name].[contenthash:8].chunk.js',
},
```

### Cache headers (CDN / nginx)
| File type | Cache header | Strategy |
|-----------|-------------|----------|
| `*.js` / `*.css` with hash | `immutable, max-age=31536000` | Cache forever, URL changes on update |
| `index.html` | `no-cache` | Always revalidate |
| `*.png` / `*.jpg` | `max-age=31536000` | Cache with hash in name |
| `*.svg` / `*.woff2` | `max-age=31536000` | Cache with hash in name |

---

## Performance Budgets

### Bundle size budget
| Bundle | Max gzipped | Notes |
|--------|-------------|-------|
| Entry chunk | 200 KB | First-load JS |
| Total JS | 400 KB | All route chunks |
| Total CSS | 50 KB | All CSS |
| Total images | 1 MB | Above-fold images |

### Build time budget
| Phase | Target | Notes |
|-------|--------|-------|
| Dev server start | < 2s | Vite with pre-bundling |
| HMR update | < 50ms | With Vite |
| Production build | < 30s | Medium project (50k LOC) |

### Measurement
```bash
npx vite build --report
npx webpack --profile --json > stats.json && npx webpack-bundle-analyzer stats.json
```

### Continuous monitoring
- CI fails if bundle exceeds budget.
- Compare PR bundle size vs main branch.
- Log bundle size to dashboard on each deploy.
