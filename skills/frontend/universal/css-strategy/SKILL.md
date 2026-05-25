---
name: frontend-css-strategy
description: >
  Use this skill when the user says 'CSS strategy', 'CSS Modules', 'CSS-in-JS', 'utility-first CSS', 'Tailwind CSS', 'styled-components', 'Emotion', 'CSS organization', 'CSS architecture', 'CSS approach', 'BEM', 'CSS naming convention', 'CSS preprocessor', 'Sass', 'PostCSS', 'styled-jsx', 'Linaria', 'vanilla-extract', 'CSS decision', 'styling approach'. This skill helps choose the right CSS approach based on project size, team composition, performance requirements, and build tooling. Works with any frontend framework. Do NOT use for: component design (use design-system skill), Tailwind-specific questions (use tailwind-css skill), or design token setup (use theming skill).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, css, styling, universal]
---

# Frontend CSS Strategy

## Purpose
Choose and implement the right CSS approach for the project. Utility-first for rapid iteration and consistency. CSS Modules for scoped, component-encapsulated styles. CSS-in-JS for dynamic theming and colocation. Each approach solves a different problem — pick the right one.

## Agent Protocol

### Trigger
Exact phrases: "CSS strategy", "CSS Modules", "CSS-in-JS", "utility-first", "Tailwind CSS", "styled-components", "Emotion", "CSS organization", "CSS architecture", "CSS approach", "styling approach", "how to style", "CSS decision".

### Input Context
- Framework (React, Vue, Angular, Svelte)
- Team size and CSS experience
- Project type (library, app, design system)
- Current styling approach (if any)
- Performance requirements (runtime cost, bundle size)
- Existing Tailwind or CSS-in-JS setup

### Output Artifact
CSS strategy recommendation with rationale, setup code, and organization pattern.

### Response Format
```
## Recommendation
<approach> — <rationale>

## Setup
<config, dependencies, file-structure>

## Usage
<component-example, naming-convention>

## Organization
<folder-structure, globals, utilities>

—
Compression footer: frontend-css/v1 | approach: <tailwind|modules|css-in-js> | perf: <runtime|zero>
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] CSS approach selected with documented rationale
- [ ] File and folder structure created
- [ ] Global styles (reset, variables, typography) configured
- [ ] Component styling pattern established with examples
- [ ] Responsive and state-based styling pattern defined
- [ ] Build tool configured for chosen approach
- [ ] Theming integration decided (CSS variables vs JS-based)

### Max Response Length
4096 tokens

## Workflow

### 1. Approach Decision
```
Project type?
├── Design system / component library → CSS Modules or vanilla-extract (zero runtime, scoped)
├── Large app with many developers → Tailwind CSS (consistent, low decision fatigue)
├── Highly themed / white-label app → CSS-in-JS or CSS variables (dynamic theming)
├── Micro-frontend → CSS Modules (isolation)
└── Small app / prototype → Any — pick based on team preference
```

### 2. Approach Comparison

| Approach | Runtime | Scoping | Dynamic Themes | Bundle Size | Learning Curve |
|----------|---------|---------|---------------|-------------|----------------|
| Utility-first (Tailwind) | Zero | N/A (utility classes) | Via CSS vars | Small (purged) | Low-Medium |
| CSS Modules | Zero | Automatic (hash) | Via CSS vars | Zero runtime | Low |
| styled-components | Runtime | Automatic (hash) | Native | ~12KB runtime | Medium |
| Emotion | Runtime | Automatic (hash) | Native | ~8KB runtime | Medium |
| vanilla-extract | Zero | Automatic (hash) | Via CSS vars | Zero runtime | Medium |
| Linaria | Zero | Automatic (hash) | Via CSS vars | Zero runtime | Medium |
| Stitches | Runtime | Automatic | Native | ~5KB runtime | Medium |
| Raw CSS/Sass | Zero | Manual (BEM) | Via CSS vars | Zero | Low |

### 3. File Organization
```
src/
├── styles/
│   ├── reset.css               /* CSS reset */
│   ├── variables.css            /* CSS custom properties */
│   ├── typography.css           /* Font faces, text styles */
│   ├── utilities.css            /* Utility classes (if not Tailwind) */
│   └── animations.css          /* Keyframes */
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.module.css   /* or Button.styled.ts for CSS-in-JS */
│   │   └── Button.test.tsx
│   └── Card/
│       ├── Card.tsx
│       ├── Card.module.css
│       └── Card.test.tsx
└── pages/
    ├── Home/
    │   ├── Home.tsx
    │   └── Home.module.css
    └── ...
```

### 4. CSS Modules Pattern
```css
/* Button.module.css */
.root {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
}

.primary {
  background: var(--color-primary);
  color: white;
}

.secondary {
  background: transparent;
  border: 1px solid var(--color-border);
}

.large {
  padding: 12px 24px;
  font-size: 1.125rem;
}
```

```typescript
// Button.tsx
import styles from './Button.module.css'

interface ButtonProps {
  variant: 'primary' | 'secondary'
  size?: 'default' | 'large'
}

export function Button({ variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={`${styles.root} ${styles[variant]} ${size === 'large' ? styles.large : ''}`}
      {...props}
    />
  )
}
```

### 5. Tailwind Pattern
```typescript
// Button.tsx (Tailwind)
export function Button({ variant = 'primary', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-transparent border border-gray-300 hover:bg-gray-50',
  }

  return (
    <button
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${variants[variant]}`}
      {...props}
    />
  )
}
```

### 6. Styled Components Pattern
```typescript
// Button.styled.ts
import styled, { css } from 'styled-components'

interface ButtonProps {
  $variant: 'primary' | 'secondary'
  $large?: boolean
}

export const StyledButton = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: ${({ $large }) => ($large ? '12px 24px' : '8px 16px')};
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;

  ${({ $variant }) =>
    $variant === 'primary'
      ? css`
          background: var(--color-primary);
          color: white;
        `
      : css`
          background: transparent;
          border: 1px solid var(--color-border);
        `}
`
```

### 7. CSS Variables for Theming
```css
:root {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-background: #ffffff;
  --color-text: #1a1a1a;
  --color-border: #e5e7eb;
  --radius-sm: 4px;
  --radius-md: 8px;
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-4: 16px;
}
```

## Rules
1. CSS approaches are not mixed in a single project — pick one primary approach.
2. Design tokens live in CSS custom properties, not in JavaScript — enables runtime theme switching without re-renders.
3. Component styles never depend on global styles for layout — each component is self-contained.
4. Utility classes are preferred over one-off CSS for margins, padding, typography, and layout.
5. CSS-in-JS is only chosen when dynamic theming is required and CSS variables are insufficient.
6. CSS Modules are used for zero-runtime scoping when dynamic theming is not needed.
7. Naming conventions are consistent across the entire codebase: camelCase for CSS Modules, kebab-case for utility classes.
8. Media queries inside component styles use the project's standard breakpoint values (as CSS variables or JS constants).
9. Animations prefer CSS over JavaScript — only JS animation when complex choreography is needed.
10. Dead styles are removed — purging (Tailwind) or lint rules (no unused styles) are configured.
11. `!important` is never used unless overriding a third-party library.
12. CSS selectors never exceed 3 levels of specificity.

## References
- `references/css-approaches.md` — Detailed comparison, trade-offs, migration paths between approaches
- `references/css-organization.md` — File structure, naming conventions, global vs component styles, design tokens
- `references/css-methodology.md` — BEM, CSS Layers, CSS Modules, naming conventions, critical CSS, file organization
- `references/css-performance.md` — Critical delivery, selector performance, containment, bundle size, layout thrash prevention

## Handoff
No artifact produced unless requested.
Next skill: `frontend-tailwind-css` — Tailwind-specific patterns, configuration, and optimization.
Carry forward: CSS approach selected, organization pattern, theming via CSS variables.
