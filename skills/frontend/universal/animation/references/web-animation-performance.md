# Web Animation Performance & Compositing Deep Dive

## The Rendering Pipeline

When the browser renders a frame, it goes through five stages. Understanding these stages is essential for writing performant animations.

```
JavaScript -> Style -> Layout -> Paint -> Composite
```

### Stage 1: JavaScript
Any JS that triggers animation (requestAnimationFrame callbacks, event handlers, animation library tick functions). If this blocks the main thread for more than 16ms, frames are dropped.

### Stage 2: Style
The browser computes which CSS rules apply to each element. Triggered by class changes, inline style modifications, CSS custom property changes. This is relatively fast but can become expensive with complex selector chains.

### Stage 3: Layout (Reflow)
The browser calculates element positions and sizes. This is the most expensive stage. Triggered by:
- Reading/writing layout properties (`offsetWidth`, `offsetHeight`, `getBoundingClientRect`, `scrollTop`)
- Animating layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`, `border-width`)
- DOM mutations (adding/removing elements, changing content)
- Font changes, viewport resize

### Stage 4: Paint
The browser fills in pixels for each element: text, colors, images, shadows, borders. Triggered by animating visual properties that are not compositor-only (`color`, `background-color`, `box-shadow`).

### Stage 5: Composite
The browser draws the final layers onto the screen. This runs on the GPU compositor thread and is independent of the main thread. Only `transform` and `opacity` can reach this stage without triggering Layout or Paint.

### Pipeline Optimization Table

| Property | Triggers Layout | Triggers Paint | Compositor-only |
|----------|----------------|----------------|-----------------|
| transform | No | No | Yes |
| opacity | No | No | Yes |
| filter | No | Yes | No |
| clip-path | No | Yes | No |
| color | No | Yes | No |
| background-color | No | Yes | No |
| box-shadow | No | Yes | No |
| width | Yes | Yes | No |
| height | Yes | Yes | No |
| top | Yes | Yes | No |
| left | Yes | Yes | No |
| margin | Yes | Yes | No |
| padding | Yes | Yes | No |
| border-width | Yes | Yes | No |
| font-size | Yes | Yes | No |
| transform (with will-change) | No | No | Yes |
| opacity (with will-change) | No | No | Yes |

## GPU Compositing Deep Dive

### What Is a Layer?
A "layer" in browser compositing is a rectangular bitmap that the GPU can transform and blend independently. Think of it like a Photoshop layer: each layer is its own image, and the compositor stacks them with transforms and alpha blending.

### How Layers Are Created
The browser automatically creates a compositor layer when:
- The element has `will-change: transform` or `will-change: opacity`
- The element has a CSS 3D transform (`translateZ(0)`, `rotateY(45deg)`, `scale3d()`)
- The element is a `<video>` or `<canvas>` element
- The element is a `<iframe>` with a different origin
- The element is positioned fixed and inside a scroll container
- The element has `position: fixed` (in some browsers)
- The element has CSS `filter` or `mix-blend-mode` (in some browsers)

### Layer Counting on Mobile
Mobile GPU memory is limited. Typical allocations:
- Low-end Android (Mali-400): 128MB shared GPU memory
- Mid-range Android (Adreno 506): 256MB
- iPhone SE: 512MB
- High-end desktop: 1-8GB dedicated

Each compositor layer consumes approximately:
- Color buffer (RGBA 8-bit): width x height x 4 bytes
- Optional depth/stencil: width x height x 4 bytes
- Texture overhead: ~100KB per texture allocation

Estimated memory per layer at 1080p: 8-12MB. At 50 layers, that is 400-600MB, exceeding mid-range device budgets.

### Layer Explosion Anti-Pattern

```css
/* BAD -- forces every card into a separate compositor layer */
.card {
  transform: translateZ(0);  /* forces layer */
  will-change: transform;     /* forces layer */
}
```

If you have 100 cards in a grid, this creates 100 GPU layers. The GPU cannot composite 100 overlapping layers at 60fps on mobile.

```css
/* GOOD -- let the browser decide, or batch */
.card-container {
  will-change: transform;  /* one layer for the container */
}
.card {
  /* no forced layers */
}
```

### Profiling Layers in Chrome DevTools
1. Open DevTools > Performance > Settings > Enable "Layer borders"
2. Orange tiles = compositor layers
3. Green tiles = painted content that is not composited
4. Red tiles = slow paint areas
5. Open the "Layers" tab (next to Console) for a full layer tree

## will-change Best Practices

### When to Use
- Elements that animate continuously: spinners, parallax backgrounds, drag elements, scroll-linked animations
- Elements whose animation is triggered frequently (hover-driven transforms in a large list)
- Elements that will be animated "soon" (set will-change, then animate, then remove)

### When NOT to Use
- Static elements -- creates unnecessary GPU memory pressure
- More than 5-10 elements simultaneously
- `will-change: all` -- this is a hint to the browser to promote ALL properties, causing GPU memory exhaustion
- On every element as a blanket optimization -- browsers have heuristics to detect this and ignore it

### Timing Pattern

```js
const element = document.querySelector('.animated');

// Set before animation starts
element.style.willChange = 'transform';

// Trigger the animation
element.classList.add('animating');

// Remove after animation completes
element.addEventListener('transitionend', () => {
  element.style.willChange = 'auto';
}, { once: true });
```

### CSS-Only Equivalent Using Animation Events

```css
.element {
  will-change: transform;
}
.element:not(:hover) {
  will-change: auto; /* Reset when not hovering */
}
```

Note: `will-change: auto` is the reset value.

## Frame Budget Optimization

### 16.67ms Breakdown

At 60fps, each frame has 16.67ms. The browser needs time for all stages:

| Stage | Budget (ms) | Who runs it |
|-------|-------------|-------------|
| JS callbacks | 0-8 | Main thread |
| Style recalc | 1-3 | Main thread |
| Layout | 1-5 | Main thread |
| Paint | 1-3 | Main thread (or raster thread) |
| Composite | 0.5-2 | GPU process (compositor thread) |
| VSync wait | 0-2 | GPU process |

If total exceeds 16.67ms, the frame is skipped (dropped frame). Consistent dropped frames = visible jank.

### Techniques to Stay Within Budget

**Batch style reads and writes:**
```js
// BAD -- forces multiple layout recalculations
element.style.width = `${newWidth}px`;
const height = element.offsetHeight; // Forces layout read
element.style.height = `${height * 1.5}px`; // Forces layout write again

// GOOD -- batch reads, then writes
const height = element.offsetHeight; // Read first
element.style.width = `${newWidth}px`;
element.style.height = `${height * 1.5}px`; // Write batch
```

**Use requestAnimationFrame for smooth loops:**
```js
// BAD -- setTimeout has unpredictable timing
function animate() {
  updatePosition();
  setTimeout(animate, 16);
}

// GOOD -- rAF syncs with browser's frame cycle
function animate(timestamp) {
  updatePosition(timestamp);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

**Avoid Force Layout (Layout Thrashing):**
Reading layout-triggering properties immediately after writing them forces the browser to recalculate layout synchronously. Common offenders:
```js
element.style.width = '100px';
console.log(element.offsetWidth); // Force layout!

// Instead, batch all reads together
element.style.width = '100px';
element.style.height = '200px';
// Then batch all reads
console.log(element.offsetWidth);
console.log(element.offsetHeight);
```

## CSS Animation Performance

### Trigering Paint vs Composite Animations

```css
/* Composite animation -- runs on GPU */
@keyframes gpuFriendly {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100px); opacity: 0.5; }
}

/* Paint animation -- runs on CPU */
@keyframes paintHeavy {
  from { background-color: red; color: blue; }
  to { background-color: blue; color: red; }
}
```

The GPU-friendly animation will run at 60fps even under main thread load. The paint animation will drop frames whenever the main thread is busy.

### Hardware Acceleration Hints

```css
.element {
  /* This is a "null" 3D transform that promotes to GPU layer */
  transform: translateZ(0);
  /* Without promoting, composite-only animations still run on main thread */
  will-change: transform;
}
```

Note: Modern Chrome (2020+) already promotes elements with ongoing transform/opacity animations to GPU layers automatically. Use `will-change` proactively only for animations that start within the next frame.

### animation-fill-mode and Performance

```css
.element {
  /* forwards keeps the final keyframe state applied */
  /* This prevents additional paint work on animation end */
  animation-fill-mode: forwards;
}
```

Without `forwards`, the element snaps back to its original state after the last animation iteration completes, potentially causing an extra paint frame.

### Step Animation for Sprite Sheets

```css
.sprite {
  width: 100px;
  height: 100px;
  background-image: url('sprite-sheet.png');
  background-size: 800px 100px;
  /* steps(7) = 8 frames (0 to 7) */
  animation: play 0.8s steps(7) infinite;
}
@keyframes play {
  from { background-position: 0 0; }
  to { background-position: -800px 0; }
}
```

`steps(n)` jumps between keyframes instead of interpolating, which is essential for sprite sheet animations. Using `steps()` also prevents intermediate paint frames.

## JavaScript-Driven Performance

### requestAnimationFrame Best Practices

```js
let rafId = null;
let lastTime = 0;

function animationLoop(timestamp) {
  // Delta time in ms since last frame
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  // Cap delta to prevent "catch-up" after tab switch
  const cappedDelta = Math.min(delta, 33); // cap at ~30fps equivalent

  // Update positions based on cappedDelta
  updateAnimations(cappedDelta);

  // Schedule next frame
  rafId = requestAnimationFrame(animationLoop);
}

// Start
rafId = requestAnimationFrame(animationLoop);

// Stop
cancelAnimationFrame(rafId);
```

Important: `rafId` should be cancelled when the component unmounts or the animation is no longer needed. Otherwise, the callback keeps running indefinitely, consuming CPU cycles.

### OffscreenCanvas for Heavy Visuals

For particle systems, confetti effects, or data visualizations with many animated elements, use OffscreenCanvas to move rendering off the main thread:

```js
const canvas = document.getElementById('particles');
const offscreen = canvas.transferControlToOffscreen();

const worker = new Worker('particle-worker.js');
worker.postMessage({ canvas: offscreen, width: 800, height: 600 }, [offscreen]);
```

In `particle-worker.js`:
```js
let ctx;
let particles = [];

self.onmessage = function(e) {
  if (e.data.canvas) {
    ctx = e.data.canvas.getContext('2d');
    // Initialize particles
    for (let i = 0; i < 500; i++) {
      particles.push(createParticle());
    }
    requestAnimationFrame(loop);
  }
};

function loop(timestamp) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const p of particles) {
    update(p, timestamp);
    draw(ctx, p);
  }
  requestAnimationFrame(loop);
}
```

## Scroll-Driven Animation Performance

### IntersectionObserver for Reveal Animations

IntersectionObserver runs off the main thread, making it much more performant than scroll events:

```js
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target); // One-shot reveal
    }
  }
}, {
  threshold: 0.1,
  rootMargin: '50px' // Trigger 50px before visible
});

document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
```

### When You Must Use Scroll Events

If you need continuous scroll-linked animation (parallax, progress bars), throttle the handler:

```js
let ticking = false;

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateParallax(window.scrollY);
      ticking = false;
    });
    ticking = true;
  }
});
```

This pattern ensures `updateParallax` is called at most once per frame, no matter how many scroll events fire.

### CSS scroll-timeline (Experimental)

Modern browsers are implementing `scroll-timeline` which moves scroll-linked animations entirely to the compositor thread:

```css
@keyframes progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
.progress-bar {
  animation: progress linear;
  animation-timeline: scroll();
}
```

This is supported in Chrome 115+ behind flags. It eliminates JS overhead for scroll-driven progress indicators.

## Memory Management for Animations

### Animation Cleanup on Unmount

When removing animated elements from the DOM, ensure all animation references are cleaned up:

```js
// Framer Motion handles this automatically via AnimatePresence
// For manual JS animations:
function createAnimation(element) {
  const animation = element.animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
    { duration: 2000, iterations: Infinity }
  );

  // Return cleanup function
  return () => {
    animation.cancel();
  };
}

// Usage in a component's cleanup/dispose
const cleanup = createAnimation(element);
// Later...
cleanup(); // Cancels the animation and releases resources
```

### Memory Leak in requestAnimationFrame

```js
// BAD -- rAF continues after component is destroyed
class AnimatedComponent {
  start() {
    function loop() {
      this.update();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
}

// GOOD -- track and cancel
class AnimatedComponent {
  start() {
    this.running = true;
    const loop = (timestamp) => {
      if (!this.running) return;
      this.update(timestamp);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  destroy() {
    this.running = false;
  }
}
```

## Testing Performance

### Manual Performance Profiling Steps

1. Open Chrome DevTools > Performance
2. Click record, perform the animation sequence
3. Stop recording
4. Check the FPS counter: green line = 60fps, yellow = 30-59fps, red = <30fps
5. Look for red frames in the timeline -- these indicate dropped frames
6. Click on a dropped frame to see what caused it
7. Check the "Summary" tab for time spent in each stage (Rendering, Painting, Scripting)

### Automated Performance Budget in CI

```js
// playwright-performance-test.js
import { test, expect } from '@playwright/test';

test('page transitions at 60fps', async ({ page }) => {
  await page.goto('/');

  // Start collecting performance metrics
  await page.evaluate(() => {
    window.__frames = [];
    let lastTime = performance.now();
    function checkFrame() {
      const now = performance.now();
      window.__frames.push(now - lastTime);
      lastTime = now;
      requestAnimationFrame(checkFrame);
    }
    requestAnimationFrame(checkFrame);
  });

  // Click navigation to trigger transition
  await page.click('[data-nav="about"]');
  await page.waitForTimeout(1000);

  // Get frame timings
  const frames = await page.evaluate(() => window.__frames);
  const droppedFrames = frames.filter(f => f > 50).length;
  const totalFrames = frames.length;
  const dropRate = droppedFrames / totalFrames;

  // No more than 5% dropped frames
  expect(dropRate).toBeLessThan(0.05);
});
```

### Lighthouse Performance Audit for Animations

Lighthouse checks for:
- No non-composited animations running
- Cumulative Layout Shift (CLS) under 0.1 -- animation-induced layout shifts are penalized
- `will-change` usage on animated elements (flagged if overused)
- Offscreen images animated unnecessarily

## Device-Specific Profiles

### Low-End Android (Moto G4 / Galaxy A-series)

| Constraint | Impact |
|------------|--------|
| 128-256 MB GPU memory | Max 15-20 compositor layers |
| CPU: Cortex-A53 quad-core | Rasterization is slow, avoid paint triggers |
| 60fps target unrealistic | Target 30fps, use reduced complexity |
| `translateZ(0)` on many elements | Will crash browser tab |

Strategy: Use CSS transitions only, no libraries, target 30fps smoothness. Disable parallax on these devices via `navigator.hardwareConcurrency` <= 4.

### Mid-Range (iPhone SE 3 / Pixel 6a)

| Constraint | Impact |
|------------|--------|
| 512 MB GPU memory | Max 30-40 compositor layers |
| CPU: Modern mid-range | Can handle Framer Motion or GSAP |
| 60fps target achievable | With careful budgeting |

Strategy: Use Framer Motion with spring physics. Limit simultaneous animations to 5. Use `will-change` on at most 10 elements.

### High-End (iPhone 16 / Galaxy S25 / Desktop)

| Constraint | Impact |
|------------|--------|
| 1-8 GB GPU memory | 100+ compositor layers |
| CPU: High-performance | Can handle complex GSAP timelines |
| 60fps target expected | Any animation library works |

Strategy: Full animation capabilities. GSAP for marketing sites, Framer Motion for apps. Use WebGL for particle effects.

## Compositing Edge Cases

### iframe Compositing
Cross-origin iframes are always promoted to their own compositor layer. Multiple iframes on a page = multiple layers. If you have a dashboard with 5 iframes, that is 5 GPU layers just for the iframes.

### position: fixed Inside Scrolling Containers
Elements with `position: fixed` inside a non-viewport scroll container are promoted to their own layer by some browsers. Each such element consumes a layer.

### CSS Filters and Compositing
```css
.element {
  filter: blur(10px);
}
```

CSS filters force the element into its own compositor layer in most browsers. Animating `filter` triggers paint on every frame. If you need blur, apply it statically and do not animate it.

### mix-blend-mode
```css
.element {
  mix-blend-mode: multiply;
}
```

Like filters, `mix-blend-mode` forces a compositor layer. Each blending element gets its own layer because the browser needs to composite it with the backdrop independently.

## Accessibility and Performance

### prefers-reduced-motion Impact on Performance
When `prefers-reduced-motion: reduce` is active, you should not just set `animation-duration: 0.01ms`. This still triggers the full render pipeline for each keyframe. Instead, completely remove the animation:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

Avoid:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

This still runs the animation tick for 0.01ms, unnecessarily consuming CPU cycles on every frame for every animated element.

### Animation Duration and Battery Life
Animations that run continuously (spinners, background parallax, ambient motion) consume battery even when the user is not interacting with them. On mobile, a spinner that runs for 60 seconds consumes approximately 0.5% of battery per minute (non-scientific estimate based on GPU compositing overhead). For long-running animations, pause them when the tab is backgrounded:

```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseAllAnimations();
  } else {
    resumeAllAnimations();
  }
});
```

## Animation Library Performance Benchmarks

### Framer Motion Memory Profile
- Base bundle: ~35KB gzipped
- Per-animated element: ~2KB of Framer internal state (motion values, subscriptions)
- 100 animated elements: ~200KB of library state
- Re-render on animation tick: each motion component calls `forceUpdate` on the React tree

### GSAP Memory Profile
- Base bundle: ~45KB gzipped (with ScrollTrigger: ~55KB)
- Per-tween: ~500 bytes
- 100 tweens: ~50KB
- Per-timeline: ~2KB
- No React re-render overhead -- GSAP writes to DOM directly

### react-spring Memory Profile
- Base bundle: ~15KB gzipped
- Per-spring: ~1KB
- Uses React concurrent mode hooks to batch updates
- Lower per-element overhead than Framer Motion

### CSS Animation Memory Profile
- Zero JS memory for running animations
- GPU memory for compositor layers (if promoted)
- Lowest memory footprint of all approaches

## Summary of Key Rules

1. Animate only `transform` and `opacity` for compositor-only performance
2. Each compositor layer consumes 8-12MB GPU memory at 1080p
3. Never use `will-change` on more than 5-10 elements simultaneously
4. Batch style reads and writes to avoid forced layout
5. Use `requestAnimationFrame` for JS-driven loops, not `setTimeout`
6. Cancel `requestAnimationFrame` on component unmount to prevent memory leaks
7. Use `animation-fill-mode: forwards` to prevent snap-back
8. Use `steps(n)` for sprite sheet animations
9. Throttle scroll handlers with `requestAnimationFrame` pattern
10. Use IntersectionObserver for reveal animations instead of scroll events
11. Completely remove animations under `prefers-reduced-motion: reduce`, do not just set zero duration
12. Pause animations when document is hidden to save battery
13. Profile layers in DevTools to detect layer explosion
14. Set performance budget: <5% dropped frames on target device
