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
  windsurf: true
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
- Timeline and iteration budget

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
- [ ] All component states documented (default, hover, active, disabled, error, loading)
- [ ] Responsive behavior defined for target breakpoints

### Max Response Length
150 lines of spec, configuration, and patterns.

## Framework/Methodology

### Fidelity Decision Framework

```
Purpose of Prototype:
├── Concept Validation → Low-fidelity (hours, click-through)
├── Flow/IA Testing → Low to Mid-fidelity (days, basic transitions)
├── Usability Testing → Mid to High-fidelity (days to weeks, key interactions)
├── Stakeholder Sign-off → High-fidelity (weeks, full interactions)
└── Developer Handoff → High-fidelity (weeks, production-ready specs)
```

### Four Levels of Prototyping Fidelity

| Level | Appearance | Interactivity | Investment | When to Use |
|-------|-----------|---------------|------------|-------------|
| Low | Wireframes, grayscale, placeholder text, rough layout | Click-through only, fixed hotspots | Hours | Early concept validation, IA testing, multiple iterations |
| Mid | Styled elements, real content, partial polish | Screen transitions, key interactions, basic feedback | Days | Internal reviews, early usability testing, flow validation |
| High | Pixel-perfect, real data, all states, design system | Full interactions, micro-animations, conditional logic | Weeks | Usability testing, stakeholder sign-off, developer handoff |
| Code | Production-quality code in browser | Full browser behavior, real API integration | Weeks | Technical validation, pre-production testing |

### Prototyping Tool Selection Matrix

| Tool | Fidelity | Learning Curve | Collaboration | Animation | Handoff | Best For |
|------|----------|---------------|---------------|-----------|---------|----------|
| Figma | Low-High | Low | Real-time multi-player | Smart Animate, variables | Dev mode, inspect | End-to-end prototyping |
| Framer | High | Medium | Comments | Advanced, spring physics | React code export | High-fidelity, code handoff |
| ProtoPie | High | High | Limited | Very advanced, sensors | Video specs | Complex interactions |
| Principle | High | Medium | Limited | Advanced transitions | Video specs | Motion design prototyping |
| Axure | Mid-High | High | Comments | Conditionals, logic | Spec docs | Complex logic prototypes |
| HTML/CSS/JS | Production | High | Git | Full control via CSS/JS | Production code | Technical validation |
| Balsamiq | Low | Minimal | Comments | None | Wireframes only | Early concept wireframes |
| Sketch | Low-Mid | Low | Plugins | Basic | Plugins | Mac-only design teams |

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
| Scale | Element grows/shrinks from center | 200-300ms | Cards, thumbnails, zoom |
| Morph | Element transitions between shapes | 300-500ms | Icon transitions, buttons to inputs |
| Stagger | Multiple elements animate in sequence | 30-80ms offset per item | Lists, grids, content loading |
| Parallax | Background moves slower than foreground | Scroll-driven | Hero sections, storytelling |

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
| Notification badge | 300ms | spring | Bounce/scale |
| Drag to reorder | 100ms | ease-out | Element follows cursor |
| Pull to refresh | 200-500ms | spring | Overscroll + release |
| Error shake | 400ms | ease-in-out | Horizontal oscillation |

### Step 4: Apply Animation Principles

| Principle | Application |
|-----------|-------------|
| Easing | No linear motion — ease-in-out for UI, ease-out for entrances |
| Stagger | Offset multiple elements by 30-80ms for visual hierarchy |
| Parenting | Elements move with container (nesting, scrolling) |
| Transformation | Same element across states — morph, don't replace |
| Duration curve | Small moves = fast (100ms), big moves = slow (400ms) |
| Anticipation | Pull back slightly before action (elastic UI) |
| Follow-through | Elements continue moving after main motion stops |
| Overlap | Multiple animations overlap rather than sequencing |
| Masking | Reveal content through shape or gradient mask |
| Depth | Use shadow, scale, and blur to create z-space hierarchy |

Common cubic-bezier values for UI animation:

| Easing Type | cubic-bezier | Feels |
|-------------|--------------|-------|
| ease-out | (0, 0, 0.2, 1) | Natural deceleration, entrances |
| ease-in | (0.4, 0, 1, 1) | Acceleration, exits |
| ease-in-out | (0.4, 0, 0.2, 1) | Standard UI motion |
| spring (stiff) | (0.175, 0.885, 0.32, 1.275) | Bouncy, playful |
| spring (gentle) | (0.34, 1.56, 0.64, 1) | Subtle bounce |

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
| Redline spec | Zeplin, Avocode, Figma | Specific measurements, alignment, spacing |
| Component documentation | Storybook, Zeroheight | Interactive component library with code |

### Step 7: Export Assets with Naming Convention
```
{component}-{variant}-{state}-{size}.{format}
button-primary-hover-40.svg
icon-close-active-24.svg
card-background-default.webp
avatar-user-static-48.png
```

### Step 8: Spec Documentation Template
For each screen: layout grid and breakpoints, component placement, responsive rules.
For each component: all states documented visually, spacing/padding, typography, elevation.

### Step 9: Prototype Testing Checklist
Before sharing a prototype, verify:
- Happy path works end-to-end with no dead ends
- Error states shown for form submissions and data failures
- Empty states designed for all list/table views
- Loading states shown within 200ms of user action
- All clickable/tappable areas are minimum 44x44px (mobile)
- Responsive behavior works at defined breakpoints
- Text is not truncated or overflowing unintentionally
- Back navigation works correctly in multi-screen flows
- Scroll behavior is smooth on target device
- All animations have `prefers-reduced-motion` fallback

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Animation for animation's sake | Every micro-interaction must confirm, notify, or delight. No gratuitous motion. | Audit each animation: "Does this serve a purpose?" |
| Linear easing | Never use linear — feels robotic. Use ease-in-out, ease-out, or spring. | Default all animations to ease-in-out, adjust from there |
| Inconsistent timing | All state changes at 200ms, all page transitions at 300ms. Consistency builds muscle memory. | Create timing scale (50-100-200-300-400-500ms) |
| No reduced-motion fallback | Users with vestibular disorders need motion collapsed. Always implement. | Add `prefers-reduced-motion` check for every animation |
| Missing states in handoff | Developers need default, hover, active, disabled, error, loading. | Create component state matrix before handoff |
| Vague easing specs | Don't say "smooth" — specify cubic-bezier or named easing function. | Document exact cubic-bezier for every animation |
| No interactive prototype | Specs without behavior context lead to implementation drift. | Always link working prototype in handoff docs |
| Prototyping in production code | Writing CSS/JS during design phase wastes time when direction changes | Use design tools for exploration, code for final validation |
| Over-elevating low-fi prototypes | Spending hours on pixel-perfect wireframes that will change | Low-fi = low polish. Move fast, validate, iterate. |
| Skipping prototype QA | Sending broken prototypes to stakeholders or testers | Run through every flow before sharing |

## Best Practices

| Practice | Why |
|----------|-----|
| Consistent easing across similar interactions | predictable, cohesive feel |
| Animation duration < 100ms imperceptible, > 500ms feels slow for UI | follow the timing chart |
| `prefers-reduced-motion` collapse for every animation | accessibility requirement |
| Dev mode as source of truth | developers inspect directly |
| Export assets at 2x resolution | retina display support |
| Name assets consistently | developer finds assets quickly |
| Create component state matrix before handoff | prevents missing states in implementation |
| Use Smart Animate sparingly in Figma | complex animations better done in ProtoPie |
| Prototype at actual device resolution | ensures realistic appearance and performance |
| Include gesture interactions for mobile prototypes | swipe, pinch, pull-to-refresh are critical patterns |

## Templates & Tools

### Animation Spec Template
```
Element: {component name}
Interaction: {trigger description}

Animation:
  Duration: {N}ms
  Easing: cubic-bezier({x1}, {y1}, {x2}, {y2})
  Properties animated: [{property}, {property}, {property}]
  Delay: {N}ms (if applicable)

State Change:
  From: {starting state description}
  To: {ending state description}

Reduced Motion Fallback: {cross-fade / instant / transform-only}
```

### Handoff Quality Checklist

| Area | Check | Status |
|------|-------|--------|
| States | All component states documented (default, hover, active, disabled, focus, error, loading) | / |
| Spacing | Padding, margin, and gap values specified for all components | / |
| Typography | Font family, size, weight, line height, letter spacing per text style | / |
| Color | Hex/rgba values for all fills, strokes, shadows, gradients | / |
| Assets | All icons, images, illustrations exported at proper formats and resolutions | / |
| Responsive | Behavior at breakpoints documented (min-width, max-width, reflow rules) | / |
| Interactive | Prototype link with all flows connected | / |
| Motion | Duration and easing for all animations documented | / |
| Accessibility | Color contrast verified, focus states shown, reduced-motion fallback specified | / |
| Code | Design tokens exported in target format (CSS, JSON, Swift, Kotlin) | / |

### Figma Prototyping Tips

- Use Auto Layout for responsive components (reduces resize work)
- Component properties for variant switching (states, sizes, themes)
- Variables for prototyping logic (conditions, expressions — Figma 2024+)
- Smart Animate works best when layer structure is identical between frames
- Name frames clearly for developer reference: "Screen Name / Variant / State"
- Use interactive components for self-contained micro-interactions
- Prototype at 100% zoom — scaling screens hides responsive issues

## Case Studies

### Case Study 1: Low-Fi to High-Fi Iterative Prototyping Reduces Rework
A fintech startup needed to validate a complex investment dashboard before committing to development. They started with low-fidelity wireframes (2 days) for concept validation with 5 users, which identified 3 major flow problems. A mid-fidelity iteration (3 days) fixed those issues and revealed 2 additional usability problems. The final high-fidelity prototype (5 days) passed usability testing with 8 of 8 tasks completed. Total prototyping investment: 10 days, saved an estimated 30 days of development rework.

Method: Progressive fidelity: low-fi (2d) → mid-fi (3d) → high-fi (5d)
Key insight: Finding problems early in low-fi is 10x cheaper than fixing in code
Impact: 30 days of development rework avoided, product launched on schedule

### Case Study 2: Micro-Interaction Details Drive Engagement
A social media app redesigned their "like" interaction from a simple button tap to an animated heart with haptic feedback, staggered friend reactions, and a celebration animation for milestone likes. The redesign took 3 weeks of prototyping in ProtoPie to perfect the timing and easing. Post-launch, the new interaction increased daily active usage of the like feature by 35% and time spent on posts by 20%.

Method: High-fidelity prototyping in ProtoPie with usability testing of animation variants
Key insight: Delightful micro-interactions increase feature engagement
Impact: Like feature daily active usage +35%, time on post +20%

### Case Study 3: Structured Handoff Reducing Implementation Bugs
A design team created a structured handoff process including design tokens (JSON), interactive prototype (Figma), motion specs (documentation), and a component state matrix (spreadsheet) for each feature. Before this process, developers re-created 40% of designs incorrectly. After implementing structured handoff, the accuracy rate increased to 92%, and development time decreased by 25% because less back-and-forth was needed.

Method: Structured handoff package with design tokens, motion specs, and state matrix
Key change: Dev mode as source of truth + supplementary documentation
Impact: Implementation accuracy 60% to 92%, development time -25%

## Rules
- Micro-interactions serve a purpose — never animate for animation's sake
- Duration < 100ms is imperceptible, > 500ms feels slow for UI
- All animation respects `prefers-reduced-motion` (cross-fade fallback)
- Consistent easing curve across all interactions of the same type
- Handoff includes interactive prototype for behavior reference
- No linear easing — use ease-in-out, ease-out, or spring
- Dev mode in Figma is the handoff source of truth — redlines overlay for details
- Always export assets at 2x resolution with descriptive naming
- Every component must have all states documented in handoff
- Prototype must be tested on target device before usability testing
- Gesture interactions must be documented alongside click interactions for mobile
- Animation specs must include trigger, duration, easing, and target properties
- Low-fidelity prototypes should not use real brand colors or typography
- High-fidelity prototypes should use production assets and design system components
- Prototype links must be shared with explicit viewing/editing permissions

## References
  - references/handoff-workflow.md — Developer Handoff Workflow Reference
  - references/handoff.md — Developer Handoff
  - references/interactive-prototypes.md — Interactive Prototypes
  - references/prototyping-advanced.md — Prototyping Advanced Topics
  - references/prototyping-fidelity.md — Prototyping Fidelity
  - references/prototyping-fundamentals.md — Prototyping Fundamentals
  - references/prototyping-tools.md — Prototyping Tools Reference
  - references/prototyping-fidelity-levels.md — Prototyping Fidelity Levels
  - references/prototyping-user-testing.md — Prototyping User Testing
## Handoff
`design-ux-research` for usability testing with the prototype.
Carry forward: prototype links, interaction specs, animation timing chart.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.
