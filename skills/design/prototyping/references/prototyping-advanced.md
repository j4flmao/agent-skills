# Prototyping Advanced Topics

## Overview
Advanced prototyping covers complex interactions (drag-and-drop, gestures, transitions), conditional logic, data-driven prototypes, prototyping at scale, and integrating prototypes with development workflows.

## Advanced Concepts

### Concept 1: Conditional Logic and Variables
Advanced prototypes use variables, conditions, and expressions to simulate real application behavior: counters, timers, conditional branching, user input processing, calculated values. Tools: Axure, Framer, Protopie. This enables testing of state-dependent flows that simple click-through can't simulate.

### Concept 2: Data-Driven Prototypes
Load real data from APIs or databases into prototypes. Use JSON data sources, API connectors (Framer, Axure), or code prototypes. This tests: layout with real content, loading states, pagination, empty states, error handling, and performance.

### Concept 3: Gesture and Sensor Prototyping
Mobile and hardware prototypes need: touch gestures (tap, swipe, pinch, long-press), device sensors (accelerometer, gyroscope, compass), camera/mic input, and haptic feedback. Protopie excels at sensor-based prototyping.

### Concept 4: Prototyping at Scale
Enterprise design teams need: shared component libraries within prototypes, consistent interaction patterns, version control for prototype files, reusable state machines, and a single source of truth for prototype components. This reduces duplication and ensures consistency.

### Concept 5: Prototype-to-Code Pipeline
Automate the transition from prototype to production code: design token export (Figma → Style Dictionary → CSS), component code export (Figma → React via Anima, TeleportHQ), and interaction handoff (annotations, spec documents). The goal is reducing reimplementation effort.

## Advanced Techniques

### State Machine Prototyping
```yaml
states:
  idle: { entry: "show button" }
  loading: { entry: "show spinner, disable button" }
  success: { entry: "show checkmark, enable" }
  error: { entry: "show error message, enable button" }

transitions:
  idle → loading: "on click"
  loading → success: "on API success"
  loading → error: "on API error"
  error → loading: "on retry click"
  success → idle: "after 3s"
```

### Variable-Driven Prototyping
Define variables in prototype to track state: login status, cart items, score, timer. Use these to conditionally show/hide elements, change text dynamically, calculate values, and track user progress through flows.

### Prototyping for Development Handoff
```yaml
handoff_package:
  specs:
    - "Redlines (measurements, spacing, alignment)"
    - "Color, typography, spacing tokens used"
    - "Responsive breakpoints"
  interactions:
    - "Animation specs (duration, easing, stagger)"
    - "State transitions (hover, active, focus, disabled)"
    - "Micro-interaction descriptions"
  assets:
    - "Exported icons (SVG, PNG @2x @3x)"
    - "Image assets with optimization notes"
    - "Font files or font loading code"
```

## Anti-Patterns

- Building production-ready code as a prototype (too expensive)
- Prototyping without variables when conditional logic is needed
- Using hi-fi prototype to test concept (too much effort for wrong question)
- No handoff documentation (developer has to reverse-engineer animations)
- Confusing prototype platform capabilities with production constraints
- Over-engineering state machines for simple flows
- Prototypes that break when data changes (hardcoded content)
