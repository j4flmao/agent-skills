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
  windsurf: true
tags: [frontend, tailwind-css, phase-3, universal]
---

# Frontend Tailwind CSS

## Purpose
Generate production-ready Tailwind CSS code following utility-first principles with consistent design tokens and responsive patterns.

## Agent Protocol

### Trigger
Exact phrases: "use tailwind", "tailwind css", "utility classes", "add tailwind", "tailwind config", "custom theme", "design tokens", "responsive tailwind"

### Input Context
- Check for existing `tailwind.config.*` or `postcss.config.*` files
- Verify whether a custom design system (colors, fonts, spacing) already exists
- Confirm the framework (React, Vue, Astro, etc.) to pick the correct Tailwind installation variant
- If no config exists, default to Tailwind v4 with `@import "tailwindcss"` syntax

### Output Artifact
No file output unless requested.

### Response Format
1. Respond with raw Tailwind classes or config snippets first, explain only if asked.
2. Use arbitrary values (`[#123]`, `[10px]`) sparingly — prefer design tokens.
3. When generating config, output the complete relevant section, not ellipses.
4. For responsive design, always list breakpoints in order: `sm` → `md` → `lg` → `xl` → `2xl`.
5. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Tailwind classes follow utility-first (one class = one CSS property) where practical
- [ ] Design tokens extracted into `tailwind.config.*` or CSS `@theme` directive
- [ ] Responsive variants applied mobile-first (base = mobile, `md:` = tablet, `lg:` = desktop)
- [ ] No unused custom CSS — Tailwind utility covers the use case
- [ ] Dark mode uses `dark:` variant unless config says otherwise
- [ ] Output has been verified against an existing Tailwind project to confirm no breaking config changes

### Max Response Length
100 lines unless generating a full config.

## Workflow

### Step 1: Detect Environment
Check for `tailwind.config.js`, `tailwind.config.ts`, `postcss.config.js`, or `@import "tailwindcss"` in CSS. If none exists, ask one question: "Which framework?" Then scaffold the minimal config for that framework.

### Step 2: Map Design Tokens
Extract brand colors, font families, spacing scale, and breakpoints. Add them under `theme.extend` in config or as `@theme` CSS variables. Never remove existing tokens.

### Step 3: Write Utility-First Markup
Build layouts with single-purpose classes. Stack with `flex`/`grid`, space with `gap`/`p-*`/`m-*`, size with `w-*`/`h-*`/`size-*`. Use `@apply` only in component files, never in global CSS. Prefer `@layer components` for repeated composite patterns.

### Step 4: Apply Responsive Variants
Start with the mobile layout (no prefix). Add `sm:`, `md:`, `lg:`, `xl:`, `2xl:` as the viewport grows. Test at every breakpoint.

### Step 5: Optimize for Production
Confirm `content` paths in config scan all template files. Use `--minify` flag in build. Avoid `@apply` on `.container` or `.prose` — they are already optimized utilities.

## Rules
- Never use `!important` in CSS — use Tailwind's `!` prefix instead.
- Never write raw CSS when a Tailwind utility exists — that includes `display: flex` → `flex`.
- Always configure `content` paths explicitly; wildcard patterns like `./src/**/*.{js,jsx,ts,tsx}` are preferred.
- Prefer Tailwind v4 `@import "tailwindcss"` syntax for new projects; fall back to `@tailwind` directives only for v3 compatibility.
- Never remove or override Tailwind's default spacing/fontSize scales unless the design system explicitly requires it. Use `extend` or `@theme` instead.
- Keep `tailwind.config.*` flat — avoid deeply nested plugin abstractions unless there are 5+ sites sharing the config.

## References
- `references/utility-first.md`
- `references/design-tokens.md`
- `references/responsive-patterns.md`
- `references/performance.md`

## Handoff
No artifact produced unless requested.
Next skill: `frontend-storybook` (if component documentation is needed next)
Carry forward: Tailwind theme config tokens (colors, spacing, fonts, breakpoints)
