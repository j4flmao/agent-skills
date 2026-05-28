# Design System Accessibility

## Why Accessibility Must Be Part of the Design System

Accessibility is not a feature to add at the end of development. It must be built into the design system from day one. When every component in the design system is accessible by default, every product built with it inherits that accessibility.

### Cost of Retrofitting

```
Accessibility built in:           ~5% additional component development cost
Accessibility added post-launch:  ~50-200% additional cost per component
```

## Design Phase Accessibility

### Color and Contrast in Design Tokens

Design tokens must include accessible color pairings, not just individual colors.

```json
{
  "color": {
    "text": {
      "primary": {
        "value": "#111827",
        "contrast": {
          "bg-primary": "14.1:1",
          "bg-secondary": "12.3:1",
          "brand": "3.2:1"
        }
      },
      "disabled": {
        "value": "#9ca3af",
        "contrast": {
          "bg-primary": "3.1:1",
          "bg-secondary": "2.8:1"
        },
        "note": "Fails 4.5:1 -- only for disabled elements, not text content"
      }
    }
  }
}
```

### Color Palette Accessibility Requirements

Every color in the palette must meet WCAG 2.1 AA (4.5:1) contrast against:
- Color-bg-primary (white or light)
- Color-bg-inverse (dark)
- Color-brand (for text on brand backgrounds)

### Focus Indicator Token

```css
:root {
  --focus-ring-color: #3b82f6;
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  --focus-ring-style: solid;
  /* Must have 3:1 contrast against adjacent colors */
  /* Must be at least 2px thick (WCAG 2.2 Focus Appearance AAA) */
}
```

### Typography and Readability

- Body text minimum: 16px (1rem) for optimal readability
- Line height: 1.5 for body text, 1.3 for headings
- Max line length: 66-75 characters per line
- Font weight: 400 minimum for body text (300 may fail contrast at small sizes)

## Component Accessibility Specifications

### Button

**HTML**: `<button>` or `<a>` (never `div` with role="button" unless absolutely necessary)

**Keyboard**:
- Enter/Space to activate
- Tab to focus
- Focus ring visible on `:focus-visible`

**ARIA**:
- `aria-disabled` when visually disabled but needs to be focusable
- `aria-busy` and `aria-label` when loading
- `aria-pressed` for toggle buttons
- `aria-expanded` for buttons that control expandable sections

**States**:
- Default: 4.5:1 text contrast, 3:1 background contrast
- Hover: 3:1 contrast change from default
- Focus: 2px ring with 3:1 contrast against adjacent
- Active: 3:1 contrast change from default (inverse or darker)
- Disabled: 3:1 text contrast minimum (may fail 4.5:1)
- Loading: Spinner + "Loading" text for screen readers

**Design review checklist**:
- [ ] Text contrast 4.5:1 (normal) or 3:1 (large)
- [ ] Hover state visually distinct from default
- [ ] Focus ring visible and meets contrast
- [ ] Disabled state clearly distinguishable
- [ ] Touch target 44x44px minimum

### Link

**HTML**: `<a href="...">`

**Keyboard**: Tab to focus, Enter to navigate

**ARIA**:
- `aria-current="page"` for current page in navigation
- `aria-label` if link text alone is insufficient

**States**:
- Default: Underline or 3:1 contrast difference from body text
- Hover: Stronger visual distinction (darker underline, color change)
- Focus: 2px ring with 3:1 contrast
- Visited: Different color from unvisited
- Active: Distinct from hover

**Design review checklist**:
- [ ] Links are visually distinguishable from body text (not just color)
- [ ] Underline or 3:1 color contrast difference
- [ ] Focus state visible
- [ ] Visited state distinct

### Form Input

**HTML**: `<input>`, `<textarea>`, `<select>` with `<label>`

**Keyboard**: Tab between fields, Enter to submit

**ARIA**:
- `aria-describedby` for hints and errors (not `aria-labelledby` for label -- use `<label>`)
- `aria-invalid="true"` on validation error
- `aria-required="true"` for required fields (in addition to `required` attribute)
- `aria-live="polite"` on error message container

**States**:
- Default: Label visible, placeholder not as label
- Focus: Visible focus ring on the input, not the wrapper
- Hover: Border color or background change
- Active: Typing state indicates focus
- Disabled: Reduced opacity, not focusable
- Error: Red border + error message + `aria-invalid`
- Success/Valid: Optional green indicator (not color-only)
- Required: Asterisk + "required" text or `aria-required`

**Design review checklist**:
- [ ] Every input has a visible label (not placeholder-only)
- [ ] Error state includes error message text
- [ ] Error is not communicated by color alone
- [ ] Focus ring visible
- [ ] Touch target 44x44px for mobile

### Modal / Dialog

**HTML**: `<dialog>` with `role="dialog"` and `aria-modal="true"`

**Keyboard**:
- Focus trapped inside modal
- Tab cycles through focusable elements
- Escape closes modal
- Focus returns to trigger element on close

**ARIA**:
- `aria-modal="true"`
- `aria-labelledby` pointing to the dialog title
- `aria-describedby` pointing to the dialog description

**Design review checklist**:
- [ ] Overlay/backdrop has 50-70% opacity
- [ ] Close button visible and accessible (not just Escape)
- [ ] Focus trap implemented
- [ ] Scrim is clickable to close (with confirmation if destructive action)
- [ ] Width constrained (max 90vw, 560px max for comfortable reading)

### Tooltip

**HTML**: `role="tooltip"` on the tooltip content, `aria-describedby` on the trigger element

**Keyboard**: Tooltip appears on focus and hover

**Dismiss**:
- Escape or blur dismisses tooltip
- Tooltip should be persistent while hovering over tooltip content

**ARIA**:
- `role="tooltip"` on the tooltip element
- `aria-describedby` on the trigger, pointing to tooltip ID

**Design review checklist**:
- [ ] Tooltip is dismissible (WCAG 1.4.13)
- [ ] Tooltip can be hovered without disappearing (WCAG 1.4.13)
- [ ] Tooltip is persistent until dismissed (no timeout)
- [ ] Text contrast 4.5:1 within tooltip

### Accordion

**HTML**: Button with `<h2-h6>` wrapper + content `div`

**Keyboard**:
- Enter/Space to toggle
- Tab between accordion headers
- Some designs use Arrow Up/Down to move between headers (optional)

**ARIA**:
- `aria-expanded="true/false"` on the button
- `aria-controls` pointing to the content panel
- `role="region"` and `aria-labelledby` on the content panel

**Design review checklist**:
- [ ] Expand/collapse indicator visible (chevron, +/-, icon)
- [ ] Animation respects prefers-reduced-motion
- [ ] Content is announced when expanded

### Tabs

**HTML**: `role="tablist"` container, `role="tab"` buttons, `role="tabpanel"` content

**Keyboard**:
- Arrow keys to switch tabs
- Tab to move between tablist and tabpanel
- Home/End to jump to first/last tab

**ARIA**:
- `aria-selected="true/false"` on tabs
- `aria-controls` on tabs pointing to panels
- `aria-labelledby` on panels pointing to tabs

**Design review checklist**:
- [ ] Active tab clearly distinguishable from inactive
- [ ] Focus ring on active tab
- [ ] Tab panel shows content (not just the tab label)

### Table (Data Table)

**HTML**: `<table>`, `<thead>`, `<tbody>`, `<th>` with `scope`

**Keyboard**:
- Tab to focus the table
- Arrow keys to navigate cells (for interactive tables)
- Focus indicator on sort headers

**ARIA**:
- `aria-sort="ascending/descending"` on sortable column headers
- `role="columnheader"` on `th` elements (default)
- `<caption>` element for table description
- `scope="col"` or `scope="row"` on header cells

**Design review checklist**:
- [ ] Row hover/striping not the only way to identify rows
- [ ] Sort indicators (arrows) visible and announced
- [ ] Column widths accommodate content without truncation
- [ ] Responsive: horizontal scroll or restructured layout on mobile

### Card

**HTML**: `<article>` or `<section>` with appropriate heading levels

**Keyboard**:
- If clickable, use `<button>` or `<a>` as the interactive element
- Never make the entire card a single click target -- provide distinct links/buttons

**ARIA**:
- Tab through interactive elements inside card
- Do not add `role="button"` to the card container

**Design review checklist**:
- [ ] Card title is a proper heading
- [ ] Interactive elements inside card are individually focusable
- [ ] Card states (hover, focus) clearly indicated
- [ ] Touch target 44x44px for card actions on mobile

### Navigation (Sidebar / Top Bar)

**HTML**: `<nav>` with `<ul>` and `<li>` for menu structure

**Keyboard**:
- Tab through navigation items
- Arrow keys for submenu navigation
- Escape closes submenu

**ARIA**:
- `aria-label="Main"` or `aria-label="Secondary"` on `<nav>`
- `aria-current="page"` on current page link
- `aria-expanded` on collapsible sections
- `aria-haspopup="true"` on menus

**Design review checklist**:
- [ ] Current page indicator visible (not color only)
- [ ] Sub-menu indicators (chevrons) visible
- [ ] Hamburger menu collapses/expands with animation respecting reduced motion
- [ ] Skip link as first focusable element

### Toast / Notification

**HTML**: `role="alert"` or `role="status"` depending on urgency

**ARIA**:
- `role="alert"` for errors/critical (announces immediately)
- `role="status"` for non-critical success/info (announces when idle)
- `aria-live="polite"` for general notifications
- `aria-atomic="true"` to announce entire content

**Keyboard**: 
- Toast should not steal focus
- Dismiss button accessible via keyboard

**Design review checklist**:
- [ ] Auto-dismiss has sufficient duration (min 5 seconds, preferably persistent)
- [ ] Dismiss button visible and accessible
- [ ] Notification is announced without stealing focus
- [ ] Toast does not overlap critical content

## Accessibility Testing in Design System

### Automated Tests

Every component must pass axe-core tests for all variants:

```tsx
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

const variants = ['primary', 'secondary', 'ghost', 'danger'];
const sizes = ['sm', 'md', 'lg'];

describe('Button accessibility', () => {
  variants.forEach((variant) => {
    sizes.forEach((size) => {
      it(`has no violations for ${variant}/${size}`, async () => {
        const { container } = render(
          <Button variant={variant} size={size}>Click</Button>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });
  });

  it('has no violations when disabled', async () => {
    const { container } = render(<Button disabled>Click</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Keyboard Testing Protocol

For every component, manually test:

1. Tab to focus the component
2. Enter activates action (button, link, submit)
3. Space activates action (button, checkbox)
4. Escape dismisses (modal, dropdown, menu)
5. Arrow keys navigate within component (tabs, menu, select)
6. Focus is trapped in modals
7. Focus returns to trigger on close

### Screen Reader Testing Protocol

Test each component with:
- VoiceOver (macOS): Cmd+F5 to enable
- NVDA (Windows): Free, most common
- JAWS (Windows): Enterprise standard

Checklist:
1. Component announces correct role
2. Component announces current state (expanded, selected, disabled)
3. Component announces label/name
4. Dynamic content changes are announced
5. Navigation order makes sense

## Design System Accessibility Audit Process

### Pre-Release Audit

Before each major release, run a full accessibility audit:

1. Automated: axe-core on every component story
2. Color contrast: Check all token combinations meet 4.5:1
3. Keyboard: Every interaction sequence tested
4. Screen reader: VoiceOver + NVDA on key components
5. Focus management: Verify focus order and visibility
6. Reduced motion: Verify all animations respect prefers-reduced-motion

### Audit Report Format

```yaml
Component: Button
Version: 2.0.0
Audit Date: 2025-01-15
Auditor: a11y-team

Results:
  Automated (axe-core): PASS
  Color contrast: PASS (4.5:1+ all variants)
  Keyboard navigation: PASS
  Screen reader (VoiceOver): PASS
  Screen reader (NVDA): PASS
  Focus management: PASS
  Reduced motion: PASS

Issues Found: 0

Notes:
  - All variants pass axe-core
  - Loading state uses aria-busy="true"
  - Focus ring meets 2px minimum
```

## Accessibility Decision Records

### When to Use ARIA vs Native HTML

```
Pattern: Button
Decision: Use <button> element
Rationale: Native keyboard, form support, built-in role
Exception: When <button> styling cannot be overridden in the framework

Pattern: Custom Select
Decision: Use <select> if possible, ARIA listbox if custom rendering required
Rationale: Native select has built-in keyboard, autocomplete, form support
Exception: When design requires custom option rendering with images/layouts

Pattern: Modal
Decision: Use native <dialog> with <form method="dialog">
Rationale: Built-in focus management, Escape handling, backdrop
Exception: When <dialog> lacks sufficient styling control (rare)
```

## Accessibility-First Component Checklist

- [ ] Uses semantic HTML element
- [ ] ARIA attributes correct and complete
- [ ] Keyboard accessible (all interactions available via keyboard)
- [ ] Focus order matches visual order
- [ ] Focus indicator visible (2px minimum, 3:1 contrast)
- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 UI)
- [ ] Touch targets 44x44px minimum
- [ ] Error states conveyed not by color alone
- [ ] Dynamic content announced (aria-live)
- [ ] Animation respects prefers-reduced-motion
- [ ] Screen reader announces role, state, name
- [ ] All states have visible styling (hover, focus, active, disabled)
- [ ] Labels associated with controls
- [ ] Headings maintain logical hierarchy
