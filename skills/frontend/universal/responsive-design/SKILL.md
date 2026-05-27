---
name: frontend-responsive-design
description: >
  Use this skill when the user says 'responsive design', 'container queries', 'breakpoints', 'mobile-first', 'fluid typography', 'responsive layout', 'media queries', 'clamp', 'adaptive design', or when building responsive frontend UIs. This skill enforces: mobile-first CSS, container queries for component-level responsiveness, a consistent breakpoint system, and fluid typography with clamp(). Works with any frontend framework. Do NOT use for: print styles, email templates, or native mobile app layout.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, responsive, layout, CSS, universal]
---

# Responsive Design

## Purpose
Build mobile-first responsive UIs with container queries, consistent breakpoints, fluid typography, and no horizontal overflow.

## Agent Protocol

### Trigger
Exact user phrases: "responsive design", "container queries", "breakpoints", "mobile-first", "fluid typography", "responsive layout", "media queries", "clamp", "adaptive design".

### Input Context
Before activating, verify:
- The CSS approach (Tailwind, vanilla CSS, CSS modules, styled-components).
- Whether the layout is page-level or component-level.

### Output Artifact
No file output. Produces responsive CSS, layout code, or breakpoint config as text.

### Response Format
```
Pattern: {name}
Breakpoint: {value}
CSS: {code block}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Mobile-first: base styles are mobile, media queries add complexity at larger screens.
- [ ] Breakpoints use consistent logical values (no arbitrary pixel values).
- [ ] Container queries used for reusable components instead of viewport media queries.
- [ ] Fluid typography via `clamp()` — no fixed font sizes.
- [ ] No horizontal scroll at any breakpoint.
- [ ] Touch targets at least 44x44px on mobile.

### Max Response Length
4096 tokens.

## Workflow

### Step 1: Mobile-First Base Styles
```css
/* Mobile first — base styles target mobile */
.card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
}

/* Then expand for larger screens */
@media (min-width: 768px) {
  .card {
    flex-direction: row;
    padding: 1.5rem;
  }
}
```

### Step 2: Consistent Breakpoint System
```css
/* Define once, use everywhere */
:root {
  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
}

/* Usage with Tailwind-like approach */
@media (min-width: 640px)  { /* sm */ }
@media (min-width: 768px)  { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Step 3: Container Queries
```css
/* Define container */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Query based on container width, not viewport */
@container card (min-width: 400px) {
  .card {
    flex-direction: row;
  }
}

@container card (min-width: 600px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}
```

### Step 4: Fluid Typography
```css
/* clamp(min, preferred, max) */
h1 {
  font-size: clamp(1.5rem, 4vw + 1rem, 3rem);
  line-height: 1.1;
}

p {
  font-size: clamp(0.875rem, 1vw + 0.75rem, 1.125rem);
  line-height: 1.6;
}

/* Fluid type scale */
--text-sm: clamp(0.75rem, 0.5vw + 0.625rem, 0.875rem);
--text-base: clamp(0.875rem, 1vw + 0.75rem, 1.125rem);
--text-lg: clamp(1rem, 1.5vw + 0.75rem, 1.375rem);
--text-xl: clamp(1.25rem, 2vw + 0.75rem, 1.75rem);
--text-2xl: clamp(1.5rem, 3vw + 0.75rem, 2.25rem);
```

### Step 5: Responsive Layout Grid
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 1rem;
}

/* Or with container query */
@container (min-width: 300px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}
@container (min-width: 600px) {
  .grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}
```

### Step 6: Touch Targets
```css
/* Minimum touch target size */
button, a, input, select {
  min-height: 44px;
  min-width: 44px;
}

/* Adequate spacing between touch targets */
.toolbar {
  display: flex;
  gap: 12px; /* at least 8px gap between targets */
}
```

## Rules
- Mobile-first: always write base styles for smallest screen, then `min-width` media queries.
- Component-level responsiveness: use container queries, not viewport media queries.
- Font sizes: use `clamp()` with viewport-relative preferred value, never fixed px.
- Breakpoints: use a predefined system (640/768/1024/1280). No random values.
- No horizontal scroll: `overflow-x: hidden` on body, use `min-width: 0` on flex children.
- Images: `max-width: 100%; height: auto` on all images by default.
- Spacing: use `rem` for padding/margin, not px.

## References
  - references/breakpoint-systems.md — Breakpoint Systems
  - references/container-queries.md — Container Queries
  - references/responsive-images.md — Responsive Images
  - references/responsive-patterns.md — Responsive Patterns
  - references/responsive-testing.md — Responsive Testing
  - references/responsive-typography.md — Responsive Typography
## Handoff
No artifact produced.
Next skill: `tailwind-css` — implement breakpoints via Tailwind utility classes.
Carry forward: breakpoint values, container query approach, fluid type scale.
