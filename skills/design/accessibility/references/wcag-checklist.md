# WCAG Checklist

## WCAG 2.2 Levels Summary

| Level | Conformance | Target | Coverage |
|-------|-------------|--------|----------|
| A | Minimum | Essential accessibility | All new features must pass |
| AA | Acceptable | Legal compliance (most regulations) | Required for production launch |
| AAA | Optimal | Best-in-class accessibility | Targeted improvements only |

## Perceivable

### Text Alternatives (1.1)
- [ ] 1.1.1 Non-text Content (A): All images have `alt` text — functional images describe action, decorative images use `alt=""`
- [ ] 1.1.1: Icons have accessible names via `aria-label` or `title`
- [ ] 1.1.1: Complex images (charts, graphs) have long descriptions via `aria-describedby`
- [ ] 1.1.1: Form controls have associated labels via `<label for>` or `aria-labelledby`
- [ ] 1.1.1: CAPTCHAs have alternative identification methods (audio, logic puzzle)

### Time-based Media (1.2)
- [ ] 1.2.1 Audio-only and Video-only (A): Transcript provided for audio-only, text/audio description for video-only
- [ ] 1.2.2 Captions (A): Synchronized captions for all video with audio
- [ ] 1.2.3 Audio Description (A): Audio description or text alternative for video content
- [ ] 1.2.4 Captions (Live) (AA): Live video has real-time captions
- [ ] 1.2.5 Audio Description (Prerecorded) (AA): Audio description provided for all prerecorded video

### Adaptable (1.3)
- [ ] 1.3.1 Info and Relationships (A): Semantic HTML used (`<nav>`, `<main>`, `<header>`, `<footer>`, `<aside>`)
- [ ] 1.3.1: Headings nested properly (`h1 > h2 > h3`), no skipped levels
- [ ] 1.3.1: Lists use `<ul>`/`<ol>` not styled `<div>`s
- [ ] 1.3.1: Data tables use `<th>`, `scope`, `<caption>`, `<thead>`
- [ ] 1.3.2 Meaningful Sequence (A): Content order in DOM matches visual order
- [ ] 1.3.3 Sensory Characteristics (A): Instructions don't rely on shape, size, or position alone
- [ ] 1.3.4 Orientation (AA): Content not locked to portrait or landscape
- [ ] 1.3.5 Identify Input Purpose (AA): Autocomplete attributes on form fields (`autocomplete="email"`)

### Distinguishable (1.4)
- [ ] 1.4.1 Use of Color (A): Color not the only way to convey information
- [ ] 1.4.2 Audio Control (A): Auto-playing audio has pause/stop control
- [ ] 1.4.3 Contrast (Minimum) (AA): Text contrast ≥ 4.5:1, large text ≥ 3:1
- [ ] 1.4.4 Resize Text (AA): Text can resize to 200% without loss of content
- [ ] 1.4.5 Images of Text (AA): Text used instead of images of text (exceptions: logos)
- [ ] 1.4.10 Reflow (AA): No horizontal scroll at 400% zoom (320px width)
- [ ] 1.4.11 Non-text Contrast (AA): UI components and graphical objects have ≥ 3:1 contrast
- [ ] 1.4.12 Text Spacing (AA): No loss of content when text styled with line-height 1.5, spacing 0.12em
- [ ] 1.4.13 Content on Hover or Focus (AA): Hover/focus tooltips dismissable, hoverable, persistent

## Operable

### Keyboard Accessible (2.1)
- [ ] 2.1.1 Keyboard (A): All functionality operable through keyboard
- [ ] 2.1.2 No Keyboard Trap (A): Focus can move away from any component via keyboard
- [ ] 2.1.3 Keyboard (No Exception) (AAA): All functionality — including mouse-specific — keyboard accessible
- [ ] 2.1.4 Character Key Shortcuts (A): Single-key shortcuts can be turned off or remapped

### Enough Time (2.2)
- [ ] 2.2.1 Timing Adjustable (A): Time limits have extend/disable option (at least 10× warning)
- [ ] 2.2.2 Pause, Stop, Hide (A): Moving, blinking, scrolling content has pause button
- [ ] 2.2.3 No Timing (AAA): No time limit for completing tasks (or extendable indefinitely)

### Seizures and Physical Reactions (2.3)
- [ ] 2.3.1 Three Flashes or Below Threshold (A): No content flashes more than 3× per second
- [ ] 2.3.2 Three Flashes (AAA): No flashing content at all

### Navigable (2.4)
- [ ] 2.4.1 Bypass Blocks (A): Skip to main content link present
- [ ] 2.4.2 Page Titled (A): Each page has descriptive `<title>`
- [ ] 2.4.3 Focus Order (A): Tab order follows logical reading order
- [ ] 2.4.4 Link Purpose (In Context) (A): Link text describes destination (not "click here")
- [ ] 2.4.5 Multiple Ways (AA): Site has multiple navigation methods (search, sitemap, nav)
- [ ] 2.4.6 Headings and Labels (AA): Headings and labels describe topic or purpose
- [ ] 2.4.7 Focus Visible (AA): Visible focus indicator on all interactive elements
- [ ] 2.4.11 Focus Not Obscured (Minimum) (AA): Focused element not fully hidden by other content

### Input Modalities (2.5)
- [ ] 2.5.1 Pointer Gestures (A): All functionality that uses multipoint/path gestures has single-point alternative
- [ ] 2.5.2 Pointer Cancellation (A): Down-event not used for execution unless essential
- [ ] 2.5.3 Label in Name (A): Visible label text matches accessible name
- [ ] 2.5.4 Motion Actuation (A): Functionality triggered by device motion also available via UI
- [ ] 2.5.7 Dragging Movements (AA): All dragging operations have single-pointer alternative
- [ ] 2.5.8 Target Size (AA): Interactive targets ≥ 24×24px (AA)

## Understandable

### Readable (3.1)
- [ ] 3.1.1 Language of Page (A): `<html lang="en">` attribute set correctly
- [ ] 3.1.2 Language of Parts (AA): Language changes within content use `lang` attribute

### Predictable (3.2)
- [ ] 3.2.1 On Focus (A): Focusing an element does not trigger a context change
- [ ] 3.2.2 On Input (A): Changing form field values does not auto-submit
- [ ] 3.2.3 Consistent Navigation (AA): Navigation repeats across pages in same relative order
- [ ] 3.2.4 Consistent Identification (AA): Same functionality uses same icon/label consistently
- [ ] 3.2.6 Consistent Help (A): Help mechanisms in same location across pages

### Input Assistance (3.3)
- [ ] 3.3.1 Error Identification (A): Form errors described clearly in text
- [ ] 3.3.2 Labels or Instructions (A): Input requirements provided (format, required fields)
- [ ] 3.3.3 Error Suggestion (AA): Error messages suggest how to fix
- [ ] 3.3.4 Error Prevention (AA): Legal/financial transactions have confirm, review, undo
- [ ] 3.3.7 Redundant Entry (A): Information previously entered is auto-populated or selectable

## Robust

### Compatible (4.1)
- [ ] 4.1.1 Parsing (A): Elements have complete start/end tags, no duplicate IDs
- [ ] 4.1.2 Name, Role, Value (A): Custom controls have correct `role`, `aria-*` states, and properties
- [ ] 4.1.3 Status Messages (AA): Status changes via `role="status"` or `aria-live="polite"`

## Development Checklist

```html
<!-- Skip to content link -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Landmarks -->
<header role="banner">
<nav role="navigation" aria-label="Main navigation">
<main id="main-content" role="main">
<footer role="contentinfo">

<!-- ARIA live region for dynamic updates -->
<div aria-live="polite" aria-atomic="true">
  <!-- Dynamic content here announced by screen reader -->
</div>

<!-- Form field with visible error -->
<label for="email">Email address</label>
<input type="email" id="email" required aria-describedby="email-error">
<span id="email-error" role="alert">Please enter a valid email address</span>
```

## Testing Tools

- axe DevTools: Automated scan for 50% of issues
- WAVE: Visual overlay showing structure and issues
- Lighthouse: Score + automated checks
- NVDA/JAWS: Manual screen reader testing
- Colour Contrast Analyser: Check color pairs
- Accessibility Insights: Guided manual testing
