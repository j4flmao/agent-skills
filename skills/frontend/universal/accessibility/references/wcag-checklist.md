# WCAG 2.1 AA Checklist

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
