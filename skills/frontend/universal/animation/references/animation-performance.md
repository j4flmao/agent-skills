# Animation Performance

Guidelines for maintaining 60fps during animations.

---

## GPU Compositing

Browsers composite layers on the GPU. Only two properties trigger compositing without layout or paint:

| Property | Compositor-only | Triggers Layout | Triggers Paint |
|----------|----------------|----------------|----------------|
| `transform` | Yes | No | No |
| `opacity` | Yes | No | No |
| `width` / `height` | No | Yes | Yes |
| `top` / `left` | No | Yes | Yes |
| `margin` / `padding` | No | Yes | Yes |
| `color` / `background` | No | No | Yes |

**Always animate only `transform` and `opacity`.**

---

## Properties to Never Animate

```css
/* ❌ Bad — triggers layout + paint on every frame */
width, height, top, left, right, bottom,
margin, padding, border-width, border-radius,
font-size, line-height, flex-basis, gap

/* ❌ Bad — triggers paint on every frame */
color, background-color, box-shadow, border-color

/* ✅ Good — compositor-only */
transform, opacity
```

If you need to animate size, use `transform: scale()` instead of `width`/`height`. If you need to animate position, use `transform: translate()` instead of `top`/`left`.

---

## Will-Change

```css
.animated-element {
  will-change: transform;
}
```

- Apply to elements that animate continuously (spinners, parallax, drag).
- Remove `will-change` when the animation completes.
- Never apply to more than a few elements simultaneously (exhausts GPU memory).
- Use `will-change: transform, opacity` only when both are animated.

---

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

For JS:
```js
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (prefersReducedMotion.matches) {
  // skip animation, apply final state immediately
}
```

Reduced motion fallback guidelines:
- Parallax → static layered layout
- Scale/bounce → opacity fade only
- Continuous rotation (spinner) → static icon
- Reveal animations → instant full visibility

---

## Frame Budget

- Target: 60fps = 16.67ms per frame
- JS animation work: < 10ms per frame (leaves 6ms for paint + composite)
- Use `requestAnimationFrame` for JS-driven animation loops
- Avoid long tasks (> 50ms) during animation sequences
- Profile with: Chrome DevTools Performance → check "FPS" meter, look for red bars

---

## Layer Promotion

The browser automatically promotes elements to GPU layers when:
- `will-change: transform` or `opacity` is set
- A 3D transform is applied (`translateZ(0)`, `scale3d()`, etc.)
- The element has a `<video>` or `<canvas>` descendant

Do NOT force layers with `translateZ(0)` on every element — each layer consumes GPU memory. On mobile devices with limited GPU memory, layer explosion causes jank.

---

## Testing Checklist

- [ ] Animations maintain 60fps on mid-range device (e.g., Moto G4)
- [ ] No layout thrashing — only transform/opacity animated
- [ ] `prefers-reduced-motion: reduce` disables all non-essential motion
- [ ] Page transition completes within 500ms
- [ ] Micro-interactions complete within 300ms
- [ ] No more than 3 simultaneous GPU-layer animations
- [ ] `will-change` removed after animation completes
