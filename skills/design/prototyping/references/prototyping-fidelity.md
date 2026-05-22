# Prototyping Fidelity

## Fidelity Levels

| Level | Appearance | Interactivity | Best For |
|-------|-----------|---------------|----------|
| Low | Grayscale wireframes, placeholder text, rough layout | Click-through only, no animation | Concept validation, IA testing |
| Mid | Styled elements, real content, partial polish | Screen transitions + key interactions | Internal reviews, early usability |
| High | Pixel-perfect, real data, all states | Full interactions + micro-animations | Usability testing, stakeholder sign-off, dev handoff |

## Interaction Patterns

| Pattern | Behavior | Use Case |
|---------|----------|----------|
| Push | Screen slides left, new screen enters from right | Drill-down navigation |
| Fade | Screen fades out, new screen fades in | Tab switches, unrelated page change |
| Slide | Panel slides up/down/left/right | Drawer, sheet, sidebar |
| Overlay | Content appears on top, background dims | Modal, tooltip, menu |
| Accordion | Content expands/collapses vertically | FAQ, settings |
| Carousel | Content slides horizontally through items | Image gallery, onboarding |
| Drag | Item follows cursor/grip | Reorder, dnd, swipe to dismiss |
| Pull to refresh | Content pulls down with spring resistance | Mobile list refresh |

## Micro-Interaction Timing

| Action | Duration | Easing | Effect |
|--------|----------|--------|--------|
| Hover | 150ms | ease-out | Color/scale change |
| Active/Press | 100ms | ease-in | Scale 0.97 |
| State change | 200ms | ease-in-out | Toggle, switch, checkbox |
| Card expand | 300ms | ease-out | Scale + shadow change |
| Page transition | 300ms | ease-in-out | Fade/slide |
| Loading skeleton | 400ms | ease-in-out | Pulse animation |
| Toast appear | 250ms | ease-out | Slide in from top/bottom |
| Toast dismiss | 200ms | ease-in | Fade out |

## Animation Principles for UI

| Principle | Application |
|-----------|-------------|
| Easing | No linear motion — use ease-in-out for UI, ease-out for entrances |
| Stagger | Offset multiple element animations by 30–80ms for hierarchy |
| Parenting | Elements move with their container (nesting, scrolling) |
| Transformation | Same element across states → morph, don't replace |
| Masking | Reveal/hide content through clipping for polished effect |
| Overlay | Shadows and elevation reinforce depth during transitions |
| Duration curve | Small moves = fast (100ms), big moves = slow (400ms) |

## `prefers-reduced-motion` Strategy

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Fallback all motion interactions to a 300ms cross-fade — preserves feedback without motion.
