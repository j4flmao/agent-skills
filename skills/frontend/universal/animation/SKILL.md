---
name: frontend-animation
description: >
  Use this skill when the user says 'animation', 'motion', 'Framer Motion', 'GSAP', 'CSS animation', 'page transition', 'enter animation', 'exit animation', 'gesture animation', 'spring animation', 'keyframe', 'motion design'. Delivers animation strategies and code for web applications. Do NOT use for: backend animation or video processing.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, animation, phase-7, universal]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Frontend Animation

**Description:** Implements web animations — page transitions, gesture animations, micro-interactions, motion design. Triggered by "animation", "motion", "Framer Motion", "GSAP", "CSS animation", "page transition", "enter animation", "exit animation", "gesture animation", "spring animation", "keyframe", "motion design".

**Version:** 1.0.0  
**Author:** j4flmao  
**License:** MIT

---

## Purpose

Deliver performant, accessible, and cohesive motion design across the frontend — from micro-interactions to full page transitions — while respecting user accessibility preferences and maintaining 60fps frame budget.

---

## Agent Protocol

### Trigger
User request includes any of: "animation", "motion", "Framer Motion", "GSAP", "CSS animation", "page transition", "enter animation", "exit animation", "gesture animation", "spring animation", "keyframe", "motion design".

### Input Context
- Existing animation libraries in use
- CSS framework / styling approach
- Component tree for targeted animations
- Accessibility requirements
- Performance budget (target 60fps)

### Output Artifact
Animation strategy as text / animation code snippets.

### Response Format
```
## Strategy
<animation-strategy>

## Implementation
<code-snippets>

## Performance Notes
<gpu-compositing, frame-budget notes>

## Accessibility
<reduced-motion handling>

—
Compression footer: frontend-animation/v1 | 4 sections | lib: <selected> | perf: <ok|warn>
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- Animations run at 60fps on mid-range devices
- prefers-reduced-motion respected globally
- Only transform/opacity animated
- Page transitions < 500ms, micro-interactions < 300ms

### Max Response Length
4096 tokens

---

## Workflow

### 1. Animation Library Selection
- **CSS transitions:** Simple hover, focus, or state changes. Zero JS overhead. Best for: button states, color shifts, opacity fades.
- **Framer Motion:** React projects needing declarative springs, layout animations, AnimatePresence for exit animations, gesture handling (drag/swipe).
- **GSAP:** Complex timeline-based sequences, scroll-triggered animation, SVG morphing, cross-browser consistency for non-React projects.
- **WAAPI (Web Animations API):** Framework-agnostic imperative animations. Good for: simple keyframe sequences without library dependency.

### 2. Page Transitions
- Use `AnimatePresence` (Framer Motion) or manual mount/unmount with CSS for exit animations.
- Layout animations between routes with `layout` prop (Framer Motion) or FLIP technique (GSAP Flip).
- Shared element transitions: unique `layoutId` (Framer Motion) or record element positions before/after DOM change.
- Page transition duration: 200–400ms for smooth feel without perceived delay.

### 3. Gesture Animations
- **Drag:** spring physics (stiffness 200, damping 20, mass 0.5) for natural feel.
- **Swipe:** velocity-based transitions — read velocity on release, animate to target or origin.
- **Hover:** scale 1→1.02–1.05, duration 150–200ms, ease-out.
- **Tap:** scale 1→0.95, duration 100ms, spring back.
- Bind gesture handlers at container level, not individual elements.

### 4. Performance
- GPU-composited properties only: `transform` and `opacity`.
- Never animate: `width`, `height`, `top`, `left`, `margin`, `padding` — cause layout thrashing.
- `will-change: transform` on persistently animated elements (remove after idle).
- Use `contain: layout style paint` on non-animated parents.
- Profile with DevTools Performance tab — target 10ms frame budget for JS animation work.

### 5. Accessibility
- `prefers-reduced-motion: reduce` → instant state transitions (0ms duration, no parallax, no auto-play).
- `prefers-reduced-motion: no-preference` → full animations.
- Use `matchMedia('(prefers-reduced-motion: reduce)')` for JS gating.
- Respect OS setting as default; provide a per-session toggle.
- Reduced motion ≠ no motion: use opacity-only fades (100–200ms) to show state changes.
- Disable parallax, scale effects, and continuous animation (spinners → static indicator).

### 6. Micro-interactions
- **Hover scale:** 150ms, ease-out, 1.02–1.05.
- **Button press:** scale 0.95, 100ms, spring(100, 10).
- **Skeleton pulse:** CSS keyframe opacity 0.3→1, 1.5s infinite, `prefers-reduced-motion: reduce` → static.
- **Toast enter:** slide up + fade, 200ms. Exit: fade out, 200ms.
- **Progress fill:** 300–600ms linear across container.
- All micro-interactions < 300ms total duration.

---

## Rules

1. Animate only `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, `margin`, `padding`.
2. Respect `prefers-reduced-motion` — instant transitions on reduce, full motion on no-preference.
3. Spring animations for UI elements: stiffness between 100–300, damping between 10–20.
4. Micro-interactions must complete within 300ms.
5. Page transitions must complete within 500ms.
6. Use `will-change` sparingly — only on elements that animate continuously, and remove when idle.
7. Profile frame budget — JS animation work must stay under 10ms per frame.
8. Provide reduced-motion fallback that still conveys state change (e.g., opacity fade instead of scale + rotate).

---

## References

- `references/animation-libraries.md` — Framer Motion, GSAP, CSS animations, WAAPI patterns
- `references/animation-performance.md` — GPU compositing, avoid list, will-change, reduced motion, frame budget
- `references/animation-techniques.md` — Page transitions, stagger, scroll-triggered, SVG morphing, gesture patterns
- `references/animation-anatomy.md` — Frame budget, easing curves, spring params, composite modes, fill modes

---

## Handoff

When complete, output the animation strategy with implementation snippets. If the request scope exceeds page transitions + micro-interactions (e.g., full motion design system), flag for a dedicated motion designer handoff.
