---
name: frontend-design-system
description: >
  Use this skill when building or extending a frontend design system: defining design tokens (primitive/semantic/component tiers), setting up a component library, designing component APIs with CVA variants, or implementing theme/dark-mode architecture. This skill enforces: three-tier token hierarchy (primitive → semantic → component), CSS custom properties as the token layer, CVA for component variants, component API with max 10 props, and dark mode via semantic token swap. Works with React, Vue, Angular. Do NOT use for: backend API design, database schema, or one-off component implementation.
version: "2.0.0"
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
Exact user phrases: "design system", "design tokens", "component library", "token architecture", "typography system", "spacing system", "component API design", "variant system", "create a design system", "dark mode theme".

### Input Context
Before activating, verify:
- The framework is known (React, Vue, Angular) or ask.
- The styling approach is known (CSS modules, Tailwind, styled-components, etc.).

### Output Artifact
Token definitions, component APIs, and (when asked) starter files for tokens, CVA variants, and theme configuration.

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

No preamble or filler. Lead with tokens and component APIs. Keep prose tight but include the definitions the user needs.

### Completion Criteria
- [ ] Three-tier token hierarchy defined (primitive, semantic, component).
- [ ] Token naming convention established with examples.
- [ ] CVA or equivalent variant pattern specified.
- [ ] Component API rules defined (props, composition, escape hatches).
- [ ] Dark mode strategy defined via semantic token cascade.
- [ ] No hardcoded values in component examples.

### Max Response Length
Produce complete token definitions and component APIs. Prioritize correctness over brevity; omit only redundant prose.

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

### Component Complexity Decision Tree

```
How many visual states does the component have?
  |-- 1-3 (simple) -->
  |     |-- Single variant, few props --> Direct utility classes or styled()
  |-- 4-10 (moderate) -->
  |     |-- Multiple variants (size, color) --> CVA or recipe()
  |-- 10+ (complex) -->
        |-- Compound component for sub-elements --> Compound + CVA
        |-- Slots for optional elements --> Slot pattern + CVA
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
Every semantic and component token references a primitive — no hardcoded values outside the primitive layer.

```css
:root {
  /* Primitives (raw values) */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-700: #374151;
  --color-gray-900: #111827;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --color-white: #ffffff;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;
  --radius-md: 0.375rem;

  /* Semantic (reference primitives) */
  --color-bg-primary: var(--color-gray-50);
  --color-text-primary: var(--color-gray-900);
  --color-text-secondary: var(--color-gray-500);
  --color-border: var(--color-gray-100);
  --color-brand: var(--color-blue-600);
  --color-on-brand: var(--color-white);
  --font-body: var(--font-size-md);
  --spacing-stack: var(--spacing-4);
  --radius-control: var(--radius-md);

  /* Component (reference semantic tokens, never primitives) */
  --button-bg: var(--color-brand);
  --button-text: var(--color-on-brand);
  --button-padding: var(--spacing-2) var(--spacing-4);
  --button-radius: var(--radius-control);
}
```

### Step 3: Dark Mode via Semantic Token Swap
Override semantic tokens under a dark theme. Support both an explicit `data-theme` attribute (user toggle) and the system `prefers-color-scheme` media query (default).

```css
/* System preference — default when no explicit theme is set */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg-primary: var(--color-gray-900);
    --color-text-primary: var(--color-gray-50);
    --color-text-secondary: var(--color-gray-400);
    --color-border: var(--color-gray-700);
  }
}

/* Explicit dark theme (user toggle wins over system) */
:root[data-theme="dark"] {
  --color-bg-primary: var(--color-gray-900);
  --color-text-primary: var(--color-gray-50);
  --color-text-secondary: var(--color-gray-400);
  --color-border: var(--color-gray-700);
  /* Component tokens inherit automatically via --button-bg: var(--color-brand) */
}
```

Components never reference dark-mode values directly. They reference semantic tokens which change under `[data-theme="dark"]` or `prefers-color-scheme`.

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
CVA maps variants to class names. Colors must come from tokens (exposed to Tailwind — see Step 5b), never hardcoded hex values.

```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-on-brand hover:bg-brand-hover',
        secondary: 'bg-surface text-text-primary hover:bg-surface-hover',
        ghost: 'text-text-primary hover:bg-surface',
        danger: 'bg-danger text-on-danger hover:bg-danger-hover',
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

### Step 5b: Bridging CSS Tokens to Tailwind
Tailwind cannot read CSS custom properties directly in class names — map them in `tailwind.config.js` so `bg-brand` resolves to `var(--color-brand)`. This keeps a single source of truth (CSS tokens) while letting CVA/Tailwind classes reference them.

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        brand: 'rgb(var(--color-brand) / <alpha-value>)',
        'on-brand': 'rgb(var(--color-on-brand) / <alpha-value>)',
        'brand-hover': 'rgb(var(--color-brand-hover) / <alpha-value>)',
        surface: 'rgb(var(--color-bg-secondary) / <alpha-value>)',
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        'on-danger': 'rgb(var(--color-on-danger) / <alpha-value>)',
      },
      spacing: {
        1: 'var(--spacing-1)',
        2: 'var(--spacing-2)',
        4: 'var(--spacing-4)',
      },
      borderRadius: {
        md: 'var(--radius-md)',
      },
    },
  },
}
```

> For the `<alpha-value>` syntax to work, store color primitives as space-separated RGB channels, e.g. `--color-brand: 37 99 235;` so Tailwind can apply opacity. If you keep hex values, drop `/ <alpha-value>` and use `var(--color-brand)` directly.

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
Avoid asserting on implementation details like class names (`toContain('bg-blue-600')`). Refactoring styles breaks those tests. Assert on **computed style** or **observable behavior** instead.

```tsx
it('applies the primary background color', () => {
  const { container } = render(<Button variant="primary">Click</Button>);
  const button = container.querySelector('button');
  // Assert on computed style, not class name
  const bg = window.getComputedStyle(button).backgroundColor;
  expect(bg).toBe('rgb(37, 99, 235)'); // --color-brand
});

it('applies disabled state', () => {
  const { container } = render(<Button disabled>Click</Button>);
  expect(container.querySelector('button')).toBeDisabled();
});
```

### Step 9: Style Dictionary Integration
```json
{
  "color": {
    "brand": {
      "500": { "value": "#3b82f6" }
    }
  },
  "spacing": {
    "sm": { "value": "0.5rem" },
    "md": { "value": "1rem" }
  }
}
```
```bash
npx style-dictionary build --config style-dictionary.config.js
# Outputs: css/tokens.css, scss/_tokens.scss, js/tokens.js
```

### Step 10: Accessibility Integration
Every component in the design system must:
- Support keyboard navigation (Tab, Enter, Escape, Arrow keys)
- Have visible focus states (not just outline: none)
- Meet WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large)
- Expose ARIA attributes for screen readers
- Support prefers-reduced-motion

```typescript
// Base focus style mixin for all components — uses token, not hardcoded color
const focusVisible = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const buttonVariants = cva(
  `inline-flex items-center justify-center rounded-md font-medium transition-colors ${focusVisible}`,
  // ...
)
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

### 6. No Loading States
Every data-driven component (Table, Dropdown, Autocomplete) must handle loading, empty, and error states. These should be part of the design system.

### 7. Missing Responsive Variants
Components should support responsive behavior at the container level, not just the page level.

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
- Referencing `var(--color-brand)` has a small cost on first style resolution
- Theme switching via CSS custom properties does NOT trigger a full recalc — only elements using the changed property recompute
- In practice the cost is negligible for typical app sizes; profile before optimizing

### CVA Runtime Cost
CVA is a pure function returning a class string. Its cost is negligible per call. The class string itself is fast because it is CSS — no runtime style computation.

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
`frontend-state-management` for state architecture alongside the design system.
`design-accessibility` for accessible component patterns.
`quality-visual-testing` for component baseline snapshots.
Carry forward: token definitions, component API rules, dark mode strategy.
