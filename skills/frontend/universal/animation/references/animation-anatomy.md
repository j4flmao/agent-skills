# Animation Anatomy

## Frame Breakdown

A single animation frame at 60fps has 16.67ms budget:

```
Event → requestAnimationFrame → Style → Layout → Paint → Composite
  |                              |       |        |         |
 0ms                           ~5ms    ~8ms    ~12ms    ~16ms
```

- **Style**: recalc selectors on class/style changes — O(n) in element count
- **Layout**: compute geometry — most expensive, triggered by width/height/top/left
- **Paint**: fill pixels — triggered by color, background, box-shadow
- **Composite**: combine layers — only triggered by transform/opacity

## will-change Protocol

```css
/* Apply before animation starts */
.element { will-change: transform, opacity; }

/* Remove when idle — use JS to manage */
element.addEventListener('transitionend', () => {
  element.style.willChange = 'auto'
})
```

| Scenario | Apply To | Remove After |
|----------|----------|--------------|
| Drag | dragged element | dragend event |
| Modal enter | modal container | transitionend |
| Continuous spinner | SVG element | never (persistent) |
| Page transition | route wrapper | transitionend |

## transform vs Layout Properties

| Operation | Property | Cost | Alternative |
|-----------|----------|------|-------------|
| Move | `left`/`top` | Layout + Paint | `translate()` |
| Resize | `width`/`height` | Layout + Paint | `scale()` |
| Rotate | N/A | N/A | `rotate()` |
| Skew | N/A | N/A | `skew()` |
| Round corners | `border-radius` | Paint | pre-rendered clip |
| Hide | `display: none` | Layout | `opacity: 0` + `pointer-events: none` |

## Keyframe Decomposition

```css
@keyframes slideIn {
  0%   { transform: translateX(-100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}
```

Equivalent JS for programmatic control:
```js
const anim = el.animate(
  [
    { transform: 'translateX(-100%)', opacity: 0, offset: 0 },
    { transform: 'translateX(0)', opacity: 1, offset: 1 },
  ],
  { duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }
)
```

`fill: 'backwards'` applies the 0% state before the animation starts — prevents flash of unanimated content.

## Animation Fill Modes

| Fill | Before Start | After End |
|------|-------------|-----------|
| `none` | No style | Reverts to computed |
| `forwards` | No style | Retains 100% keyframe |
| `backwards` | Applies 0% keyframe | Reverts to computed |
| `both` | Applies 0% keyframe | Retains 100% keyframe |

## Composite Modes

In WAAPI and Framer Motion, composite controls how the animation interacts with existing styles:

- **replace** (default): animation value completely overrides the existing style
- **add**: animation value is added to the existing style (e.g., `transform: translate(100px)` + existing `translate(50px)` = `translate(150px)`)
- **accumulate**: like add, but for non-additive properties

## spring() Parameters

| Parameter | Effect | Range | Default |
|-----------|--------|-------|---------|
| stiffness | Resistance to deformation | 50-500 | 100 |
| damping | Energy dissipation | 3-50 | 10 |
| mass | Inertia (heavier = more bouncy) | 0.1-10 | 1 |
| velocity | Initial velocity (px/s) | any | 0 |

| Feel | stiffness | damping | mass |
|------|-----------|---------|------|
| Snappy UI | 300 | 30 | 0.5 |
| Bouncy | 200 | 10 | 1 |
| Heavy | 500 | 50 | 3 |
| Gentle | 100 | 20 | 1 |

## easing Equivalents

| CSS | cubic-bezier | Framer Motion |
|-----|-------------|---------------|
| ease-out | `(0, 0, 0.58, 1)` | `easeOut` |
| ease-in-out | `(0.42, 0, 0.58, 1)` | `easeInOut` |
| ease | `(0.25, 0.1, 0.25, 1)` | `ease` |
| linear | `(0, 0, 1, 1)` | `linear` |
| — | `(0.34, 1.56, 0.64, 1)` | `backOut` |
| — | `(0.68, -0.6, 0.32, 1.6)` | `backIn` |

## CSS Animation Events

```js
element.addEventListener('animationstart', handler)   // animation begins
element.addEventListener('animationend', handler)     // animation completes
element.addEventListener('animationiteration', handler) // each loop (for infinite)
element.addEventListener('animationcancel', handler)  // animation aborted
```

```js
element.addEventListener('transitionstart', handler)  // transition begins
element.addEventListener('transitionrun', handler)    // transition queued (before delay)
element.addEventListener('transitionend', handler)    // transition completes
element.addEventListener('transitioncancel', handler) // transition aborted
```

## animation shorthand

```css
/* animation: name duration timing-function delay iteration-count direction fill-mode play-state */
.element {
  animation: slideIn 300ms ease-out 100ms 1 normal forwards running;
}
```

## Performance Budget for Animation

| Metric | Budget |
|--------|--------|
| Frame time | < 16.67ms (60fps) |
| JS animation work | < 10ms per frame |
| Layout thrash calls | 0 per frame |
| GPU layers | < 5 simultaneous |
| Page transition | < 500ms |
| Micro-interaction | < 300ms |
| Initial page load anim | < 1000ms after TTI |
