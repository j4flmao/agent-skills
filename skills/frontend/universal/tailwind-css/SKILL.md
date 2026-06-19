---
name: frontend-tailwind-css
description: >
  Use this skill when the user says 'tailwind', 'utility css', 'design tokens', 'responsive tailwind', 'tailwind config', 'custom theme'. This skill enforces utility-first CSS principles, design token extraction, responsive breakpoint patterns, and Tailwind config best practices. Applies to any frontend stack.
version: "1.2.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsure: true
tags: [frontend, tailwind-css, phase-3, universal]
---

# Frontend Tailwind CSS

## Purpose
Generate production-ready Tailwind CSS code following utility-first principles with consistent design tokens and responsive patterns. Covers v3 (config-based) and v4 (`@theme`-based) workflows, plugin integration, JIT optimization, and component extraction patterns. Output is deterministic, tree-shakeable, and under 15KB gzipped for typical apps.

## Agent Protocol

### Trigger
Exact phrases: "use tailwind", "tailwind css", "utility classes", "add tailwind", "tailwind config", "custom theme", "design tokens", "responsive tailwind", "tailwind v4", "tailwind plugin", "tailwind dark mode", "tailwind components"

### Input Context
- Check for existing `tailwind.config.*` or `postcss.config.*` files
- Detect version: v3 uses `@tailwind` directives, v4 uses `@import "tailwindcss"`
- Verify whether a custom design system (colors, fonts, spacing) already exists
- Confirm framework (React, Vue, Astro, Next.js, etc.) for framework-specific setup
- Check for existing dark mode strategy (`class` vs `media`)
- Identify plugins already registered (`@tailwindcss/forms`, `@tailwindcss/typography`, etc.)

### Output Artifact
No file output unless requested.

### Response Format
1. Respond with raw Tailwind classes or config snippets first, explain only if asked
2. Use arbitrary values (`[#123]`, `[10px]`) sparingly -- prefer design tokens
3. When generating config, output the complete relevant section, not ellipses
4. For responsive design, always list breakpoints in order: `sm` to `md` to `lg` to `xl` to `2xl`
5. Prefix v4 tokens with `--color-`, `--font-`, `--spacing-` namespacing
6. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Tailwind classes follow utility-first (one class = one CSS property) where practical
- [ ] Design tokens extracted into `tailwind.config.*` or CSS `@theme` directive
- [ ] Responsive variants applied mobile-first (base = mobile, `md:` = tablet, `lg:` = desktop)
- [ ] No unused custom CSS -- Tailwind utility covers the use case
- [ ] Dark mode uses `dark:` variant unless config says otherwise
- [ ] Output has been verified against an existing Tailwind project to confirm no breaking config changes
- [ ] JIT mode properly detects all class sources in `content` paths
- [ ] Third-party plugins (`forms`, `typography`) registered in config if form/article patterns exist

### Max Response Length
100 lines unless generating a full config.

## Component Architecture / Decision Trees

### Build Tool Integration Decision Tree

```
Which framework?
  |-- Vite -->
  |     |-- v4: @tailwindcss/vite plugin
  |     |-- v3: postcss.config.js + tailwindcss + autoprefixer
  |-- Next.js -->
  |     |-- v4: @tailwindcss/postcss
  |     |-- v3: postcss.config.js with tailwindcss
  |-- Angular -->
  |     |-- v4: @tailwindcss/vite (if using Vite) or postcss.config.js
  |     |-- v3: postcss.config.json + angular.json styles
  |-- Remix / Astro / others -->
        |-- postcss.config.js in both v3 and v4
```

### Design Token Architecture Options

**Option A: Tailwind Config Extend (v3)**
Best for: Existing v3 projects, projects with static theme values.
```
theme.extend.colors.brand.500 = #3b82f6
theme.extend.fontFamily.body = ['Inter', 'sans-serif']
```
Pros: Familiar, well-documented, works with IntelliSense. Cons: JS config can become large, no dynamic theming at runtime.

**Option B: CSS @theme Directive (v4)**
Best for: New projects, projects needing runtime CSS custom properties.
```
@theme { --color-brand-500: #3b82f6; --font-body: 'Inter', sans-serif; }
```
Pros: CSS-native, generates `--color-brand-500` as CSS custom property automatically, works with any build tool. Cons: v4 only, less tooling support.

**Option C: Hybrid CSS Custom Properties + Tailwind Config**
Best for: Design systems with runtime theming (light/dark mode).
Define primitives as CSS custom properties, reference them in Tailwind config:
```css
:root { --color-brand: #3b82f6; }
```
```js
theme.extend.colors.brand: 'var(--color-brand)'
```
Pros: Runtime theme switching without rebuild. Cons: Harder to debug, potential for missing fallback values.

### Component Abstraction Patterns

**Pattern 1: @apply + @layer components (v3)**
```css
@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
  }
}
```

**Pattern 2: Component Function (React)**
```tsx
function Button({ variant = 'primary', size = 'md', children }) {
  const classes = cn(
    'inline-flex items-center justify-center rounded-md font-medium transition-colors',
    variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
    variant === 'secondary' && 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    size === 'sm' && 'h-8 px-3 text-sm',
    size === 'md' && 'h-10 px-4 text-base',
    size === 'lg' && 'h-12 px-6 text-lg',
  );
  return <button className={classes}>{children}</button>;
}
```

**Pattern 3: CVA (Class Variance Authority)**
```tsx
import { cva } from 'class-variance-authority';
const button = cva('inline-flex items-center justify-center rounded-md font-medium', {
  variants: {
    variant: { primary: 'bg-blue-600 text-white', secondary: 'bg-gray-100 text-gray-900' },
    size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-base' },
  },
});
```

## Workflow

### Step 1: Detect Environment & Version
Check `tailwind.config.js` / `tailwind.config.ts` / `postcss.config.js`. If v4, expect `@import "tailwindcss"` in CSS. If none exists, ask: "Which framework?" Then scaffold.

| Version | Setup Command | Config File | CSS Entry |
|---------|--------------|-------------|-----------|
| v3      | `npm i -D tailwindcss postcss autoprefixer` | `tailwind.config.js` | `@tailwind base; @tailwind components; @tailwind utilities;` |
| v4      | `npm i -D tailwindcss @tailwindcss/vite` | Inline via `@theme` | `@import "tailwindcss";` |

### Step 2: Configure Content Paths
```js
// tailwind.config.js -- v3
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx,vue,astro,html}', './public/**/*.html'],
  theme: { extend: {} },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
```

### Step 3: Map Design Tokens
Extract brand colors, font families, spacing scale, and breakpoints into `theme.extend` (v3) or `@theme` (v4). Never remove existing tokens. Use semantic naming:

```js
colors: {
  brand: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
  surface: { DEFAULT: '#fff', secondary: '#f9fafb' },
}
```

### Step 4: Write Utility-First Markup
Build layouts with single-purpose classes. Stack with `flex`/`grid`, space with `gap`/`p-*`/`m-*`, size with `w-*`/`h-*`/`size-*`.

```html
<div class="flex flex-col gap-4 p-6 rounded-xl border bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Title</h3>
  <p class="text-sm text-gray-600 dark:text-gray-400">Content</p>
</div>
```

Use `@apply` only in component-scoped files, never in global CSS. Prefer `@layer components` for repeated composites.

### Step 5: Apply Responsive Variants
Start with mobile layout (no prefix). Layer on `sm:`, `md:`, `lg:`, `xl:`, `2xl:` as viewport grows.

```html
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  <!-- cards -->
</div>
```

### Step 6: Integrate Plugins
```bash
npm i -D @tailwindcss/forms @tailwindcss/typography @tailwindcss/container-queries
```
Plugins add utility classes and resets: `forms` normalizes inputs, `typography` adds `.prose`, `container-queries` enables `@sm:`, `@md:`, etc.

### Step 7: Optimize for Production
Confirm `content` paths scan all templates. Use `--minify` flag. Safelist dynamic classes:

```js
safelist: ['bg-red-500', 'bg-green-500', { pattern: /^bg-(red|green)-(100|200|500)$/ }],
```

### Step 8: Validate Output
```bash
npx tailwindcss -i src/input.css -o output.css --minify --verbose
# Check output CSS size (< 50 KB for most apps)
# Verify no missing classes by spot-checking known-used utilities
```

### Step 9: Handle Dark Mode
```js
// tailwind.config.js
export default {
  darkMode: 'class', // or 'media'
}
```
Use `dark:` variants for elements that change in dark mode. With `class` strategy, toggle dark mode by adding `dark` class to `<html>` element.

### Step 10: Manage Custom Plugins
```js
const plugin = require('tailwindcss/plugin');
module.exports = {
  plugins: [
    plugin(function({ addUtilities, addComponents, addBase, matchUtilities, theme }) {
      addUtilities({
        '.scrollbar-thin': { scrollbarWidth: 'thin' },
      });
      matchUtilities({
        'scrollbar': (value) => ({ 'scrollbar-width': value }),
      }, { values: { thin: 'thin', none: 'none' } });
    }),
  ],
};
```

### Step 11: Purge Unused Animations and Keyframes
If using Tailwind's `animate-*` utilities, only the classes you use are generated. For custom keyframes, wrap in `@theme` (v4) or `theme.extend.animation` + `theme.extend.keyframes` (v3).

## Best Practices

| Practice | Why | Example |
|----------|-----|---------|
| Design tokens over arbitrary values | Consistency, theming | `text-brand-500` vs `text-[#3b82f6]` |
| Mobile-first responsive | Simpler base, progressive enhancement | `flex-col lg:flex-row` |
| `dark:` class strategy | JS-controlled, SSR-friendly | `config: { darkMode: 'class' }` |
| `@apply` in components only | Prevents global CSS bloat | `.btn { @apply px-4 py-2 rounded; }` |
| Plugin over custom CSS | Tree-shakeable, maintained | `@tailwindcss/forms` vs custom input styles |
| `size-*` for equal dimensions | Shorthand for w+h | `size-10` = `w-10 h-10` |
| `content` path coverage | No missing classes in prod | Glob all template extensions |
| `cn()` helper for conditional classes | Cleaner JSX | `cn('base', condition && 'extra')` |
| `@layer` for custom utilities | Proper cascade ordering | `@layer utilities { ... }` |

## Common Pitfalls

### 1. String Concatenation in Class Names
```jsx
// BAD -- JIT cannot detect dynamic parts
<div className={`bg-${color}-500`}>

// GOOD -- full class names in mapping
const colorMap = { red: 'bg-red-500', green: 'bg-green-500' };
<div className={colorMap[color]}>
```

### 2. Missing Content Paths for Third-Party Packages
If you use a component library that uses Tailwind classes, its classes will be purged unless you add its source to `content`:
```js
content: ['./node_modules/@my-lib/**/*.js']
```

### 3. Overusing @apply Instead of Component Abstraction
`@apply` generates duplicate CSS if used in multiple places. For reusable patterns, use framework components instead. Reserve `@apply` for cases where you cannot use a component (CMS templates, legacy code).

### 4. Using dark: Variants Without darkMode Config
```js
// This will NOT work:
// tailwind.config.js without darkMode: 'class'
// <div className="dark:bg-gray-800">

// Fix:
export default { darkMode: 'class' };
```

### 5. Forgetting to Restore Default Scale
When you add a custom spacing value, Tailwind's default spacing scale is still available unless you override the entire `spacing` key.
```js
// This REPLACES the default scale -- bad
theme: { spacing: { 4: '1rem', 8: '2rem' } }
// This ADDS to the default scale -- good
theme: { extend: { spacing: { 18: '4.5rem' } } }
```

### 6. Arbitrary Value Overuse
```html
<!-- BAD -- creates inconsistency -->
<div class="text-[#333] p-[13px] gap-[7px]">

<!-- GOOD -- uses design tokens -->
<div class="text-gray-800 p-3 gap-2">
```

Arbitrary values should be reserved for truly one-off cases (e.g., a specific measurement from a design comp that does not match the spacing scale).

### 7. Nested @apply with Responsive Variants
```css
/* BAD -- responsive variants inside @apply */
.btn { @apply text-sm lg:text-base; }
/* The lg: variant won't work inside @apply */
```

## Compared With

| Approach | Bundle Size | Developer Experience | Customization | Runtime Theming |
|----------|-------------|---------------------|---------------|-----------------|
| Tailwind CSS | < 15KB after purge | Excellent with IntelliSense | Config-driven | Possible via CSS vars |
| CSS Modules | Zero runtime | Good with co-located styles | Per-component | Yes |
| Styled Components | ~15KB runtime | Good, JS-based | Runtime dynamic | Native |
| Vanilla CSS | Zero | Manual | Unlimited | Yes |
| Bootstrap | ~30KB (utilities only) | Good, predates Tailwind | Sass variable overrides | Via CSS variables |
| Open Props | ~20KB | Good, design tokens | CSS variable overrides | Yes, via CSS vars |

## Performance Considerations

### Build Time Optimization
- v4 is 2-5x faster than v3 due to Lightning CSS integration
- Use `@tailwindcss/vite` for Vite projects -- it uses esbuild for pre-processing
- Keep `content` paths narrow: `./src/**/*.{jsx,tsx}` instead of `./src/**/*`
- Avoid regex in `safelist` patterns -- they are evaluated per class

### CSS Output Size
- A typical app with 500 unique utility classes: 8-15KB uncompressed, 3-5KB gzipped
- Large apps with 2000+ unique classes: 30-50KB uncompressed, 8-15KB gzipped
- Monitor with `npx tailwindcss -i src/input.css -o /dev/null --dry-run -v`

### Runtime Performance
- Tailwind classes translate to static CSS -- zero runtime performance cost
- Dynamic class computation (clsx, cn) is negligible (< 0.1ms per render)
- CSS custom properties used by Tailwind themes have minimal performance impact

## Ecosystem & Tooling

### IntelliSense
- VS Code: Tailwind CSS IntelliSense extension (autocomplete, hover preview, linting)
- WebStorm: Built-in Tailwind support since 2021.3

### Formatting
- prettier-plugin-tailwindcss -- automatically sorts classes in the recommended order
- Install: `npm i -D prettier prettier-plugin-tailwindcss`
- Add to `prettier.config.js`: `{ plugins: ['prettier-plugin-tailwindcss'] }`

### Build Plugins
- `@tailwindcss/vite` -- Vite plugin for v4 (handles `@import "tailwindcss"`)
- `@tailwindcss/postcss` -- PostCSS plugin for v4
- `@tailwindcss/forms` -- Form reset and style normalization
- `@tailwindcss/typography` -- Prose styling for rich text
- `@tailwindcss/container-queries` -- Container query support (`@sm:`, `@md:`, etc.)

### Design Tool Integration
- Figma to Tailwind: Anima, Tailwind CSS Builder, Figma Tokens
- Storybook: Storybook-addon-tailwind-dark-mode for theme switching

## Rules
- Never use `!important` in CSS -- use Tailwind's `!` prefix instead
- Never write raw CSS when a Tailwind utility exists -- that includes `display: flex` to `flex`
- Always configure `content` paths explicitly; wildcard patterns like `./src/**/*.{js,jsx,ts,tsx}` are preferred
- Prefer v4 `@import "tailwindcss"` syntax for new projects; fall back to `@tailwind` directives only for v3 compatibility
- Never remove or override Tailwind's default spacing/fontSize scales unless the design system explicitly requires it. Use `extend` or `@theme` instead
- Keep `tailwind.config.*` flat -- avoid deeply nested plugin abstractions unless there are 5+ sites sharing the config
- Always output `@theme` tokens with the `--` prefix in v4: `--color-brand-500: #3b82f6`
- Never use `@apply` inside `@media` queries -- use responsive variants instead
- Position container queries (`@sm:`, `@md:`) after viewport breakpoints in class order
- Avoid `@apply` for responsive or dark variants -- use the utility directly on the element
- Never use `@layer` in component library source -- it changes the cascade order

## References

- `references/component-patterns.md` -- Component Patterns Reference
- `references/configuration.md` -- Tailwind Configuration Reference
- `references/design-tokens.md` -- Design Tokens Reference
- `references/performance.md` -- Tailwind CSS Performance Reference
- `references/responsive-patterns.md` -- Responsive Patterns Reference
- `references/utility-first.md` -- Utility-First CSS Reference
- `references/tailwind-design-system.md` -- Tailwind Design System Integration
- `references/tailwind-performance-optimization.md` -- Tailwind Performance & Build Optimization

## Handoff
No artifact produced unless requested.
Next skill: `frontend-storybook` (if component documentation is needed next)
Carry forward: Tailwind theme config tokens (colors, spacing, fonts, breakpoints)

## Implementation Patterns

### Design Token Integration

```typescript
// tailwind.config.ts with design tokens
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        surface: {
          primary: 'var(--color-surface-primary)',
          secondary: 'var(--color-surface-secondary)',
          elevated: 'var(--color-surface-elevated)',
        },
      },
      spacing: {
        '4.5': '1.125rem',
        '18': '4.5rem',
        '68': '17rem',
        '88': '22rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### Responsive Component with Tailwind

```tsx
function DashboardCard({ title, children, className }: Props) {
  return (
    <div className={[
      'rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
      '@container flex flex-col',
      'dark:border-gray-700 dark:bg-gray-800',
      'transition-shadow hover:shadow-md',
      className,
    ].join(' ')}>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
        {children}
      </div>
    </div>
  );
}
```

## Architecture Decision Trees

### Tailwind Strategy

```
What project type?
├── New project with design system
│   └── Tailwind v4 with @theme
│       ├── Design tokens as CSS variables
│       ├── Component patterns for reuse
│       └── @apply only for component libraries
│
├── Existing project migration
│   └── Incremental Tailwind adoption
│       ├── Add alongside existing CSS
│       ├── New components in Tailwind
│       └── Refactor old CSS when touching files
│
└── Design system / component library
    └── Tailwind as base, add @layer components
        ├── Extract common patterns
        ├── Publish as npm package
        └── Document in Storybook
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| @apply for everything | Loses utility-first benefits | Use utilities directly, @apply only for component libs |
| Custom theme without extend | Loses Tailwind defaults | Always use extend or @theme, never replace |
| Missing content paths | Classes removed in production | Explicit content glob patterns |
| Overusing arbitrary values | No consistency, no design system | Define as theme tokens, use arbitrary sparingly |

## Performance Optimization

- **JIT compilation in production**: Tailwind v4 generates only used CSS. Average output 10-50KB gzipped. Enable `@source` for optimizing across multiple entry points.
- **CSS logical properties for RTL**: Use `ps` (padding-inline-start) instead of `pl`. Tailwind v4 supports logical properties natively. Single CSS bundle for both LTR and RTL.
