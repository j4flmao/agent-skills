---
name: frontend-theming
description: >
  Use this skill when the user says 'theming', 'dark mode', 'light mode', 'theme switching', 'CSS variables', 'custom properties', 'theme provider', 'theme context', 'color scheme', 'prefers-color-scheme', 'theme toggle', 'design tokens'. Implement theme systems with CSS variables, dark mode, design tokens, and per-framework patterns. Do NOT use for: CSS-in-JS library selection or UI component design.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, theming, phase-7, universal]
version: "2.0.0"
author: "j4flmao"
license: "MIT"
---

# Frontend Theming

**Description:** Implements theming — design tokens, theme definitions (light/dark), switching strategy, framework integration, and persistence. Triggered by "theming", "dark mode", "light mode", "theme switching", "CSS variables", "custom properties", "theme provider", "theme context", "color scheme", "prefers-color-scheme", "theme toggle", "design tokens".

**Version:** 2.0.0
**Author:** j4flmao
**License:** MIT

---

## Purpose

Deliver a robust, flicker-free theming system that supports light and dark modes — using CSS custom properties for design tokens, with OS preference detection, manual toggle, and SSR-safe persistence.

---

## Agent Protocol

### Trigger
User request includes any of: "theming", "dark mode", "light mode", "theme switching", "CSS variables", "custom properties", "theme provider", "theme context", "color scheme", "prefers-color-scheme", "theme toggle", "design tokens".

### Input Context
- Framework (React, Vue, Svelte, vanilla, Tailwind)
- Existing styling approach (CSS modules, styled-components, Tailwind)
- SSR / SSG setup (Next.js, Nuxt, SvelteKit)
- Design token requirements (colors, spacing, typography)

### Output Artifact
Theme system with CSS variables, switching logic, and persistence.

### Response Format
```
## Token Architecture
<variable-naming, theme-structure>

## Implementation
<theme-provider, switching-logic, anti-flicker>

## Persistence
<localStorage, cookie, SSR-hydration>

—
Compression footer: frontend-theming/v1 | 3 sections | tokens: <count> | modes: <light|dark|system>
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- All color/spacing/typography values use CSS custom properties
- Light and dark themes both defined
- System preference detected and applied as default
- Manual toggle overrides system preference
- Anti-flicker script prevents flash of wrong theme on load
- User preference persisted across sessions

### Max Response Length
4096 tokens

## Theming Architecture / Decision Trees

### Theme Strategy Decision Tree
```
SSR application?
  |-- YES (Next.js, Nuxt, SvelteKit) -->
  |     Anti-flicker is critical
  |     Strategy: inline script in <head> reads cookie/localStorage
  |     Set class on <html> before any paint
  |     Cookie enables server-side class injection
  |     Library: next-themes, nuxt-color-mode, or custom
  |
  |-- NO (CSR only, React SPA, Vue SPA) -->
  |     Anti-flicker still needed (can use loading attribute)
  |     Strategy: inline script in index.html <head>
  |     Set class on <html> before React/Vue mounts
  |
  |-- No JS (static HTML, minimal) -->
        CSS-only: prefers-color-scheme media query
        No toggle, no persistence
```

### Token Architecture Decision Tree
```
How many themes?
  |-- 2 (light + dark) -->
  |     Semantic tokens on :root (light) + [data-theme="dark"]
  |     Components reference semantic tokens only
  |     Simple, maintainable
  |
  |-- 3+ (light + dark + high-contrast + sepia) -->
  |     Use a class-based approach: [data-theme="high-contrast"]
  |     Consider token generation tool (Style Dictionary)
  |     Each theme overrides same set of semantic tokens
  |
  |-- Per-user / dynamic branding -->
        Runtime token injection via CSS custom properties on a scoped element
        CSS variables cascade allows component-level overrides
```

### Token Naming Decision Tree
```
CSS custom property naming convention?
  |-- Semantic (recommended) -->
  |     --color-surface-primary, --color-text-body
  |     Pros: meaning never changes, themes swap actual values
  |     Cons: need to know what "surface" means
  |
  |-- Appearance-based (avoid) -->
        --color-white, --color-dark-gray
        Pros: obvious values
        Cons: when theme changes, --color-white may not be white
```

---

## Workflow

### 1. Design Tokens Foundation
- Define CSS custom properties for all visual primitives.
- Semantic naming convention: `color-surface-primary`, `color-text-default`, `spacing-md`, `font-size-body`, `shadow-sm`.
- Categories: colors (surface, text, border, interactive), spacing (xs through 3xl), typography (font family, size, weight, line-height), shadows, radii, z-index.
- Tokens are consumed by components — never reference raw hex values.
- Token names describe purpose, not appearance.

### 2. Theme Definition
- Light theme: light background, dark text, subtle shadows.
- Dark theme: dark background, light text, softer shadows.
- Both themes override the same semantic tokens.
- Define themes in CSS (`:root` + `[data-theme="dark"]`), JS object (for runtime switching), or both.
- SSR: define theme as cookie for server-side class injection.

### 3. Theme Switching Strategy
- CSS class on `<html>` for manual toggle (e.g., `data-theme="dark"`).
- `prefers-color-scheme` media query for system default.
- Combine both: system preference is initial, manual toggle sets class and persists.
- Priority: manual toggle > system preference > light fallback.

### 4. Implementation per Framework
- **CSS:** `:root` / `[data-theme]` / `@media (prefers-color-scheme)`.
- **React:** ThemeProvider context with useTheme hook, toggle function.
- **Tailwind:** `darkMode: 'class'`, use `dark:` variant.
- **Svelte:** `:global` with context, CSS variables on body.
- **Next.js:** `next-themes` or custom with cookie-based SSR.

### 5. Persistence
- `localStorage` for user preference (JS-readable, persists across sessions).
- Cookie for SSR consistent render (server reads cookie to set class).
- System preference as default when no stored preference exists.
- Anti-flicker script in `<head>` reads localStorage/cookie and sets class before paint.

### 6. React Theme Provider
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) setTheme(stored)
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const resolved = theme === 'system'
      ? (mediaQuery.matches ? 'dark' : 'light')
      : theme

    setResolvedTheme(resolved)
    document.documentElement.setAttribute('data-theme', resolved)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
```

### 7. Anti-Flicker Script
```html
<!-- Inline in <head> before any CSS loads -->
<script>
  (function() {
    var theme = localStorage.getItem('theme') || 'system';
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
</script>
```

### 8. CSS Theme Variables
```css
:root {
  --color-surface-primary: #ffffff;
  --color-surface-secondary: #f9fafb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --color-brand: #2563eb;
  --spacing-page: 1rem;
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
  --color-surface-primary: #111827;
  --color-surface-secondary: #1f2937;
  --color-text-primary: #f9fafb;
  --color-text-secondary: #9ca3af;
  --color-border: #374151;
  --color-brand: #60a5fa;
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.4);
}
```

### 9. Smooth Theme Transitions
```css
/* Apply transitions globally */
*, *::before, *::after {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
  }
}
```

## Common Pitfalls

### 1. Flicker on Page Load
Without an anti-flicker script, the page renders with the wrong theme before JS runs. The inline `<head>` script prevents this.

### 2. Hardcoded Colors
```css
/* BAD -- component references raw color */
.card { background: #ffffff; color: #111827; }

/* GOOD -- component references token */
.card { background: var(--color-surface-primary); color: var(--color-text-primary); }
```

### 3. Not Respecting prefers-reduced-motion
Theme transitions should be disabled for users who request reduced motion. Use a media query check.

### 4. Storing Only the Resolved Theme
Store the user's CHOICE (light/dark/system), not the resolved value. Otherwise, if the user picks "system", a page refresh loses that choice.

### 5. Not Syncing with SSR
If the server renders HTML with the light theme but the user prefers dark, the mismatch causes a flicker. Use a cookie for server-side theme detection.

## Compared With

| Approach | Bundle Size | Flicker-Free | SSR Support | Complexity |
|----------|------------|-------------|-------------|------------|
| CSS variables + inline script | 0KB runtime | Yes | Yes (cookie) | Low |
| Tailwind dark: class | 0KB | Yes (with script) | Yes | Low |
| styled-components ThemeProvider | ~2KB | Yes | Yes | Medium |
| next-themes | ~3KB | Yes | Yes (built-in) | Low |
| CSS prefers-color-scheme only | 0KB | Yes | Yes | Minimal (no toggle) |

## Performance Considerations

- CSS custom properties are resolved at computed-value time — negligible cost
- Theme switching triggers style recalculation on elements using changed properties (typically 5-20ms)
- `prefers-color-scheme` media query evaluation is instant
- Transition on all properties can cause jank on slow devices — limit to `background-color`, `color`, `border-color`, `box-shadow`
- localStorage read is synchronous but fast (< 1ms)

## Accessibility Considerations

- Ensure WCAG 2.1 AA contrast ratios in ALL themes (4.5:1 normal text, 3:1 large text)
- Dark theme should maintain sufficient contrast — not just invert colors
- Theme toggle button must have accessible label ("Switch to dark mode" / "Switch to light mode")
- Announce theme change to screen readers using aria-live region
- Respect `prefers-reduced-motion` for theme transitions
- Provide a high-contrast theme option if the app targets accessibility-sensitive users

## Security Considerations

- Inline `<script>` for anti-flicker must be CSP-compatible (use nonce or hash)
- localStorage theme preference is not sensitive data (no security concern)
- Cookie-based theme should be a simple preference, never contain session data

## Rules

1. CSS custom properties for all theme values — no hardcoded colors anywhere in component code.
2. Use semantic token names only (`color-text-default`), never appearance-based (`color-dark-gray`).
3. Dark mode respects `prefers-color-scheme` as default — user toggle overrides.
4. Anti-flicker script must execute in `<head>` before any DOM paint.
5. All components consume CSS variables, not theme context directly — context is only for switching.
6. Persist user choice in both `localStorage` and cookie for SSR.
7. Theme toggle must animate smoothly (200ms transition on affected properties).
8. Provide at minimum: light, dark, and system-auto modes.

---

## References
  - references/design-tokens.md — Design Tokens
  - references/theme-implementation.md — Theme Implementation
  - references/theme-performance.md — Theme Performance
  - references/theme-testing.md — Theme Testing
  - references/theming-architecture.md — Theming Architecture
  - references/theming-tokens.md — Theming Tokens
## Handoff

If project requires complex design token management tooling (Style Dictionary, Token Studio) or multi-brand theming (3+ themes), flag for design systems handoff. Otherwise implement complete theming system.
