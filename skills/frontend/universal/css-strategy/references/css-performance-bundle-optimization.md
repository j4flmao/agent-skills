# CSS Performance and Bundle Optimization

## Overview

CSS performance optimization covers loading strategies, bundle size reduction, critical CSS inlining, code splitting, unused style removal, and rendering performance. A well-optimized CSS pipeline reduces time-to-first-paint, eliminates layout shifts, and minimizes network transfer.

## CSS Loading Strategies

### Standard Stylesheet (Render-Blocking)

```html
<!-- Full render-blocking CSS -->
<link rel="stylesheet" href="/styles/main.css" />
```

The browser must download and parse this CSS before rendering. For large stylesheets, this delays first paint.

### Critical CSS Inline, Non-Critical Deferred

```html
<!-- Inline critical CSS in <head> -->
<style>
  /* Above-the-fold styles only */
  header, nav, .hero { ... }
  /* Inline directly — no network request */
</style>

<!-- Load non-critical CSS asynchronously -->
<link rel="preload" href="/styles/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
<noscript><link rel="stylesheet" href="/styles/main.css" /></noscript>
```

### Media-Based Loading

```html
<!-- Load only when print is used (never blocks rendering) -->
<link rel="stylesheet" href="/styles/print.css" media="print" />

<!-- Load only when screen width matches condition -->
<link rel="stylesheet" href="/styles/desktop.css" media="(min-width: 768px)" />
<link rel="stylesheet" href="/styles/mobile.css" media="(max-width: 767px)" />
```

### Conditional Loading with JavaScript

```html
<!-- Basic: load after page is interactive -->
<script>
  window.addEventListener('load', () => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/styles/non-critical.css'
    document.head.appendChild(link)
  })
</script>

<!-- Advanced: load when component is visible (IntersectionObserver) -->
<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = entry.target.dataset.stylesheet
        document.head.appendChild(link)
        observer.unobserve(entry.target)
      }
    })
  })
  document.querySelectorAll('[data-stylesheet]').forEach(el => observer.observe(el))
</script>
```

## Critical CSS Generation

### Using Critters (for SSR frameworks)

```javascript
// Next.js configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')()
const withCritters = require('next-plugin-critters')

module.exports = withCritters({
  // Critters inlines critical CSS
  experimental: {
    optimizeCss: true,
  },
})
```

### Manual Critical CSS Generation

```bash
# Install critical CLI
npm install -g critical

# Generate critical CSS for a URL
critical https://example.com --base ./public --width 1440 --height 900 --inline

# Generate for multiple breakpoints
critical https://example.com \
  --base ./public \
  --width 375 --height 667 \
  --width 768 --height 1024 \
  --width 1440 --height 900 \
  --output ./styles/critical.css
```

### Programmatic Critical CSS

```javascript
const critical = require('critical')

critical.generate({
  inline: true,
  base: './public',
  src: 'index.html',
  target: 'index.html',
  width: 1440,
  height: 900,
  minify: true,
  extract: true,
  ignore: {
    atrule: ['@font-face'],
    rule: [/.no-critical/],
  },
})
```

## Bundle Size Optimization

### Purge Unused CSS

```javascript
// PostCSS config with purgecss
module.exports = {
  plugins: [
    require('@fullhuman/postcss-purgecss')({
      content: [
        './src/**/*.html',
        './src/**/*.tsx',
        './src/**/*.jsx',
        './src/**/*.vue',
        './src/**/*.svelte',
      ],
      defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
      safelist: {
        standard: [/^is-/, /^has-/], // Keep dynamic classes
        deep: [/modal$/],
      },
    }),
  ],
}
```

### Analyze CSS Bundle

```bash
# Using source-map-explorer
npx source-map-explorer dist/styles/*.css

# Using webpack-bundle-analyzer
ANALYZE=true npm run build

# Using PurgeCSS analyzer
npx purgecss --css dist/styles/*.css --content dist/**/*.html --output ./analyzed
```

### CSS Code Splitting

```javascript
// Webpack: split CSS per entry point
module.exports = {
  entry: {
    main: './src/main.js',
    admin: './src/admin.js',
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          name: 'styles',
          type: 'css/mini-extract',
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
  ],
}
```

### CSS Minification

```javascript
// Webpack with CssMinimizerPlugin
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

module.exports = {
  optimization: {
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
              minifyFontValues: { removeQuotes: true },
              minifySelectors: true,
            },
          ],
        },
      }),
    ],
  },
}
```

## CSS Delivery Performance

### Preload Key Styles

```html
<!-- Preload critical CSS -->
<link rel="preload" href="/styles/critical.css" as="style" />

<!-- Preload important fonts -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
```

### Preconnect to CDN

```html
<!-- Preconnect to external CSS/CDN origins -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://cdn.example.com" crossorigin />
```

### HTTP Caching Headers

```javascript
// Express.js server
app.use('/styles', express.static('public/styles', {
  maxAge: '1y',
  immutable: true,     // Content-hashed filenames
  etag: true,
  lastModified: false,
}))

// Cache-Control: public, max-age=31536000, immutable
```

## Render Performance

### Avoid Layout Thrash

```javascript
// BAD: Forces multiple layout recalculations
const elements = document.querySelectorAll('.animated')
elements.forEach(el => {
  el.style.width = `${el.offsetWidth * 2}px`  // Read → Write → Read
  el.style.height = `${el.offsetHeight * 2}px`
})

// GOOD: Batch reads and writes separately
const elements = document.querySelectorAll('.animated')
const widths = []
const heights = []
elements.forEach(el => {
  widths.push(el.offsetWidth * 2)    // Batch reads
  heights.push(el.offsetHeight * 2)
})
elements.forEach((el, i) => {
  el.style.width = `${widths[i]}px`   // Batch writes
  el.style.height = `${heights[i]}px`
})
```

### Use CSS Containment

```css
/* Tell browser this element's layout is isolated */
.widget {
  contain: layout style paint;
}

/* Card in a list — isolation optimizes re-renders */
.card {
  contain: content; /* layout + style + paint */
}

/* Off-screen element — skip painting entirely */
.off-screen {
  content-visibility: auto;
  contain-intrinsic-size: 500px;
}
```

### Animations and Transitions

```css
/* BAD: Triggers layout */
.element {
  transition: all 0.3s ease;
}

/* GOOD: Only composite (GPU-accelerated) */
.element {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

/* Force GPU layer creation for smooth animations */
.element {
  will-change: transform, opacity;
  /* Use sparingly — creates layers that use memory */
}

/* Prefer transforms over positional changes */
/* BAD */
.element {
  left: 100px;
  transition: left 0.3s;
}

/* GOOD */
.element {
  transform: translateX(100px);
  transition: transform 0.3s;
}
```

### Reduce Paint Areas

```css
/* BAD: Repaints entire element on hover */
.card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* GOOD: Limit repaint to specific property */
.card {
  transform: translateY(0);
  transition: transform 0.2s;
}
.card:hover {
  transform: translateY(-2px);
}
```

## CSS Custom Properties Performance

### Scoping and Inheritance

```css
/* BAD: Defining variables globally causes unnecessary inheritance */
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  /* ... many variables ... */
}

/* GOOD: Scope variables to components */
.card {
  --card-padding: 16px;
  --card-radius: 8px;
  padding: var(--card-padding);
  border-radius: var(--card-radius);
}
```

### Variable Access Performance

CSS custom properties are fast but not free. Accessing a var() requires resolving the inheritance chain. Limit var() usage in hot animation paths:

```css
/* BAD: var() in animation triggers recomputation */
@keyframes slide {
  from { transform: translateX(var(--start)); }
  to { transform: translateX(var(--end)); }
}

/* GOOD: Resolve to concrete values in animation context */
@keyframes slide {
  from { transform: translateX(0); }
  to { transform: translateX(100px); }
}
```

## CSS Metrics to Monitor

### Performance Budget for CSS

```
Component            Budget
─────────────────────────────
Total CSS (gzipped)   < 15KB
Critical CSS (inline) < 4KB
Render-blocking CSS   0 (async or inline)
First paint           < 1.5s

Layout time           < 5ms
Selector matching     < 2ms
```

### Measuring CSS Performance

```javascript
// Performance Observer for style/layout timing
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.entryType === 'style' || entry.entryType === 'layout') {
      console.log(`${entry.entryType}: ${entry.duration}ms`)
      if (entry.duration > 50) {
        console.warn('Slow CSS operation detected:', entry)
      }
    }
  })
})

observer.observe({ entryTypes: ['style', 'layout'] })
```

### Chrome DevTools Timeline

```
Performance Tab:
  - Look for purple (style) and yellow (layout) bars
  - Long bars (>50ms) indicate problems
  - Check for forced reflow warnings

Coverage Tab:
  - Shows how much CSS is actually used
  - Red = unused, Green = used
  - Aim for >80% CSS usage
```

## Selector Performance

### Efficient Selectors

```css
/* Fast: ID, class, tag selectors */
#header { }
.card { }
p { }

/* Slower: descendant, attribute selectors */
.card .title { }
[data-type="primary"] { }

/* Slowest: universal, pseudo-class, complex combinators */
* { }
:not(.card) { }
.card ~ .related { }
.card + .card { }

/* BEM-based selectors are efficient — single class per match */
.card { }
.card__title { }
.card--featured { }
```

### Key Rules for Selector Performance

- Avoid universal selectors (`*`) in key paths.
- Keep selectors short (3 max).
- Prefer class selectors over tag selectors for components.
- Avoid qualifying classes with tags (`div.card`).
- Right-to-left matching: browser matches the rightmost selector first.

## Web Font Performance

### Font Loading Strategies

```html
<!-- Use font-display: swap to prevent FOIT -->
<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter.woff2') format('woff2');
    font-display: swap;
    font-weight: 400;
    unicode-range: U+0000-00FF; /* Limit character set */
  }

  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-bold.woff2') format('woff2');
    font-display: swap;
    font-weight: 700;
  }
</style>

<!-- Preload key fonts -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
```

### Subset Fonts

```css
/* Only load characters you use */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

### Inline Critical Fonts

For very small font files (icons, brand font), inline as base64 in critical CSS:

```css
@font-face {
  font-family: 'IconFont';
  src: url('data:font/woff2;base64,...') format('woff2');
  font-display: block;
}
```

## Build Pipeline Optimization

### PostCSS Pipeline

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('postcss-import'),
    require('postcss-mixins'),
    require('postcss-nesting'),
    require('postcss-custom-media'),
    require('autoprefixer'),
    require('cssnano')({
      preset: 'advanced',
    }),
  ],
}
```

### PurgeCSS with Tailwind

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{html,jsx,tsx}',
    './public/index.html',
  ],
  safelist: [
    'is-active',
    'has-error',
    /^modal-/,
  ],
  theme: { extend: {} },
  plugins: [],
}
```

## Media Query Performance

### Container Queries (Modern Alternative)

```css
/* Instead of many media query breakpoints, use container queries */
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    display: flex;
    flex-direction: row;
  }
}

@container (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
  }
}
```

## Testing and Monitoring

### Automated CSS Checks

```bash
# Check CSS file size
find dist -name '*.css' -exec ls -lh {} \;

# Check gzipped size
gzip -k dist/styles/main.css && ls -lh dist/styles/main.css.gz

# Audit with Lighthouse CI
npx lhci collect --url=https://example.com
npx lhci assert --preset=lighthouse:no-throttling
```

### Bundle Size CI Check

```yaml
# .github/workflows/css-size.yml
name: CSS Bundle Size
on: [pull_request]
jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - name: Check CSS size
        run: |
          CSS_SIZE=$(gzip -c dist/styles/main.css | wc -c)
          MAX_SIZE=15000
          if [ $CSS_SIZE -gt $MAX_SIZE ]; then
            echo "CSS bundle too large: ${CSS_SIZE} bytes (max ${MAX_SIZE})"
            exit 1
          fi
          echo "CSS bundle: ${CSS_SIZE} bytes"
```

## Checklist

```
CSS Delivery
- [ ] Critical CSS inlined in <head>
- [ ] Non-critical CSS loaded async
- [ ] Preconnect to external CSS domains
- [ ] Preload key fonts
- [ ] Content-hashed filenames for long-term caching

Bundle Size
- [ ] Total CSS < 15KB gzipped
- [ ] Unused CSS purged
- [ ] CSS minified
- [ ] Code-split per route/chunk
- [ ] Font subsetting applied

Rendering
- [ ] No layout thrashing
- [ ] Animations use transform/opacity only
- [ ] content-visibility: auto for off-screen
- [ ] CSS containment on isolated widgets
- [ ] Avoid var() in animation hot paths

Selectors
- [ ] No universal selectors
- [ ] Max 3 levels deep
- [ ] Prefer class selectors
- [ ] BEM or methodology followed
```
