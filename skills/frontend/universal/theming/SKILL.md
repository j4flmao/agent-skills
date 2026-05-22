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
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Frontend Theming

**Description:** Implements theming — design tokens, theme definitions (light/dark), switching strategy, framework integration, and persistence. Triggered by "theming", "dark mode", "light mode", "theme switching", "CSS variables", "custom properties", "theme provider", "theme context", "color scheme", "prefers-color-scheme", "theme toggle", "design tokens".

**Version:** 1.0.0
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

---

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

- `references/design-tokens.md` — Naming conventions, CSS variables, token categories, theme definitions
- `references/theme-implementation.md` — Per-framework patterns, switching, persistence, anti-flicker, Tailwind theming

---

## Handoff

If project requires complex design token management tooling (Style Dictionary, Token Studio) or multi-brand theming (3+ themes), flag for design systems handoff. Otherwise implement complete theming system.
