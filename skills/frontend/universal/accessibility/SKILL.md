---
name: frontend-accessibility
description: >
  Use this skill when the user says 'accessibility', 'a11y', 'WCAG', 'screen reader', 'ARIA', 'keyboard navigation', 'color contrast', 'focus management', 'semantic HTML', or when ensuring frontend applications are accessible. This skill enforces: semantic HTML first (no div soup), ARIA only when native semantics are insufficient, WCAG 2.1 AA compliance (4.5:1 contrast, keyboard navigation, focus indicators), and automated a11y testing in CI. Works with any frontend framework. Do NOT use for: backend API accessibility, database design, or performance optimization.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, accessibility, phase-3, universal]
---

# Frontend Accessibility

## Purpose
Meet WCAG 2.1 AA standards. Semantic HTML first. ARIA only when necessary. Every interactive element is keyboard accessible. Color contrast meets 4.5:1 minimum.

## Agent Protocol

### Trigger
Exact user phrases: "accessibility", "a11y", "WCAG", "screen reader", "ARIA", "keyboard navigation", "color contrast", "focus management", "semantic HTML", "accessible".

### Input Context
Before activating, verify:
- The component or page being reviewed is specified.
- The WCAG level required (AA by default, AAA for specific requirements) is known.

### Output Artifact
No file output. Produces accessibility review or implementation guidance as text.

### Response Format
Issue:
```
Element: {selector}
Issue: {description}
WCAG: {success criterion}
Severity: {critical/major/minor}
Fix: {specific code change}
```

Implementation:
```
Pattern: {name}
HTML: {semantic element}
ARIA: {aria attributes if needed}
Keyboard: {focus behavior}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Semantic HTML elements used instead of div/span with ARIA roles.
- [ ] ARIA used only when native HTML semantics do not cover the pattern.
- [ ] All interactive elements keyboard accessible (Tab, Enter, Escape).
- [ ] Color contrast meets 4.5:1 for normal text, 3:1 for large text.
- [ ] Focus indicators visible on all interactive elements.
- [ ] Dynamic content changes announced via aria-live.
- [ ] Automated a11y tests included (axe-core).

### Max Response Length
Per issue: 6 lines. Per pattern: 8 lines.

## Workflow

### Step 1: Use Semantic HTML
```html
<!-- NOT THIS -->
<div class="nav">
  <div class="nav-item" onclick="navigate()">Home</div>
</div>
<div class="main">
  <div class="heading">Welcome</div>
</div>

<!-- THIS -->
<nav aria-label="Main">
  <a href="/">Home</a>
</nav>
<main>
  <h1>Welcome</h1>
</main>
```

### Step 2: ARIA Rules
1. No ARIA is better than bad ARIA.
2. ARIA overrides native semantics. Do not add role="button" to a `<button>`.
3. Use ARIA only when native HTML is insufficient.

| Pattern | Native | ARIA Fallback |
|---------|--------|---------------|
| Button | `<button>` | `role="button" tabindex="0" onkeydown` |
| Navigation | `<nav>` | `role="navigation"` |
| Dialog | `<dialog>` | `role="dialog" aria-modal="true"` |
| Progress | `<progress>` | `role="progressbar" aria-valuenow` |
| Alert | `role="alert"` (on any element) | same |

### Step 3: Keyboard Navigation
Every interactive element must be keyboard accessible:
```html
<!-- Skip link: first focusable element -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Focus trap in modals -->
<!-- Tab cycles between first and last focusable element -->
<!-- Escape closes the modal -->
<!-- Focus returns to trigger element on close -->
```

### Step 4: Color Contrast
| Text Type | Minimum Ratio | WCAG Level |
|-----------|--------------|------------|
| Normal text (<18px / <14px bold) | 4.5:1 | AA |
| Large text (>=18px bold / >=24px) | 3:1 | AA |
| UI components / graphical objects | 3:1 | AA |

Test with: axe-core, pa11y, Chrome DevTools contrast checker.

### Step 5: Focus Management
```css
/* NEVER */
*:focus { outline: none; }

/* ALWAYS */
:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}
```

- Every interactive element must have a visible focus indicator.
- Focus order (Tab order) must match visual order. DOM order determines focus order by default.
- When content changes dynamically (e.g., error message appears), move focus to the new content.
- Never leave focus on a hidden element.

### Step 6: Live Regions for Dynamic Content
```html
<div aria-live="polite" aria-atomic="true">
  {notification message}
</div>
```
- aria-live="polite": screen reader announces when idle (for most updates).
- aria-live="assertive": screen reader interrupts to announce (for critical errors, timers).
- aria-atomic="true": announce the entire region content, not just the changed part.

### Step 7: Automated Testing
```typescript
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

it('should have no a11y violations', async () => {
  const { container } = render(<Button>Click me</Button>)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## Rules
- Semantic HTML first. ARIA is a supplement, never a replacement.
- Every interactive element is keyboard accessible. No exceptions.
- Never set outline: none without providing a visible focus indicator.
- Color is never the only way to convey information. Add text labels, icons, or patterns.
- Dynamic content changes are announced to screen readers via aria-live.
- Automated a11y testing (axe-core) runs in CI. Manual testing with a real screen reader (VoiceOver, NVDA) is done before release.

## References
- `references/wcag-checklist.md` — WCAG 2.1 AA checklist with implementation examples
- `references/a11y-testing.md` — axe-core, Cypress/Playwright a11y tests, CI integration, common violations
- `references/a11y-aria.md` — landmark roles, widget patterns, live regions, ARIA states reference
- `references/a11y-tools.md` — automated tools, contrast checkers, screen readers, browser extensions, CI

## Handoff
No artifact produced.
Next skill: frontend-testing — test accessibility assertions.
Carry forward: a11y patterns used, WCAG level, automated testing setup.
