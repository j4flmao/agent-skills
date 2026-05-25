# CSS Performance

## Critical Rendering Path

```
HTML → CSS → Render Tree → Layout → Paint → Composite
        │
        CSS blocks rendering!
        Browser won't render until CSSOM is built.
```

CSS is a **render-blocking resource**. Every external stylesheet delays first paint.

## CSS Delivery Optimization

```html
<!-- ❌ Render-blocking CSS -->
<link rel="stylesheet" href="/styles.css">

<!-- ✅ Inline critical CSS, defer the rest -->
<style>
  /* Above-fold styles (< 14KB total) */
</style>
<link rel="preload" href="/styles.css" as="style"
      onload="this.onload=null;this.rel='stylesheet'">

<!-- ✅ For tiny CSS: inline entirely -->
<style>/* full app CSS under 14KB */</style>
```

## Selector Performance

| Selector | Speed | Example |
|----------|-------|---------|
| ID | Fastest | `#header` |
| Class | Fast | `.card` |
| Tag | Fast | `button` |
| Attribute | Medium | `[type="text"]` |
| Pseudo | Medium | `:nth-child(2)` |
| Descendant | Slower | `.card span` |
| Child | Faster than descendant | `.card > span` |
| Universal | Slow | `*` |
| Complex combinators | Slowest | `.card + .card ~ .card` |

```css
/* ❌ Slow — descendant selector on every element */
.card * { /* ... */ }

/* ✅ Fast — class selector */
.card-children { /* ... */ }
```

## CSS Property Performance

```css
/* ✅ Compositor-only (GPU) */
transform: translateX(100px);
opacity: 0.5;

/* ❌ Triggers layout (CPU) */
width: 50%;
height: 200px;
top: 0; left: 0;
margin: 10px;
padding: 20px;

/* ❌ Triggers paint (CPU) */
color: red;
background: blue;
box-shadow: 0 2px 4px rgba(0,0,0,0.1);
border-radius: 8px;
```

## CSS Containment

```css
/* Prevents re-layout of children from affecting outside */
.aside {
  contain: layout style paint;
}

/* Only prevents re-layout in inline direction */
.card {
  contain: layout;
}

/* Full containment for off-screen elements */
.off-screen-modal {
  contain: strict; /* layout style paint size */
}
```

## Bundle Size Optimization

| Technique | Saving | Implementation |
|-----------|--------|---------------|
| Purge unused CSS | 50-90% | Tailwind purge, PurgeCSS |
| CSS minification | 20-30% | lightningcss, cssnano |
| Remove redundant prefixes | 5-10% | autoprefixer with target browsers |
| Critical CSS extraction | 30-50% perceived | Critters, Penthouse |
| CSS splitting | Per-page savings | Code-split CSS per route |

## CSS Package Size Reference

| Library | Minified | Gzipped | Notes |
|---------|----------|---------|-------|
| Tailwind CSS | 4MB+ | ~250KB | Before purge |
| Tailwind CSS (purged) | Varies | ~10KB | After purge |
| Bootstrap 5 | ~180KB | ~25KB | Full library |
| styled-components | ~32KB | ~12KB | Runtime |
| Emotion | ~20KB | ~8KB | Runtime |
| animate.css | ~80KB | ~15KB | Full library |
| Normalize.css | ~10KB | ~2KB | CSS reset |

## Animating Properties Performance

```
Benchmark (15,000 elements, 60fps target):
┌─────────────────────────────────────────┐
│ transform: 60fps ✓ (compositor thread)  │
│ opacity:   60fps ✓ (compositor thread)  │
│ color:     45fps ✗ (paints)            │
│ width:     20fps ✗ (layout + paint)    │
│ box-shadow: 15fps ✗ (expensive paint)   │
└─────────────────────────────────────────┘
```

## Layout Thrash Prevention

```typescript
// ❌ Bad — forces synchronous layout on every read
const heights = []
elements.forEach(el => {
  element.style.height = '100px'  // write
  heights.push(el.offsetHeight)   // read — forces layout flush!
})

// ✅ Good — batch writes separate from reads
const heights = []
elements.forEach(el => {
  element.style.height = '100px'  // batch all writes
})
requestAnimationFrame(() => {
  elements.forEach(el => {
    heights.push(el.offsetHeight) // batch all reads
  })
})
```

## CSS Audit Checklist

- [ ] CSS delivery: no render-blocking CSS above 14KB
- [ ] Critical CSS inlined in `<head>`
- [ ] No `@import` in CSS (blocks parallel downloads)
- [ ] Unused CSS purged in production build
- [ ] No expensive selectors (universal, complex combinators)
- [ ] Animations use only transform/opacity
- [ ] Containment applied to widgets and modals
- [ ] CSS bundle < 50KB gzipped
- [ ] No `!important` usage (unless overriding 3rd party)
- [ ] `will-change` used sparingly and removed when idle
