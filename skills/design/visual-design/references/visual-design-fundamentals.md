# Visual Design Fundamentals

## Overview
Visual Design applies color, typography, layout, spacing, and imagery to create interfaces that are both aesthetically pleasing and functionally effective. Every visual decision should support clarity, readability, usability, and accessibility.

## Core Concepts

### Concept 1: Color Theory
Color communicates meaning, hierarchy, and emotion. Key properties: hue (pigment), saturation (intensity), lightness (brightness). Use color harmonies (complementary, analogous, triadic) for balanced palettes. Ensure WCAG AA contrast (4.5:1 text, 3:1 large text). Never rely on color alone to convey information.

### Concept 2: Typography
Typography affects readability, hierarchy, and brand expression. Establish a modular type scale (1.25 Major Third or 1.333 Perfect Fourth). Limit to 2 typeface families. Body text: 16-18px, line-height 1.5-1.7, max 75 characters per line. Headings: bold, shorter line-height.

### Concept 3: Layout Systems
Grids create structure and consistency. Use column grids (12-col for general, 8-col for compact, 6-col for dashboards) with consistent gutters. F-pattern for content-heavy pages, Z-pattern for minimal/landing pages. Design from mobile up.

### Concept 4: Spacing Systems
An 8px base grid creates consistent rhythm. All margins, padding, and gaps are multiples of 8px (4px for micro-spacing). Use proximity to group related elements (tighter spacing within groups, looser between groups). Space replaces borders.

### Concept 5: Visual Hierarchy
Guide the user's attention through size (bigger = more important), color (brighter/higher contrast = advances), position (top-left primary in LTR), whitespace (more space = more importance), and depth (shadows/layering create focal planes).

## Architecture Patterns

### Pattern 1: 60-30-10 Color Rule
60% neutral/background, 30% primary/brand, 10% accent/emphasis. This creates balanced, harmonious interfaces. The neutral base provides breathing room; the accent draws attention to key actions.

### Pattern 2: 8px Grid
All spacing uses multiples of 8px (or 4px for fine-tuning). This creates visual rhythm, eliminates arbitrary values, and simplifies design-to-development handoff.

### Pattern 3: Modular Type Scale
Define 7+ type sizes using a modular scale (1.25 or 1.333 ratio). Each size has defined line-height, weight, and usage context. This creates mathematical consistency and prevents font-size proliferation.

## Best Practices

- Minimum text size: 14px body, 12px caption
- Minimum contrast: 4.5:1 text, 3:1 UI elements (WCAG AA)
- Limit to 2 typeface families per interface
- Use 8px grid for all spacing
- Semantic color naming (color-primary, not color-blue)
- Test designs in grayscale to verify hierarchy
- Design dark mode alongside light mode
- Every component has hover, active, disabled, focus, error states

## Anti-Patterns

- Low contrast text (light gray on white is unreadable)
- Too many colors (10+ distinct colors = visual noise)
- Inconsistent spacing (random padding/margin values)
- No type hierarchy (same size/weight for headings and body)
- Decorative overload (effects without purpose)
- No dark mode (design breaks in dark environments)
- Color-only differentiation (inaccessible for colorblind users)
- Borders as separators (spacing is cleaner)
