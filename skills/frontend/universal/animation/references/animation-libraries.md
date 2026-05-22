# Animation Libraries

Patterns and usage guides for the four major web animation approaches.

---

## CSS Transitions & Keyframes

Best for: simple state-driven UI animations, zero JS overhead.

```css
.button {
  transition: transform 150ms ease-out, opacity 200ms ease-out;
  will-change: transform;
}
.button:hover {
  transform: scale(1.05);
}
```

```css
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
.skeleton {
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; opacity: 0.5; }
}
```

Keyframe animation properties: `animation-name`, `animation-duration`, `animation-timing-function`, `animation-delay`, `animation-iteration-count`, `animation-direction`, `animation-fill-mode`, `animation-play-state`.

---

## Framer Motion (React)

### Declarative spring animations
```tsx
<motion.div
  animate={{ scale: 1 }}
  initial={{ scale: 0 }}
  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
/>
```

### AnimatePresence (exit animations)
```tsx
<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    />
  )}
</AnimatePresence>
```

### Shared layout animations
```tsx
<motion.div layoutId="card-{id}" />
<!-- Elements with same layoutId animate between positions -->
```

### Gesture shortcuts
```tsx
<motion.div
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  drag="x"
  dragElastic={0.2}
  onDragEnd={(_, info) => console.log(info.velocity.x)}
/>
```

Layout animations are opt-in with the `layout` prop. Use `layoutId` for shared element transitions between routes. All gesture props accept `transition` overrides.

---

## GSAP (GreenSock)

Best for: complex timeline sequences, SVG, scroll-triggered, cross-browser.

### Timeline
```js
const tl = gsap.timeline({ defaults: { duration: 0.3, ease: 'power2.out' } });
tl.to('.el', { x: 100 })
  .to('.el', { opacity: 0 })
  .from('.el2', { y: 50 });
```

### ScrollTrigger
```js
gsap.registerPlugin(ScrollTrigger);
gsap.from('.reveal', {
  scrollTrigger: '.reveal',
  y: 100,
  opacity: 0,
  duration: 0.6,
});
```

### GSAP Flip (layout animation)
```js
const state = Flip.getState('.card');
// mutate DOM
Flip.from(state, { duration: 0.4, ease: 'power2.inOut' });
```

GSAP requires the ScrollTrigger plugin for scroll-linked animation. Register via `gsap.registerPlugin(ScrollTrigger)`. Flip is its own plugin.

---

## WAAPI (Web Animations API)

Framework-agnostic, native browser API. No library import needed.

```js
element.animate([
  { transform: 'scale(0)', opacity: 0 },
  { transform: 'scale(1)', opacity: 1 }
], {
  duration: 300,
  easing: 'ease-out',
  fill: 'forwards'
});
```

```js
// pause / play / reverse
const anim = element.animate(keyframes, options);
anim.pause();
anim.play();
anim.reverse();
```

WAAPI does not support spring easing natively. Use `cubic-bezier()` for custom easing. No built-in scroll linking — pair with IntersectionObserver for scroll-triggered effects. No promise-based `onfinish` in all browsers — use `finish` event listener instead.
