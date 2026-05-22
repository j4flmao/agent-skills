# Design Tokens

Naming conventions, CSS variable organization, token categories, and theme definition structure.

---

## Naming Convention

```
<category>-<property>-<variant>-<state>
```

| Segment | Examples | Description |
|---------|----------|-------------|
| category | `color`, `spacing`, `font`, `shadow`, `radius`, `z` | What the token controls |
| property | `surface`, `text`, `border`, `bg`, `size`, `weight` | Which CSS property |
| variant | `primary`, `secondary`, `default`, `muted`, `md`, `lg` | Purpose or scale variant |
| state | `hover`, `active`, `disabled`, `focus` | Interactive state (optional) |

### Examples
```css
--color-surface-primary: #ffffff;
--color-surface-secondary: #f5f5f5;
--color-text-default: #1a1a1a;
--color-text-muted: #6b7280;
--color-border-default: #e5e7eb;
--color-border-focus: #3b82f6;
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--font-size-body: 16px;
--font-size-h1: 32px;
--font-weight-normal: 400;
--font-weight-bold: 600;
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--radius-sm: 4px;
--radius-md: 8px;
```

Never name tokens by appearance (`--color-dark-gray`, `--font-size-16px`). Always name by purpose.

---

## Token Categories

### Colors
| Token | Purpose |
|-------|---------|
| `--color-surface-*` | Background colors for surfaces |
| `--color-text-*` | Text colors |
| `--color-border-*` | Border colors |
| `--color-interactive-*` | Button, link, input colors |
| `--color-brand-*` | Brand colors |
| `--color-status-*` | Success, warning, error, info |

### Spacing (4px grid)
```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-2xl: 48px;
--spacing-3xl: 64px;
```

### Typography
```css
--font-family-sans: 'Inter', system-ui, sans-serif;
--font-family-mono: 'JetBrains Mono', monospace;
--font-size-body: 16px;
--font-size-sm: 14px;
--font-size-lg: 18px;
--font-size-h1: 32px;
--font-size-h2: 24px;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-bold: 600;
--line-height-body: 1.5;
--line-height-heading: 1.2;
```

---

## Theme Definition Structure

```css
/* Light theme (default) */
:root {
  --color-surface-primary: #ffffff;
  --color-surface-secondary: #f9fafb;
  --color-text-default: #111827;
  --color-text-muted: #6b7280;
  --color-border-default: #e5e7eb;
  /* ... */
}

/* Dark theme */
[data-theme="dark"] {
  --color-surface-primary: #1f2937;
  --color-surface-secondary: #111827;
  --color-text-default: #f9fafb;
  --color-text-muted: #9ca3af;
  --color-border-default: #374151;
  /* ... */
}
```

Keep theme definitions in one file. Export as JS object if runtime switching is needed. Use the same variable names across themes — only values change.
