# Tailwind Design System Integration

## Bridging Design Tokens to Tailwind

A design system provides structured token values (colors, spacing, typography, shadows) from a source like Figma Tokens, Style Dictionary, or a design token JSON file. Tailwind consumes these tokens through its configuration. The goal is a single source of truth: tokens are defined once and consumed by both designers and developers.

### Token Mapping Architecture

```
Design Tokens (JSON)
    |
    v
Transform Layer (Style Dictionary / Token Transformer)
    |
    +---> CSS Custom Properties (for runtime theming)
    +---> tailwind.config.* / @theme (for build-time utility classes)
    +---> TypeScript types (for IntelliSense and type safety)
```

### Three approaches ranked by maturity:

**Approach 1: Style Dictionary to Tailwind Config (Recommended for v3)**
```
tokens/color/primary.json -> Style Dictionary -> tailwind.config.js import
```


**Approach 2: CSS @theme with Token References (Recommended for v4)**
```
tokens.json -> CSS file with @theme -> Tailwind reads @theme
```
All tokens are defined as CSS custom properties via `@theme`, giving both Tailwind utilities and runtime access.

**Approach 3: Design Token JSON Direct**
```
tokens.json -> import to tailwind.config.js
```
Simple but no transform layer. Works for small systems.

## Token Structure for Tailwind

### Color Tokens

```json
{
  "color": {
    "brand": {
      "50": { "value": "#eff6ff" },
      "100": { "value": "#dbeafe" },
      "200": { "value": "#bfdbfe" },
      "300": { "value": "#93c5fd" },
      "400": { "value": "#60a5fa" },
      "500": { "value": "#3b82f6" },
      "600": { "value": "#2563eb" },
      "700": { "value": "#1d4ed8" },
      "800": { "value": "#1e40af" },
      "900": { "value": "#1e3a8a" },
      "950": { "value": "#172554" }
    },
    "neutral": {
      "50": { "value": "#fafafa" },
      "100": { "value": "#f5f5f5" },
      "200": { "value": "#e5e5e5" },
      "300": { "value": "#d4d4d4" },
      "400": { "value": "#a3a3a3" },
      "500": { "value": "#737373" },
      "600": { "value": "#525252" },
      "700": { "value": "#404040" },
      "800": { "value": "#262626" },
      "900": { "value": "#171717" },
      "950": { "value": "#0a0a0a" }
    },
    "success": { "500": { "value": "#22c55e" } },
    "warning": { "500": { "value": "#f59e0b" } },
    "error": { "500": { "value": "#ef4444" } },
    "info": { "500": { "value": "#3b82f6" } }
  }
}
```

### Tailwind Config Integration

```js
// tailwind.config.js
const tokens = require('./tokens.json');

function flattenTokens(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    if (obj[key].value) {
      acc[`${prefix}${key}`] = obj[key].value;
    } else {
      Object.assign(acc, flattenTokens(obj[key], `${prefix}${key}-`));
    }
    return acc;
  }, {});
}

export default {
  theme: {
    extend: {
      colors: {
        brand: flattenTokens(tokens.color.brand),
        neutral: flattenTokens(tokens.color.neutral),
        success: flattenTokens(tokens.color.success),
        warning: flattenTokens(tokens.color.warning),
        error: flattenTokens(tokens.color.error),
        info: flattenTokens(tokens.color.info),
      },
    },
  },
};
```

### Typography Tokens

```json
{
  "typography": {
    "fontFamily": {
      "sans": { "value": ["Inter", "system-ui", "sans-serif"] },
      "mono": { "value": ["JetBrains Mono", "monospace"] }
    },
    "fontSize": {
      "xs": { "value": "0.75rem" },
      "sm": { "value": "0.875rem" },
      "base": { "value": "1rem" },
      "lg": { "value": "1.125rem" },
      "xl": { "value": "1.25rem" },
      "2xl": { "value": "1.5rem" },
      "3xl": { "value": "1.875rem" },
      "4xl": { "value": "2.25rem" }
    },
    "fontWeight": {
      "normal": { "value": "400" },
      "medium": { "value": "500" },
      "semibold": { "value": "600" },
      "bold": { "value": "700" }
    },
    "lineHeight": {
      "tight": { "value": "1.15" },
      "normal": { "value": "1.5" },
      "relaxed": { "value": "1.625" }
    }
  }
}
```

### Spacing Tokens

```json
{
  "spacing": {
    "0": { "value": "0px" },
    "0.5": { "value": "0.125rem" },
    "1": { "value": "0.25rem" },
    "1.5": { "value": "0.375rem" },
    "2": { "value": "0.5rem" },
    "2.5": { "value": "0.625rem" },
    "3": { "value": "0.75rem" },
    "3.5": { "value": "0.875rem" },
    "4": { "value": "1rem" },
    "5": { "value": "1.25rem" },
    "6": { "value": "1.5rem" },
    "7": { "value": "1.75rem" },
    "8": { "value": "2rem" },
    "9": { "value": "2.25rem" },
    "10": { "value": "2.5rem" },
    "11": { "value": "2.75rem" },
    "12": { "value": "3rem" },
    "14": { "value": "3.5rem" },
    "16": { "value": "4rem" },
    "20": { "value": "5rem" },
    "24": { "value": "6rem" },
    "28": { "value": "7rem" },
    "32": { "value": "8rem" },
    "36": { "value": "9rem" },
    "40": { "value": "10rem" },
    "44": { "value": "11rem" },
    "48": { "value": "12rem" },
    "52": { "value": "13rem" },
    "56": { "value": "14rem" },
    "60": { "value": "15rem" },
    "64": { "value": "16rem" },
    "72": { "value": "18rem" },
    "80": { "value": "20rem" },
    "96": { "value": "24rem" }
  }
}
```

## Runtime Theming with Tailwind

### CSS Custom Properties Approach

This approach lets you switch themes at runtime without rebuilding CSS.

```css
/* tokens.css */
:root {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --color-brand: #3b82f6;
  --color-brand-hover: #2563eb;
}

[data-theme="dark"] {
  --color-bg-primary: #111827;
  --color-bg-secondary: #1f2937;
  --color-text-primary: #f9fafb;
  --color-text-secondary: #9ca3af;
  --color-border: #374151;
  --color-brand: #60a5fa;
  --color-brand-hover: #93c5fd;
}
```

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'border': 'var(--color-border)',
        'brand': 'var(--color-brand)',
        'brand-hover': 'var(--color-brand-hover)',
      },
    },
  },
};
```

Usage in markup:
```html
<div class="bg-bg-primary text-text-primary border border-border">
  <button class="bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded">
    Themed button
  </button>
</div>
```

### Tailwind v4 @theme Approach

```css
/* app.css */
@import "tailwindcss";

@theme {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --color-brand: #3b82f6;
  --color-brand-hover: #2563eb;
}

@layer base {
  :root {
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #f9fafb;
    --color-text-primary: #111827;
    --color-text-secondary: #6b7280;
    --color-border: #e5e7eb;
    --color-brand: #3b82f6;
  }

  [data-theme="dark"] {
    --color-bg-primary: #111827;
    --color-bg-secondary: #1f2937;
    --color-text-primary: #f9fafb;
    --color-text-secondary: #9ca3af;
    --color-border: #374151;
    --color-brand: #60a5fa;
  }
}
```

In v4, `@theme` auto-generates both Tailwind utility classes and CSS custom properties from the same definition.

## Semantic Color Naming Convention

### Role-Based Palette

Instead of naming colors by their visual appearance (blue-500, gray-100), use semantic names that describe the purpose:

| Token Name | Light Theme | Dark Theme | Used For |
|-----------|-------------|------------|----------|
| `bg-primary` | #ffffff | #111827 | Main page background |
| `bg-secondary` | #f9fafb | #1f2937 | Card, sidebar, elevated surfaces |
| `bg-tertiary` | #f3f4f6 | #374151 | Hover states, input backgrounds |
| `bg-inverse` | #111827 | #ffffff | Dark text on light, inverse badges |
| `text-primary` | #111827 | #f9fafb | Headings, body text |
| `text-secondary` | #6b7280 | #9ca3af | Labels, captions, metadata |
| `text-tertiary` | #9ca3af | #6b7280 | Placeholder, disabled text |
| `text-inverse` | #ffffff | #111827 | Text on brand backgrounds |
| `border-default` | #e5e7eb | #374151 | Standard borders, dividers |
| `border-hover` | #d1d5db | #4b5563 | Border on hover state |
| `border-inverse` | #374151 | #e5e7eb | Border on dark surfaces |

### Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `status-success` | #22c55e | Success messages, positive metrics, completed status |
| `status-warning` | #f59e0b | Warning messages, pending status, caution |
| `status-error` | #ef4444 | Error messages, destructive actions, failed status |
| `status-info` | #3b82f6 | Information banners, help text, neutral updates |

## Component Design with Tailwind

### Button Component with Full Variant Coverage

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-text-inverse hover:bg-brand-hover focus:ring-brand shadow-sm',
        secondary: 'bg-bg-secondary text-text-primary hover:bg-bg-tertiary focus:ring-border border border-border',
        outline: 'border-2 border-brand text-brand hover:bg-brand hover:text-text-inverse focus:ring-brand',
        ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary focus:ring-border',
        danger: 'bg-status-error text-white hover:bg-red-700 focus:ring-status-error shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

interface ButtonProps extends VariantProps<typeof button> {
  children: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

function Button({ variant, size, children, className, loading, ...props }: ButtonProps) {
  return (
    <button className={button({ variant, size, className })} disabled={loading} {...props}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
```

### Card Component

```tsx
const card = cva('rounded-xl border border-border bg-bg-primary shadow-sm', {
  variants: {
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
    hover: {
      true: 'transition-shadow hover:shadow-md cursor-pointer',
      false: '',
    },
  },
  defaultVariants: { padding: 'md', hover: false },
});

function Card({ padding, hover, className, children }) {
  return <div className={card({ padding, hover, className })}>{children}</div>;
}
```

### Input Component

```tsx
const inputWrapper = cva('group relative', {
  variants: {
    size: {
      sm: 'h-8',
      md: 'h-10',
      lg: 'h-12',
    },
    hasError: {
      true: '',
      false: '',
    },
  },
});

const input = cva(
  'w-full rounded-lg border bg-bg-primary px-3 text-text-primary transition-colors placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-8 text-sm',
        md: 'h-10 text-base',
        lg: 'h-12 text-lg',
      },
      hasError: {
        true: 'border-status-error focus:ring-status-error',
        false: 'border-border focus:border-brand focus:ring-brand',
      },
    },
    defaultVariants: { size: 'md', hasError: false },
  },
);
```

## Responsive Design Patterns

### Container Queries with Tailwind

Using `@tailwindcss/container-queries` plugin:

```html
<div class="@container">
  <div class="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 gap-4">
    <!-- Cards adapt to container width, not viewport -->
  </div>
</div>
```

Container queries enable truly reusable components that adapt to their parent, not the viewport. Ideal for dashboard widgets, sidebars, and embedded components.

### Responsive Typography Scale

```css
/* Global responsive type scale */
@theme {
  --text-h1: clamp(1.75rem, 4vw, 2.5rem);
  --text-h2: clamp(1.5rem, 3vw, 2rem);
  --text-h3: clamp(1.25rem, 2vw, 1.5rem);
  --text-body: clamp(0.875rem, 1.5vw, 1rem);
}
```

Usage:
```html
<h1 class="text-h1 font-bold text-text-primary">Responsive Heading</h1>
<p class="text-body text-text-secondary">Fluid body text.</p>
```

## Tailwind + CSS Modules

For projects using CSS Modules, reference Tailwind's `@apply` in module files:

```css
/* Button.module.css */
.root {
  @apply inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50;
}

.primary {
  @apply bg-brand text-white hover:bg-brand-hover;
}

.secondary {
  @apply bg-bg-secondary text-text-primary border border-border hover:bg-bg-tertiary;
}

.sizeSm {
  @apply h-8 px-3 text-xs;
}
.sizeMd {
  @apply h-10 px-4 text-sm;
}
.sizeLg {
  @apply h-12 px-6 text-base;
}
```

This pattern gives you:
- CSS Module scoping (class hashing)
- Tailwind utility convenience
- No runtime class composition
- Full IntelliSense support

## Typography Plugin Deep Integration

### Customizing Prose for Brand

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.text.secondary'),
            '--tw-prose-headings': theme('colors.text.primary'),
            '--tw-prose-links': theme('colors.brand'),
            '--tw-prose-code': theme('colors.text.primary'),
            '--tw-prose-quotes': theme('colors.text.primary'),
            maxWidth: '72ch',
            h2: {
              marginTop: '2em',
              marginBottom: '0.5em',
            },
            a: {
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              '&:hover': {
                color: theme('colors.brand.hover'),
              },
            },
          },
        },
        dark: {
          css: {
            '--tw-prose-body': theme('colors.text.secondary'),
            '--tw-prose-headings': theme('colors.text.primary'),
          },
        },
      }),
    },
  },
};
```

## Accessibility and Tailwind

### Focus Ring Pattern

Always use Tailwind's focus ring utilities:

```html
<button class="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
  Accessible Button
</button>
```

Create a utility class for consistent focus rings:
```css
@layer utilities {
  .focus-ring {
    @apply focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2;
  }
}
```

### Reduced Motion

```html
<div class="transition-transform duration-300 motion-reduce:transition-none motion-reduce:transform-none">
```

Tailwind's `motion-reduce:` and `motion-safe:` variants map to `prefers-reduced-motion`.

## Tailwind Plugin Development Pattern

### Creating a Reusable Plugin

```js
// tailwindcss-skeleton.js
const plugin = require('tailwindcss/plugin');

module.exports = plugin(function({ addUtilities, matchUtilities, theme }) {
  // Static utilities
  addUtilities({
    '.skeleton': {
      background: 'linear-gradient(90deg, var(--color-bg-secondary) 25%, var(--color-bg-tertiary) 50%, var(--color-bg-secondary) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
    },
    '.skeleton-text': {
      height: '0.75em',
      borderRadius: theme('borderRadius.DEFAULT'),
      background: 'var(--color-bg-secondary)',
    },
  });

  // Dynamic utilities
  matchUtilities({
    'skeleton-w': (value) => ({
      width: value,
      height: '0.75em',
      borderRadius: theme('borderRadius.DEFAULT'),
      background: 'var(--color-bg-secondary)',
    }),
  }, { values: theme('width') });
}, {
  // Add keyframes
  theme: {
    extend: {
      keyframes: {
        'skeleton-shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
});
```

## Testing Tailwind in a Design System

### Visual Regression Tests

```tsx
// Button.visual.test.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from './Button';

test('Button renders all variants', async ({ mount }) => {
  const component = await mount(
    <div className="flex flex-col gap-4 p-8">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  );

  await expect(component).toHaveScreenshot('button-variants.png');
});
```

### Class Output Tests

```tsx
test('Button has correct base classes', () => {
  const { container } = render(<Button>Click</Button>);
  const button = container.querySelector('button');
  expect(button.className).toContain('inline-flex');
  expect(button.className).toContain('items-center');
  expect(button.className).toContain('rounded-lg');
  expect(button.className).toContain('transition-all');
});
```

## Design Token Migration Guide

### Step-by-step from Hardcoded to Tokens

1. Audit all hardcoded values: grep for `#`, `rgb`, `px`, `rem`, `em` in CSS files
2. Extract to design token JSON: categorize by color, spacing, typography
3. Create Style Dictionary config: define transforms and formats
4. Generate Tailwind config: import token JSON into `theme.extend`
5. Replace inline values: migrate `text-[#333]` to `text-text-primary`
6. Remove custom CSS: replace `@apply` or custom properties with Tailwind utilities
7. Verify no visual changes: run visual regression tests
8. Document the token system: update Storybook with token documentation

## File Organization

```
design-system/
  tokens/
    color.json
    typography.json
    spacing.json
    elevation.json
    motion.json
  plugins/
    tailwindcss-skeleton.js
    tailwindcss-motion.js
  components/
    Button/
      Button.tsx
      Button.stories.tsx
      Button.test.tsx
    Card/
      Card.tsx
      Card.stories.tsx
  tailwind.config.js
  postcss.config.js
```
