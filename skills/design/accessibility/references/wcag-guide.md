# WCAG Guide

## WCAG Levels

| Level | Minimum Requirements | Target |
|-------|---------------------|--------|
| A | 30 criteria — basic support | Minimum viable, legal baseline |
| AA | 20 additional criteria — major barriers removed | Standard target for all products |
| AAA | 28 additional criteria — highest conformance | Government, healthcare, finance |

## POUR Principles

### Perceivable
- Text alternatives (1.1.1) — all non-text content has alt text
- Time-based media (1.2) — captions, transcripts, audio descriptions
- Adaptable (1.3) — content makes sense when linearized, no information conveyed by sensory characteristics alone
- Distinguishable (1.4) — color contrast, text resize, no auto-play audio

### Operable
- Keyboard accessible (2.1) — all functionality from keyboard
- Enough time (2.2) — adjustable time limits, no auto-advance without warning
- Seizures (2.3) — no flashing content >3 per second
- Navigable (2.4) — skip links, descriptive headings, focus order, multiple ways to find pages

### Understandable
- Readable (3.1) — language set on page, unusual words defined
- Predictable (3.2) — consistent navigation, no unexpected context changes
- Input assistance (3.3) — error identification, labels, suggestions, prevention

### Robust
- Compatible (4.1) — valid HTML, ARIA, parsable by assistive tech

## Common Violations

| Violation | WCAG | Fix |
|-----------|------|-----|
| Missing alt text | 1.1.1 | Add descriptive alt text to all images |
| Low contrast | 1.4.3 | Check ratio ≥ 4.5:1 for normal text |
| No heading structure | 1.3.1 | Add h1–h6 hierarchy (no skipping) |
| Empty button/link | 4.1.2 | Add text content or aria-label |
| Missing form label | 1.3.1 / 3.3.2 | Add `<label>` to every input |
| No focus indicator | 2.4.7 | Add visible focus style (2px, 3:1 contrast) |
| Non-semantic structure | 1.3.1 | Use nav, main, aside, footer, heading |

## Semantic Markup Checklist

- [ ] One `<h1>` per page describing the page purpose
- [ ] Headings in sequence (no h2 → h4 jumps)
- [ ] Landmarks: header, nav, main, aside, footer
- [ ] `<button>` for actions, `<a>` for navigation
- [ ] Lists use `<ul>` / `<ol>` with `<li>` children
- [ ] Tables have `<caption>` and `<th scope="">`
- [ ] Forms use `<fieldset>` + `<legend>` for groups

## ARIA Decision Tree

```
Is there a native HTML element? → Use it
Does the native element need a label? → Use aria-label or aria-labelledby
Does the widget manage sub-elements? → Add role + keyboard arrow navigation
Does content update dynamically? → Add aria-live region
Is it a modal or dialog? → role="dialog" + aria-modal + focus trap
```
