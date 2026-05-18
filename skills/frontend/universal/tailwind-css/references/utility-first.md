# Utility-First CSS Reference

## Core Principle

Single-purpose classes, each maps to one CSS property. Avoid custom CSS.

```html
<!-- BAD — custom CSS -->
<div class="card">
<style>.card { display: flex; padding: 1rem; border-radius: 0.5rem; }</style>

<!-- GOOD — utility classes -->
<div class="flex p-4 rounded-lg">
```

## Common Utility Map

| Category        | Utilities                                           |
|-----------------|-----------------------------------------------------|
| Layout          | `flex`, `grid`, `block`, `hidden`, `inline-flex`    |
| Flex/Grid       | `flex-1`, `gap-*`, `justify-*`, `items-*`           |
| Spacing         | `p-*`, `m-*`, `px-*`, `py-*`, `space-x-*`, `space-y-*` |
| Sizing          | `w-*`, `h-*`, `max-w-*`, `min-h-*`, `size-*`       |
| Typography      | `text-*`, `font-*`, `leading-*`, `tracking-*`       |
| Background      | `bg-*`, `bg-gradient-to-*`, `from-*`, `to-*`        |
| Border          | `border`, `border-*`, `rounded-*`, `divide-*`       |
| Effects         | `shadow-*`, `opacity-*`, `blur-*`, `brightness-*`   |
| Transitions     | `transition`, `duration-*`, `ease-*`, `delay-*`     |
| Interactivity   | `cursor-*`, `select-*`, `pointer-events-*`          |

## `@apply` Discipline

Use `@apply` only in component-scoped files. Never in global CSS.

```css
/* components/button.css — acceptable */
.btn-primary {
  @apply inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500;
}
```

```css
/* global.css — never use @apply here */
```

## Arbitrary Values

Use sparingly. Prefer design tokens.

```html
<!-- Arbitrary — OK for one-off overrides -->
<div class="w-[calc(100%-2rem)] top-[37px] text-[#123456]">

<!-- Token — better -->
<div class="w-full md:w-3/4 top-10 text-primary">
```

## Dark Mode

Use `dark:` variant consistently.

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

## State Variants Order

`hover:` → `focus:` → `active:` → `disabled:` → `group-hover:` → `peer-checked:`

```html
<button class="bg-blue-600 hover:bg-blue-700 focus:ring-2 active:bg-blue-800 disabled:opacity-50">
```

## Composition Patterns

```html
<!-- Card -->
<div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Title</h3>
  <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Content</p>
</div>

<!-- Input -->
<input class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50" />

<!-- Button variants -->
<button class="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
  /* primary */   bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500
  /* secondary */ bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500
  /* ghost */     bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500
  /* danger */    bg-red-600 text-white hover:bg-red-700 focus:ring-red-500">
```
