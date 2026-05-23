# CSS Organization

## Folder Structure

### Standard Structure
```
src/
├── styles/
│   ├── reset.css              /* CSS reset / normalize */
│   ├── variables.css           /* CSS custom properties */
│   ├── typography.css          /* Font imports, heading/body styles */
│   ├── utilities.css           /* Custom utility classes */
│   ├── animations.css          /* @keyframes */
│   └── globals.css             /* html, body, #root styles */
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.module.css   /* Component styles */
│   │   └── Button.test.tsx
│   └── Card/
│       ├── Card.tsx
│       ├── Card.module.css
│       └── Card.test.tsx
└── layouts/
    ├── DashboardLayout.tsx
    └── DashboardLayout.module.css
```

### Tailwind Structure
```
src/
├── styles/
│   ├── globals.css             /* @tailwind base/components/utilities + custom base */
│   └── animations.css          /* Custom @keyframes via @layer utilities */
├── components/                 /* Tailwind classes inline in JSX */
└── ...
```

### CSS-in-JS Structure
```
src/
├── styles/
│   ├── global.ts               /* createGlobalStyle (styled-components) */
│   ├── theme.ts                /* theme object with tokens */
│   └── mixins.ts               /* Shared CSS mixins */
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.styled.ts    /* styled components */
│   │   └── Button.test.tsx
│   └── ...
└── ...
```

## Naming Conventions

### CSS Modules (camelCase)
```css
/* ✅ Good */
.cardTitle {}
.primaryButton {}
.userAvatarLarge {}

/* ❌ Bad */
.card-title {}       /* Not valid JS property access: styles['card-title'] */
.primary_button {}   /* Inconsistent */
```

### Utility Classes (kebab-case)
```
/* ✅ Good */
.flex-center {}
.text-lg {}
.mt-4 {}

/* ❌ Bad */
.flexCenter {}       /* Not consistent with framework conventions */
```

### BEM (if not using CSS Modules)
```css
.block {}               /* Component name */
.block__element {}      /* Child element */
.block--modifier {}     /* Variant */
```

## Global vs Component Styles

### What Goes in Global
- CSS reset / normalize
- CSS custom properties (design tokens)
- Font-face declarations
- HTML/body base styles (background, font-family, line-height)
- Utility classes (`.sr-only`, `.truncate`)
- Animation keyframes
- Transitions / prefers-reduced-motion

### What Goes in Component
- Layout within the component
- Component-specific colors, spacing, typography
- Responsive variants
- State styles (hover, active, focus, disabled)
- Animation application (not keyframes — import from globals)

## CSS Custom Properties (Design Tokens)

```css
:root {
  /* Colors */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #dbeafe;
  --color-secondary: #7c3aed;
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-text: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --color-error: #dc2626;
  --color-success: #16a34a;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Layout */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}

/* Dark Theme Overrides */
[data-theme="dark"] {
  --color-primary: #3b82f6;
  --color-primary-hover: #60a5fa;
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-border: #334155;
}
```

## Layer Organization (Tailwind / PostCSS)

```css
@layer base {
  html { scroll-behavior: smooth; }
  body { -webkit-font-smoothing: antialiased; }
}

@layer components {
  .card { @apply rounded-lg border p-4 shadow-sm; }
  .btn { @apply inline-flex items-center justify-center rounded-md px-4 py-2 font-medium; }
}

@layer utilities {
  .text-balance { text-wrap: balance; }
  .scrollbar-hide { scrollbar-width: none; }
}
```

## Code Review Checklist

- [ ] No `!important` — exceptions require comment
- [ ] No magic values — all spacing/color/sizing via token variables
- [ ] No `px` values — use `rem` for font sizes, `px` only for borders
- [ ] No deep nesting (> 3 levels) in Sass/CSS
- [ ] No global style leakage from component files
- [ ] All `@keyframes` in shared animations file
- [ ] Responsive styles use the project breakpoint tokens
- [ ] `:hover`/`:focus` states declared for all interactive elements
- [ ] Dark mode variant considered for new color values
- [ ] No unused styles — purging or lint configured
