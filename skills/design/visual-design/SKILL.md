---
name: design-visual-design
description: >
  Use when the user asks about visual design, color theory, typography, layout, visual hierarchy, spacing, proportion, or UI aesthetics. Do NOT use for: design systems (design-design-systems), UX research (design-ux-research), or prototyping (design-prototyping).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [design, visual-design, phase-3]
---

# Visual Design

## Purpose
Apply visual design principles: color theory, typography, layout grids, spacing systems, visual hierarchy, and aesthetic consistency for digital products.

## Workflow

### Color System
| Element | Rule |
|---------|------|
| Primary | Brand color, 1-2 hues |
| Secondary | Supporting colors, 2-3 hues |
| Neutral | Grays for text, backgrounds, borders |
| Semantic | Success, warning, error, info |
| Accessibility | WCAG AA contrast (4.5:1 for text) |

### Typography Scale
```css
/* Type scale: 1.25 ratio (Major Third) */
--text-xs: 0.75rem;   /* 12px */
--text-sm: 0.875rem;  /* 14px */
--text-base: 1rem;    /* 16px */
--text-lg: 1.125rem;  /* 18px */
--text-xl: 1.25rem;   /* 20px */
--text-2xl: 1.5rem;   /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem;  /* 36px */
```

### Spacing System
```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

### Layout Principles
- **Grid**: 8px base grid, 4px micro grid
- **Columns**: 12-column grid for responsive layouts
- **Whitespace**: Breathing room between elements
- **Visual hierarchy**: Size, color, position guide attention
- **Consistency**: Repeating patterns create familiarity

## References
- `references/color-theory.md` — Color theory, wheel, harmony, contrast, WCAG, dark mode
- `references/layout-principles.md` — Grid systems, spacing, and composition
- `references/spacing-grid.md` — 8px grid, baseline grid, spacing scale, container queries, responsive breakpoints
- `references/typography.md` — Typeface selection, font pairing, hierarchy, responsive type scales, variable fonts
- `references/visual-hierarchy.md` — F-pattern, Z-pattern, focal points, proximity, Gestalt principles
