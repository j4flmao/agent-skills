# Tailwind CSS Error Handling: Troubleshooting Builds and Styling Error States

Two kinds of "errors" matter in Tailwind projects: build and class-generation problems (styles missing, conflicts, migration breakage), and the UI's own error states (invalid inputs, error messages, failed loads). This reference covers both for Tailwind v4 (CSS-first configuration) with v3 notes. Configuration details are in `configuration.md`; tokens in `design-tokens.md`.

## Part 1: Troubleshooting Missing or Wrong Styles

### Classes not generated

Tailwind generates CSS only for class names it finds as complete strings in scanned source files.

```tsx
// Broken: Tailwind never sees "bg-red-500" or "bg-green-500"
<div className={`bg-${status === 'error' ? 'red' : 'green'}-500`} />

// Works: full class names present in source
const statusClasses = { error: 'bg-red-500', ok: 'bg-green-500' } as const;
<div className={statusClasses[status]} />
```

| Cause | Fix |
|-------|-----|
| Dynamically concatenated class names | Map to complete class strings |
| Files outside detected sources (v4) | Add `@source "../packages/ui/src";` in the CSS entry |
| `content` globs missing paths (v3) | Add paths in `tailwind.config.js` `content` |
| Classes coming from CMS/database at runtime | Safelist them (`@source inline("...")` in v4.1+, `safelist` in v3) or map CMS values to known classes |
| Class used only in a dependency in `node_modules` | Explicitly `@source` that package (ignored by default) |

### v4 setup errors

```css
/* app.css (v4) */
@import "tailwindcss";
@source "../../packages/ui/src";

@theme {
  --color-danger-500: oklch(0.63 0.22 25);
  --font-sans: "Inter", system-ui, sans-serif;
}
```

| Symptom | Likely cause |
|---------|-------------|
| `@tailwind base` directives produce errors or nothing | v3 syntax in a v4 project; replace with `@import "tailwindcss";` |
| PostCSS error "trying to use tailwindcss directly as a PostCSS plugin" | In v4 the PostCSS plugin is `@tailwindcss/postcss`; with Vite prefer `@tailwindcss/vite` |
| Custom colors from `tailwind.config.js` missing | v4 does not auto-load JS config; add `@config "../tailwind.config.js";` or migrate to `@theme` |
| Plugin not applied | Load with `@plugin "@tailwindcss/typography";` |
| Styles broken in older browsers | v4 targets modern browsers (Safari 16.4+, Chrome 111+, Firefox 128+); stay on v3.4 if you must support older ones |

Run the official upgrade tool for v3 → v4 migrations and review its diff: `npx @tailwindcss/upgrade`.

### Renamed or changed utilities after upgrading to v4

| v3 | v4 |
|----|----|
| `shadow-sm` / `shadow` | `shadow-xs` / `shadow-sm` |
| `rounded-sm` / `rounded` | `rounded-xs` / `rounded-sm` |
| `blur-sm` / `blur` | `blur-xs` / `blur-sm` |
| `outline-none` | `outline-hidden` (`outline-none` now sets `outline-style: none`) |
| `ring` (3px default) | `ring-3` (`ring` is now 1px) |
| `bg-opacity-50`, `text-opacity-*` | Opacity modifiers: `bg-black/50` |
| `flex-shrink-0`, `flex-grow` | `shrink-0`, `grow` |
| Default border color `gray-200` | `currentColor`; specify a color (`border-gray-200`) |
| `!font-bold` (important prefix) | `font-bold!` (suffix; prefix still accepted for compatibility) |

Visual regressions after upgrade usually come from these defaults; run visual regression tests across key pages.

### Class conflicts

Two conflicting utilities on one element (`p-2 p-4`) resolve by CSS order in the generated stylesheet, not by order in the `class` attribute. When composing props with defaults, merge deterministically:

```ts
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

<button className={cn('px-4 py-2 bg-blue-600', className)} />   // caller's bg-red-600 wins
```

Use a `tailwind-merge` major version that matches your Tailwind major version.

### Specificity problems with third-party CSS

- v4 places utilities in the `utilities` cascade layer; unlayered third-party CSS beats layered utilities regardless of specificity. Import third-party CSS into a layer (`@import "lib.css" layer(components);`) so utilities can override it.
- Avoid widespread `!important`; fix layering instead.

### Diagnosing

- Inspect the element in DevTools: is the class present in the DOM? Is the rule present in the stylesheet? Is it overridden?
- Use the Tailwind CSS IntelliSense editor extension for class validation and conflict warnings.
- `prettier-plugin-tailwindcss` sorts classes consistently, which makes duplicates easier to spot.

## Part 2: Styling UI Error States

### Form fields tied to accessibility attributes

Drive error styling from `aria-invalid` so visual and assistive states stay in sync:

```tsx
<label htmlFor="email" className="block text-sm font-medium text-gray-900">Email</label>
<input
  id="email"
  type="email"
  aria-invalid={!!error}
  aria-describedby={error ? 'email-error' : undefined}
  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
             focus-visible:outline-2 focus-visible:outline-blue-600
             aria-invalid:border-red-600 aria-invalid:focus-visible:outline-red-600"
/>
{error && (
  <p id="email-error" role="alert" className="mt-1 text-sm text-red-700">
    {error}
  </p>
)}
```

- `aria-invalid:` (and `aria-[invalid=true]:` arbitrary form) variants style from the attribute.
- Native validation: `user-invalid:` (v4) applies only after user interaction, avoiding red fields on page load; `invalid:` applies immediately.
- `peer`/`group` variants style siblings or parents: `peer-aria-invalid:block` on a hidden message after the input.

### Do not rely on color alone

- Pair red borders with an icon and text message (WCAG 1.4.1 Use of Color).
- Check contrast: error text on white must meet 4.5:1; `text-red-700` usually passes where `text-red-500` may not — verify with your palette.
- Move focus to the first invalid field or an error summary on submit.

### Semantic tokens for error states

```css
@theme {
  --color-danger: oklch(0.55 0.21 27);
  --color-danger-surface: oklch(0.97 0.02 25);
}
```

```html
<div role="alert" class="rounded-md border border-danger bg-danger-surface p-4 text-danger">
  Payment failed. Check your card details and try again.
</div>
```

Semantic names (`danger`, `danger-surface`) let themes (including dark mode via `dark:` or theme variables) change values without editing components.

### Loading, empty, and failure states

| State | Pattern |
|-------|---------|
| Loading | Skeletons with `animate-pulse` and `motion-reduce:animate-none`; `aria-busy="true"` on the region |
| Empty | Explanatory text plus a primary action |
| Failed fetch | Inline alert with retry button; keep previous data visible if available |
| Fatal page error | Error boundary rendering a full-page message with recovery links |

## Checklist

- [ ] No dynamically constructed class names; sources configured (`@source` / `content`)
- [ ] v4 migration: CSS entry, PostCSS/Vite plugin, renamed utilities, border/ring defaults reviewed
- [ ] `twMerge`-based helper for overridable component classes
- [ ] Third-party CSS layered so utilities override it
- [ ] Error styles driven by `aria-invalid` / `user-invalid`, with text and icon, sufficient contrast
- [ ] Semantic danger tokens defined in the theme
- [ ] Loading, empty, and error states designed and accessible
