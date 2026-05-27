---
name: design-motion-design
description: >
  Use when the user asks about motion design, animation, micro-interactions, Lottie, animation principles, UI animation, transition design, or motion guidelines. Do NOT use for: frontend animation implementation (frontend-animation), or visual design (design-visual-design).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [design, motion-design, phase-3]
---

# Motion Design

## Purpose
Design motion systems for digital products: animation principles, micro-interactions, transitions, Lottie animations, and motion guidelines that enhance user experience.

## Workflow

### Animation Principles (UI Context)
| Principle | UI Application |
|-----------|----------------|
| Easing | Natural acceleration/deceleration, not linear |
| Duration | Short for functional (100-300ms), longer for expressive (300-500ms) |
| Stagger | Offset animations for visual interest |
| Hierarchy | Important elements animate first |
| Spatial continuity | Elements should animate as if in physical space |

### Motion Duration Guidelines
| Action | Duration | Easing |
|--------|----------|--------|
| Button feedback | 100ms | ease-out |
| Element appear | 200ms | ease-out |
| Page transition | 300ms | ease-in-out |
| Modal open | 250ms | ease-out |
| Notification | 400ms | ease-out |

### Micro-interaction Anatomy
1. **Trigger**: User action or system state change
2. **Feedback**: Visual response (color, scale, position)
3. **Pattern**: How the animation behaves

### Lottie Animation
- Export from After Effects with Bodymovin
- JSON format, small file size
- Runtime rendering (no video files)
- Supports color customization
- Pause/resume/seek controls

## References
  - references/animation-principles.md — Animation Principles Reference
  - references/lotti-rive.md — Lottie and Rive Animation Reference
  - references/motion-accessibility.md — Motion Accessibility Reference
  - references/motion-design-advanced.md — Motion Design Advanced Topics
  - references/motion-design-fundamentals.md — Motion Design Fundamentals
  - references/ui-animation-patterns.md — UI Animation Patterns Reference
