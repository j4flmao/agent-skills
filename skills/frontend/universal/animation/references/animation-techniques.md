# Animation Techniques

## Timing & Easing Reference

| Easing | CSS | Use Case |
|--------|-----|----------|
| Ease-out | `cubic-bezier(0.16, 1, 0.3, 1)` | UI enter animations, cards appearing |
| Ease-in-out | `cubic-bezier(0.65, 0, 0.35, 1)` | Page transitions, shared element moves |
| Spring | Framer `stiffness:200, damping:20` | Bouncy UI, drag interactions |
| Anticipate | GSAP `ease: "back.out(1.7)"` | Drawer open, menu reveal |
| Custom | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Overshoot effects (elastic buttons) |

## Page Transition Patterns

### Framer Motion Route Transitions
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.2, ease: 'easeInOut' }}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

### Shared Element Transitions
```tsx
<!-- Two pages with shared layoutId animate seamlessly -->
< motion.img layoutId={`card-image-${id}`} src={image} />
```

Key: same `layoutId` across routes or list/detail views. Framer Motion interpolates position and size automatically.

## Stagger Children Animation

```tsx
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => <motion.li key={i.id} variants={item}>{i.name}</motion.li>)}
</motion.ul>
```

Stagger start: `delayChildren` on parent. Gap between children: `staggerChildren` (seconds). Combine with `staggerDirection: -1` for reverse order exit.

## Scroll-Triggered Animations

```tsx
const ref = useRef(null)
const isInView = useInView(ref, { once: true, margin: '-100px' })

<motion.div
  ref={ref}
  initial={{ opacity: 0, y: 60 }}
  animate={isInView ? { opacity: 1, y: 0 } : {}}
  transition={{ duration: 0.5 }}
/>
```

`useInView` (Framer Motion) or IntersectionObserver. `once: true` to animate only the first time. Margin adjusts trigger boundary — negative = later trigger.

## SVG Morphing

```tsx
<motion.path
  d={isOpen ? openPath : closedPath}
  transition={{ duration: 0.3, ease: 'easeInOut' }}
/>
```

Paths must have the same number of commands for smooth morphing. Use SVG path editor to align command count. Combine with `fill` and `stroke` transitions.

## Gesture Animation Patterns

| Gesture | Duration | Easing | Transform |
|---------|----------|--------|-----------|
| Hover | 150ms | ease-out | scale(1.05) |
| Active/Tap | 100ms | spring(100,10) | scale(0.95) |
| Drag snap | 300ms | spring(300,30) | translate to snap point |
| Swipe dismiss | velocity-based | spring(damping:20) | translateX + fade |

## Animation Orchestration

```tsx
// Sequential animation with delay
const seq = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { when: 'beforeChildren', staggerChildren: 0.1 },
  },
}

// Parallel — use AnimatePresence for exit
// Delayed — staggerChildren on parent
// Waterfall — stagger + y offset increase
```

## Reduced Motion & Accessibility

Always gate non-essential animations:
```tsx
const prefersReduced = useReducedMotion()
const animationProps = prefersReduced
  ? { initial: false, animate: {} } // instant
  : { initial: { opacity: 0 }, animate: { opacity: 1 } }
```

## Animation Decision Tree

```
Animation need?
├── State change (hover, focus, tap)
│   └── CSS transition — 150-200ms, ease-out
├── Element enter / exit
│   ├── Single element → Framer AnimatePresence or CSS animation
│   └── List → stagger children, 50ms between each
├── Page transition
│   ├── Simple crossfade → AnimatePresence with opacity
│   └── Shared element → layoutId mapping
├── Scroll reveal
│   ├── Once → useInView with { once: true }
│   └── Parallax → transform: translateY based on scroll position
└── Complex timeline
    └── GSAP timeline or Framer useAnimate with sequence
```

## Performance Table

| Technique | GPU | CPU Cost | Best For |
|-----------|-----|----------|----------|
| CSS transition | Yes | Negligible | Hover, state changes |
| CSS keyframes | Yes | Negligible | Looping background animation |
| Framer Motion | Yes (transform/opacity) | Low | React UI animations |
| GSAP timeline | Yes (composited) | Medium | Complex choreography |
| WAAPI | Yes | Low | Framework-agnostic keyframes |
| JS setInterval | No | High | Avoid — use rAF instead |
