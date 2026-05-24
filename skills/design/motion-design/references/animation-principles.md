# Animation Principles Reference

## Easing Curves

Easing defines how an animation accelerates and decelerates. Never use linear motion in UI — it feels robotic and unnatural.

### Standard Easing Types

| Easing | Cubic Bezier | Feel | Use Case |
|--------|-------------|------|----------|
| ease-out | `cubic-bezier(0, 0, 0.2, 1)` | Decelerates | Elements entering, appearing |
| ease-in | `cubic-bezier(0.4, 0, 1, 1)` | Accelerates | Elements leaving, disappearing |
| ease-in-out | `cubic-bezier(0.4, 0, 0.2, 1)` | Smooth start/end | Transitions between states |
| linear | `cubic-bezier(0, 0, 1, 1)` | Constant speed | Color/opacity only, progress bars |
| spring | Physical simulation | Bouncy | Overshoot animation, playful UI |

```css
/* CSS standard easings */
.element-enter {
  transition: transform 200ms cubic-bezier(0, 0, 0.2, 1),
              opacity 200ms ease-out;
}
.element-exit {
  transition: transform 150ms cubic-bezier(0.4, 0, 1, 1),
              opacity 150ms ease-in;
}
```

### Custom Easing Curves
| Curve | Use |
|-------|-----|
| `(0.34, 1.56, 0.64, 1)` | Bouncy overshoot for playful elements |
| `(0.87, 0, 0.13, 1)` | Smooth deceleration, subtle |
| `(0.76, 0, 0.24, 1)` | Snappy, responsive |
| `(0.5, 0, 0.5, 1)` | Symmetrical, simple |

## Duration Guidelines

| Element | Duration | Context |
|---------|----------|---------|
| Hover/active state | 50-100ms | Instant feedback |
| Button click ripple | 100-150ms | Feels responsive |
| Micro-interaction | 100-200ms | Toggle, switch, checkbox |
| Element appear (fade in) | 150-300ms | Cards, list items |
| Element appear (move in) | 200-400ms | Slide-in panels |
| Modal/dialog open | 200-350ms | Contextual overlays |
| Page transition | 250-500ms | Route changes |
| Notification appear | 300-500ms | Toast, banner |
| Loading shimmer | 800-1500ms | Skeleton screen pulse |
| Emphasized animation | 400-800ms | Celebrations, confetti |

### Duration Formula
```
min: 100ms (functional feedback)
comfortable: 200-300ms (most UI animation)
max: 500ms (expressive animation)
avoid: > 1000ms for functional UI (feels slow)
```

## Delay and Stagger

Stagger creates visual interest by offsetting the start time of sibling animations.

```css
/* Staggered list items */
.list-item:nth-child(1) { transition-delay: 0ms; }
.list-item:nth-child(2) { transition-delay: 50ms; }
.list-item:nth-child(3) { transition-delay: 100ms; }
/* ... */
```

### Stagger Timing
| Number of Items | Stagger Offset | Total Duration |
|----------------|---------------|----------------|
| 3-5 | 50-80ms | 150-400ms |
| 6-10 | 40-50ms | 240-500ms |
| 10-20 | 20-30ms | 200-600ms |
| Grid items | 20-40ms (row offset) | Match reading direction |

## Orchestration

Orchestration coordinates multiple animations into a cohesive sequence.

| Pattern | Description | Example |
|---------|-------------|---------|
| Sequential | Elements animate one after another | Stepper wizard |
| Parallel | Elements animate simultaneously | Page transition |
| Waterfall | Staggered start times in sequence | List reveal |
| Overlap | Next animation starts before previous finishes | Smooth page transitions |

```css
/* Orchestrated card reveal with overlap */
.card {
  animation: cardEnter 400ms ease-out both;
}
.card:nth-child(1) { animation-delay: 0ms; }
.card:nth-child(2) { animation-delay: 100ms; }
.card:nth-child(3) { animation-delay: 200ms; }

@keyframes cardEnter {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

## Motion Paths

CSS `offset-path` allows elements to follow defined curves and shapes.

```css
@keyframes fly {
  0%   { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}

.motion-path-element {
  offset-path: path("M 0,0 C 50,100 150,100 200,0");
  animation: fly 2000ms ease-in-out infinite;
}
```

## Spring Physics

CSS spring physics creates natural-feeling motion with defined stiffness and damping.

```css
/* CSS spring — standard */
.element {
  transition: transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Framer Motion spring API equivalent */
{
  type: "spring",
  stiffness: 300,   /* Higher = snappier */
  damping: 25,      /* Higher = less bounce */
  mass: 1           /* Higher = heavier, slower */
}
```

### Spring Parameter Cheatsheet
| Feel | Stiffness | Damping | Mass |
|------|-----------|---------|------|
| Snappy, no bounce | 500 | 50 | 1 |
| Bouncy, playful | 200 | 10 | 1 |
| Heavy, slow | 100 | 20 | 3 |
| Gentle, natural | 300 | 25 | 1 |
| Overshoot | 400 | 15 | 1 |

## Natural Movement

### Principles
- Objects in UI should behave like objects in physical space
- An element entering from the right shouldn't bounce off the left
- Scale and opacity often pair together (fade + scale feels more natural)
- Motion should have purpose — never animate for its own sake
- Direction should match user expectation (menu opens downward, not upward)

### Avoiding Common Mistakes
- Don't animate everything — too much motion is disorienting
- Don't use different easing for entering vs exiting the same element
- Don't animate layout properties (width, height, top, left) — use transforms
- Don't exceed 500ms for functional animations
- Don't animate elements that are already animating (queue or interrupt)
