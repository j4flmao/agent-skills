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
Create interactive prototypes with appropriate fidelity, purposeful micro-interactions, and structured developer handoff.

## Agent Protocol

### Trigger
Exact user phrases: "prototype", "interactive prototype", "Figma prototype", "micro-interaction", "animation", "transition", "design handoff", "developer handoff", "high-fidelity", "low-fidelity", "interaction design", "motion design".

### Input Context
Before activating, verify:
- Prototype purpose (concept validation, usability testing, stakeholder sign-off)
- Fidelity level expected (low, mid, high)
- Target platform (web, mobile, desktop)
- Handoff audience (developers, stakeholders, clients)

### Output Artifact
Prototype specification with interaction design, animation specs, and handoff artifacts.

### Response Format
```yaml
# Prototype plan: fidelity, interactions, tools
# Animation specs: trigger, duration, easing, state change
```
```figma
# Handoff checklist and spec format
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Fidelity level selected with rationale
- [ ] All user flows prototyped with screen transitions
- [ ] Micro-interactions defined with timing and easing
- [ ] Animation specs documented (trigger, duration, easing, target properties)
- [ ] Developer handoff package prepared (specs, assets, redlines)
- [ ] Prototype testable or shareable via chosen tool

### Max Response Length
150 lines of spec, configuration, and patterns.

## Workflow

### Step 1: Select Fidelity Level
Low-fidelity: wireframes, click-through only, grayscale, placeholder content — use for early concept validation. High-fidelity: pixel-perfect designs, real content, micro-interactions, responsive — use for usability testing and dev handoff. Mid-fidelity bridges the gap with real layout but minimal polish. Fidelity level determines tool choice (Figma for high, Balsamiq for low).

### Step 2: Design Interactions
Screen transitions: push (drill-down), fade (context change), slide (side panels). Component interaction: hover → state change, tap → ripple or scale, drag → snap to grid. Navigation: tabs switch content pane, accordion expands content, dropdown reveals options. Apply consistent interaction patterns across the prototype — never mix metaphors.

### Step 3: Micro-Interactions
Structure: trigger → rule → feedback → loop (Dan Saffer model). Timing: hover < 200ms, state change 200–300ms, page transitions 300–500ms, loading > 1s (use skeleton). Easing: ease-in-out for UI elements, ease-out for entrances, ease-in for exits, spring/bounce for playful feedback. Every micro-interaction serves a purpose — confirm, notify, or delight.

### Step 4: Animation Principles
Follow Disney's 12 principles where applicable: easing (no linear animations), squash & stretch (elastic elements), anticipation (pull back before action), follow-through (overshoot then settle). Duration: faster for functional (state change: 200ms), slower for expressive (onboarding: 500ms). Respect `prefers-reduced-motion` — collapse all motion to cross-fade (300ms).

### Step 5: Developer Handoff
Figma Dev Mode: inspect mode, redlines for spacing and sizing, export assets (SVG, PNG, WebP). Spec document: component states (default, hover, active, disabled, error), responsive behavior (breakpoints, grid), typography scale (font, size, weight, line-height, letter-spacing). Interactive prototype link for behavior reference.

### Step 6: Spec Documentation
For each screen: layout grid and breakpoints, component placement with absolute coordinates or constraints, responsive rules (stack, wrap, hide). For each component: states documented visually, spacing/padding within component, typography values, elevation/shadow values. Export assets with naming convention: `component-state-scale` (e.g., `icon-close-active-24.svg`).

## Rules
- Micro-interactions serve a purpose — never animate for animation's sake
- Duration < 100ms is imperceptible, > 500ms feels slow for UI
- All animation respects `prefers-reduced-motion` (cross-fade fallback)
- Consistent easing curve across all interactions of the same type
- Handoff includes interactive prototype for behavior reference
- No linear easing — use ease-in-out, ease-out, or spring
- Dev mode in Figma is the handoff source of truth — redlines overlay for details

## References
- `references/prototyping-fidelity.md` — Low/high fidelity, interaction patterns, micro-interactions, animation principles
- `references/handoff.md` — Figma dev mode, specs, asset export, redlines, specs doc

## Handoff
`design-ux-research` for usability testing with the prototype.
`design-accessibility` for a11y review of interactions.
Carry forward: prototype links, interaction specs, animation timing chart.
