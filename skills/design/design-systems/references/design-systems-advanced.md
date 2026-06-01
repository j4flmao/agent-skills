# Design Systems Advanced Topics

## Overview
Advanced design systems extend beyond components to multi-product ecosystems, automated testing, cross-platform distribution, accessibility enforcement, and organizational change management.

## Advanced Concepts

### Concept 1: Multi-Product Systems
When a design system serves multiple products with distinct brands or domains, the architecture needs: a core system (shared tokens, base components), product extensions (domain-specific variants), and governance rules for what belongs in core vs extension.

### Concept 2: Accessibility Enforcement
Automate accessibility at the system level: color contrast checks in CI (lighthouse-ci, axe-core), keyboard navigation tests (Playwright), ARIA attribute validation (eslint-plugin-jsx-a11y). Every component must pass before release. Create accessibility test helpers for consuming teams.

### Concept 3: Cross-Platform Distribution
Tokens and components must work across web (React), mobile (React Native, Flutter), desktop (Electron, WPF), and email. Strategy: design tokens as the single source, platform-specific components with shared behavior, and shared integration tests.

### Concept 4: Visual Regression Testing
Automatically detect unintended visual changes: Chromatic, Percy, Storybook test runner. Set threshold for pixel diffs. Review UI changes in PR workflow. Maintain baseline screenshots per component per theme.

### Concept 5: Design System as API
Treat the component library like an API: clearly documented public API, internal/private implementation details, semantic versioning, deprecation warnings, and migration guides. Breaking changes require a major version and codemods.

## Advanced Techniques

### Codemods for Breaking Changes
```javascript
// codemods/button-v2.js
// Automatically migrate v1 Button API to v2
module.exports = (file, api) => {
  const j = api.jscodeshift;
  return j(file.source)
    .find(j.JSXElement, { name: 'Button' })
    .replaceWith(path => {
      const props = path.node.attributes;
      // Transform props from v1 to v2
      return j.jsxElement(...);
    })
    .toSource();
};
```

### Theme Architecture
Core theme (light/dark mode) + brand themes (multi-brand) + user overrides. Themes cascade: system defaults → brand overrides → user preferences. Implement via CSS custom properties or React context.

### Build-Time Token Transformations
Style Dictionary transforms: color values to rgba, px to rem, camelCase to kebab-case. Platform outputs: CSS, JS/TS, Swift, Kotlin/Compose, XML. CI generates platform packages on token change.

## Anti-Patterns

- Single monolithic system for unrelated products
- No automated accessibility testing (manual review doesn't scale)
- Platform-specific bugs discovered by consumers
- Breaking changes without codemods or migration guides
- Tokens and components out of sync
- Contribution bottlenecks (too few maintainers, too many PRs)
- Design system roadmap driven by technology, not consumer needs
