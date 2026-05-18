# Tailwind CSS Performance Reference

## JIT Engine

Tailwind v3+ uses a Just-In-Time compiler. Only generates classes found in scanned files.

```
Before (v2): entire framework output ~3000+ KB CSS
After (v3+):  only used utilities → often < 10 KB
```

## Content Paths

Must point to all files containing class names.

```js
// tailwind.config.js
export default {
  content: [
    './src/**/*.{js,jsx,ts,tsx,vue,astro,html}',
    './public/**/*.html',
    // Include any third-party libs that use Tailwind classes
    './node_modules/@my-library/**/*.js',
  ],
};
```

Missed file = missing class. Use `--content` flag to debug:

```bash
npx tailwindcss --content './src/**/*.html' --output output.css
```

## Purge Optimization Tips

- Avoid string concatenation in class names: `bg-${color}-500` → JIT cannot detect dynamic parts
- Use full class names in arrays: `const variants = ['primary', 'secondary']` with `map` referencing full classes
- Safelist classes used by dynamic content:

```js
export default {
  safelist: [
    'bg-red-500',
    'bg-green-500',
    'bg-blue-500',
    { pattern: /^bg-(red|green|blue)-(100|200|500)$/ },
  ],
};
```

## CSS Size Budget

| Target | Max CSS size |
|--------|-------------|
| First paint | `< 50 KB` uncompressed |
| Full utility set for large app | `< 100 KB` uncompressed |
| Gzip/Wasm compressed | `< 15 KB` |

## Reducing Build Time

```bash
# Use --minify only in production
npx tailwindcss -i src/input.css -o dist/output.css --minify

# Use parallel builds in CI
TAILWIND_MODE=build
```

## Plugin Performance

```js
// BAD — plugin runs on every class
const badPlugin = plugin(({ addUtilities }) => {
  addUtilities({ /* large set */ });
});

// GOOD — keep plugins small
const goodPlugin = plugin(({ addUtilities, matchUtilities }) => {
  matchUtilities({
    'scrollbar': (value) => ({ 'scrollbar-width': value }),
  }, { values: { thin: 'thin', none: 'none' } });
});
```

## Bundle Analysis

```bash
# Inspect generated CSS
npx tailwindcss -i src/input.css -o output.css --verbose

# Use --dry-run to see which files are scanned
npx tailwindcss --dry-run --content './src/**/*.html'
```

## Class Name Ordering

Prettier plugin auto-sorts classes consistently:

```bash
npm i -D prettier prettier-plugin-tailwindcss
```

Output is deterministic — same CSS tree regardless of markup order, enabling better compression.

## Production Build Checklist

- [ ] `content` paths cover all template/component files
- [ ] No `@apply` in global CSS files
- [ ] `--minify` applied in production build
- [ ] Dynamic class names use safelist or full-class mapping
- [ ] Third-party component libraries scanned in `content`
- [ ] `purge: false` on any `theme.extend` values that JIT cannot detect
- [ ] PostCSS plugin chain optimized (Tailwind runs first)
