# Tailwind Configuration Reference

## Version Detection

| Feature | v3 (config-based) | v4 (`@theme`-based) |
|---------|-------------------|---------------------|
| Config file | `tailwind.config.js` / `.ts` | No config file needed (optional) |
| CSS entry | `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` |
| Theme tokens | `theme.extend.colors` | `@theme { --color-* }` |
| Custom values | `theme.extend.*` + `theme.*` overrides | `@theme { --prefix-* }` |
| Plugins | `plugins: [require(...)]` | `@plugin "..."` or npm package |
| Dark mode | `darkMode: 'class'` | `@variant dark (&:where(.dark, .dark *));` |

## v3 Config Template

```js
// tailwind.config.js
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx,vue,astro,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
        surface: { DEFAULT: '#fff', secondary: '#f9fafb', tertiary: '#f3f4f6' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
      spacing: { 18: '4.5rem', 88: '22rem' },
      boxShadow: { soft: '0 2px 8px rgba(0,0,0,0.06)', glow: '0 0 12px rgba(59,130,246,0.5)' },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography'), require('@tailwindcss/container-queries')],
};
```

## v4 CSS Theme

```css
/* app.css */
@import "tailwindcss";

@theme {
  --color-brand-50: #eff6ff;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-surface: #ffffff;
  --color-surface-secondary: #f9fafb;
  --font-family-sans: "Inter", system-ui, sans-serif;
  --font-family-mono: "JetBrains Mono", monospace;
  --spacing-18: 4.5rem;
  --spacing-88: 22rem;
  --shadow-soft: 0 2px 8px rgba(0,0,0,0.06);
  --radius-4xl: 2rem;
}

@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/typography";

@variant dark (&:where(.dark, .dark *));
```

## Dark Mode Configuration

### Class-based (recommended)
```js
// v3
darkMode: 'class',
```
Toggle via JS: `document.documentElement.classList.toggle('dark')`.

### Media-based (system preference)
```js
darkMode: 'media',
```
Automatic based on OS setting. Less flexible — no manual override possible.

### Usage
```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

## Plugin Integration

| Plugin | Install | Usage |
|--------|---------|-------|
| `@tailwindcss/forms` | `npm i -D` | Normalizes input/select/checkbox styles |
| `@tailwindcss/typography` | `npm i -D` | Adds `.prose` class for rich text |
| `@tailwindcss/container-queries` | `npm i -D` | `@sm:`, `@md:`, `@lg:` container query prefixes |

## Custom Screens (Breakpoints)

```js
screens: {
  xs: '480px',
  tablet: '768px',
  laptop: '1024px',
  desktop: '1280px',
},
```

```css
/* v4 */
@custom-media --xs (min-width: 480px);
@custom-media --tablet (min-width: 768px);
```

## Safelist for Dynamic Classes

```js
safelist: [
  'bg-red-500',
  'bg-green-500',
  'text-red-500',
  { pattern: /^bg-(red|green|blue)-(100|200|500)$/ },
  { pattern: /^text-(gray|slate)-(400|500|600)$/, variants: ['dark'] },
],
```

## PostCSS Config

```js
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

For v4 with Vite, use the dedicated plugin:
```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [tailwindcss()] });
```

## Environment Variables

```bash
NODE_ENV=production npx tailwindcss -i src/input.css -o dist/output.css --minify
TAILWIND_MODE=build  # CI optimization
```

## Config Validation Checklist

- [ ] `content` paths cover all template extensions (html, jsx, tsx, vue, astro)
- [ ] `darkMode` set to `'class'` unless using system preference
- [ ] `theme.extend` used — never replace entire theme unless intentional
- [ ] Required plugins registered: forms (if forms exist), typography (if rich text)
- [ ] Custom fonts included in `fontFamily` with fallback stacks
- [ ] Safelist entries for any dynamically constructed class names
- [ ] PostCSS or Vite plugin configured to process Tailwind
- [ ] Build script includes `--minify` for production
