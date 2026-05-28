---
name: design-design-systems
description: >
  Use this skill when designing design systems, design tokens, component libraries, Figma-to-code workflows, Storybook integration, or theming strategies. This skill enforces: token architecture with Style Dictionary, atomic component hierarchy, Figma-to-code synchronization, Storybook documentation, and systematic theming. Do NOT use for: single-component design, CSS-in-JS styling only, or brand identity / visual design decisions.
version: "1.2.0"
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
Architect a scalable design system with token-driven styling, component composition, and cross-platform tooling. Supports web, iOS, Android, and design tool synchronization.

## Agent Protocol

### Trigger
Exact user phrases: "design system", "design tokens", "component library", "Figma", "Storybook", "style dictionary", "themed", "consistent UI", "design system architecture", "token specification", "component hierarchy".

### Input Context
Before activating, verify:
- Target platform(s) -- web, mobile, or both
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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Token categories defined (color, typography, spacing, elevation, motion)
- [ ] Token naming convention documented (category-concept-variant)
- [ ] Style Dictionary configuration for platform output
- [ ] Component hierarchy with atomic composition (atoms to molecules to organisms)
- [ ] Figma-to-code sync approach selected
- [ ] Theming strategy defined (light/dark, brand variants)
- [ ] Storybook setup with addons for documentation, controls, a11y

### Max Response Length
200 lines of specification and configuration.

## Component Architecture / Decision Trees

### Token Architecture Decision Tree

```
Single brand or multi-brand?
  |-- Single brand -->
  |     |-- One platform? --> Flat token file, CSS custom properties
  |     |-- Multi-platform? --> Style Dictionary with platform transforms
  |-- Multi-brand -->
        |-- Shared primitives, brand-specific semantic tokens
        |-- Style Dictionary with brand as a build parameter
```

### Component Hierarchy Decision

```
Design-to-code workflow:
  |-- Design-first (Figma components -> code components)
  |     Tokens Studio + Style Dictionary + auto-generation
  |-- Code-first (Code components -> Figma library)
  |     Storybook + Figma plugin for code-to-design sync
  |-- Parallel (Both evolve together)
        Design tokens as single source of truth
```

### Tooling Stack Decision

```
Team size & maturity:
  |-- Small team (< 5) --> Figma Tokens + Style Dictionary + Storybook
  |-- Medium team (5-20) --> Add Design System management tool (Specify/Supernova)
  |-- Large team (20+) --> Full DesignOps with dedicated DS platform
```

## Workflow

### Step 1: Token Architecture
Define tokens by category: `color` (primary, neutral, semantic, gradient), `typography` (family, size, weight, lineHeight, letterSpacing), `spacing` (0-4 rem scale, 4px base unit), `elevation` (shadow levels 1-5), `motion` (duration, easing presets). Naming: `category-concept-variant` e.g. `color-primary-500`, `spacing-md`, `elevation-card`. Never use presentation values (e.g., `color-blue`) -- use semantic names (`color-primary`).

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
Platform-specific transforms: px to rem for web, camelCase for JS, platform conventions for native.

### Step 3: Component Hierarchy
Atoms: button, input, label, icon, avatar. Molecules: card, form-field, search-bar, pagination. Organisms: header, sidebar, data-table, modal. Composition rules: atoms never import molecules; molecules compose atoms; organisms compose molecules and atoms. Every component exposes a `size`, `variant`, and `disabled` prop where applicable.

### Step 4: Theming Strategy
Define theme variants as token overrides. Light theme = base tokens. Dark theme overrides `color-background`, `color-surface`, `color-text`, `color-border`. Brand themes override `color-primary`, `color-secondary`, `font-family`. Theme switching via CSS custom properties or React context. Each theme is a separate Style Dictionary source file.

### Step 5: Storybook Integration
Configure Storybook with addons: controls (live prop editing), a11y (contrast checks), docs (auto-generated MDX), viewports (responsive breakpoints), themes (theme switcher toolbar). Each story covers: default, variants, states (hover, active, disabled, error, loading), responsive behavior.

### Step 6: Figma-to-Code Workflow
Options ranked by maturity: 1) Design Token plugin (Tokens Studio) to JSON to Style Dictionary. 2) Figma API export to manual mapping. 3) Design system management tool (Specify, Supernova). Preferred: Tokens Studio for Figma + GitHub sync + Style Dictionary build pipeline.

### Step 7: Component Documentation Standard
Each component must document: purpose, props table with types and defaults, variants with visual examples, states (hover, active, disabled, focus, error, loading), accessibility features, usage guidelines, and code examples for basic and advanced usage.

### Step 8: Versioning and Releases
Use semantic versioning: major for breaking changes (token removals, component API changes), minor for additions (new tokens, new components), patch for fixes. Maintain a CHANGELOG. Tag releases in both Figma and code repository.

## Common Pitfalls

### 1. Presentation-Named Tokens
Naming tokens by appearance (`color-blue-500`) instead of purpose (`color-primary`) means a rebrand requires renaming tokens throughout the system. Use semantic naming from day one.

### 2. No Single Source of Truth
When design tokens exist in Figma, CSS, AND JS with manual synchronization, they inevitably diverge. Use a build pipeline (Style Dictionary) with Figma as the source or a JSON file as the source.

### 3. Over-Engineering the Token System
A design system with 7 deep abstraction layers (alias tokens, composite tokens, recursive tokens) is hard to maintain and harder for new team members to understand. Keep it simple: primitives, semantics, components.

### 4. Missing Component States
Shipping components without hover, active, disabled, focus, error, and loading states means developers will implement them inconsistently. Every component must define its state coverage.

### 5. No Governance Process
Without a design system governance process, anyone can add tokens or components, leading to bloat and inconsistency. Establish a review process for token and component additions.

### 6. Figma-Code Drift
When designers update components in Figma but the code is not updated (or vice versa), the design system loses trust. Use Figma API or Tokens Studio plugins to alert when tokens or component specs diverge.

## Compared With

| Approach | Token Management | Component Documentation | Design Sync | Platform Support |
|----------|-----------------|----------------------|-------------|-----------------|
| Style Dictionary + Storybook | Build-time JSON | Storybook MDX | Tokens Studio | Web, iOS, Android |
| Theme UI / Stitches | JS theme object | Storybook | Manual | Web |
| Tailwind + CVA | Config + @theme | Storybook | Figma Tokens plugin | Web |
| Material Design | Theme object | Storybook | Manual sync | Web, Android, iOS |
| Radix + Stitches | Unstyled + theme | Storybook | Manual | Web |
| Specify / Supernova | Platform-managed | Auto-generated | Bidirectional | All |

## Performance Considerations

### Token Resolution Performance
CSS custom properties used by design tokens resolve at computed-value time. Switching themes (redefining 100+ custom properties in a `[data-theme]` selector) can cause a style recalculation cascade. Test theme switching performance with the Performance panel -- it should be under 5ms.

### Component Library Bundle Size
Each component adds 1-5KB to the bundle. A library of 50 components = 50-250KB. Tree-shaking via ES module imports ensures consumers only pay for what they use.

### Style Dictionary Build Time
For small token sets (< 500 tokens), Style Dictionary builds in < 1s. For large sets (> 2000 tokens) with multiple platforms, expect 2-5s build time.

## Ecosystem & Tooling

### Design Token Management
- **Tokens Studio for Figma** -- Industry standard Figma plugin. Syncs tokens to GitHub via JSON.
- **Style Dictionary** -- Amazon's build-time token transformer. Converts JSON to any platform format.
- **Specify** -- Design token management platform. Integrates Figma, GitHub, and multiple code outputs.
- **Supernova** -- Full design system management. Parser, documentation generator, code exporter.
- **Theo** -- Salesforce's token transformer (predecessor to Style Dictionary, less maintained).

### Component Documentation
- **Storybook** -- Industry standard. Controls, a11y addon, docs/auto-generated documentation, viewport addon.
- **Docusaurus** -- Documentation site generator. Good for token documentation guides.
- **Zeroheight** -- Design system documentation platform. No-code, designer-friendly.

### Figma Plugins for Design Systems
- **Tokens Studio** -- Design token editing and sync
- **Anima** -- Figma to React/Vue code export
- **Stark** -- Accessibility checking (contrast, colorblind simulation)
- **Design Lint** -- Design system compliance checking
- **Variants Parser** -- Export Figma component variants

## Rules
- Tokens are semantic, not presentation -- `color-primary` not `color-blue`
- One source of truth: tokens drive design AND code
- Every component has documented states (hover, active, disabled, focus, error)
- No component exceeds 4 levels of composition depth
- Theme variants are token overrides, never separate components
- Style Dictionary transforms handle platform differences -- not custom CSS
- Storybook stories cover every component variant + state
- Version everything: tokens, components, documentation
- Token additions require design review and PR approval
- Figma and code must reference the same token source

## References

- `references/component-library.md` -- Component Library
- `references/design-system-tokens.md` -- Design System Tokens
- `references/design-system-workflow.md` -- Design System Workflow
- `references/design-systems-advanced.md` -- Design Systems Advanced Topics
- `references/design-systems-fundamentals.md` -- Design Systems Fundamentals
- `references/design-tokens.md` -- Design Tokens
- `references/design-system-governance.md` -- Design System Governance
- `references/design-system-accessibility.md` -- Design System Accessibility

## Handoff
`design-accessibility` for a11y audit of the component library.
`design-prototyping` for interaction specs on component states.
Carry forward: token spec, component inventory, Storybook config.
