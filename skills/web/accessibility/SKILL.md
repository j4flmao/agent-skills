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

## Testing Accessibility

### Automated Test Setup (Vitest + Testing Library)
```typescript
// a11y.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Login page has no accessibility violations', async () => {
  const { container } = render(<LoginPage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

// Testing specific role queries
test('navigation has correct landmark roles', () => {
  render(<App />);
  expect(screen.getByRole('navigation')).toBeInTheDocument();
  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByRole('contentinfo')).toBeInTheDocument();
});

// Focus management tests
test('modal traps focus on open', async () => {
  const { user } = setup(<Modal />);
  await user.click(screen.getByText('Open'));

  // First focusable element should be focused
  expect(screen.getByRole('dialog')).toHaveFocus();

  // Tab should cycle within modal
  await user.tab();
  expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();
});
```

### E2E Accessibility Testing (Playwright)
```typescript
// e2e/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage should not have automatically detectable issues', async ({ page }) => {
  await page.goto('/');
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

// Filter known issues
test('filter out false positives', async ({ page }) => {
  await page.goto('/form');
  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast', 'label', 'aria-valid-attr'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### Manual Testing Checklist
Test with real assistive technology before shipping:
- [ ] Navigate entire page with Tab key only — can you reach everything?
- [ ] Screen reader (VoiceOver/NVDA/JAWS) reads page in logical order
- [ ] All images have meaningful alt text (or `role="presentation"`)
- [ ] Dynamic content changes are announced via `aria-live`
- [ ] Forms: error messages associated via `aria-describedby`
- [ ] Touch targets ≥ 44x44px on mobile
- [ ] Text can be zoomed to 200% without loss of functionality
- [ ] Custom components have correct ARIA roles, states, and properties

### Accessibility Audit Tools

| Tool | Type | What It Checks | Integration |
|------|------|---------------|-------------|
| axe-core | Library | 50+ WCAG rules | Testing library, Playwright, Cypress |
| Lighthouse | Browser | Automated audit + suggestions | CI, local dev, PageSpeed Insights |
| WAVE | Browser extension | Visual overlay of issues | Manual testing |
| Accessibility Insights | Desktop tool | FastPass + manual tests | Guided manual testing |
| NVDA/JAWS | Screen reader | Full screen reader experience | Manual testing |
| Colour Contrast Analyser | Desktop tool | WCAG AA/AAA contrast | Design review |
| Pa11y | CLI | Continuous integration | CI pipeline |
| Chrome DevTools | Built-in | Issues tab, rendering tab | Quick checks during development |

### CI Pipeline Integration
```yaml
# .github/workflows/a11y.yml
name: Accessibility
on: [pull_request]
jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm build
      - run: npx pa11y-ci --sitemap https://staging.example.com/sitemap.xml
        env:
          PA11Y_SITEMAP_URL: https://staging.example.com
      - run: pnpm test -- --testPathPattern="a11y"
```

## Mobile Accessibility Patterns

### Touch Target Sizing
```css
/* Minimum 44x44px touch target */
.button {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;
}

/* Increase spacing between touch targets */
.nav-item + .nav-item {
  margin-top: 8px;
}
```

### Screen Reader Announcements
```typescript
// React Native
import { AccessibilityInfo, announceForAccessibility } from 'react-native';

// Announce dynamic content
announceForAccessibility('Item added to cart');

// Group related elements
<View accessible={true} accessibilityLabel="Order summary: 2 items, $45.00 total">
  <Text>2 items</Text>
  <Text>$45.00</Text>
</View>;
```

### Reduced Motion
```css
/* Respect OS-level motion preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Mobile-specific */
@media (prefers-reduced-motion: reduce) and (max-width: 768px) {
  .slide-in {
    animation: none;
    transform: none;
  }
}
```

### Orientation & Gesture Alternatives
```typescript
// Provide alternatives to gesture-based interactions
// Swipe to delete → also show delete button
function SwipeableRow({ onDelete, children }) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div>
      {children}
      {showDelete && (
        <button
          onClick={onDelete}
          aria-label="Delete item"
        >
          Delete
        </button>
      )}
    </div>
  );
}
```

## Production Monitoring & Compliance

### Accessibility Statement
Generate and publish an accessibility statement:
```markdown
# Accessibility Statement for [App Name]

We are committed to ensuring digital accessibility for people with disabilities.
We are continually improving the user experience for everyone.

## Conformance status
The Web Content Accessibility Guidelines (WCAG) define requirements for designers
and developers. [App Name] aims for WCAG 2.2 Level AA conformance.

## Date
This statement was last updated on [Date].

## Assessment approach
[Organization] assessed the accessibility of [App Name] using:
- Automated testing (axe-core in CI)
- Manual testing with screen readers
- User testing with people with disabilities

## Feedback
We welcome your feedback. Contact us at [email] or [phone].
```

### Monitoring Regressions
- Add a11y tests to CI pipeline — fail PRs that introduce violations
- Run Lighthouse CI on every PR and track score in PR comment
- Schedule weekly automated scan with Pa11y or axe-core
- Log screen reader bugs in issue tracker with `a11y` label
- Include a11y review in definition of done for all features

## Anti-Patterns

| Anti-Pattern | Why It Fails | Better Approach |
|---|---|---|
| ARIA overuse | "ARIA is only a contract" — misuse creates worse experience | Native HTML first. ARIA only when no HTML equivalent exists. |
| Alt text on decorative images | Screen reader noise | `alt=""` or `role="presentation"` for decorative images |
| Focus outline removal | Keyboard users can't see focus position | Custom focus styles with high contrast `:focus-visible` |
| Color-only indicators | Red-green colorblind users can't distinguish | Add icons, patterns, or text labels alongside color |
| Auto-playing media | Disorienting for screen reader users | No auto-play. If necessary, provide pause button. |
| Infinite scroll without load-more | Keyboard users can't reach footer content | Add "Load more" button or pagination with skip links |
| Hover-only interactions | Touch and keyboard users can't hover | Make interactions available on click/focus too |
| Complex tables without headers | Screen readers can't associate data | Use `<th>` with `scope` attributes. Test with screen reader. |
| Relying solely on automated tools | Only 30-40% of issues found automatically | Automated + manual + user testing required |
| Adding a11y late | Retrofitting costs 10x more than building accessible | Include in design system, component library, and MVP scope |

## Quick Reference: Common WCAG Violations

| WCAG Criterion | Description | Fix |
|----------------|-------------|-----|
| 1.1.1 Non-text Content | Missing alt text | Add `alt` attributes to all images |
| 1.3.1 Info and Relationships | Headings not semantic | Use `<h1>`-`<h6>` hierarchy, not styled `<div>`s |
| 1.4.3 Contrast Minimum | Text color too light | AA: 4.5:1 (normal), 3:1 (large). AAA: 7:1 (normal). |
| 2.1.1 Keyboard | Function not keyboard accessible | Add tabindex, keydown handlers |
| 2.4.3 Focus Order | Tab order doesn't match visual | Logical DOM order, no positive tabindex values |
| 2.4.6 Headings and Labels | Unclear form labels | Explicit `<label>` for every form control |
| 3.3.1 Error Identification | Error not associated with field | `aria-describedby` linking error to input |
| 4.1.2 Name, Role, Value | Custom widget lacks ARIA | `role`, `aria-*` properties on custom components |
