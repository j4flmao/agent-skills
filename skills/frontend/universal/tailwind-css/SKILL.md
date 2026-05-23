---
name: frontend-tailwind-css
description: >
  Use this skill when the user says 'tailwind', 'utility css', 'design tokens', 'responsive tailwind', 'tailwind config', 'custom theme'. This skill enforces utility-first CSS principles, design token extraction, responsive breakpoint patterns, and Tailwind config best practices. Applies to any frontend stack.
version: "1.0.0"
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
Generate production-ready Tailwind CSS code following utility-first principles with consistent design tokens and responsive patterns. Covers v3 (config-based) and v4 (`@theme`-based) workflows, plugin integration, JIT optimization, and component extraction patterns.

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
2. Use arbitrary values (`[#123]`, `[10px]`) sparingly — prefer design tokens
3. When generating config, output the complete relevant section, not ellipses
4. For responsive design, always list breakpoints in order: `sm` → `md` → `lg` → `xl` → `2xl`
5. Prefix v4 tokens with `--color-`, `--font-`, `--spacing-` namespacing
6. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Tailwind classes follow utility-first (one class = one CSS property) where practical
- [ ] Design tokens extracted into `tailwind.config.*` or CSS `@theme` directive
- [ ] Responsive variants applied mobile-first (base = mobile, `md:` = tablet, `lg:` = desktop)
- [ ] No unused custom CSS — Tailwind utility covers the use case
- [ ] Dark mode uses `dark:` variant unless config says otherwise
- [ ] Output has been verified against an existing Tailwind project to confirm no breaking config changes
- [ ] JIT mode properly detects all class sources in `content` paths
- [ ] Third-party plugins (`forms`, `typography`) registered in config if form/article patterns exist

### Max Response Length
100 lines unless generating a full config.

## Workflow

### Step 1: Detect Environment & Version
Check `tailwind.config.js` / `tailwind.config.ts` / `postcss.config.js`. If v4, expect `@import "tailwindcss"` in CSS. If none exists, ask: "Which framework?" Then scaffold.

| Version | Setup Command | Config File | CSS Entry |
|---------|--------------|-------------|-----------|
| v3      | `npm i -D tailwindcss postcss autoprefixer` | `tailwind.config.js` | `@tailwind base; @tailwind components; @tailwind utilities;` |
| v4      | `npm i -D tailwindcss @tailwindcss/vite` | Inline via `@theme` | `@import "tailwindcss";` |

### Step 2: Configure Content Paths
```js
// tailwind.config.js — v3
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

## Pitfalls to Avoid

- **Class concatenation**: `bg-${color}-500` — JIT can't detect dynamic parts. Use full class names in arrays + `map()`.
- **Inline styles overriding utilities**: `style={{ color: '#333' }}` defeats Tailwind's design system. Use token classes.
- **Custom CSS for layouts**: `display: grid` → `grid`, `display: flex` → `flex`. Tailwind covers 99% of layout needs.
- **Over-nesting in `@apply`**: Don't `@apply` complex responsive/dark variants in one go. Keep each variant as its own class.
- **Ignoring `content` paths**: Missing glob patterns = purged classes in production. Always verify with `--dry-run`.
- **Linear animations**: Use `ease-*` utilities. Never `transition: all` — be specific with `transition-colors`, `transition-transform`.
- **Forgetting `darkMode: 'class'`**: If using class-based dark mode, `dark:` variants won't work without it.

## Rules
- Never use `!important` in CSS — use Tailwind's `!` prefix instead
- Never write raw CSS when a Tailwind utility exists — that includes `display: flex` → `flex`
- Always configure `content` paths explicitly; wildcard patterns like `./src/**/*.{js,jsx,ts,tsx}` are preferred
- Prefer v4 `@import "tailwindcss"` syntax for new projects; fall back to `@tailwind` directives only for v3 compatibility
- Never remove or override Tailwind's default spacing/fontSize scales unless the design system explicitly requires it. Use `extend` or `@theme` instead
- Keep `tailwind.config.*` flat — avoid deeply nested plugin abstractions unless there are 5+ sites sharing the config
- Always output `@theme` tokens with the `--` prefix in v4: `--color-brand-500: #3b82f6`
- Never use `@apply` inside `@media` queries — use responsive variants instead
- Position `container queries` (`@sm:`, `@md:`) after viewport breakpoints in class order

## References
- `references/configuration.md` — Config setup for v3 and v4, tailwind.config, plugins, dark mode
- `references/component-patterns.md` — Component extraction, @apply discipline, composition patterns
- `references/utility-first.md`
- `references/design-tokens.md`
- `references/responsive-patterns.md`
- `references/performance.md`

## Handoff
No artifact produced unless requested.
Next skill: `frontend-storybook` (if component documentation is needed next)
Carry forward: Tailwind theme config tokens (colors, spacing, fonts, breakpoints)

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.
