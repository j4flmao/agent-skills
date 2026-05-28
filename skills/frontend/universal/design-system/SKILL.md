---
name: frontend-design-system
description: >
  Use this skill when the user says 'design system', 'design tokens', 'component library', 'theme', 'colors', 'typography system', 'spacing system', 'component API design', 'variant system', or when creating or extending a frontend design system. This skill enforces: three-tier token hierarchy (primitive, semantic, component), CSS custom properties as the token layer, CVA for component variants, component API with max 10 props, and dark mode via semantic token swap. Works with React, Vue, Angular. Do NOT use for: backend API design, database schema, or individual component implementation.
version: "1.2.0"
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
Build a three-tier design token system with CVA-based component variants and theme-aware architecture. Every visual value is a token. No hardcoded colors, spacing, or typography. Components support dark mode, responsive variants, and accessibility out of the box.

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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Three-tier token hierarchy defined (primitive, semantic, component).
- [ ] Token naming convention established with examples.
- [ ] CVA or equivalent variant pattern specified.
- [ ] Component API rules defined (props, composition, escape hatches).
- [ ] Dark mode strategy defined via semantic token cascade.
- [ ] No hardcoded values in component examples.

### Max Response Length
Token definitions: 15 lines. Component API: 10 lines.

## Component Architecture / Decision Trees

### Styling Approach Decision Tree

```
Existing styling stack?
  |-- Tailwind CSS --> Use CVA with Tailwind classes + cn() helper
  |-- CSS Modules --> Use CVA with @apply and module scoping
  |-- styled-components / Emotion --> Use CSS prop or styled() + variants
  |-- Vanilla CSS --> Use CSS custom properties + BEM-style classes
  |-- CSS-in-JS (other) --> Use the library's variant system
```

### Token Architecture Decision Tree

```
Runtime theme switching needed?
  |-- YES --> CSS Custom Properties + semantic tokens (themes are CSS files)
  |     Components reference semantic tokens, themes swap their values
  |-- NO  --> Build-time token generation (Style Dictionary -> Tailwind config / CSS)
  |     Simpler, no runtime overhead. Rebuild to change theme.
```

### Component Composition Decision Tree

```
Does the component render its children?
  |-- YES --> Is it a layout component?
  |     |-- YES --> Use React children / Vue slots
  |     |-- NO  --> Use composition (compound components)
  |-- NO --> Does it accept many optional sub-elements?
        |-- YES --> Use slots pattern (leftIcon, rightIcon, subtitle)
        |-- NO  --> Keep props flat under 10
```

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

Components never reference dark-mode values directly. They reference semantic tokens which change under `[data-theme="dark"]`.

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

### Step 6: Compound Component Pattern
```tsx
function Card({ children, className }) {
  return <div className={cn('rounded-xl border p-6', className)}>{children}</div>;
}

Card.Header = function CardHeader({ children, className }) {
  return <div className={cn('mb-4', className)}>{children}</div>;
};

Card.Body = function CardBody({ children, className }) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className }) {
  return <div className={cn('mt-4 pt-4 border-t', className)}>{children}</div>;
};

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>;
```

### Step 7: Polymorphic Components (as prop)
```tsx
function Text({ as: Component = 'p', variant = 'body', children, className }) {
  const styles = {
    h1: 'text-3xl font-bold',
    h2: 'text-2xl font-semibold',
    h3: 'text-xl font-medium',
    body: 'text-base',
    caption: 'text-sm text-gray-500',
  };

  return <Component className={cn(styles[variant], className)}>{children}</Component>;
}
```

### Step 8: Testing Components
```tsx
it('renders with correct variant classes', () => {
  const { container } = render(<Button variant="primary">Click</Button>);
  const button = container.querySelector('button');
  expect(button.className).toContain('bg-blue-600');
  expect(button.className).toContain('text-white');
});

it('applies disabled state', () => {
  const { container } = render(<Button disabled>Click</Button>);
  expect(container.querySelector('button')).toBeDisabled();
});
```

## Common Pitfalls

### 1. Hardcoded Values
```css
/* BAD -- hardcoded color */
.button { background: #3b82f6; }

/* GOOD -- token reference */
.button { background: var(--button-bg); }
```

### 2. Component Tokens Referencing Primitives
```css
/* BAD -- component token references primitive directly */
--button-bg: var(--color-blue-500);

/* GOOD -- component token references semantic token */
--button-bg: var(--color-brand);
--color-brand: var(--color-blue-500);
```

This allows the theme to change `--color-brand` without touching component tokens.

### 3. Excessive Props
More than 10 props on a component makes it hard to use and maintain. Prefer composition (children, slots) over configuration props.

### 4. Missing Focus States
Every interactive component must have visible focus states. Design system components that omit focus rings fail WCAG 2.4.7.

### 5. Prop Drilling Theme Context
Passing theme values through component props creates tight coupling. Use CSS custom properties or React context for theming.

## Compared With

| Approach | Token System | Variant System | Runtime Theming | Bundle Size |
|----------|-------------|----------------|-----------------|-------------|
| CSS Custom Properties + CVA | Yes (3-tier) | CVA | Yes | 0 KB runtime |
| Tailwind + CVA | Via config | CVA | Yes (CSS vars) | < 15 KB CSS |
| styled-components | Via ThemeProvider | styled() + css() | Yes | ~15 KB runtime |
| Theme UI / Stitches | Design tokens | Variant system | Yes | ~5 KB runtime |
| Material UI Theme | Theme object | sx prop | Yes | ~30 KB |
| Radix UI | Unstyled | Unstyled | Manual | 0 KB (unstyling) |

## Performance Considerations

### CSS Custom Properties Performance
CSS custom properties are resolved at computed-value time, not cascade time. This means:
- Referencing `var(--color-brand)` has a small performance cost on first style resolution
- Theme switching via CSS custom properties does NOT trigger style recalculation for all elements -- only for elements that use the changed property
- Benchmark: swapping 100 custom properties affects ~1-2ms of style recalc per frame

### CVA Runtime Cost
CVA is a function that returns a class string. It is negligible (< 0.01ms per call). The class string itself is fast because it is CSS -- no runtime style computation.

### Bundle Size Impact
A well-designed design system component library should add:
- Component logic: 2-10KB per component
- Shared utilities (cn, CVA): 1-2KB
- Token definitions: 5-20KB CSS
- Total: 30-100KB for a library of 30-50 components

## Ecosystem & Tooling

### Token Management
- **Style Dictionary**: Amazon's build-time token transformation tool. Input JSON, output CSS/JS/anything.
- **Tokens Studio (Figma plugin)**: Design token editor in Figma. Syncs to GitHub via JSON.
- **Specify**: Design token management platform with Figma and code integrations.
- **Theo**: Salesforce's token transformer (predecessor to Style Dictionary).

### Component Development
- **Storybook**: Component development environment with a11y, controls, docs addons.
- **CVA (Class Variance Authority)**: Variant management for React/Vue components.
- **Radix UI / Headless UI**: Unstyled accessible primitives to build design system components on top of.
- **Reach UI / Ariakit**: Accessible UI primitives.

### Testing
- **jest-axe**: Automated accessibility assertions.
- **Storybook test runner**: Run interaction tests on stories.
- **Chromatic**: Visual regression testing for Storybook.
- **Playwright**: E2E testing with component mounting.

## Rules
- Never hardcode color, spacing, or typography values in component CSS. Every visual value is a token.
- Component tokens reference semantic tokens, never primitives directly.
- One component = one file. No monolithic component files.
- All components support dark mode automatically via semantic token cascade.
- Component API: maximum 10 props (excluding className/style/children).
- Prefer composition (children, slots) over configuration (boolean props for every option).
- Every interactive component must have hover, focus, active, and disabled states.
- Variants should be mutually exclusive per category (variant, size, color).
- Provide an escape hatch (`className`) for one-off overrides.

## References

- `references/component-api.md` -- Component API Design
- `references/component-architecture.md` -- Component Architecture
- `references/design-system-implementation.md` -- Design System Implementation
- `references/design-system-testing.md` -- Design System Testing
- `references/design-tokens.md` -- Design Tokens
- `references/theme-implementation.md` -- Theme Implementation
- `references/design-system-token-architecture.md` -- Design System Token Architecture
- `references/design-system-component-library.md` -- Design System Component Library Architecture

## Handoff
No artifact produced.
Next skill: frontend-state-management -- state architecture for the design system.
Carry forward: token definitions, component API rules, dark mode strategy.
