# UI Animation Patterns Reference

## Micro-interactions

Micro-interactions are single-purpose animations that provide feedback for a user action.

### Button Feedback
```css
.button {
  transition: transform 100ms ease-out, box-shadow 100ms ease-out;
}
.button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.button:active {
  transform: translateY(0) scale(0.97);
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
```

### Toggle / Switch
```css
.toggle-track {
  transition: background-color 200ms ease-out;
}
.toggle-thumb {
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toggle.active .toggle-thumb {
  transform: translateX(20px);
}
```

### Like / Favorite (Heart animation)
- Scale up → overshoot → scale back (200ms spring)
- On activation: boost scale to 1.3, then settle at 1.0
- On deactivation: scale to 0.9, then back to 1.0 (no bounce)

### Input Focus
```css
.input {
  border-color: var(--border);
  transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
}
.input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.15);
}
```

## Page / Route Transitions

### Fade Transition
```css
.page-enter {
  opacity: 0;
}
.page-enter-active {
  opacity: 1;
  transition: opacity 200ms ease-out;
}
.page-exit {
  opacity: 1;
}
.page-exit-active {
  opacity: 0;
  transition: opacity 150ms ease-in;
}
```

### Slide Transition
```css
.slide-enter {
  transform: translateX(20px);
  opacity: 0;
}
.slide-enter-active {
  transform: translateX(0);
  opacity: 1;
  transition: all 250ms ease-out;
}
.slide-exit-active {
  transform: translateX(-20px);
  opacity: 0;
  transition: all 200ms ease-in;
}
```

### Shared Element Transition
Elements that exist on both pages animate smoothly between positions.
```javascript
// Framer Motion shared layout animation
<motion.div layoutId="card-image" transition={{ type: "spring", stiffness: 300, damping: 30 }}>
  <img src={item.image} />
</motion.div>
```

Key principle: find elements common to both views and animate their transform/scale rather than remounting.

## Loading States

### Skeleton Screens
```css
.skeleton {
  background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%);
  background-size: 200% 100%;
  animation: skeletonPulse 1.5s ease-in-out infinite;
}

@keyframes skeletonPulse {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Content Reveal
```css
@keyframes contentReveal {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.list-item {
  animation: contentReveal 300ms ease-out both;
}
.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 50ms; }
```

### Optimistic UI
Show the result immediately, animate it in, then correct if the server response differs.
```javascript
// Optimistic update
function addItem(item) {
  // Immediately show in UI with entrance animation
  setItems(prev => [...prev, { ...item, status: 'optimistic' }]);
  // Server request
  api.addItem(item).then(response => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...response, status: 'confirmed' } : i));
  }).catch(() => {
    setItems(prev => prev.filter(i => i.id !== item.id));
    // Show error state with shake animation
  });
}
```

## Parallax

```css
.parallax-container {
  overflow: hidden;
  position: relative;
}
.parallax-bg {
  transform: translateY(var(--parallax-offset, 0));
  transition: transform 100ms linear;
}
```

```javascript
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  document.querySelectorAll('[data-parallax]').forEach(el => {
    const speed = el.dataset.parallax || '0.5';
    el.style.setProperty('--parallax-offset', `${scrollY * speed}px`);
  });
});
```

## Scroll-Triggered Animations

```javascript
import { useInView } from 'react-intersection-observer';

function AnimatedSection({ children }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={`animate-on-scroll ${inView ? 'visible' : ''}`}
    >
      {children}
    </div>
  );
}
```

```css
.animate-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 600ms ease-out, transform 600ms ease-out;
}
.animate-on-scroll.visible {
  opacity: 1;
  transform: translateY(0);
}
```

## List / Item Animations

| Pattern | Implementation | Use Case |
|---------|---------------|----------|
| Fade in | Opacity 0 → 1 | Low emphasis items |
| Slide in + fade | translateY(20) + opacity | Cards, list items |
| Scale in | scale(0.95) → scale(1) | Gallery, grid |
| Stagger waterfall | Sequential delay per item | Any list reveal |
| Height animation | Grid-template-rows: 0fr → 1fr | Accordion, expand |

## Animation Guidelines for Performance

- **Always prefer `transform` and `opacity`** — they trigger only compositing, not layout or paint
- **Avoid animating `width`, `height`, `top`, `left`, `margin`, `padding`** — these trigger layout recalculations
- **Use `will-change` sparingly** on elements that will animate (creates a new compositor layer)
- **Keep animations to 60fps** — check DevTools Performance tab
- **GPU-composited properties are fastest**: `transform`, `opacity`, `filter`
