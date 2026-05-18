# Responsive Patterns Reference

## Default Breakpoints

| Prefix | Min-width | Target                |
|--------|-----------|-----------------------|
| (none) | 0         | Mobile (base)         |
| `sm:`  | 640px     | Large phone           |
| `md:`  | 768px     | Tablet                |
| `lg:`  | 1024px    | Small laptop/tablet landscape |
| `xl:`  | 1280px    | Desktop               |
| `2xl:` | 1536px    | Large desktop         |

## Mobile-First Rule

Write base styles for mobile, then override upward.

```html
<!-- BAD — desktop-first -->
<div class="lg:flex-col flex-row">

<!-- GOOD — mobile-first -->
<div class="flex-col lg:flex-row">
```

## Layout Patterns

### Stack → Row at Tablet

```html
<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <div class="flex-1">Content</div>
  <div>Actions</div>
</div>
```

### Grid Columns by Breakpoint

```html
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  <div v-for="item in items" :key="item.id">Card</div>
</div>
```

### Sidebar Layout

```html
<div class="flex flex-col lg:flex-row">
  <aside class="w-full lg:w-64 lg:shrink-0">Sidebar</aside>
  <main class="min-w-0 flex-1">Main</main>
</div>
```

## Responsive Typography

```html
<h1 class="text-2xl font-bold sm:text-3xl md:text-4xl lg:text-5xl">
  Responsive Heading
</h1>
<p class="text-sm sm:text-base md:text-lg">
  Body text scales with viewport.
</p>
```

## Responsive Spacing

```html
<section class="p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16">
  <div class="space-y-4 md:space-y-6">
```

## Responsive Hiding

```html
<!-- Hide on mobile, show on desktop -->
<div class="hidden lg:block">Desktop only</div>

<!-- Show on mobile, hide on desktop -->
<div class="block lg:hidden">Mobile only</div>

<!-- Responsive table -->
<div class="overflow-x-auto">
  <table class="min-w-full">
    <thead class="hidden md:table-header-group">
```

## Container Queries (Tailwind v3.5+)

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      container: { center: true, padding: '1rem' },
    },
  },
};
```

```html
<!-- Built-in container -->
<div class="container mx-auto px-4">
  <!-- max-width auto-adjusts at each breakpoint -->
</div>
```

## Custom Breakpoints

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      screens: {
        xs: '480px',
        tablet: '768px',
        laptop: '1024px',
        desktop: '1280px',
      },
    },
  },
};
```

```css
/* Tailwind v4 */
@custom-media --xs (min-width: 480px);
@custom-media --tablet (min-width: 768px);
@custom-media --laptop (min-width: 1024px);
```

## Testing Checklist

- [ ] Layout works at 320px width (small mobile)
- [ ] No horizontal scroll at any breakpoint
- [ ] Touch targets at least 44x44px on mobile (`min-h-11 min-w-11`)
- [ ] Text does not overflow or clip at any breakpoint
- [ ] Navigation collapses to hamburger/menu icon on mobile
- [ ] Tables use horizontal scroll or responsive card layout on mobile
- [ ] Images use `max-w-full` to prevent overflow
