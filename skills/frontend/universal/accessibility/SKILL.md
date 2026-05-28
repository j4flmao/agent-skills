---
name: frontend-accessibility
description: >
  Use this skill when the user says 'accessibility', 'a11y', 'WCAG', 'screen reader', 'ARIA', 'keyboard navigation', 'color contrast', 'focus management', 'semantic HTML', or when ensuring frontend applications are accessible. This skill enforces: semantic HTML first (no div soup), ARIA only when native semantics are insufficient, WCAG 2.1 AA compliance (4.5:1 contrast, keyboard navigation, focus indicators), and automated a11y testing in CI. Works with any frontend framework. Do NOT use for: backend API accessibility, database design, or performance optimization.
version: "1.2.0"
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
Meet WCAG 2.1 AA standards. Semantic HTML first. ARIA only when necessary. Every interactive element is keyboard accessible. Color contrast meets 4.5:1 minimum. Dynamic content changes announced via live regions. Automated testing enforced in CI.

## Agent Protocol

### Trigger
Exact user phrases: "accessibility", "a11y", "WCAG", "screen reader", "ARIA", "keyboard navigation", "color contrast", "focus management", "semantic HTML", "accessible".

### Input Context
Before activating, verify:
- The component or page being reviewed is specified.
- The WCAG level required (AA by default, AAA for specific requirements) is known.
- Target audience (consumer, enterprise, government) to determine WCAG level.

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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

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

## Component Architecture / Decision Trees

### Semantic Element Decision Tree

```
Is it interactive?
  |-- YES --> Does it navigate?
  |     |-- YES --> <a href="..."> (even for client-side routing)
  |     |-- NO  --> Does it submit a form?
  |           |-- YES --> <button type="submit">
  |           |-- NO  --> <button type="button">
  |-- NO --> Does it represent a document structure?
        |-- YES --> See: <header>, <nav>, <main>, <section>, <article>, <aside>, <footer>
        |-- NO  --> Is it a group of related items?
              |-- YES --> <ul>/<ol> + <li>, or <select>/<option>
              |-- NO  --> Is it a standalone piece of content?
                    |-- YES --> <p>, <figure>, <blockquote>, <pre>, <code>
                    |-- NO  --> <div> or <span> as last resort
```

### ARIA Decision Tree

```
Does native HTML element exist for this pattern?
  |-- YES --> Use native element. Do NOT add ARIA role (overrides native semantics).
  |-- NO --> Can the pattern be built with composition of native elements?
        |-- YES --> Use composition. No ARIA needed.
        |-- NO  --> Use ARIA role. Must manage keyboard interaction manually.
              |-- role="button", role="tab", role="dialog", role="alertdialog"
              |-- role="listbox", role="combobox", role="menu", role="menubar"
              |-- role="tree", role="grid", role="slider"
```

### Focus Management Decision Tree

```
Does the component manage focus?
  |-- Modal/Dialog: Trap focus, return to trigger on close
  |-- Tab panel: Arrow keys between tabs, roving tabindex
  |-- Menu: Arrow keys between items, Escape to close, return focus to trigger
  |-- Combobox: Focus stays in input, listbox is programmatically associated
  |-- Accordion: Section toggle via Enter/Space, no focus movement
  |-- Carousel: Focus wraps, tab stops on carousel shell (not all slides)
```

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

```js
function trapFocus(modalElement, triggerElement) {
  const focusable = modalElement.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  modalElement.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      triggerElement.focus();
    }
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  first.focus();
}
```

### Step 4: Color Contrast
| Text Type | Minimum Ratio | WCAG Level |
|-----------|--------------|------------|
| Normal text (<18px / <14px bold) | 4.5:1 | AA |
| Large text (>=18px bold / >=24px) | 3:1 | AA |
| UI components / graphical objects | 3:1 | AA |
| Normal text (AAA) | 7:1 | AAA |
| Large text (AAA) | 4.5:1 | AAA |

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

### Step 8: Screen Reader Testing Protocol
1. **VoiceOver (macOS)**: Cmd+F5 to enable. Navigate with VO+arrow keys. Test all interactions.
2. **NVDA (Windows)**: Free screen reader. Navigate with Insert+arrow keys. Test form inputs.
3. **JAWS (Windows)**: Most common enterprise screen reader. Test forms and dynamic content.
4. **TalkBack (Android)**: Test touch navigation and gesture support.
5. **VoiceOver (iOS)**: Test touch navigation and rotor gestures.

### Step 9: Auditing with axe-core in CI
```yaml
# GitHub Actions
- name: Accessibility audit
  run: |
    npx @axe-core/cli http://localhost:3000 \
      --exit \
      --stdout \
      --rules color-contrast,aria-roles,label,landmark-one-main,page-has-heading-one
```

## Common Pitfalls

### 1. Removing Focus Outlines Without Replacement
```css
/* BAD - removes focus indicator entirely */
*:focus { outline: none; }

/* BAD - insufficient contrast */
*:focus { outline: 1px solid #ddd; outline-offset: 0; }
```

### 2. Color-Only Information
Using color alone to convey state (red = error, green = success) fails WCAG 1.4.1. Always include text labels, icons, or patterns alongside color indicators.

### 3. Missing Labels on Form Inputs
Every form input needs a programmatically associated label.
```html
<!-- WRONG -->
<input type="text" placeholder="Search">

<!-- RIGHT -->
<label for="search">Search</label>
<input type="text" id="search">

<!-- ALSO RIGHT (aria-label for icon-only inputs) -->
<input type="search" aria-label="Search site">
```

### 4. Custom Components Without Keyboard Support
Every custom interactive element must support: Tab (reach), Enter/Space (activate), Escape (dismiss), Arrow keys (navigation within component).

### 5. Dynamic Content Not Announced
Single Page Applications frequently add/update content without notifying screen readers. Every content update that is visible must also be announced via aria-live.

### 6. Incorrect Heading Hierarchy
Headings must form a logical outline. Skipping from h1 to h4 is invalid. There must be no gaps in the hierarchy (h1 -> h2 -> h3 -> ...).

### 7. Missing Skip Links
Every page must have a skip link as the first focusable element. Without it, keyboard users tab through navigation/menus on every page load.

### 8. aria-hidden on Focusable Elements
Never put `aria-hidden="true"` on a focusable element. The element becomes invisible to screen readers but remains focusable, creating a trap where focus disappears.

## Compared With

| Testing Approach | Automation Level | Coverage | Best For |
|-----------------|-----------------|----------|----------|
| axe-core | Fully automated | ~57 WCAG rules | CI pipelines, dev feedback |
| Lighthouse a11y | Fully automated | ~23 WCAG rules | Quick audits, performance bundles |
| pa11y | Fully automated | Same as axe-core | CLI-based CI integration |
| WAVE | Semi-automated | Visual overlay | Design review, manual inspection |
| Manual screen reader | Manual | 100% | Final sign-off, edge cases |
| User testing | Manual | Real-world usage | Production validation |
| Accessibility Insights | Semi-automated | FastPass + manual | Enterprise compliance |

## Performance Considerations

### Impact of Accessibility on Performance
- aria-live regions have negligible performance impact (< 1ms on mutation)
- Screen reader detection libraries (like `@react-aria/live`) may add 2-5KB bundle
- Focus management event handlers are trivial (microsecond scale)
- Skip links and semantic HTML are zero-cost
- The most significant performance cost is from poorly implemented custom widgets that cause excessive DOM mutations

### CSS vs JS for Focus Management
```css
/* Zero-cost focus management */
:focus-visible { outline: 2px solid blue; }

/* vs JS-based */
// ~1KB library needed, event listeners on focus/blur
```

Prefer CSS `:focus-visible` over JS-based focus management where possible.

## Ecosystem & Tooling

### Testing Tools
- **axe-core**: Industry standard. ~57 WCAG rules. Integrates with jest, Cypress, Playwright.
- **Lighthouse a11y**: Built into Chrome DevTools. Good for quick checks.
- **pa11y**: CLI tool, CI-friendly. Supports HTML reporters.
- **WAVE**: Browser extension. Visual overlay of a11y issues on the page.
- **Accessibility Insights**: Microsoft's free tool. FastPass + full assessment workflows.
- **Storybook a11y addon**: Real-time axe-core checks in Storybook.
- **ESLint plugin jsx-a11y**: Static analysis for common React a11y mistakes.

### Screen Readers
- **NVDA** (Windows, free): Most common for testing. ~5% market share.
- **JAWS** (Windows, paid): Enterprise standard. ~3% market share.
- **VoiceOver** (macOS/iOS, built-in): ~7% market share on desktop, ~4% on mobile.
- **TalkBack** (Android, built-in): ~3% market share.

### Design Tools
- **Stark**: Figma/Sketch/Adobe XD plugin for contrast, colorblind simulation.
- **Able**: Figma plugin for contrast checking and focus order.
- **Contrast**: Online color contrast checker with WCAG scores.

## Rules
- Semantic HTML first. ARIA is a supplement, never a replacement.
- Every interactive element is keyboard accessible. No exceptions.
- Never set outline: none without providing a visible focus indicator.
- Color is never the only way to convey information. Add text labels, icons, or patterns.
- Dynamic content changes are announced to screen readers via aria-live.
- Automated a11y testing (axe-core) runs in CI. Manual testing with a real screen reader (VoiceOver, NVDA) is done before release.
- Headings must form a logical hierarchy (no skipping levels).
- Every form input must have an associated label or aria-label.
- Skip link must be the first focusable element on every page.
- Focus must be managed for modal dialogs, tab panels, menus, and other composite widgets.

## References

- `references/a11y-aria.md` -- ARIA Patterns & Best Practices
- `references/a11y-testing.md` -- Accessibility Testing Patterns
- `references/a11y-tools.md` -- Accessibility Tools
- `references/accessible-data-visualization.md` -- Accessible Data Visualization
- `references/accessible-forms.md` -- Accessible Forms
- `references/wcag-checklist.md` -- WCAG 2.1 AA Checklist
- `references/wcag-22-compliance.md` -- WCAG 2.2 Compliance Deep Dive
- `references/accessible-component-patterns.md` -- Accessible Component Patterns

## Handoff
No artifact produced.
Next skill: frontend-testing -- test accessibility assertions.
Carry forward: a11y patterns used, WCAG level, automated testing setup.
