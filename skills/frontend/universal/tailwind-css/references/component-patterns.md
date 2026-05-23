# Component Patterns Reference

## `@apply` Discipline

Use `@apply` only in component-scoped CSS files. Never in global CSS.

```css
/* components/button.css — acceptable */
@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
           bg-blue-600 text-white transition-colors
           hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
           disabled:opacity-50 disabled:cursor-not-allowed;
  }
}
```

## Component Extraction Strategies

### 1. Repeated utility patterns → extracted class
When the same 5+ utility classes repeat across 3+ locations, extract:

```html
<!-- BEFORE -->
<button class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">Save</button>
<button class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">Submit</button>

<!-- AFTER: framework component -->
<Button variant="primary">Save</Button>
<Button variant="primary">Submit</Button>
```

### 2. Tailwind v3 `@layer components`
```css
@layer components {
  .card {
    @apply rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800;
  }
  .card-title {
    @apply text-lg font-semibold text-gray-900 dark:text-gray-100;
  }
  .card-body {
    @apply mt-2 text-sm text-gray-600 dark:text-gray-400;
  }
}
```

### 3. Framework components (preferred for complex composites)
```tsx
// React — Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
}
```

## Common Component Patterns

### Card
```html
<div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Title</h3>
  <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Content</p>
</div>
```

### Form Input
```html
<label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
  Email
  <input type="email" class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm
    placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
    disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-800" placeholder="you@example.com" />
</label>
```

### Navigation
```html
<nav class="flex items-center gap-1">
  <a href="#" class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900">Home</a>
  <a href="#" class="rounded-md px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50">Active</a>
</nav>
```

### Modal / Dialog
```html
<div class="fixed inset-0 z-50 flex items-center justify-center">
  <div class="fixed inset-0 bg-black/50" />
  <div class="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
    <h2 class="text-lg font-semibold">Modal Title</h2>
    <p class="mt-2 text-sm text-gray-600">Modal content</p>
    <div class="mt-6 flex justify-end gap-3">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

## Inline vs Extracted Decision Table

| Scenario | Approach |
|----------|----------|
| 1-3 utility classes, used once | Inline |
| 4-9 utility classes, used 2-3x | Inline (duplication acceptable) |
| 5+ utilities, used 4+ times | Extract to component or `@layer` |
| Composite pattern (card, input, button) | Framework component |
| Responsive variant combinations | Framework component (keeps variants centralized) |

## State Variant Ordering Convention

```
hover: → focus: → active: → disabled: → group-hover: → peer-checked:
dark: → responsive → hover/focus/active → motion:reduce →
```

```html
<button class="bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 active:bg-blue-800 disabled:opacity-50
  dark:bg-blue-500 dark:hover:bg-blue-600 lg:w-auto w-full">
```
