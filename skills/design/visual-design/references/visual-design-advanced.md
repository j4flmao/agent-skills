# Visual Design Advanced Topics

## Overview
Advanced visual design covers responsive typography, adaptive color systems, advanced layout techniques (grids, containers, subgrid), data visualization design, visual accessibility beyond WCAG, and design tokens for visual properties.

## Advanced Concepts

### Concept 1: Responsive Typography
Type that adapts to viewport: fluid typography (clamp() in CSS for size scaling between breakpoints), line-height adjustment per font size, letter-spacing that tightens at larger sizes and opens at smaller, and font loading strategy (swap vs optional, subsetting for performance).

### Concept 2: Adaptive Color Systems
Color systems that adapt beyond dark mode: contrast mode (high contrast for accessibility), sepia mode (reading-friendly), dim mode (low light), and theme extension (brand theming). Each mode maps the same semantic tokens (--color-background, --color-text-primary) to different values.

### Concept 3: Subgrid and Container Queries
CSS subgrid enables aligning items across nested grid containers. Container queries enable component-level responsiveness (element queries) instead of viewport-based. Container query units (cqw, cqh) enable sizing relative to container, not viewport. These replace many media query patterns.

### Concept 4: Data Visualization Design
Visualizing data requires: appropriate chart type (bar for comparison, line for trends, scatter for correlation, heatmap for density), data-ink ratio (maximize data, minimize decoration), color for categories (distinct hues) vs values (sequential gradients), and accessibility (patterns + labels + high contrast).

### Concept 5: Visual Accessibility (Beyond WCAG)
Advanced accessibility: non-visual contrast (texture and pattern differentiation for colorblindness), cognitive load reduction (consistent iconography, limited choices, clear labeling), reading support (fonts for dyslexia, generous spacing, high character differentiation), and focus indicators that are part of the visual design.

## Advanced Techniques

### Fluid Typography with clamp()
```css
/* Fluid type that scales between viewport sizes */
h1 {
  font-size: clamp(1.75rem, 1.5rem + 1.5vw, 3rem);
  /* Min: 28px, preferred: fluid, max: 48px */
}
p {
  font-size: clamp(1rem, 0.875rem + 0.5vw, 1.125rem);
  /* Min: 16px, preferred: fluid, max: 18px */
}
```

### Container Query Pattern
```css
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}

@container (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
  }
}
```

### Semantic Color Token Architecture
```css
:root {
  /* Raw values */
  --blue-50: #EFF6FF;
  --blue-500: #3B82F6;
  --blue-900: #1E3A5F;

  /* Semantic tokens - adapt to theme */
  --color-bg-primary: var(--blue-50);
  --color-text-primary: var(--gray-900);
  --color-border: var(--gray-200);
}

[data-theme="dark"] {
  --color-bg-primary: var(--gray-900);
  --color-text-primary: var(--gray-50);
  --color-border: var(--gray-700);
}
```

## Anti-Patterns

- Fluid typography without min/max constraints (unreadable at extremes)
- Color tokens that don't adapt for dark mode (same blue on dark bg)
- Data visualizations that are beautiful but unreadable (chartjunk)
- Layouts that break at container boundaries (no container queries)
- Accessibility treated as checklist, not integrated into design
- Visual hierarchy that doesn't work in grayscale
- Responsive designs tested only on standard breakpoints
