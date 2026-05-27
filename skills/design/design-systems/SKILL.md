---
name: design-design-systems
description: >
  Use this skill when designing design systems, design tokens, component libraries, Figma-to-code workflows, Storybook integration, or theming strategies. This skill enforces: token architecture with Style Dictionary, atomic component hierarchy, Figma-to-code synchronization, Storybook documentation, and systematic theming. Do NOT use for: single-component design, CSS-in-JS styling only, or brand identity / visual design decisions.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [design, frontend, phase-10]
---

# Design Design Systems

## Purpose
Architect a scalable design system with token-driven styling, component composition, and cross-platform tooling.

## Agent Protocol

### Trigger
Exact user phrases: "design system", "design tokens", "component library", "Figma", "Storybook", "style dictionary", "themed", "consistent UI", "design system architecture", "token specification", "component hierarchy".

### Input Context
Before activating, verify:
- Target platform(s) — web, mobile, or both
- Existing design tooling (Figma, Sketch, Adobe XD)
- CSS framework or styling approach in use (Tailwind, styled-components, plain CSS)
- Whether a token system already exists

### Output Artifact
Design system architecture with token specification, component hierarchy, and tooling configuration.

### Response Format
```yaml
# Token categories and naming convention
# Component tree with composition rules
```
```typescript
// Style Dictionary configuration
// Theming setup
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Token categories defined (color, typography, spacing, elevation, motion)
- [ ] Token naming convention documented (category-concept-variant)
- [ ] Style Dictionary configuration for platform output
- [ ] Component hierarchy with atomic composition (atoms → molecules → organisms)
- [ ] Figma-to-code sync approach selected
- [ ] Theming strategy defined (light/dark, brand variants)
- [ ] Storybook setup with addons for documentation, controls, a11y

### Max Response Length
200 lines of specification and configuration.

## Workflow

### Step 1: Token Architecture
Define tokens by category: `color` (primary, neutral, semantic, gradient), `typography` (family, size, weight, lineHeight, letterSpacing), `spacing` (0-4 rem scale, 4px base unit), `elevation` (shadow levels 1-5), `motion` (duration, easing presets). Naming: `category-concept-variant` e.g. `color-primary-500`, `spacing-md`, `elevation-card`. Never use presentation values (e.g., `color-blue`) — use semantic names (`color-primary`).

### Step 2: Style Dictionary Configuration
```json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css": { "transformGroup": "css", "buildPath": "dist/css/" },
    "js": { "transformGroup": "js", "buildPath": "dist/js/" },
    "ios": { "transformGroup": "ios", "buildPath": "dist/ios/" },
    "android": { "transformGroup": "android", "buildPath": "dist/android/" }
  }
}
```
Platform-specific transforms: px → rem for web, camelCase for JS, platform conventions for native.

### Step 3: Component Hierarchy
Atoms: button, input, label, icon, avatar. Molecules: card, form-field, search-bar, pagination. Organisms: header, sidebar, data-table, modal. Composition rules: atoms never import molecules; molecules compose atoms; organisms compose molecules and atoms. Every component exposes a `size`, `variant`, and `disabled` prop where applicable.

### Step 4: Theming Strategy
Define theme variants as token overrides. Light theme = base tokens. Dark theme overrides `color-background`, `color-surface`, `color-text`, `color-border`. Brand themes override `color-primary`, `color-secondary`, `font-family`. Theme switching via CSS custom properties or React context. Each theme is a separate Style Dictionary source file.

### Step 5: Storybook Integration
Configure Storybook with addons: controls (live prop editing), a11y (contrast checks), docs (auto-generated MDX), viewports (responsive breakpoints), themes (theme switcher toolbar). Each story covers: default, variants, states (hover, active, disabled, error, loading), responsive behavior.

### Step 6: Figma-to-Code Workflow
Options ranked by maturity: 1) Design Token plugin (Tokens Studio) → JSON → Style Dictionary. 2) Figma API export → manual mapping. 3) Design system management tool (Specify, Supernova). Preferred: Tokens Studio for Figma + GitHub sync + Style Dictionary build pipeline.

## Rules
- Tokens are semantic, not presentation — `color-primary` not `color-blue`
- One source of truth: tokens drive design AND code
- Every component has documented states (hover, active, disabled, focus, error)
- No component exceeds 4 levels of composition depth
- Theme variants are token overrides, never separate components
- Style Dictionary transforms handle platform differences — not custom CSS
- Storybook stories cover every component variant + state

## References
  - references/component-library.md — Component Library
  - references/design-system-tokens.md — Design System Tokens
  - references/design-system-workflow.md — Design System Workflow
  - references/design-systems-advanced.md — Design Systems Advanced Topics
  - references/design-systems-fundamentals.md — Design Systems Fundamentals
  - references/design-tokens.md — Design Tokens
## Handoff
`design-accessibility` for a11y audit of the component library.
`design-prototyping` for interaction specs on component states.
Carry forward: token spec, component inventory, Storybook config.
