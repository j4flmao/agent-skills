---
name: frontend-design-system
description: >
  Use this skill when the user says 'design system', 'design tokens', 'component library', 'theme', 'colors', 'typography system', 'spacing system', 'component API design', 'variant system', or when creating or extending a frontend design system. This skill enforces: three-tier token hierarchy (primitive, semantic, component), CSS custom properties as the token layer, CVA for component variants, component API with max 10 props, and dark mode via semantic token swap. Works with React, Vue, Angular. Do NOT use for: backend API design, database schema, or individual component implementation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, design-system, phase-3, universal]
---

# Frontend Design System

## Purpose
Build a three-tier design token system with CVA-based component variants and theme-aware architecture. Every visual value is a token. No hardcoded colors, spacing, or typography.

## Agent Protocol

### Trigger
Exact user phrases: "design system", "design tokens", "component library", "theme", "colors", "typography system", "spacing system", "component API design", "variant system", "create a design system".

### Input Context
Before activating, verify:
- The framework is known (React, Vue, Angular) or ask.
- The styling approach is known (CSS modules, Tailwind, styled-components, etc.).

### Output Artifact
No file output. Produces token definitions and component APIs as text.

### Response Format
Token definitions:
```
Primitive: --color-{scale}-{step}
Semantic: --color-{role}
Component: --{component}-{property}
```

Component API:
```
Component: {Name}
Props: {list with types}
Variants: {variant name -> options}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Three-tier token hierarchy defined (primitive, semantic, component).
- [ ] Token naming convention established with examples.
- [ ] CVA or equivalent variant pattern specified.
- [ ] Component API rules defined (props, composition, escape hatches).
- [ ] Dark mode strategy defined via semantic token cascade.
- [ ] No hardcoded values in component examples.

### Max Response Length
Token definitions: 15 lines. Component API: 10 lines.

## Workflow

### Step 1: Three-Tier Token Hierarchy
```
Primitive tokens (raw values):
  --color-gray-50, --color-blue-500, --font-size-md, --spacing-4
  These never change meaning. Direct mappings to design values.

Semantic tokens (meaning):
  --color-bg-primary, --color-text-body, --color-border
  These reference primitives. Meaning is stable even when theme changes.

Component tokens (scoped):
  --button-bg, --card-padding, --input-border
  These reference semantic tokens. Components only use these, never primitives.
```

### Step 2: Token Naming Convention
```css
:root {
  /* Primitives */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;

  /* Semantic */
  --color-bg-primary: var(--color-gray-50);
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-border: var(--color-gray-100);
  --color-brand: var(--color-blue-600);
  --font-body: var(--font-size-md);
  --spacing-stack: var(--spacing-4);

  /* Component */
  --button-bg: var(--color-brand);
  --button-text: #ffffff;
  --button-padding: var(--spacing-2) var(--spacing-4);
  --button-radius: 0.375rem;
}
```

### Step 3: Dark Mode via Semantic Token Swap
```css
:root[data-theme="dark"] {
  --color-bg-primary: #111827;
  --color-text-primary: #f9fafb;
  --color-text-secondary: #9ca3af;
  --color-border: #374151;
  /* Component tokens inherit automatically via --button-bg: var(--color-brand) */
}
```

Components never reference dark-mode values directly. They reference semantic tokens which change under [data-theme="dark"].

### Step 4: Component API Design Rules
```typescript
interface ButtonProps {
  // Variants (use CVA)
  variant: 'primary' | 'secondary' | 'ghost' | 'danger'
  size: 'sm' | 'md' | 'lg'

  // Behavior
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean

  // Content
  children: React.ReactNode
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode

  // Escape hatch
  className?: string
  // Maximum 10 props
}
```

### Step 5: CVA Variant Pattern
```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        ghost: 'text-gray-700 hover:bg-gray-100',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)
```

## Rules
- Never hardcode color, spacing, or typography values in component CSS. Every visual value is a token.
- Component tokens reference semantic tokens, never primitives directly.
- One component = one file. No monolithic component files.
- All components support dark mode automatically via semantic token cascade.
- Component API: maximum 10 props (excluding className/style/children).
- Prefer composition (children, slots) over configuration (boolean props for every option).

## References
  - references/component-api.md — Component API Design
  - references/component-architecture.md — Component Architecture
  - references/design-system-implementation.md — Design System Implementation
  - references/design-system-testing.md — Design System Testing
  - references/design-tokens.md — Design Tokens
  - references/theme-implementation.md — Theme Implementation
## Handoff
No artifact produced.
Next skill: frontend-state-management — state architecture for the design system.
Carry forward: token definitions, component API rules, dark mode strategy.
