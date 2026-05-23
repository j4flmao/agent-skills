# Breakpoint Systems

## Recommended Breakpoint Values

| Name | Width | Target |
|------|-------|--------|
| `sm` | 640px | Large phones (landscape) |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops / tablets (landscape) |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

## CSS Custom Properties

```css
:root {
  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
  --bp-2xl: 1536px;
}

/* PostCSS + custom-media plugin */
@custom-media --sm (min-width: 640px);
@custom-media --md (min-width: 768px);
@custom-media --lg (min-width: 1024px);
@custom-media --xl (min-width: 1280px);
@custom-media --2xl (min-width: 1536px);

/* Usage */
@media (--md) {
  .sidebar { display: block; }
}
```

## Tailwind Config

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },
}

// Usage: <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

## Mobile-First Pattern

```css
/* Base: mobile */
.layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .layout {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .layout > * { flex: 1 1 50%; }
}

/* Desktop */
@media (min-width: 1024px) {
  .layout > * { flex: 1 1 33.33%; }
}
```

## Desktop-First (avoid — use mobile-first)

```css
/* Don't do this — harder to maintain */
.layout { display: grid; grid-template-columns: 1fr 1fr 1fr; }
@media (max-width: 1023px) { .layout { grid-template-columns: 1fr 1fr; } }
@media (max-width: 767px) { .layout { grid-template-columns: 1fr; } }
```

## Named Breakpoint Map (TypeScript)

```typescript
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof breakpoints

export function useBreakpoint(): Breakpoint | null {
  const [bp, setBp] = useState<Breakpoint | null>(null)

  useEffect(() => {
    const queries = Object.entries(breakpoints).map(([name, width]) => ({
      name,
      query: window.matchMedia(`(min-width: ${width}px)`),
    }))

    function check() {
      const matched = queries.findLast((q) => q.query.matches)
      setBp((matched?.name as Breakpoint) ?? null)
    }

    queries.forEach((q) => q.query.addEventListener('change', check))
    check()
    return () => queries.forEach((q) => q.query.removeEventListener('change', check))
  }, [])

  return bp
}
```

## Container Query Breakpoints

```css
/* Container-relative breakpoints differ from viewport breakpoints */
.card-container {
  container-type: inline-size;
}

@container (min-width: 300px) { /* narrow card */ }
@container (min-width: 500px) { /* medium card */ }
@container (min-width: 700px) { /* wide card */ }
```

## Spacing Scale

```css
:root {
  --space-1: clamp(0.25rem, 0.5vw, 0.5rem);
  --space-2: clamp(0.5rem, 1vw, 0.75rem);
  --space-3: clamp(0.75rem, 1.5vw, 1rem);
  --space-4: clamp(1rem, 2vw, 1.5rem);
  --space-6: clamp(1.5rem, 3vw, 2rem);
  --space-8: clamp(2rem, 4vw, 3rem);
}
```
