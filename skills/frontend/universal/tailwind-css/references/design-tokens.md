# Design Tokens Reference

## Token Location Decision

| Token Type | Tailwind v3 | Tailwind v4 |
|---|---|---|
| Colors       | `theme.extend.colors`   | `@theme { --color-* }`  |
| Fonts        | `theme.extend.fontFamily` | `@theme { --font-* }` |
| Spacing      | `theme.extend.spacing`  | `@theme { --spacing-* }` |
| Breakpoints  | `theme.extend.screens`  | Custom media queries |
| Shadows      | `theme.extend.boxShadow` | `@theme { --shadow-* }` |
| Border radius| `theme.extend.borderRadius` | `@theme { --radius-* }` |

## Tailwind v3 Config

```js
// tailwind.config.js
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx,vue,astro}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe',
          300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6',
          600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af',
          900: '#1e3a8a', 950: '#172554',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f9fafb',
          tertiary: '#f3f4f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0,0,0,0.06)',
        'glow': '0 0 12px rgba(59,130,246,0.5)',
      },
    },
  },
};
```

## Tailwind v4 CSS Theme

```css
/* app.css — Tailwind v4 */
@import "tailwindcss";

@theme {
  --color-brand-50: #eff6ff;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-surface: #ffffff;
  --color-surface-secondary: #f9fafb;

  --font-family-sans: "Inter", system-ui, sans-serif;
  --font-family-mono: "JetBrains Mono", Fira Code, monospace;

  --spacing-18: 4.5rem;
  --spacing-88: 22rem;

  --shadow-soft: 0 2px 8px rgba(0,0,0,0.06);
  --shadow-glow: 0 0 12px rgba(59,130,246,0.5);
}
```

## CSS Variable Output

Tailwind generates CSS variables automatically:

```css
:root {
  --color-brand-500: #3b82f6;
  --font-family-sans: "Inter", system-ui, sans-serif;
}
```

Use in JavaScript for dynamic styling:

```js
getComputedStyle(document.documentElement).getPropertyValue('--color-brand-500')
```

## Naming Conventions

| Token Pattern        | Example              |
|----------------------|----------------------|
| `--color-{name}-{n}` | `--color-blue-500`   |
| `--font-{name}`      | `--font-sans`        |
| `--spacing-{n}`      | `--spacing-4`        |
| `--radius-{name}`    | `--radius-lg`        |
| `--shadow-{name}`    | `--shadow-md`        |
| `--ease-{name}`      | `--ease-in-out`      |
| `--animate-{name}`   | `--animate-spin`     |

## Removing Default Tokens

```js
// tailwind.config.js — replace entire scale
export default {
  theme: {
    colors: { /* only your colors */ },
    spacing: { /* only your spacing */ },
  },
};
```

```css
/* tailwind v4 — opt out of default theme */
@import "tailwindcss" prefix(tw);
@theme { /* only your tokens  — defaults still available via tw- prefix */ }
```

## Token Audit Checklist

- [ ] Brand colors mapped to `--color-*` tokens (not ad-hoc hex values in markup)
- [ ] Type scale uses text-* utilities (not arbitrary font-size values)
- [ ] Spacing uses the 4px base scale (p-1 = 4px, p-2 = 8px, etc.)
- [ ] No hardcoded colors in `:hover:`, `:focus:` state variants — use tokens
- [ ] `fontFamily` configured for both sans and mono stacks
- [ ] Breakpoints defined if custom (default Tailwind breakpoints suffice for most projects)
