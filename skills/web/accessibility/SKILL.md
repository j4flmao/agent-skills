# Accessibility Skill

## Overview
Web accessibility ensures applications are usable by people with disabilities. This skill covers ARIA patterns, testing strategies, WCAG compliance, and inclusive design patterns.

## Decision Tree: Accessibility Approach

### Compliance Level
```
What compliance level do I need?
├── Public-facing website / government → WCAG 2.1 AA (minimum), AAA where practical
├── Enterprise B2B SaaS → WCAG 2.1 AA (legal requirement in many regions)
├── Internal company tool → WCAG 2.1 A (essential), AA where practical
├── Mobile app → WCAG 2.1 AA (Apple/Google store requirements)
└── Personal project → At minimum: keyboard support, color contrast, alt text
```

### Implementation Priority
```
What should I fix first?
├── No keyboard support → CRITICAL — some users can only use keyboard
├── Missing alt text on images → HIGH — screen reader can't describe content
├── Low color contrast → HIGH — affects readability for low-vision users
├── Missing form labels → HIGH — forms are unusable without labels
├── No heading structure → MEDIUM — navigation by headings is common
├── No focus indicators → MEDIUM — keyboard users need to know focus location
├── Missing ARIA landmarks → MEDIUM — helps screen reader navigation
├── No skip links → LOW — annoyance, but alternative navigation exists
└── Autoplaying video/audio → LOW — annoying, but pausable
```

## ARIA Patterns

### When to Use ARIA
```
Do I need ARIA?
├── Native HTML element handles behavior (button, input, select) → NO ARIA needed
├── Custom interactive control (tab panel, accordion, dialog) → YES, use ARIA roles
├── Dynamic content updates (toast, loading spinner) → YES, use live regions
├── Adding semantics to generic elements → YES, add appropriate role
├── Hiding decorative content from screen readers → YES, use aria-hidden
└── Fixing broken semantics → NO, fix the HTML instead
```

### Pattern: Custom Select
```html
<div class="custom-select">
  <button
    role="combobox"
    aria-expanded="false"
    aria-haspopup="listbox"
    aria-labelledby="select-label"
    id="select-button"
    tabindex="0"
    aria-controls="select-listbox"
  >
    <span id="select-value">Select option...</span>
  </button>
  <ul
    id="select-listbox"
    role="listbox"
    aria-labelledby="select-label"
    hidden
  >
    <li role="option" id="opt-1" aria-selected="false" tabindex="-1">Option 1</li>
    <li role="option" id="opt-2" aria-selected="false" tabindex="-1">Option 2</li>
    <li role="option" id="opt-3" aria-selected="false" tabindex="-1">Option 3</li>
  </ul>
</div>
```

### Pattern: Toast / Notification
```html
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  class="toast"
>
  <p>Item successfully added to cart.</p>
</div>
```

### Pattern: Loading State
```html
<div role="status" aria-live="polite">
  <span class="sr-only">Loading search results...</span>
  <div class="spinner" aria-hidden="true"></div>
</div>
```

### Pattern: Progress Bar
```html
<div
  role="progressbar"
  aria-valuenow="65"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Upload progress"
>
  <div class="progress-bar" style="width: 65%"></div>
</div>
```

## WCAG Compliance Patterns

### Color Contrast
```css
/* WCAG AA: 4.5:1 for normal text, 3:1 for large text */
/* WCAG AAA: 7:1 for normal text, 4.5:1 for large text */

/* BAD: Insufficient contrast */
.muted-text { color: #999999; } /* On white: ratio 2.8:1 */

/* GOOD: Sufficient contrast */
.muted-text { color: #595959; } /* On white: ratio 4.5:1 */
```

### Focus Indicators
```css
/* Custom focus styles (never remove outline without replacement) */
:focus-visible {
  outline: 2px solid #4A90D9;
  outline-offset: 2px;
  border-radius: 2px;
}

/* BAD: Removing focus outline */
*:focus { outline: none; } /* Never do this! */

/* GOOD if you must customize */
*:focus { outline: none; }
*:focus-visible {
  box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.5);
}
```

### Skip Link Pattern
```html
<style>
  .skip-link {
    position: absolute;
    top: -100%;
    left: 0;
    padding: 8px 16px;
    background: #333;
    color: white;
    z-index: 10000;
  }
  .skip-link:focus {
    top: 0;
  }
</style>
<a href="#main-content" class="skip-link">Skip to main content</a>
```

### Reduced Motion
```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Keyboard Navigation Patterns

### Focus Management (Modal)
```typescript
function openModal(modalEl: HTMLElement) {
  // Save previously focused element
  const previousFocus = document.activeElement as HTMLElement;

  // Show modal and focus first focusable element
  modalEl.hidden = false;
  const firstFocusable = modalEl.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  firstFocusable?.focus();

  // Trap focus within modal
  modalEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') trapFocus(modalEl, e);
  });

  // Restore focus on close
  previousFocus.focus();
}
```

### Keyboard Event Handler
```typescript
function handleKeyNav(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowUp':
      // Move focus to previous item
      moveFocus(-1);
      break;
    case 'ArrowDown':
      // Move focus to next item
      moveFocus(1);
      break;
    case 'Home':
      // Move focus to first item
      moveFocus('first');
      break;
    case 'End':
      // Move focus to last item
      moveFocus('last');
      break;
    case 'Enter':
    case ' ':
      // Activate item
      activateItem();
      break;
  }
}
```

## Testing Strategy

### Automated Testing Decision Tree
```
What tool for accessibility testing?
├── Unit testing components → jest-axe (in Jest test suite)
├── E2E testing → Cypress + cypress-axe
├── Full page audit → Lighthouse CI
├── CI pipeline → pa11y-ci or axe-core CLI
└── Continuous monitoring → axe DevTools Pro or Deque WorldSpace
```

### Test Pattern: jest-axe
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('button component has no a11y violations', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

test('respects rule exemptions', async () => {
  const { container } = render(<LowContrastComponent />);
  const results = await axe(container, {
    rules: { 'color-contrast': { enabled: false } },
  });
  expect(results).toHaveNoViolations();
});
```

### Manual Testing Checklist
```
Keyboard Testing:
□ All interactive elements are reachable via Tab
□ Tab order follows visual order
□ All functionality is operable with keyboard alone
□ No keyboard traps (focus gets stuck)
□ Focus indicator is always visible
□ Escape closes modals/menus
□ Arrow keys navigate within components (listbox, tabs, menu)

Screen Reader Testing:
□ All images have appropriate alt text
□ Forms have labels announced
□ Dynamic content is announced
□ Headings provide document structure
□ Landmarks enable navigation
□ Tables have headers
□ Error messages are announced

Visual Testing:
□ Color contrast meets WCAG AA (4.5:1)
□ Content readable at 200% zoom
□ No information conveyed by color alone
□ Touch targets are 44x44px minimum
□ Focus indicators are clearly visible
```

## Key Anti-Patterns
- **Using ARIA when native HTML works**: `<button>` is better than `<div role="button">`
- **Removing focus outlines**: Always provide visible focus indicators
- **Relying solely on color**: Use icons, text, or patterns in addition to color
- **Only automated testing**: Automated tools catch only 30-50% of issues
- **Ignoring reduced motion**: Always respect `prefers-reduced-motion`
- **Empty alt text for informative images**: `alt=""` is for decorative only
- **Using `aria-label` on visible text labels**: Use `aria-labelledby` instead
- **Making everything a landmark**: Too many landmarks reduce usefulness
- **Dynamic content without live regions**: Screen readers won't know content changed
- **Testing accessibility only at the end**: Include a11y from the start
- **Assuming accessibility = screen readers**: Includes motor, cognitive, low vision

## Inclusive Design Patterns

### Accessible Forms
- Labels must be programmatically associated with inputs
- Error messages must be linked via `aria-describedby`
- Required fields use `aria-required="true"`
- Success states should also be announced
- Group related fields with `<fieldset>` and `<legend>`

### Accessible Data Tables
```html
<table>
  <caption>User accounts and their roles</caption>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Email</th>
      <th scope="col">Role</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Alice Smith</th>
      <td>alice@example.com</td>
      <td>Admin</td>
    </tr>
  </tbody>
</table>
```

### SVG Accessibility
```html
<!-- Decorative SVG -->
<svg aria-hidden="true" focusable="false">
  <circle cx="10" cy="10" r="10" fill="currentColor" />
</svg>

<!-- Informative SVG -->
<svg role="img" aria-labelledby="chart-title">
  <title id="chart-title">Revenue by quarter: Q1 $10K, Q2 $15K, Q3 $12K, Q4 $20K</title>
  <!-- chart content -->
</svg>
```
