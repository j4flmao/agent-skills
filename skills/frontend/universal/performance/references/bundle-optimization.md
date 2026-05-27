# Bundle Optimization

## Purpose

Bundle optimization reduces the amount of JavaScript, CSS, and other assets that browsers must download, parse, and execute. Key techniques include code splitting, tree-shaking, image optimization, font optimization, and CDN delivery. Every optimization must be measured before and after — intuition about bundle composition is often wrong.

## Code Splitting

### Route-Based Splitting

Split code by route so each page loads only its own dependencies. The initial load includes only the code for the current route.

```typescript
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

// Each chunk is loaded only when the route is visited
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Orders = lazy(() => import('./pages/Orders'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const Settings = lazy(() => import('./pages/Settings'))

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders/*" element={<Orders />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  )
}
```

### Component-Level Splitting

For large, rarely-used components within a page.

```typescript
const MarkdownEditor = lazy(() => import('./MarkdownEditor'))
const PDFViewer = lazy(() => import('./PDFViewer'))
const DataExportModal = lazy(() => import('./DataExportModal'))

function DocumentPage({ documentId }: { documentId: string }) {
  const [isExporting, setIsExporting] = useState(false)

  return (
    <div>
      <Suspense fallback={<EditorSkeleton />}>
        <MarkdownEditor documentId={documentId} />
      </Suspense>
      <Suspense fallback={null}>
        {document.format === 'pdf' && <PDFViewer url={document.url} />}
      </Suspense>
      {isExporting && (
        <Suspense fallback={null}>
          <DataExportModal onClose={() => setIsExporting(false)} />
        </Suspense>
      )}
    </div>
  )
}
```

### Dynamic Imports for Interaction-Triggered Code

Load heavy code only when the user triggers an action.

```typescript
async function handleExportCSV(data: ReportData) {
  // 50KB CSV library loaded only on click
  const { generateCSV } = await import('./utils/csv-generator')
  const csv = generateCSV(data)
  downloadFile(csv, 'report.csv')
}

async function handleGeneratePDF() {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  // ... generate PDF
}

// Vue 3 — defineAsyncComponent with lazy loading
const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))

// Angular — loadChildren for route splitting
const routes: Routes = [
  { path: 'admin', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) },
]
```

### Preload Critical Chunks

Hint the browser to start downloading likely-next pages.

```html
<!-- Preload the most likely next route chunk -->
<link rel="preload" href="/assets/Orders-chunk.js" as="script">
<link rel="modulepreload" href="/assets/Settings-chunk.js">

<!-- Prefetch for less urgent but possible navigation -->
<link rel="prefetch" href="/assets/AdminPanel-chunk.js">
```

```typescript
// Programmatic prefetch
const preloadOrders = () => {
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = '/assets/Orders-chunk.js'
  document.head.appendChild(link)
}

// React — prefetch on hover
<Link
  to="/orders"
  onMouseEnter={() => import('./pages/Orders')}
>
  Orders
</Link>
```

## Tree-Shaking

### How Tree-Shaking Works

Tree-shaking is a build-time optimization that removes unused exports from the final bundle. It relies on ES module static analysis (import/export) — CommonJS require() cannot be tree-shaken.

```javascript
// tree-shakeable: only `formatDate` is included in the bundle
import { formatDate } from './utils/dates'

// NOT tree-shakeable: entire lodash library is included
const lodash = require('lodash')

// Better: named import from ES module build
import { debounce } from 'lodash-es'
import { format } from 'date-fns'       // Fully tree-shakeable
import { col } from 'd3-collection'     // Import from sub-package
```

### Side Effects Declaration

Mark packages as side-effect-free in package.json to enable deeper tree-shaking.

```json
{
  "name": "my-ui-lib",
  "sideEffects": [
    "*.css",
    "*.scss",
    "register-sw.js"
  ],
  "sideEffects": false
}
```

In webpack/Vite configuration:

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    sideEffects: true,  // Enable side-effect analysis
    usedExports: true,  // Mark unused exports
    providedExports: true,
  },
}
```

### Barrel File Anti-Pattern

Barrel files (re-exporting everything from index.ts) prevent effective tree-shaking.

```typescript
// BAD — barrel file: tree-shaker can't determine which exports are used
export { UserCard } from './UserCard'
export { UserList } from './UserList'
export { UserAvatar } from './UserAvatar'
export { UserProfile } from './UserProfile'
export { UserStats } from './UserStats'
// ... 20 more exports

// GOOD — direct import (tree-shaker knows exactly what's used)
import { UserCard } from '../components/user/UserCard'
```

## Bundle Analysis

### webpack-bundle-analyzer

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',       // Generates report.html
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
    }),
  ],
}
```

### vite-bundle-analyzer / rollup-plugin-visualizer

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/bundle-stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
})
```

### vite inspect

```bash
# Inspect Vite's resolved configuration and plugin pipeline
npx vite inspect

# Generate bundle analysis
npx vite build --analyze
```

### CI Bundle Size Checks

```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size
on: [pull_request]
jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build

      - name: Check bundle size
        run: |
          # Compare main bundle against threshold
          MAIN_BUNDLE=$(ls dist/assets/index-*.js | head -1)
          SIZE=$(gzip -c $MAIN_BUNDLE | wc -c)
          MAX_SIZE=200000  # 200KB gzipped
          if [ $SIZE -gt $MAX_SIZE ]; then
            echo "Bundle size $SIZE bytes exceeds $MAX_SIZE bytes"
            exit 1
          fi
```

## Chunk Splitting Strategies

### Automatic Splitting (Vite)

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          charts: ['recharts', 'd3-scale'],
        },
      },
    },
    chunkSizeWarningLimit: 100, // KB — warn if chunks exceed this
  },
})
```

### Automatic Splitting (Webpack)

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      maxSize: 200000,       // 200KB — split into smaller chunks
      minSize: 20000,        // 20KB — minimum chunk size
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        common: {
          minChunks: 2,       // Shared by at least 2 modules
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
  },
}
```

### Framework-Agnostic Chunk Strategy

```yaml
chunk strategy:
  frameworks: "Single vendor chunk (react, react-dom, react-router)"
  ui-libraries: "Separate chunk for heavy UI libs (chart, editor, datepicker)"
  route-pages: "One chunk per route, lazy-loaded"
  shared-utils: "Common utilities shared by 2+ pages"
  entry: "Small entry chunk with app shell only"
```

## Image Optimization

### Next.js Image Component

```typescript
import Image from 'next/image'

function HeroSection() {
  return (
    <Image
      src="/images/hero.webp"
      alt="Hero banner"
      width={1200}
      height={600}
      priority                      // LCP candidate — preload
      placeholder="blur"            // Show blur-up placeholder
      blurDataURL="data:image/webp;base64,..."
      sizes="(max-width: 768px) 100vw, 1200px"
      quality={85}
    />
  )
}
```

### Responsive Images with srcset

```html
<img
  src="hero-400.webp"
  srcset="
    hero-400.webp 400w,
    hero-800.webp 800w,
    hero-1200.webp 1200w,
    hero-1600.webp 1600w
  "
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  alt="Hero"
  width="1200"
  height="600"
  loading="lazy"
  decoding="async"
/>
```

### <picture> Element for Format Selection

```html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Hero" width="1200" height="600" loading="lazy">
</picture>
```

### Image Optimization Checklist

- [ ] Use Next.js Image or `picture` element with WebP/AVIF
- [ ] Set explicit `width` and `height` (prevents CLS)
- [ ] Add `loading="lazy"` for below-the-fold images
- [ ] Add `fetchpriority="high"` for LCP image
- [ ] Compress images to <100KB (hero) and <30KB (thumbnails)
- [ ] Use responsive srcset with appropriate breakpoints
- [ ] Serve images from CDN with cache headers

## Font Optimization

### Self-Hosted Fonts with subsetting

```css
/* Before: full font, ~150KB per weight */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}

/* After: subsetted font, ~20KB per weight */
/* Use Glyphhanger or Google Fonts API with text parameter */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

### Google Fonts Optimization

```html
<!-- Before: separate requests for each weight -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- After: preconnect + preload + display=optional -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=optional" rel="stylesheet">
```

### font-display Values

| Value | Behavior | Use Case |
|-------|----------|----------|
| `swap` | Show fallback immediately, swap when font loads | Content text (may cause CLS) |
| `optional` | Show fallback, use font only if loaded in <100ms | Body text (minimizes CLS) |
| `block` | Hide text for up to 3s while font loads | Brand/logo text |
| `fallback` | Hide text for ~100ms, swap if loaded | Semi-critical text |

## JS/CSS Minimization

### Build Tool Configuration

```javascript
// Vite — Terser or esbuild for minification
export default defineConfig({
  build: {
    minify: 'esbuild',     // Default, fast
    // minify: 'terser',   // Smaller output, slower
    terserOptions: {
      compress: {
        drop_console: true,       // Remove console.log
        drop_debugger: true,
        pure_funcs: ['console.info'],  // Remove specific calls
      },
      mangle: {
        properties: {
          regex: /^_/,           // Mangle private properties
        },
      },
    },
    cssMinify: 'lightningcss',    // Fast CSS minification
  },
})
```

### CSS Optimization

```css
/* Unused CSS removal with purgecss (via Tailwind) */
/* Tailwind purges unused classes automatically */
/* Keep only used styles in production */

/* Critical CSS inlining */
<style>
  /* Inline critical above-the-fold styles */
  header, nav, .hero { /* layout styles */ }
</style>
<link rel="stylesheet" href="/styles.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/styles.css"></noscript>

/* Avoid @import — it blocks rendering */
/* Bad */
@import url('components.css');

/* Good */
<link rel="stylesheet" href="/components.css">
```

## CDN Delivery

### CDN Configuration

```yaml
# Cloudflare / Fastly / Vercel Edge
cdn:
  static-assets:
    - pattern: "/assets/*"
      ttl: "365 days"
      immutable: true       # Content-hash filenames are immutable
      compression: "brotli"
    - pattern: "/images/*"
      ttl: "30 days"
      compression: "auto"
      transformation: "resize on demand"
    - pattern: "/_next/static/*"
      ttl: "365 days"
      immutable: true

  cache-headers:
    - pattern: "*.html"
      "Cache-Control": "public, max-age=0, must-revalidate"
    - pattern: "*.js"
      "Cache-Control": "public, max-age=31536000, immutable"
    - pattern: "*.css"
      "Cache-Control": "public, max-age=31536000, immutable"
    - pattern: "*.woff2"
      "Cache-Control": "public, max-age=31536000, immutable"
    - pattern: "*.jpg"
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
```

### Service Worker Caching

```javascript
// sw.js — Cache static assets on install
const CACHE_NAME = 'static-v1'
const STATIC_ASSETS = [
  '/assets/vendor-abc123.js',
  '/assets/app-xyz456.js',
  '/assets/styles-def789.js',
  '/fonts/inter-latin.woff2',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    )
  }
})
```

## Key Points

- Route-level code splitting is mandatory — each page loads only its own code.
- Dynamic imports for interaction-triggered heavy code (PDF export, chart libraries).
- Tree-shaking works only with ES module imports — avoid CommonJS require().
- Avoid barrel files (index.ts re-exports) — they defeat tree-shaking.
- Analyze bundle composition before optimizing — use webpack-bundle-analyzer or vite visualizer.
- Split vendor code into separate chunks for better caching.
- Images must use modern formats (WebP/AVIF), responsive srcset, and explicit dimensions.
- Self-host fonts with subsetting and use `font-display: optional`.
- Minify JS (esbuild/terser) and CSS (lightningcss) in production builds.
- Set immutable cache headers for content-hashed assets (1 year).
- Set a bundle budget: initial JS <200KB gzipped, initial CSS <50KB gzipped.
