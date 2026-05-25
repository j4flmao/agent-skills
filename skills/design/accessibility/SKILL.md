---
name: design-accessibility
description: >
  Use this skill when addressing accessibility, a11y, WCAG compliance, screen reader support, keyboard navigation, color contrast, ARIA patterns, or inclusive design. This skill enforces: WCAG 2.2 AA compliance (AAA where possible), semantic HTML structure, correct ARIA patterns, keyboard interaction design, sufficient color contrast, and screen reader testing protocol. Do NOT use for: general frontend performance optimization, visual design aesthetics, or mobile gesture-only interactions.
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

# Design Accessibility

## Purpose
Ensure digital products meet WCAG compliance with semantic HTML, correct ARIA, keyboard support, and inclusive patterns.

## Agent Protocol

### Trigger
Exact user phrases: "accessibility", "a11y", "WCAG", "screen reader", "keyboard navigation", "color contrast", "ARIA", "inclusive design", "accessible", "508 compliance", "disabled users".

### Input Context
Before activating, verify:
- Target WCAG level (A, AA, or AAA)
- Supported assistive technologies (screen readers, voice control)
- Component or page scope (entire app vs specific feature)
- Current accessibility baseline (none, partial, audited)

### Output Artifact
Accessibility audit with WCAG compliance plan, ARIA patterns, and testing strategy.

### Response Format
```yaml
# WCAG compliance status per criterion
# Audit findings with severity, location, and fix
```
```html
<!-- Correct ARIA patterns -->
<!-- Keyboard interaction implementation -->
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] WCAG level target confirmed (AA minimum)
- [ ] Color contrast ratios verified (4.5:1 text, 3:1 large text)
- [ ] All interactive elements keyboard accessible
- [ ] ARIA landmarks defined for page structure
- [ ] Screen reader announcements verified for dynamic content
- [ ] Focus management implemented (visible focus, logical order)
- [ ] Automated a11y tests configured (axe/Lighthouse)

### Max Response Length
200 lines of spec, patterns, and configuration.

## Workflow

### Step 1: WCAG Level Target
AA minimum for all public-facing interfaces. AAA for: government, healthcare, financial, educational. If budget/time constrained, prioritize AA and document AAA gaps. Perceivable, Operable, Understandable, Robust (POUR) — every fix maps to at least one principle.

### Step 2: Semantic HTML
Use native HTML elements before ARIA: `<nav>` not `<div role="navigation">`, `<button>` not `<div role="button">`, `<heading>` elements in correct hierarchy (h1 → h2 → h3, no skipping). Landmarks: `<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>`. Each page has exactly one `<main>`.

### Step 3: Color Contrast
Text contrast ratios: 4.5:1 for normal text (<18px), 3:1 for large text (≥18px bold or ≥24px). UI component contrast: 3:1 for borders, icons, focus indicators. Use tools: WebAIM Contrast Checker, axe DevTools, Stark plugin. Never rely on color alone to convey information — add icons, patterns, or text labels.

### Step 4: Keyboard Navigation
Every interactive element is reachable via Tab. Tab order matches visual order. Visible focus indicator (3:1 contrast against background, 2px minimum). No keyboard traps. Custom widgets use arrow keys for internal navigation (tablist, menu, combobox). Skip link at page start: "Skip to main content".

### Step 5: ARIA Patterns
Use ARIA only when native HTML is insufficient. Roles: `alert`, `dialog`, `tablist`, `tab`, `tabpanel`. Properties: `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-expanded`, `aria-controls`, `aria-current`. States: `aria-disabled`, `aria-hidden`, `aria-selected`, `aria-checked`. Always test ARIA with a screen reader — incorrect ARIA is worse than no ARIA.

### Step 6: Dynamic Content
Loading states: `aria-busy="true"`. Live regions: `aria-live="polite"` for non-critical updates, `aria-live="assertive"` for time-sensitive alerts. Toast/notification: `role="alert"`. Modal: trap focus inside, `role="dialog"` + `aria-modal="true"`, close on Escape. Announcements: use `aria-live` regions, not screen reader detection hacks.

### Step 7: Testing Strategy
Automated (axe DevTools, Lighthouse in CI): catches 30% of issues — contrast, ARIA, heading hierarchy, label associations. Manual: keyboard-only navigation (full pass), screen reader testing (VoiceOver macOS, NVDA Windows, TalkBack Android, VoiceOver iOS). User testing with assistive tech users for complex interactions.

## Rules
- Semantic HTML first — ARIA only as supplement
- No color-only information — always pair with text or icon
- Focus indicators are never removed — only improved
- Every form input has a visible `<label>`
- Dynamic content changes are announced via live regions
- Tab order = DOM order (avoid tabindex > 0)
- Automated testing catches syntax — human testing catches experience
- Disable animations with `prefers-reduced-motion`

## References
- `references/aria-patterns.md` — Aria Patterns
- `references/testing-tools.md` — Testing Tools
- `references/wcag-checklist.md` — Wcag Checklist
- `references/wcag-guide.md` — Wcag Guide

## Handoff
`design-design-systems` for accessible component library integration.
`quality-visual-testing` for visual regression with a11y states.
Carry forward: WCAG audit report, ARIA patterns, testing checklist.
