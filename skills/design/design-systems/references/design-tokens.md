# Design Tokens

## Token Categories

| Category | Sub-categories | Example |
|----------|----------------|---------|
| color | primary, neutral, semantic (success, warning, error, info), gradient, surface, text, border, state (hover, active, disabled) | `color-primary-500` |
| typography | family, size, weight, lineHeight, letterSpacing, paragraph | `typography-size-lg` |
| spacing | xs, sm, md, lg, xl, 2xl, 3xl, 4xl (4px base) | `spacing-md` = 16px |
| elevation | shadow levels 1–5, blur, spread, y-offset, color | `elevation-card` |
| motion | duration (fast, normal, slow), easing (in, out, in-out), transition | `motion-duration-normal` |
| border | radius (none, sm, md, lg, full), width, style | `border-radius-md` |
| opacity | disabled, overlay, muted | `opacity-disabled` = 0.38 |

## Naming Convention

`{category}-{concept}-{variant}`

```
color-primary-500
color-neutral-100
typography-size-xl
spacing-lg
elevation-modal
motion-duration-fast
border-radius-full
```

Semantic names only — never literal colors (`color-brand-blue` is wrong, `color-primary` is correct).

## Token Values (CSS Custom Properties)

```css
:root {
  --color-primary-500: #6366f1;
  --color-primary-600: #4f46e5;
  --color-neutral-100: #f5f5f5;
  --color-neutral-900: #171717;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --typography-size-sm: 0.875rem;
  --typography-size-base: 1rem;
  --typography-size-lg: 1.125rem;
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --elevation-1: 0 1px 3px rgba(0,0,0,0.12);
  --motion-duration-fast: 150ms;
  --border-radius-md: 0.5rem;
}
```

## Style Dictionary Configuration

```
tokens/
  color/
    primary.json
    neutral.json
    semantic.json
  typography/
    scale.json
    weights.json
  spacing/
    scale.json
  elevation/
    levels.json
  motion/
    durations.json
    easings.json
```

Platform transforms:
- CSS: px → rem, camelCase → kebab-case, `type` → CSS value
- JS: px → number, kebab-case → camelCase, `type` → string
- iOS: px → CGFloat, kebab-case → camelCase
- Android: px → dp, kebab-case → snake_case

## Platform Output

```css
/* CSS output */
:root { --color-primary-500: #6366f1; }
```

```typescript
// JS output
export const colorPrimary500 = "#6366f1";
```

```swift
// iOS output
let colorPrimary500 = UIColor(red: 0.388, green: 0.4, blue: 0.945, alpha: 1.0)
```

```xml
<!-- Android output -->
<color name="color_primary_500">#FF6366F1</color>
```
