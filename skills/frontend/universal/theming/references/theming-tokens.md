# Theming Tokens

## Token Naming Convention

```
Format: {category}-{property}-{modifier}

Categories:
  color    → visual appearance
  space    → margin, padding, gap
  font     → typography
  shadow   → box shadows
  radius   → border radius
  z        → z-index layers
  size     → width, height, max-width

Examples:
  color-bg-primary
  color-text-muted
  space-stack-md
  font-size-body
  font-weight-bold
  shadow-card
  radius-button
  z-modal
  size-container-max
```

## Token Hierarchy

```css
/* Level 1: Primitive tokens (raw values) */
:root {
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-500: #6b7280;
  --gray-900: #111827;
  --blue-500: #3b82f6;
  --blue-600: #2563eb;
  --red-500: #ef4444;
  --green-500: #22c55e;
  --spacing-unit: 4px;
  --font-size-unit: 1rem;
}

/* Level 2: Semantic tokens (meaning-based) */
:root {
  --color-surface: var(--gray-50);
  --color-text: var(--gray-900);
  --color-text-secondary: var(--gray-500);
  --color-border: var(--gray-100);
  --color-primary: var(--blue-600);
  --color-primary-hover: var(--blue-500);
  --color-danger: var(--red-500);
  --color-success: var(--green-500);
  --space-xs: calc(var(--spacing-unit) * 1);
  --space-sm: calc(var(--spacing-unit) * 2);
  --space-md: calc(var(--spacing-unit) * 4);
  --space-lg: calc(var(--spacing-unit) * 8);
}

/* Level 3: Component tokens (scoped) */
:root {
  --button-bg: var(--color-primary);
  --button-text: #ffffff;
  --button-radius: var(--radius-md);
  --button-padding: var(--space-sm) var(--space-md);
  --card-bg: var(--color-surface);
  --card-padding: var(--space-md);
  --card-radius: var(--radius-md);
  --card-shadow: var(--shadow-sm);
}
```

## Token File Organization

```
tokens/
├── index.css                    /* imports all token files */
├── colors.css                   /* primitive color tokens */
├── spacing.css                  /* spacing scale */
├── typography.css               /* font families, sizes, weights */
├── shadows.css                  /* shadow presets */
├── radii.css                    /* border radius scale */
├── z-index.css                  /* z-index layers */
├── breakpoints.css              /* responsive breakpoints */
├── animations.css               /* duration, easing tokens */
├── semantic.css                 /* semantic token mappings */
└── components.css               /* component-scoped tokens */
```

## Token Documentation Format

```typescript
interface Token {
  name: string          // CSS variable name
  value: string         // resolved value
  category: string      // color, spacing, typography, etc.
  description: string   // usage guidance
  example?: string      // visual example or usage code
}

const tokens: Token[] = [
  {
    name: '--color-primary',
    value: '#2563eb',
    category: 'color',
    description: 'Primary interactive elements (buttons, links, active states)',
    example: 'background: var(--color-primary)',
  },
  {
    name: '--space-md',
    value: '16px',
    category: 'spacing',
    description: 'Default padding for cards and sections',
    example: 'padding: var(--space-md)',
  },
]
```

## Token Consumption Rules

```css
/* ✅ Correct: component uses semantic token */
.card {
  background: var(--color-surface);
  color: var(--color-text);
  padding: var(--space-md);
}

/* ❌ Wrong: component uses primitive token directly */
.card {
  background: var(--gray-50);
  color: var(--gray-900);
  padding: 16px;
}

/* ❌ Wrong: hardcoded value */
.card {
  background: #f9fafb;
  color: #111827;
  padding: 16px;
}
```

## Token Audit Checklist

- [ ] No hardcoded colors in CSS (use `rg` to verify)
- [ ] No hardcoded spacing values (4px, 8px, 16px, etc.)
- [ ] All colors referenced from semantic tokens, not primitives
- [ ] Component tokens exist for every interactive component
- [ ] Dark theme overrides only semantic tokens (not primitives)
- [ ] Token names describe purpose, not appearance
- [ ] Token documentation generated and shared with design team
- [ ] Token usage guidelines included in component documentation

## CSS Variable vs Preprocessor Variable

| Feature | CSS Custom Properties | Sass/SCSS Variables |
|---------|----------------------|---------------------|
| Runtime changeable | Yes | No |
| Theme switching | Yes (cascade) | No (compile-time) |
| Browser DevTools | Editable | Not visible |
| Media queries | Yes | No |
| Animatable | Via `transition` | No |
| Computation | `calc()` | Built-in math |
| Dark mode | Native | Requires rebuild |
| Scope | DOM cascade | Lexical scope |

## Tailwind Dark Mode

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',  // or 'media' for system preference
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        surface: 'var(--color-surface)',
      },
    },
  },
}

// Usage
<div className="bg-surface text-text dark:bg-dark-surface dark:text-dark-text">
```

## Token Migration Process

```
1. Audit all hardcoded values in codebase
2. Define primitive tokens first (gray-50, blue-600, etc.)
3. Define semantic tokens referencing primitives
4. Replace hardcoded values → semantic tokens in components
5. Add dark theme overrides for all semantic tokens
6. Remove primitive token direct references (keep only semantic)
7. Generate token documentation from source of truth
```
