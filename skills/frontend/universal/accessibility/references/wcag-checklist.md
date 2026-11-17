# WCAG 2.1 AA Checklist (with WCAG 2.2 additions)

## Perceivable

### Text Alternatives
- [ ] All non-text content has a text alternative (`alt` on images, `aria-label` on icons)
- [ ] Decorative images have `alt=""` (empty alt)
- [ ] Complex images have long descriptions

### Time-based Media
- [ ] Videos have captions
- [ ] Audio content has transcripts

### Adaptable
- [ ] Content maintains meaning when linearized (no layout-dependent info)
- [ ] `aria-describedby` for complex relationships

### Distinguishable
- [ ] Color is not the only way to convey information
- [ ] Color contrast ratio >= 4.5:1 (normal text), >= 3:1 (large text)
- [ ] Text can be resized up to 200% without loss of content

## Operable

### Keyboard
- [ ] All functionality is operable via keyboard
- [ ] No keyboard traps
- [ ] Visible focus indicator (focus ring)

### Enough Time
- [ ] Users can turn off, adjust, or extend time limits

### Seizures
- [ ] No content flashes more than 3 times per second

### Navigable
- [ ] Skip navigation link is present
- [ ] Page titles describe purpose
- [ ] Focus order is logical
- [ ] Link purpose is clear from text alone

## Understandable

### Readable
- [ ] Language is set on the `<html>` element

### Predictable
- [ ] Navigation patterns are consistent across pages
- [ ] Components behave consistently

### Input Assistance
- [ ] Errors are clearly identified and described
- [ ] Suggestions for fixing errors are provided
- [ ] Form labels are associated with inputs

## Robust

### Compatible
- [ ] HTML elements have complete start/end tags
- [ ] ARIA attributes are used correctly
- [ ] Status messages are announced (aria-live, role="status")

## Implementation

```html
<!-- Skip link -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Focus visible -->
<button class="focus:outline-2 focus:outline-offset-2 focus:outline-blue-500">Submit</button>

<!-- ARIA live region for dynamic updates -->
<div aria-live="polite" role="status">
  {notification}
</div>

<!-- Form label -->
<label for="email">Email address</label>
<input id="email" type="email" aria-describedby="email-hint" />
<span id="email-hint">We'll never share your email.</span>
```

## WCAG 2.2 Additions (Level A and AA)
WCAG 2.2 (W3C Recommendation, October 2023) is the current target. It keeps every 2.1 criterion except 4.1.1 Parsing (removed) and adds:
- [ ] 2.4.11 Focus Not Obscured (Minimum) (AA): the focused element is not fully hidden by sticky headers, banners or chat widgets
- [ ] 2.5.7 Dragging Movements (AA): every drag action has a single-pointer alternative (buttons, tap-to-move)
- [ ] 2.5.8 Target Size (Minimum) (AA): pointer targets are at least 24x24 CSS px or have enough spacing
- [ ] 3.2.6 Consistent Help (A): help links/contact options appear in the same relative place across pages
- [ ] 3.3.7 Redundant Entry (A): information already entered in the same process is auto-filled or selectable
- [ ] 3.3.8 Accessible Authentication (Minimum) (AA): no cognitive function test to log in; allow paste and password managers
