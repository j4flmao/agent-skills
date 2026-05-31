# CSS Architecture Methodologies

## Overview

CSS architecture methodologies provide structured approaches to writing scalable, maintainable CSS. This reference covers BEM, ITCSS, OOCSS, SMACSS, CUBE CSS, and modern utility-first approaches. Each methodology solves different organizational problems — choosing one depends on team size, project scope, and tooling.

## Methodology Comparison

### At a Glance

| Methodology | Principle | Best For | Learning Curve |
|-------------|-----------|----------|----------------|
| BEM | Block-Element-Modifier naming | Any project size | Low |
| ITCSS | Specificity-based layer sorting | Large teams, design systems | Medium |
| OOCSS | Separate structure from skin | Reusable component libraries | Medium |
| SMACSS | Category-based organization | Projects with clear UI patterns | Low |
| CUBE CSS | Composition, Utility, Block, Exception | Modern progressive enhancement | Medium |
| Utility-First | Atomic utility classes (Tailwind) | Rapid iteration, consistency | Low-Medium |

## BEM (Block Element Modifier)

### Naming Convention

```css
/* Block: standalone component */
.card { }

/* Element: part of a block (double underscore) */
.card__title { }
.card__body { }
.card__footer { }

/* Modifier: variation of a block/element (double dash) */
.card--featured { }
.card__title--large { }
.card__button--primary { }
```

### HTML Structure

```html
<div class="card card--featured">
  <h2 class="card__title card__title--large">Featured Post</h2>
  <div class="card__body">
    <p>Content here</p>
  </div>
  <div class="card__footer">
    <button class="card__button card__button--primary">Read More</button>
  </div>
</div>
```

### SCSS with BEM

```scss
.card {
  border-radius: 8px;
  padding: 16px;
  background: white;

  &--featured {
    border: 2px solid gold;
  }

  &__title {
    font-size: 1.25rem;
    margin-bottom: 8px;

    &--large {
      font-size: 1.5rem;
    }
  }

  &__body {
    color: #333;
  }

  &__footer {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
}
```

### BEM Best Practices

- Blocks are standalone — no dependency on parent context.
- Elements are only meaningful within their block.
- Modifiers change appearance, not structure.
- Avoid deeply nested elements (`.block__elem1__elem2__elem3`) — create a new block.
- Use modifiers with a single responsibility.

### BEM Pitfalls

- Verbose class names can feel repetitive.
- No built-in theming mechanism.
- Can lead to specificity issues if combined with deep nesting in SCSS.
- Not designed for utility-driven layouts.

## ITCSS (Inverted Triangle CSS)

### Layer Structure

```
// Layer 1: Settings
// Variables, config (preprocessor only, no CSS output)
$color-primary: #2563eb;
$breakpoint-md: 768px;
$font-stack: 'Inter', sans-serif;

// Layer 2: Tools
// Mixins and functions (preprocessor only, no CSS output)
@mixin respond-to($bp) {
  @media (min-width: $bp) { @content; }
}

// Layer 3: Generic (reset/normalize)
// CSS reset, box-sizing, low-specificity
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

// Layer 4: Elements (bare HTML elements)
// H1-H6, a, p, ul, ol, button — no classes
h1 { font-size: 2rem; line-height: 1.2; }
h2 { font-size: 1.5rem; line-height: 1.3; }
a { color: $color-primary; text-decoration: none; }

// Layer 5: Objects (layout patterns)
// Grid, container, wrapper — no cosmetics
.o-container {
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: 16px;
}

.o-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

// Layer 6: Components (UI components)
// Cards, buttons, nav, form elements — explicit classes
.c-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.c-button {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;

  &--primary {
    background: $color-primary;
    color: white;
  }

  &--secondary {
    background: transparent;
    border: 1px solid #ddd;
  }
}

// Layer 7: Utilities (overrides)
// Single-purpose, !important allowed
.u-text-center { text-align: center !important; }
.u-mt-4 { margin-top: 16px !important; }
.u-hidden { display: none !important; }
```

### ITCSS Key Principles

- Specificity increases as you go down the layers.
- Higher layers override lower layers.
- Settings and Tools produce no CSS output.
- Utilities use !important intentionally (they're meant to override).
- Objects (OOCSS patterns) handle layout, not cosmetics.
- Components combine layout + cosmetics for specific UI patterns.

### ITCSS File Organization

```
styles/
  settings/
    _colors.scss
    _typography.scss
    _spacing.scss
    _breakpoints.scss
  tools/
    _mixins.scss
    _functions.scss
  generic/
    _reset.scss
    _box-sizing.scss
  elements/
    _headings.scss
    _links.scss
    _lists.scss
    _forms.scss
    _images.scss
  objects/
    _container.scss
    _grid.scss
    _flow.scss
    _media.scss
  components/
    _card.scss
    _button.scss
    _nav.scss
    _modal.scss
    _form.scss
  utilities/
    _spacing.scss
    _typography.scss
    _display.scss
    _colors.scss

// main.scss — imports layers in order
@import 'settings/colors';
@import 'settings/typography';
@import 'tools/mixins';
@import 'generic/reset';
@import 'elements/headings';
@import 'objects/container';
@import 'components/button';
@import 'utilities/spacing';
```

### ITCSS Benefits

- Clear mental model for where styles belong.
- Prevents specificity escalations.
- Scales well to large teams (50+ developers).
- Works with any naming convention (BEM + ITCSS is common).

## OOCSS (Object-Oriented CSS)

### Separation of Structure and Skin

```css
/* Structure — reusable layout */
/* .media is a layout object */
.media {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.media__figure {
  flex-shrink: 0;
}

.media__body {
  flex: 1;
}

/* Skin — visual appearance */
/* .card is a visual style */
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 24px;
}

/* Dark skin */
.card--dark {
  background: #1a1a1a;
  color: white;
}
```

```html
<!-- Composition: structure + skin -->
<div class="media card">
  <div class="media__figure">
    <img src="avatar.jpg" alt="" />
  </div>
  <div class="media__body">
    <h2>Title</h2>
    <p>Description</p>
  </div>
</div>

<!-- Same structure, different skin -->
<div class="media card card--dark">
  <div class="media__figure">...</div>
  <div class="media__body">...</div>
</div>
```

### OOCSS Benefits

- Maximum reuse — write layout once, apply skin separately.
- Reduced CSS size through composition.
- Encourages building a library of reusable objects.
- Works well with design system components.

## SMACSS (Scalable and Modular Architecture for CSS)

### Category System

```
Base: Default element styles (no classes)
  h1, h2, a, p, ul, ol, button

Layout: Major structural components
  .l-header, .l-main, .l-sidebar, .l-footer
  .l-grid, .l-container

Module: Reusable UI components
  .card, .button, .nav, .modal, .form

State: Conditional appearance
  .is-active, .is-hidden, .is-disabled, .is-loading

Theme: Visual variations (optional layer)
  .theme-dark, .theme-high-contrast
```

### File Structure

```
styles/
  base/
    _reset.scss
    _typography.scss
    _links.scss
  layout/
    _header.scss
    _grid.scss
    _sidebar.scss
  modules/
    _card.scss
    _button.scss
    _nav.scss
    _modal.scss
  states/
    _visibility.scss
    _loading.scss
  themes/
    _dark.scss
    _high-contrast.scss
```

### SMACSS State Rules

```css
/* SMACSS state: .is- prefixed, overrides modules */
.card.is-active {
  border-color: blue;
  box-shadow: 0 0 0 2px rgba(blue, 0.3);
}

.button.is-loading {
  opacity: 0.7;
  pointer-events: none;
}

.button.is-loading::after {
  content: '';
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
```

### SMACSS Depth Limit

```css
/* OK: module > child (1 level deep) */
.card > .card__title { }

/* OK: module > state (1 level deep) */
.card.is-active { }

/* BAD: Too much depth */
.card .card__body .card__text .highlight { }
```

## CUBE CSS

### Layers

```
Composition: Layout patterns, spacing
  --grid, --cluster, --sidebar, --box

Utility: Single-purpose helpers
  .text-center, .weight-bold, .color-primary

Block: Component-specific styles
  .card, .button, .site-header

Exception: Overrides for specific contexts
  [data-variant="dark"] .card { }
```

### Composition CSS

```css
/* Composition classes handle layout exclusively */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--grid-min, 250px), 1fr));
  gap: var(--grid-gap, 1rem);
}

.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cluster-gap, 1rem);
  justify-content: var(--cluster-align, flex-start);
  align-items: var(--cluster-valign, center);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: var(--stack-gap, 1rem);
}
```

### CUBE CSS in Practice

```html
<div class="grid" style="--grid-min: 300px">
  <article class="card">
    <h2 class="text-center weight-bold">Card Title</h2>
    <p>Card content here</p>
  </article>
  <article class="card" data-variant="dark">
    <h2 class="text-center weight-bold">Dark Card</h2>
    <p>Different variant</p>
  </article>
</div>
```

## Utility-First (Tailwind Approach)

### Atomic Classes

```html
<div class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
  <div class="md:flex">
    <div class="md:shrink-0">
      <img class="h-48 w-full object-cover md:h-full md:w-48" src="..." alt="" />
    </div>
    <div class="p-8">
      <div class="uppercase tracking-wide text-sm text-indigo-500 font-semibold">Category</div>
      <a href="#" class="block mt-1 text-lg leading-tight font-medium text-black hover:underline">
        Title Here
      </a>
      <p class="mt-2 text-slate-500">Description text here.</p>
    </div>
  </div>
</div>
```

### Benefits

- No naming conventions to learn or maintain.
- Zero specificity issues (all single-class selectors).
- No growing CSS files (only used classes are generated).
- Consistent spacing, type, and color from a constrained design system.
- Responsive variants built-in (`sm:`, `md:`, `lg:`).

### When to Extract Components

```html
<!-- Repeat this 50 times → extract to component -->
<button class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50">
  Click Me
</button>
```

```typescript
// Extracted to component
function Button({ variant = 'primary', children, ...props }) {
  return (
    <button
      className={`
        inline-flex items-center px-4 py-2 rounded-md font-medium
        focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50
        ${variant === 'primary'
          ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500'
        }
      `}
      {...props}
    >
      {children}
    </button>
  )
}
```

## Methodology Selection Guide

### Decision Factors

```
Team size?
├── Solo / small (< 5) → BEM or Utility-First
├── Medium (5-20) → ITCSS + BEM or Utility-First + Components
└── Large (> 20) → ITCSS + BEM (strict governance)

Project type?
├── Design system / component library → ITCSS + BEM + OOCSS
├── Marketing site → Utility-First (Tailwind)
├── SaaS application → Utility-First or CSS Modules
├── CMS theme → SMACSS or BEM
└── Micro-frontend → CSS Modules (isolation by default)

Legacy codebase?
├── Migrating from global CSS → SMACSS or ITCSS (incremental adoption)
├── Greenfield project → Utility-First or CSS Modules
└── Embedded in another app → CSS Modules (scoped)

Critical requirements?
├── Performance (zero runtime) → CSS Modules, Tailwind, or vanilla-extract
├── Dynamic theming → CSS Variables + any methodology
├── Design token integration → CSS Variables + BEM or ITCSS
└── Shadow DOM isolation → Already scoped, use BEM for consistency
```

## Hybrid Approaches

### Tailwind + CSS Modules

```typescript
// Button.tsx
import styles from './Button.module.css'

export function Button({ variant = 'primary', className = '', children }) {
  return (
    <button
      className={`
        inline-flex items-center px-4 py-2 rounded-md font-medium /* Tailwind */
        ${styles.root}                                           /* Scoped CSS */
        ${variant === 'primary' ? styles.primary : styles.secondary}
        ${className}
      `}
    >
      {children}
    </button>
  )
}
```

### BEM + ITCSS

The most common enterprise combination: BEM for naming, ITCSS for layering.

```
styles/
  settings/    /* variables */
  tools/       /* mixins */
  generic/     /* reset */
  elements/    /* html elements */
  objects/     /* layout */
  components/  /* BEM blocks */
  utilities/   /* overrides */
```

## File Organization Examples

### Small Project (BEM)

```
css/
  main.css              /* Imports all partials */
  _variables.css
  _reset.css
  _utilities.css
  components/
    _card.css
    _button.css
    _nav.css
```

### Medium Project (ITCSS + BEM)

```
styles/
  settings/
    _colors.scss
    _typography.scss
  tools/
    _mixins.scss
    _responsive.scss
  generic/
    _reset.scss
  elements/
    _headings.scss
    _links.scss
  objects/
    _container.scss
    _grid.scss
  components/
    _header.scss
    _card.scss
    _button.scss
    _modal.scss
  utilities/
    _spacing.scss
    _display.scss
main.scss
```

### Large Project (ITCSS + BEM, per-feature)

```
src/
  features/
    auth/
      styles/
        _login.scss
        _register.scss
      components/
        LoginForm.tsx
        RegisterForm.tsx
    dashboard/
      styles/
        _dashboard.scss
        _widget.scss
      components/
        Dashboard.tsx
        Widget.tsx
  shared/
    styles/
      settings/
      tools/
      generic/
      elements/
      objects/
      components/     /* shared components */
      utilities/
```
