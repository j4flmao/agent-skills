# CSS Custom Properties

## Design Token System

```css
:root {
  /* Colors */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-full: 9999px;
}

/* Theming with data attributes */
[data-theme="dark"] {
  --color-primary-50: #172554;
  --color-primary-100: #1e3a8a;
  --color-primary-200: #1e40af;
  --color-primary-300: #1d4ed8;
  --color-primary-400: #2563eb;
  --color-primary-500: #3b82f6;
  --color-primary-600: #60a5fa;
  --color-primary-700: #93c5fd;
  --color-primary-800: #bfdbfe;
  --color-primary-900: #dbeafe;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.4);
}
```

## Dynamic Updates

```typescript
function updateCSSVariable(name: string, value: string): void {
  document.documentElement.style.setProperty(name, value)
}

function getCSSVariable(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

function setThemeColors(primary: string, secondary: string): void {
  updateCSSVariable('--color-primary-500', primary)
  updateCSSVariable('--color-secondary-500', secondary)
}

function useResponsiveFontSize(base: number, scale: number): void {
  const width = window.innerWidth
  const size = width < 768 ? base : base + (width - 768) / 768 * scale
  updateCSSVariable('--font-size-base', `${size}rem`)
}
```

## Component-Level Variables

```css
.card {
  --card-padding: var(--space-4);
  --card-radius: var(--radius-lg);
  --card-bg: var(--color-surface);

  padding: var(--card-padding);
  border-radius: var(--card-radius);
  background: var(--card-bg);
}

.card--compact {
  --card-padding: var(--space-2);
  --card-radius: var(--radius-md);
}

.card--elevated {
  --card-bg: var(--color-surface-elevated);
  box-shadow: var(--shadow-md);
}

.card__title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.card__description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
```

## Key Points

- Define design tokens as custom properties at :root level
- Use data attributes for theme switching
- Scope component variables for encapsulation
- Combine with calc() for responsive calculations
- Provide fallback values for unsupported browsers
- Use semantic naming for better maintainability
- Override variables at component level for variants
- Avoid runtime manipulation of frequently changing values
- Document variable usage in design system
- Test contrast ratios when theming colors
- Use @property for type-safe custom properties
- Group related variables in comment sections
