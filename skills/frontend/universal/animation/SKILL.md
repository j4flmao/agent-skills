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
version: "1.2.0"
author: "j4flmao"
license: "MIT"
---

# Frontend Animation

**Description:** Implements web animations -- page transitions, gesture animations, micro-interactions, motion design. Triggered by "animation", "motion", "Framer Motion", "GSAP", "CSS animation", "page transition", "enter animation", "exit animation", "gesture animation", "spring animation", "keyframe", "motion design".

**Version:** 1.2.0
**Author:** j4flmao
**License:** MIT

---

## Purpose

Deliver performant, accessible, and cohesive motion design across the frontend -- from micro-interactions to full page transitions -- while respecting user accessibility preferences and maintaining 60fps frame budget across mid-range devices.

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
- Device target range (mobile-only, desktop, or both)

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

--
Compression footer: frontend-animation/v1 | 4 sections | lib: <selected> | perf: <ok|warn>
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- Animations run at 60fps on mid-range devices
- prefers-reduced-motion respected globally
- Only transform/opacity animated
- Page transitions < 500ms, micro-interactions < 300ms
- No layout thrashing in performance trace
- Spring physics feel natural (no overshoot on UI elements)

### Max Response Length
4096 tokens

---

## Component Architecture / Decision Trees

### Animation Library Decision Tree

```
Is it a React project?
  |-- YES --> Is animation declarative (mount/unmount)?
  |     |-- YES --> Use Framer Motion (AnimatePresence, layout animations)
  |     |-- NO  --> Is it a single gesture or hover?
  |           |-- YES --> CSS transitions (no JS dep needed)
  |           |-- NO  --> Framer Motion or react-spring
  |-- NO --> Is it a complex timeline sequence?
        |-- YES --> GSAP (timelines, scrollTrigger, SVG morph)
        |-- NO  --> Is it a simple CSS animation?
              |-- YES --> CSS @keyframes + transitions
              |-- NO  --> WAAPI (Web Animations API)
```

### Architecture Options

**Option A: CSS-only animation** -- Zero JS overhead. Best for: hover states, focus rings, loading spinners, skeleton pulses. Limited to simple transitions and keyframes. No timeline sequencing. Control via CSS custom properties for theming.

```css
.element {
  transition: transform 200ms ease, opacity 200ms ease;
}
.element:hover {
  transform: scale(1.05);
}
```

**Option B: Framer Motion (React)** -- Declarative spring animations, layout animations via `layout` prop, exit animations via `AnimatePresence`, gesture handling (drag, swipe, hover, tap). Best for: component-level animations in React SPAs and Next.js. Bundle size: ~35KB gzipped.

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
  transition={{ type: "spring", stiffness: 300, damping: 25 }}
/>
```

**Option C: GSAP (GreenSock)** -- Professional-grade timeline control, ScrollTrigger plugin, SVG morphing, cross-browser consistency. Best for: marketing pages, complex reveal sequences, scroll-driven narratives, non-React projects. Bundle size: ~45KB gzipped with ScrollTrigger.

**Option D: WAAPI (Web Animations API)** -- Native browser API. Framework-agnostic. Zero dependency cost. Best for: simple imperative sequences, polyfill-free modern browsers. Limited easing options (no spring), no timeline chaining without manual orchestration.

```js
element.animate([
  { transform: 'scale(1)', opacity: 1 },
  { transform: 'scale(1.1)', opacity: 0.8 }
], { duration: 200, easing: 'ease-out', fill: 'forwards' })
```

### Tradeoff Matrix

| Criterion | CSS | Framer Motion | GSAP | WAAPI |
|-----------|-----|---------------|------|-------|
| Bundle cost | 0 KB | ~35 KB | ~45 KB | 0 KB |
| Spring physics | No | Yes (configurable) | Yes (GSAP 3.6+) | No |
| Timeline sequencing | Manual | AnimatePresence | Native timeline | Manual promise chain |
| Scroll-driven | Intersection Observer | useInView | ScrollTrigger | Intersection Observer |
| SVG morphing | No | layout animation | MorphSVG plugin | No |
| Cross-browser | Native | React only | All (IE11+) | Modern browsers only |
| Learning curve | Low | Medium | Medium-High | Low |

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
- Page transition duration: 200-400ms for smooth feel without perceived delay.
- For Next.js: use the `layout` prop on page components with `AnimatePresence` in `_app.tsx` or use the `page` transition API.
- For SPAs: wrap route components with `AnimatePresence mode="wait"` for sequential enter/exit.

### 3. Gesture Animations
- **Drag:** spring physics (stiffness 200, damping 20, mass 0.5) for natural feel. Constrain drag within bounds using `dragConstraints`.
- **Swipe:** velocity-based transitions -- read velocity on release, animate to target or origin. Use `onDragEnd` with velocity extraction.
- **Hover:** scale 1 to 1.02-1.05, duration 150-200ms, ease-out. Combine with `whileHover` for interactive elements.
- **Tap:** scale 1 to 0.95, duration 100ms, spring back with `whileTap`.
- **Pinch/Zoom:** Track two-pointer distance changes. Use transform scale + translate for zoomable containers.
- Bind gesture handlers at container level, not individual elements.

### 4. Performance
- GPU-composited properties only: `transform` and `opacity`.
- Never animate: `width`, `height`, `top`, `left`, `margin`, `padding` -- cause layout thrashing.
- `will-change: transform` on persistently animated elements (remove after idle).
- Use `contain: layout style paint` on non-animated parents.
- Profile with DevTools Performance tab -- target 10ms frame budget for JS animation work.
- For many simultaneous elements (particles, confetti), use Canvas or WebGL instead of DOM.
- Debounce scroll/resize handlers that trigger animations.

### 5. Accessibility
- `prefers-reduced-motion: reduce` -- instant state transitions (0ms duration, no parallax, no auto-play).
- `prefers-reduced-motion: no-preference` -- full animations.
- Use `matchMedia('(prefers-reduced-motion: reduce)')` for JS gating.
- Respect OS setting as default; provide a per-session toggle.
- Reduced motion does not mean no motion: use opacity-only fades (100-200ms) to show state changes.
- Disable parallax, scale effects, and continuous animation (spinners to static indicator).
- For animation categories: disable "scroll-triggered", "parallax", "scale/bounce", "flashing/strobing". Allow "opacity fades", "color transitions", "transform shifts" at reduced duration.

### 6. Micro-interactions
- **Hover scale:** 150ms, ease-out, 1.02-1.05.
- **Button press:** scale 0.95, 100ms, spring(100, 10).
- **Skeleton pulse:** CSS keyframe opacity 0.3 to 1, 1.5s infinite. With reduced motion: static.
- **Toast enter:** slide up + fade, 200ms. Exit: fade out, 200ms.
- **Progress fill:** 300-600ms linear across container.
- **Checkbox toggle:** spring-based scale + color shift, 200ms.
- **Accordion expand:** height via `grid-template-rows: 0fr to 1fr` with CSS transition (no JS height calc).
- All micro-interactions < 300ms total duration.

### 7. Scroll-Triggered Animation
- Use IntersectionObserver for non-React projects or simple reveal.
- Use Framer Motion's `useInView` hook for React projects.
- Use GSAP ScrollTrigger for complex scroll narratives and pinning.
- Animate elements when they enter the viewport, not on page load.
- Reveal threshold: 0.1-0.25 for images, 0.3-0.5 for text content.
- Stagger children with `transition.staggerChildren` (Framer Motion) or GSAP timeline offset.

### 8. SVG Animation
- Animate SVG attributes via `motion.path` `pathLength` for draw effects.
- GSAP MorphSVG plugin for shape morphing between path data.
- CSS stroke-dasharray + stroke-dashoffset for line draw effects.
- animateTransform for rotational SVG animations.
- SVG viewBox animation for zoom effects (use transform scale instead if possible).

### 9. Testing Animations
- Use jest with Framer Motion's `motion` mocked to `div` for unit tests.
- For visual regression: Storybook + Chromatic with animation disable decorator.
- E2E: Playwright with `page.waitForSelector` for animation end states.
- Performance: DevTools performance recording with labeled frame markers.
- Accessibility test: enable `prefers-reduced-motion: reduce` and verify state changes still communicate.

---

## Common Pitfalls

### 1. Animating Layout Properties
Using `width`, `height`, `top`, `left` triggers layout recalculation on every frame. This causes jank, especially on mobile. Always use `transform: scale()` for size and `transform: translate()` for position.

```css
/* BAD */
.element {
  animation: slide 300ms;
}
@keyframes slide {
  from { left: -100px; }
  to { left: 0; }
}

/* GOOD */
@keyframes slide {
  from { transform: translateX(-100px); }
  to { transform: translateX(0); }
}
```

### 2. Forgetting Exit Animations
When removing elements from the DOM, the element disappears instantly unless you explicitly animate exit. In React, wrap with `AnimatePresence` and define `exit` prop. For CSS, use a timeout to toggle visibility before removal.

### 3. Spring Over-oscillation
Default spring parameters often cause visible bounce that feels unpolished. For UI elements, use `stiffness: 200-300` and `damping: 15-25`. Stiffness > 500 creates robotic motion. Damping < 10 causes excessive wobble.

### 4. Unthrottled Scroll Event Listeners
Attaching animation triggers to scroll without throttling fires hundreds of callbacks per second. Use `requestAnimationFrame` or IntersectionObserver instead of scroll events. If scroll events are unavoidable, throttle to 16ms intervals.

### 5. Animating Too Many Elements Simultaneously
More than 5-8 simultaneous animated elements will drop frames on mid-range devices. Batch animations into staggered sequences. Use `will-change` sparingly -- each promoted layer consumes GPU memory.

### 6. No Reduced Motion Check for Auto-play
Auto-playing animations (carousels, marquees, background video) that ignore `prefers-reduced-motion` cause vestibular disorders for users with motion sensitivity. Always gate auto-play animations behind the reduced motion media query.

### 7. Layout Shift from Animation Removals
When animating elements out of the document flow, surrounding content snaps to fill the gap before the animation completes. Use `position: absolute` on exiting elements or animate `height` alongside opacity with `overflow: hidden` on the parent.

### 8. Missing `fill: forwards` on Final Frame
Without `animation-fill-mode: forwards` or WAAPI `fill: "forwards"`, the animated element snaps back to its pre-animation state when the animation ends. This creates a jarring visual pop.

---

## Compared With

| Approach | Strengths | Weaknesses | Best Use Case |
|----------|-----------|------------|---------------|
| CSS transitions/keyframes | Zero JS, GPU-composited, declarative | No timeline, no spring, limited sequencing | Hover, focus, simple state changes |
| Framer Motion | Declarative springs, layout animations, exit animations, drag/gesture | React-only, ~35KB bundle | React component animations |
| GSAP | Full timeline control, ScrollTrigger, SVG morph, IE11+ | ~45KB, commercial license for some plugins | Marketing sites, complex sequences |
| react-spring | Physics-based springs, interpolation | Smaller ecosystem, fewer gesture helpers | Natural-feeling UI motion |
| WAAPI | Zero cost, native, imperative | No spring easing, no timeline chaining | Simple imperative sequences |
| Lottie/Bodymovin | After Effects export, complex vector animations | Large file sizes, no runtime interaction | Brand animations, splash screens |
| anime.js | Lightweight, versatile JS animations | Smaller community, less maintenance | General purpose JS animations |

---

## Advanced Gesture Animations

```typescript
// Framer Motion — complex gesture composition
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

function Card3D({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), {
    stiffness: 300, damping: 30,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), {
    stiffness: 300, damping: 30,
  });

  function handleMouseMove(event: React.MouseEvent) {
    const rect = event.currentTarget.getBoundingClientRect();
    const xPos = (event.clientX - rect.left) / rect.width - 0.5;
    const yPos = (event.clientY - rect.top) / rect.height - 0.5;
    x.set(xPos); y.set(yPos);
  }

  function handleMouseLeave() { x.set(0); y.set(0); }

  return (
    <motion.div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}>
      {children}
    </motion.div>
  );
}
```

## Spring Physics Reference

| Feel | Stiffness | Damping | Mass | Use Case |
|------|-----------|---------|------|----------|
| Snappy UI | 300 | 25 | 0.5 | Buttons, toggles, micro-interactions |
| Gentle UI | 200 | 20 | 1.0 | Cards, modals, sheets |
| Bouncy | 150 | 10 | 1.0 | Fun reveal, celebration animations |
| Heavy | 500 | 40 | 2.0 | Drag constraints, large elements |
| Fluid | 100 | 15 | 1.0 | Page transitions, parallax |
| Stiff (no bounce) | 400 | 40 | 1.0 | Progress bars, loading indicators |

```typescript
const uiSpring = { type: 'spring', stiffness: 300, damping: 20, mass: 0.5 };
const gestureSpring = { type: 'spring', stiffness: 500, damping: 30, mass: 1 };
```

## Layout Animations (FLIP)

```tsx
function ReorderList() {
  const [items, setItems] = useState(['A', 'B', 'C', 'D']);
  return (
    <div>
      <button onClick={() => setItems([...items].sort(() => Math.random() - 0.5))}>Shuffle</button>
      <ul>
        {items.map((item) => (
          <motion.li key={item} layout transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
            {item}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
```

## Shared Element Transitions

```tsx
// Shared layoutId enables cross-page element transitions
// Page A: <motion.img layoutId={`product-image-${id}`} src={product.image} />
// Page B: <motion.img layoutId={`product-image-${id}`} src={product.image} style={{ width: '100%', height: 400 }} />
// Framer Motion animates the transition between the two layouts automatically
```

## CSS-Driven Animations (Zero JS)
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out both;
}

.animate-stagger > * {
  opacity: 0;
  animation: fadeIn 0.3s ease-out both;
}

.animate-stagger > *:nth-child(1) { animation-delay: 0ms; }
.animate-stagger > *:nth-child(2) { animation-delay: 75ms; }
.animate-stagger > *:nth-child(3) { animation-delay: 150ms; }
.animate-stagger > *:nth-child(4) { animation-delay: 225ms; }
```

```tsx
// View Transition API (Chrome 111+) — instant cross-page morphing
// app/layout.tsx
function navigateWithTransition(path: string) {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      router.push(path);
    });
  } else {
    router.push(path);
  }
}

// Set view-transition-name on shared elements
// <img style={{ viewTransitionName: 'product-image' }} />
```

## Performance Budget by Animation Type

| Animation Type | Max Elements | Max Duration | Frame Budget |
|---------------|-------------|-------------|--------------|
| Micro-interaction (hover, tap) | 1-2 | 300ms | < 4ms JS |
| Page transition | 5-10 | 400ms | < 8ms JS |
| Scroll reveal | 10-20 | 600ms | < 6ms JS |
| Parallax | 3-5 | Continuous | < 2ms JS |
| Particle (DOM) | 5-8 | 2s | < 8ms JS |
| Particle (Canvas) | 100-1000 | 5s | < 10ms JS |

## Performance Considerations

### Frame Budget Breakdown
Total budget per frame at 60fps: 16.67ms. Recommended allocation: JS animation work < 8ms, style recalculation < 3ms, paint + composite < 5ms. Exceeding 16ms causes dropped frames.

### Layer Promotion Pitfalls
The browser promotes elements to GPU compositor layers when `will-change`, 3D transforms (`translateZ(0)`), or `<video>`/`<canvas>` are present. Each layer consumes ~1-2MB of GPU memory. On mobile devices with 128-256MB GPU memory, 50+ layers exhaust memory and crash the GPU process.

### Measurement Tools
- Chrome DevTools Performance tab: record animation sequence, check FPS counter, look for red frames
- `performance.now()` markers around animation callbacks: log durations
- `requestAnimationFrame` callback timestamps: monitor frame spacing (delta > 20ms indicates jank)
- Lighthouse: "animations are smooth" audit
- Web Vitals: Cumulative Layout Shift (CLS) must stay below 0.1

## Security Considerations

- Animated content should not convey time-sensitive information (e.g., "press within 3 seconds") — users may have animations disabled
- `will-change` is purely cosmetic — does not introduce security concerns
- Lottie JSON files from untrusted sources may contain malicious payloads — validate before rendering
- Third-party animation libraries loaded from CDNs increase supply chain risk — use SRI hashes and lock versions
- GSAP's `scrollTrigger` does not introduce XSS vectors when used with static selectors
- Avoid interpolating user-generated content into animation props (e.g., CSS-in-JS dynamic values) without sanitization

## Accessibility Considerations (Expanded)

- `prefers-reduced-motion`: use `@media (prefers-reduced-motion: reduce)` to disable or simplify animations
- Framer Motion: `MotionConfig reducedMotion="user"` auto-handles the media query
- GSAP: `gsap.ticker.lagSmoothing(0)` and manually check `window.matchMedia('(prefers-reduced-motion: reduce)')`
- Flashing/strobing animations (over 3 flashes/second) can trigger seizures — avoid entirely
- Provide a user-facing toggle to disable motion even if the user hasn't set OS-level preference
- Animations that convey meaning (e.g., a loading spinner) must have a text equivalent visible when motion is reduced
- Focus indicators should not be animated — `:focus-visible` styles must be instant
- Tooltip/popover animations must respect reduced motion without breaking usability

---

## Ecosystem & Tooling

### Libraries
- **Framer Motion** -- React animation library. Declarative springs, layout animations, AnimatePresence, gesture system (drag, swipe, hover, tap). Active development, Motion team.
- **GSAP** -- Professional-grade animation for any framework. Timeline, ScrollTrigger, MorphSVG, TextPlugin, Draggable. Paid "Green" membership for premium plugins.
- **react-spring** -- Physics-based animation for React. Springs, interpolation, animated SVG. ~15KB.
- **Lottie-web** -- Render After Effects animations in the browser. JSON-based, runtime playback controls.
- **Anime.js** -- Lightweight JS animation library. CSS, SVG, DOM attributes. ~10KB.
- **Motion** -- The standalone version of Framer Motion (since v11). Works without React.

### Design Tools
- **After Effects + Bodymovin** -- Export complex vector animations as Lottie JSON.
- **Rive** -- Real-time interactive animation tool. State machine-driven animations.
- **LottieFiles** -- Lottie animation marketplace and player.
- **Haiku Animator** -- Visual animation tool that exports code.

### Performance Profilers
- Chrome DevTools Performance panel
- Firefox Profiler
- Safari Web Inspector Timeline
- Lighthouse CI for regression detection

---

## Rules

1. Animate only `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, `margin`, `padding`.
2. Respect `prefers-reduced-motion` -- instant transitions on reduce, full motion on no-preference.
3. Spring animations for UI elements: stiffness between 100-300, damping between 10-20.
4. Micro-interactions must complete within 300ms.
5. Page transitions must complete within 500ms.
6. Use `will-change` sparingly -- only on elements that animate continuously, and remove when idle.
7. Profile frame budget -- JS animation work must stay under 10ms per frame.
8. Provide reduced-motion fallback that still conveys state change (e.g., opacity fade instead of scale + rotate).
9. Never auto-play motion without checking `prefers-reduced-motion`.
10. Stagger animated elements with 50-100ms delay between each, never all at once.
11. Use `transform-origin` correctly for scale/rotate animations -- default is center.
12. Avoid animating `box-shadow` -- prefer pseudo-element opacity trick for performance.
13. Test on a mid-range Android device (Moto G4 equivalent) before shipping.
14. GSAP ScrollTrigger animations must use `scrub: 1` or `toggleActions` for smooth scroll-linked motion.
15. Never animate elements that are currently being measured by ResizeObserver or IntersectionObserver.
16. Validate Lottie JSON from untrusted sources before rendering with `lotti-web`.

---

## References

- `references/animation-accessibility.md` -- Animation Accessibility
- `references/animation-anatomy.md` -- Animation Anatomy
- `references/animation-libraries.md` -- Animation Libraries
- `references/animation-performance.md` -- Animation Performance
- `references/animation-techniques.md` -- Animation Techniques
- `references/animation-tools.md` -- Animation Tools Reference
- `references/web-animation-performance.md` -- Web Animation Performance & Compositing Deep Dive
- `references/spring-gesture-animation.md` -- Spring Physics & Gesture Animation Patterns

## Handoff

When complete, output the animation strategy with implementation snippets. If the request scope exceeds page transitions + micro-interactions (e.g., full motion design system), flag for a dedicated motion designer handoff. For GSAP ScrollTrigger-heavy work, flag for scroll experience specialist.
