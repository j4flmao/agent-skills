# Motion Design Fundamentals

## Overview
Motion Design adds the dimension of time to user interfaces — guiding attention, communicating state changes, providing feedback, and creating a sense of direct manipulation. This reference covers fundamental concepts, easing, choreography, and best practices.

## Core Concepts

### Concept 1: Purpose of Motion
Every animation must serve a purpose: guide attention (where to look next), provide feedback (confirm action), communicate hierarchy (what's important), show relationships (what's connected), or create continuity (what happened between states). Decorative motion is visual noise.

### Concept 2: Easing
Easing defines how an object accelerates and decelerates. Linear motion feels robotic. Ease-in-out (deceleration + acceleration) feels natural. Use cubic bezier curves to define custom easing. Standard: ease-in-out, decelerated (enter), accelerated (exit), emphasize (hero moment).

### Concept 3: Duration
Duration should scale with distance and size: small elements move fast (150-200ms), large elements move slower (300-400ms), full-page transitions take longest (500-700ms). Mobile durations should be shorter than desktop. Always respect prefers-reduced-motion.

### Concept 4: Choreography
Multiple elements moving simultaneously should follow a hierarchy: primary element moves first, supporting elements follow. Use staggered delays (20-50ms apart) for lists. Elements entering should follow each other, not compete.

### Concept 5: Spatial Continuity
Elements should maintain spatial relationships during transitions. Shared element transitions (hero animations) show continuity when an element moves between screens. Avoid elements appearing/disappearing without transition.

## Architecture Patterns

### Pattern 1: Motion Tokens
Define motion as design tokens: duration (fast, normal, slow), easing (enter, exit, emphasize, linear), and delay (stagger-short, stagger-medium, stagger-long). All animations use these tokens, ensuring consistency.

### Pattern 2: Motion Choreography
Establish a motion hierarchy: navigation-level (page transitions), component-level (list reordering, modal open/close), micro-interaction-level (button hover, toggle switch). Each level uses appropriate duration and easing.

### Pattern 3: Responsive Motion
Adjust motion properties by device and input method: touch devices need shorter durations and more feedback, mouse users need hover states, keyboard users need focus indicators. Motion should not trigger vestibular disorders.

## Best Practices

- Every animation must serve a purpose
- Use consistent easing curves (defined as tokens)
- Duration scales with element size and travel distance
- Stagger list animations (20-50ms between items)
- Test with prefers-reduced-motion enabled
- Avoid motion that could trigger vestibular disorders
- Match easing to material behavior (real-world physics)
- Keep animations under 400ms for functional elements
- Use shared element transitions for page navigation

## Anti-Patterns

- Decorative animation with no functional purpose
- Too slow animations (users waiting for UI)
- Too fast animations (users miss the transition)
- Inconsistent easing (some ease-in, some linear)
- All elements animating simultaneously (competing for attention)
- No reduced-motion support (accessibility failure)
- Animations that cause layout shifts
