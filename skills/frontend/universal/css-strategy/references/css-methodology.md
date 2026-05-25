# CSS Methodology

## Approach Selection Decision

```
Team size & project type?
├── Solo / small team, rapid iteration
│   └── Tailwind CSS (utility-first)
├── Medium team, component library
│   └── CSS Modules (scoped, zero-runtime)
├── Large team, design system
│   └── vanilla-extract (type-safe, zero-runtime)
├── Highly themed / white-label
│   └── CSS-in-JS (styled-components, Emotion)
└── Legacy / existing project
    └── Incremental migration plan
```

## Naming Convention Comparison

| Convention | Example | Scoping | Complexity |
|------------|---------|---------|------------|
| BEM | `block__element--modifier` | Manual (naming) | Medium |
| SUIT CSS | `Block-element--modifier` | Manual (naming) | Medium |
| SMACSS | `.l-header`, `.is-active` | Category-based | Low |
| ITCSS | Layered (Settings→Tools→...) | Layer-based | High |
| CSS Modules | `.card` → `._card_abc123` | Automatic (hash) | Low |
| Tailwind | `<div class="flex p-4">` | Implicit | Low |

## BEM Convention

```css
/* Block: standalone component */
.card { }
.card__title { }
.card__image { }

/* Element: part of a block (double underscore) */

/* Modifier: variant of block or element (double dash) */
.card--featured { }
.card__title--large { }
```

```html
<div class="card card--featured">
  <h2 class="card__title card__title--large">Title</h2>
</div>
```

## CSS Layers

```css
/* Explicit layering with @layer */
@layer reset, base, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; margin: 0; }
}

@layer base {
  body { font-family: system-ui; color: var(--color-text); }
}

@layer components {
  .card { padding: 1rem; border-radius: 8px; }
}

@layer utilities {
  .flex { display: flex; }
  .gap-4 { gap: 1rem; }
}
```

Layers solve specificity fights — last declared layer wins for equal specificity. `!important` still breaks layering.

## CSS Modules Best Practices

```typescript
// Single class composition
import styles from './Card.module.css'
<div className={styles.card} />

// Multiple classes
<div className={`${styles.card} ${styles.featured}`} />

// Conditional
<div className={`${styles.card} ${isFeatured ? styles.featured : ''}`} />

// Using classnames utility
import cn from 'classnames'
<div className={cn(styles.card, { [styles.featured]: isFeatured })} />
```

## Pre/Post-Processor Features

| Feature | Sass | PostCSS | Lightning CSS |
|---------|------|---------|---------------|
| Nesting | ✅ `&` | ✅ postcss-nesting | ✅ Built-in |
| Variables | ✅ `$var` | ✅ custom-props | ✅ Built-in |
| Mixins | ✅ `@mixin` | ❌ | ❌ |
| Functions | ✅ `@function` | ✅ postcss-functions | ❌ |
| Autoprefixer | Manual | ✅ autoprefixer | ✅ Built-in |
| Minification | Manual | ✅ cssnano | ✅ Built-in |
| Import bundling | ✅ `@use` | ✅ postcss-import | ❌ |

## Critical CSS Pattern

```html
<!-- Inline critical CSS in <head> -->
<style>
  /* Above-fold styles — everything needed for hero/header */
  header { ... }
  .hero { ... }
  .cta-button { ... }
</style>

<!-- Load full CSS async -->
<link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/styles.css"></noscript>
```

## CSS File Organization

```
src/styles/
├── reset.css              /* Box-sizing, margin reset, base font */
├── variables.css          /* CSS custom properties (tokens) */
├── typography.css         /* Type scale, font faces, text styles */
├── utilities.css          /* One-off utility classes */
├── animations.css         /* @keyframes definitions */
├── critical.css           /* Above-fold styles (inlined in HTML) */
└── print.css              /* Print-specific styles */

components/
├── Button/
│   ├── Button.tsx
│   ├── Button.module.css  /* or Button.styles.ts */
│   └── Button.test.tsx
└── Card/
    ├── Card.tsx
    └── Card.module.css
```

## Global vs Component Styles

| Style Type | Location | Scope | When to Add |
|------------|----------|-------|-------------|
| Reset | `styles/reset.css` | Global | Once |
| Typography | `styles/typography.css` | Global | Per type scale addition |
| CSS variables | `styles/variables.css` | Global | Per token addition |
| Component styles | Co-located `.module.css` | Component | Per component |
| Layout utilities | `styles/utilities.css` | Global | When pattern repeats 3+ times |
