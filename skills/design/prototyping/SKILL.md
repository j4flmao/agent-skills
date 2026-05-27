---
name: design-prototyping
description: >
  Use this skill when creating interactive prototypes, Figma prototypes, micro-interactions, animations, transitions, or managing design-to-developer handoff. This skill enforces: fidelity level selection (low vs high), interaction pattern design, micro-interaction timing and easing, motion principles, and structured developer handoff. Do NOT use for: production CSS animation code, visual brand design, or user research protocol design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsure: true
tags: [design, prototyping, phase-10]
---

# Design Prototyping

## Purpose
Create interactive prototypes with appropriate fidelity, purposeful micro-interactions, and structured developer handoff. Covers low-to-high fidelity prototyping, interaction design patterns, animation principles (easing, timing, choreography), tool selection (Figma, ProtoPie, Framer), and comprehensive handoff workflow including design tokens, redlines, and asset export.

## Agent Protocol

### Trigger
Exact user phrases: "prototype", "interactive prototype", "Figma prototype", "micro-interaction", "animation", "transition", "design handoff", "developer handoff", "high-fidelity", "low-fidelity", "interaction design", "motion design", "ProtoPie", "Framer", "design tokens export", "redlines", "specs".

### Input Context
Before activating, verify:
- Prototype purpose (concept validation, usability testing, stakeholder sign-off)
- Fidelity level expected (low, mid, high)
- Target platform (web, mobile, desktop)
- Handoff audience (developers, stakeholders, clients)
- Existing design system or component library
- Animation performance requirements and device constraints

### Output Artifact
Prototype specification with interaction design, animation specs, and handoff artifacts.

### Response Format
- Prototype plan: fidelity, interactions, tools
- Animation specs: trigger, duration, easing, state change
- Handoff checklist and spec format
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Fidelity level selected with rationale
- [ ] All user flows prototyped with screen transitions
- [ ] Micro-interactions defined with timing and easing
- [ ] Animation specs documented (trigger, duration, easing, target properties)
- [ ] Developer handoff package prepared (specs, assets, redlines)
- [ ] Prototype testable or shareable via chosen tool
- [ ] `prefers-reduced-motion` fallback defined for every animation

### Max Response Length
150 lines of spec, configuration, and patterns.

## Workflow

### Step 1: Select Fidelity Level

| Level | Appearance | Interactivity | Tool | Best For |
|-------|-----------|---------------|------|----------|
| Low | Grayscale wireframes, placeholder text, rough layout | Click-through only | Figma, Balsamiq, pen & paper | Concept validation, IA testing |
| Mid | Styled elements, real content, partial polish | Screen transitions + key interactions | Figma, Sketch | Internal reviews, early usability |
| High | Pixel-perfect, real data, all states | Full interactions + micro-animations | Figma, ProtoPie, Framer | Usability testing, stakeholder sign-off, dev handoff |

### Step 2: Design Interaction Patterns

| Pattern | Behavior | Duration | Use Case |
|---------|----------|----------|----------|
| Push | Screen slides left, new in from right | 300-400ms | Drill-down navigation |
| Fade | Screen fades out/in | 200-300ms | Tab switches, unrelated page change |
| Slide | Panel slides up/down/left/right | 250-350ms | Drawer, sheet, sidebar |
| Overlay | Content appears on top, dims background | 200-300ms | Modal, tooltip, menu |
| Accordion | Content expands/collapses vertically | 200-300ms | FAQ, settings |
| Carousel | Content slides horizontally | 300-400ms | Image gallery, onboarding |

### Step 3: Define Micro-Interactions

Dan Saffer model: **Trigger** → **Rule** → **Feedback** → **Loop**

| Action | Duration | Easing | Effect |
|--------|----------|--------|--------|
| Hover | 150ms | ease-out | Color/scale change |
| Active/Press | 100ms | ease-in | Scale 0.97 |
| State change | 200ms | ease-in-out | Toggle, switch, checkbox |
| Card expand | 300ms | ease-out | Scale + shadow |
| Page transition | 300ms | ease-in-out | Fade/slide |
| Toast appear | 250ms | ease-out | Slide in from top |
| Toast dismiss | 200ms | ease-in | Fade out |
| Loading skeleton | 400ms | ease-in-out | Pulse animation |

### Step 4: Apply Animation Principles

| Principle | Application |
|-----------|-------------|
| Easing | No linear motion — ease-in-out for UI, ease-out for entrances |
| Stagger | Offset multiple elements by 30-80ms for visual hierarchy |
| Parenting | Elements move with container (nesting, scrolling) |
| Transformation | Same element across states — morph, don't replace |
| Duration curve | Small moves = fast (100ms), big moves = slow (400ms) |
| Anticipation | Pull back slightly before action (elastic UI) |

### Step 5: Implement Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
Fallback all motion to 300ms cross-fade — preserves feedback without motion.

### Step 6: Prepare Developer Handoff

| Artifact | Tools | Content |
|----------|-------|---------|
| Figma Dev Mode link | Figma | Inspect CSS/iOS/Android values, export assets |
| Interactive prototype link | Figma, ProtoPie | Behavior reference for all flows |
| Spec document | Notion, PDF | Component states, typography, colors, spacing, elevation |
| Asset exports | Figma, Sketch | SVG/PNG/WebP organized by component-state-scale |
| Design tokens | JSON, CSS custom properties | Colors, typography, spacing, shadows, radii |
| Motion specs | Documentation | Trigger, duration, easing, state change per interaction |

### Step 7: Export Assets with Naming Convention
```
{component}-{variant}-{state}-{size}.{format}
button-primary-hover-40.svg
icon-close-active-24.svg
card-background-default.webp
```

### Step 8: Spec Documentation Template
For each screen: layout grid and breakpoints, component placement, responsive rules.
For each component: all states documented visually, spacing/padding, typography, elevation.

## Best Practices

| Practice | Why |
|----------|-----|
| Consistent easing across similar interactions | predictable, cohesive feel |
| Animation duration < 100ms imperceptible, > 500ms feels slow for UI | follow the timing chart |
| `prefers-reduced-motion` collapse for every animation | accessibility requirement |
| Dev mode as source of truth | developers inspect directly |
| Export assets at 2x resolution | retina display support |
| Name assets consistently | developer finds assets quickly |

## Pitfalls to Avoid

- **Animation for animation's sake**: Every micro-interaction must confirm, notify, or delight. No gratuitous motion.
- **Linear easing**: Never use linear — feels robotic. Use ease-in-out, ease-out, or spring.
- **Inconsistent timing**: All state changes at 200ms, all page transitions at 300ms. Consistency builds muscle memory.
- **No reduced-motion fallback**: Users with vestibular disorders need motion collapsed. Always implement `prefers-reduced-motion`.
- **Missing states in handoff**: Developers need default, hover, active, disabled, error, loading for every component.
- **Vague easing specs**: Don't say "smooth" — specify cubic-bezier or named easing function.
- **No Interactive prototype**: Specs without behavior context lead to implementation drift. Always link prototype.

## Rules
- Micro-interactions serve a purpose — never animate for animation's sake
- Duration < 100ms is imperceptible, > 500ms feels slow for UI
- All animation respects `prefers-reduced-motion` (cross-fade fallback)
- Consistent easing curve across all interactions of the same type
- Handoff includes interactive prototype for behavior reference
- No linear easing — use ease-in-out, ease-out, or spring
- Dev mode in Figma is the handoff source of truth — redlines overlay for details
- Always export assets at 2x resolution with descriptive naming

## References
  - references/handoff-workflow.md — Developer Handoff Workflow Reference
  - references/handoff.md — Developer Handoff
  - references/interactive-prototypes.md — Interactive Prototypes
  - references/prototyping-advanced.md — Prototyping Advanced Topics
  - references/prototyping-fidelity.md — Prototyping Fidelity
  - references/prototyping-fundamentals.md — Prototyping Fundamentals
  - references/prototyping-tools.md — Prototyping Tools Reference
## Handoff
`design-ux-research` for usability testing with the prototype.
Carry forward: prototype links, interaction specs, animation timing chart.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.
