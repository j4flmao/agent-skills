# Spring Physics & Gesture Animation Patterns

## Understanding Spring Physics

A spring in animation is a physics simulation of a mass attached to a spring. When you pull the mass (initial state) and release it, the spring oscillates until it settles at rest (final state). Unlike CSS easings, spring animations respond to velocity -- if you drag an element fast and release, the spring carries that momentum.

### Spring Parameters

**Stiffness (k):** The spring's resistance. Higher values = snappier motion, faster return to rest.

```
stiffness: 100 -- loose, bouncy, exaggerated
stiffness: 300 -- standard UI feel, pleasant
stiffness: 500 -- quick, minimal bounce
stiffness: 1000 -- very rigid, almost instant
```

**Damping (d):** Controls how quickly the oscillation settles. Higher values = less bounce.

```
damping: 5  -- very bouncy, oscillates multiple times
damping: 10 -- noticeable bounce, playful
damping: 20 -- subtle bounce, professional
damping: 30 -- overdamped, no bounce at all
```

**Mass (m):** The simulated weight of the object. Higher values = slower acceleration, more inertia.

```
mass: 0.5 -- lightweight, accelerates fast
mass: 1   -- default, balanced
mass: 2   -- heavy, slow to start and stop
mass: 5   -- very heavy, sluggish feel
```

### Damping Ratio Classification

The relationship between stiffness and damping determines the spring's behavior type:

**Underdamped (zeta < 1):** The spring oscillates past the target before settling. This is the most common and natural-feeling configuration.

```
Stiffness: 200, Damping: 10
zeta = 10 / (2 * sqrt(200)) = 10 / 28.28 = 0.35
Result: 1-2 overshoot oscillations, playful feel
```

**Critically damped (zeta = 1):** The spring returns to rest as fast as possible without overshooting. Useful for UI elements where bounce would feel wrong.

```
Stiffness: 100, Damping: 20
zeta = 20 / (2 * sqrt(100)) = 20 / 20 = 1.0
Result: Fastest return to rest without overshoot
```

**Overdamped (zeta > 1):** The spring returns to rest slowly without oscillation. Feels heavy and deliberate.

```
Stiffness: 50, Damping: 30
zeta = 30 / (2 * sqrt(50)) = 30 / 14.14 = 2.12
Result: Slow settling, no bounce, feels sticky
```

### Spring Duration Calculation

Spring animations do not have a fixed duration. The duration depends on how long the physics simulation takes to settle. However, we can estimate:

```
Settling time ~= -ln(tolerance) / (damping * 0.5 / mass)

For tolerance = 0.001 (99.9% settled):
  With stiffness 300, damping 20, mass 1:
  Settling time ~= -ln(0.001) / (20 * 0.5) = 6.9 / 10 = 0.69 seconds
```

This means the same spring animation may take different real times depending on the starting velocity. This is a feature, not a bug -- it feels more natural than fixed-duration easings.

## Spring Configuration Reference

### Framer Motion Spring Presets

```tsx
// Default spring
transition: { type: "spring", stiffness: 100, damping: 10, mass: 1 }

// Snappy spring -- for button press, small elements
transition: { type: "spring", stiffness: 300, damping: 20, mass: 0.5 }

// Bouncy spring -- for playful reveal animations
transition: { type: "spring", stiffness: 150, damping: 8, mass: 1 }

// Gentle spring -- for card hover, subtle interactions
transition: { type: "spring", stiffness: 200, damping: 15, mass: 1 }

// Heavy spring -- for modals, drawers (feels substantial)
transition: { type: "spring", stiffness: 250, damping: 25, mass: 2 }

// Velocity-driven spring -- for drag/swipe release
transition: { type: "spring", stiffness: 300, damping: 30, mass: 0.5, velocity: dragVelocity }
```

### react-spring Presets

```tsx
import { useSpring, config } from '@react-spring/web'

// Use built-in configs
const props = useSpring({
  to: { opacity: 1, transform: 'scale(1)' },
  from: { opacity: 0, transform: 'scale(0.95)' },
  config: config.default
})

// Available configs:
// config.default -- gentle spring (stiffness: 170, damping: 26)
// config.gentle -- softer spring (stiffness: 120, damping: 14)
// config.wobbly -- playful, bouncy (stiffness: 180, damping: 12)
// config.stiff -- snappy, minimal bounce (stiffness: 210, damping: 20)
// config.fast -- quick transition (stiffness: 300, damping: 30)
// config.slow -- deliberate motion (stiffness: 80, damping: 20)
// config.molasses -- very slow (stiffness: 30, damping: 20)

// Custom config
const props = useSpring({
  to: { x: 100 },
  config: {
    mass: 1,
    tension: 280, // react-spring uses "tension" instead of stiffness
    friction: 60, // react-spring uses "friction" instead of damping
  }
})
```

### GSAP Spring Equivalent

GSAP does not have native spring physics. Use the `"spring"` ease introduced in GSAP 3.12:

```js
gsap.to(element, {
  x: 100,
  ease: "spring(200, 20, 1)", // stiffness, damping, mass
  duration: 0.5 // spring ease ignores this, uses physics-based settling time
})
```

### WAAPI Spring Approximation

WAAPI does not support spring easings natively. Approximate with cubic-bezier:

```js
element.animate([
  { transform: 'translateX(0)' },
  { transform: 'translateX(100px)' }
], {
  duration: 600,
  easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // slight overshoot approximation
  fill: 'forwards'
})
```

Common cubic-bezier spring approximations:

| Desired feel | cubic-bezier |
|-------------|--------------|
| Subtle bounce | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| Snappy | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Exaggerated bounce | `cubic-bezier(0.5, 1.75, 0.5, 1)` |
| Heavy settle | `cubic-bezier(0.22, 0.61, 0.36, 1)` |

## Gesture Animation Patterns

### Drag

#### Framer Motion Drag

```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 300 }}
  dragElastic={0.2}
  onDragEnd={(event, info) => {
    // info.offset.x -- total drag distance
    // info.velocity.x -- velocity at release (px/s)
    if (info.offset.x > 100 || info.velocity.x > 500) {
      // Swipe threshold exceeded -- confirm action
      confirmAction()
    } else {
      // Not enough -- snap back
      snapBack()
    }
  }}
>
  Drag me
</motion.div>

// With spring on release
transition={{
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.5,
  velocity: info.velocity.x // preserves momentum
}}
```

#### Plain JS Drag with Spring

```js
let isDragging = false;
let startX = 0;
let currentX = 0;
let velocity = 0;
let lastX = 0;
let lastTime = 0;

element.addEventListener('pointerdown', (e) => {
  isDragging = true;
  startX = e.clientX;
  currentX = parseFloat(element.dataset.x || '0');
  lastX = e.clientX;
  lastTime = performance.now();
  element.setPointerCapture(e.pointerId);
});

element.addEventListener('pointermove', (e) => {
  if (!isDragging) return;

  const now = performance.now();
  const delta = e.clientX - lastX;
  const dt = now - lastTime;

  velocity = delta / dt * 1000; // px/s
  lastX = e.clientX;
  lastTime = now;

  const newX = currentX + (e.clientX - startX);
  element.style.transform = `translateX(${newX}px)`;
});

element.addEventListener('pointerup', () => {
  isDragging = false;
  // Release with velocity into spring simulation
  if (Math.abs(velocity) > 500) {
    animateSpring(element, parseFloat(element.style.transform.replace('translateX(', '').replace('px)', '')), 0, velocity);
  } else {
    // Snap back
    animateSpring(element, parseFloat(element.style.transform.replace('translateX(', '').replace('px)', '')), 0, 0);
  }
});

function animateSpring(element, from, to, velocity) {
  // Simple spring simulation using Verlet integration
  const stiffness = 300;
  const damping = 25;
  const mass = 1;
  let position = from;
  let vel = velocity * 0.001; // convert px/s to px/ms
  let frame;
  function step(timestamp) {
    const force = -stiffness * (position - to);
    const dampForce = -damping * vel;
    const acceleration = (force + dampForce) / mass;
    vel += acceleration * 0.016; // ~16ms
    position += vel * 0.016;
    element.style.transform = `translateX(${position}px)`;

    if (Math.abs(position - to) < 0.5 && Math.abs(vel) < 0.5) {
      element.style.transform = `translateX(${to}px)`;
      element.dataset.x = to;
      cancelAnimationFrame(frame);
      return;
    }
    frame = requestAnimationFrame(step);
  }
  frame = requestAnimationFrame(step);
}
```

### Swipe

Swipe is drag + release with sufficient velocity. The key metrics are:

**Swipe threshold patterns:**

```
Distance-based: swipe completes when drag > 30% of element width
Velocity-based: swipe completes when release velocity > 500px/s
Combined: distance > 100px OR velocity > 500px/s
```

#### Framer Motion Swipe Card (Tinder-like)

```tsx
const [isRemoved, setIsRemoved] = useState(false);

<motion.div
  drag
  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
  dragElastic={1}
  onDragEnd={(_, info) => {
    const swipeThreshold = 150;
    const velocityThreshold = 500;

    if (
      Math.abs(info.offset.x) > swipeThreshold ||
      Math.abs(info.velocity.x) > velocityThreshold
    ) {
      setIsRemoved(true);
    }
  }}
  animate={isRemoved ? { x: window.innerWidth + 100, opacity: 0 } : { x: 0 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
  Swipeable Card
</motion.div>
```

#### Swipe-to-Dismiss (Mobile UI Pattern)

```tsx
<motion.li
  drag="x"
  dragDirectionLock
  onDragEnd={(_, info) => {
    if (Math.abs(info.offset.x) > 100) {
      // Show delete action
      setShowAction(true);
    }
  }}
>
  <motion.div
    className="content"
    drag="x"
    dragConstraints={{ left: -100, right: 0 }}
    dragElastic={0.1}
  >
    Swipe to reveal delete
  </motion.div>
  <button className="delete-action">Delete</button>
</motion.li>
```

### Hover

#### CSS Hover Animation Pattern

```css
.card {
  transform: scale(1);
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 200ms ease;
}

.card:hover {
  transform: scale(1.03);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
```

The cubic-bezier `(0.34, 1.56, 0.64, 1)` creates a subtle spring-like overshoot on hover enter, making the interaction feel alive.

#### Framer Motion Hover with whileHover

```tsx
<motion.div
  whileHover={{
    scale: 1.03,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    transition: { type: "spring", stiffness: 400, damping: 15 }
  }}
>
  Hover me
</motion.div>
```

### Tap / Press

#### Button Press Animation

```css
button {
  transform: scale(1);
  transition: transform 100ms ease-out;
}

button:active {
  transform: scale(0.96);
}

/* Release animation -- returns to scale(1) with subtle overshoot */
button:not(:active) {
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

#### Framer Motion Tap with whileTap

```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 15 }}
>
  Click me
</motion.button>
```

### Pinch / Zoom

Pinch-to-zoom requires tracking two touch points and calculating the distance between them.

```tsx
function PinchZoom({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const lastScaleRef = useRef(1);
  const lastDistanceRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      // Track pointer IDs for two-finger detection
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (touches.length === 2) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (lastDistanceRef.current > 0) {
        const newScale = lastScaleRef.current * (distance / lastDistanceRef.current);
        setScale(Math.min(Math.max(newScale, 0.5), 3));
      }
      lastDistanceRef.current = distance;
    }
  };

  return (
    <motion.div
      style={{ scale }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}
```

## Gesture Interaction Guidelines

### Accessibility in Gestures

Gestures must never be the only way to perform an action. Every gesture-triggered action must have a non-gesture alternative:

| Gesture | Alternative |
|---------|-------------|
| Swipe to dismiss | Dismiss button |
| Drag to reorder | Move up/down buttons |
| Pinch to zoom | Zoom controls (+/-) |
| Swipe carousel | Prev/next buttons and dots |
| Pull to refresh | Refresh button |

### Gesture Thresholds for Usability

| Gesture | Minimum Activation Threshold | Duration |
|---------|---------------------------|----------|
| Tap | No movement, < 300ms | 100-300ms |
| Long press | No movement, > 500ms | 500-800ms |
| Drag | > 5px movement | Variable |
| Swipe | > 100px OR > 500px/s velocity | < 500ms |
| Pinch | > 10% scale change | Variable |
| Double-tap | Two taps within 300ms, < 20px apart | 0-600ms total |

### Preventing Accidental Gestures

```tsx
// Set drag direction lock to prevent diagonal confusion
<motion.div drag dragDirectionLock />

// Use dragElastic to limit the "stretch" before release
<motion.div drag dragElastic={0.1} />

// Ignore small movements (dead zone)
// In custom implementation:
if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return;
```

## Physics of Multi-Step Gestures

### Drag-to-Reorder

```tsx
import { Reorder } from 'framer-motion';

const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3']);

<Reorder.Group axis="y" values={items} onReorder={setItems}>
  {items.map((item) => (
    <Reorder.Item key={item} value={item}>
      {item}
    </Reorder.Item>
  ))}
</Reorder.Group>
```

Framer Motion's Reorder handles the spring physics of items moving out of the way as another item is dragged past them.

### Pull-to-Refresh

```tsx
function PullToRefresh({ onRefresh }) {
  const [refreshProgress, setRefreshProgress] = useState(0);

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 100 }}
      dragElastic={0.3}
      onDrag={(_, info) => {
        setRefreshProgress(Math.min(info.offset.y / 80, 1));
      }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 80) {
          onRefresh();
        }
      }}
      animate={{ y: isRefreshing ? 50 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <RefreshIndicator progress={refreshProgress} />
      <ScrollContent />
    </motion.div>
  );
}
```

## Spring Animation in Non-UI Contexts

### SVG Path Drawing with Spring

```tsx
const pathLength = useSpring(0);

return (
  <motion.path
    d="M10,80 C40,10 65,10 95,80 S125,150 155,80"
    fill="transparent"
    stroke="blue"
    strokeWidth="2"
    strokeDasharray={pathLength}
    strokeDashoffset={pathLength}
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{ type: "spring", stiffness: 100, damping: 20 }}
  />
);
```

### Layout Animation with Spring

Framer Motion's layout animations use spring physics by default for position/size transitions:

```tsx
<motion.div layout transition={{ type: "spring", stiffness: 300, damping: 25 }}>
  When this element's position or size changes in the layout,
  it animates smoothly using spring physics.
</motion.div>
```

### Shared Element Transitions

```tsx
// Both elements share the same layoutId
// As elements unmount/mount, the motion transitions smoothly

// Thumbnail view
<motion.img layoutId="photo-1" src="thumb.jpg" />

// Expanded view
<motion.img layoutId="photo-1" src="full.jpg"
  style={{ width: '100%', height: 'auto' }}
/>
```

The spring transition creates a natural-feeling scale and position morph between the two states.

## Performance of Spring Animations

### CPU Cost of Spring Simulation

Spring physics requires per-frame calculations:
- Framer Motion: spring simulation computed in JS per animated element per frame
- react-spring: same pattern, computed in JS
- CSS: no spring physics available without cubic-bezier approximation

Benchmark (approximate):
- 10 spring elements: < 0.5ms frame time for spring computation
- 50 spring elements: ~2ms frame time
- 200 spring elements: ~8ms frame time (danger zone)

### Reducing Spring Overhead

1. Use `layoutDependency` to limit when layout animations trigger
2. Use `onAnimationComplete` to remove spring-driven motion values from the animation system
3. Use CSS transitions for simple state changes (color, opacity) and reserve springs for layout/transform changes

```tsx
// Limit layout animation triggers
<motion.div
  layout
  layoutDependency={[itemId]} // only animate when itemId changes
/>
```

### When to Avoid Springs

Spring animations are physically inaccurate by design (mass-spring-damper is a simplification). They are not suitable for:

- Progress bars (duration is unpredictable)
- Countdowns (exact timing needed)
- Precision UI (tooltip positioning, cursor follow)
- Animations that need to sync with audio or video
- Loading indicators (predictable timing expected)

For these cases, use CSS transitions with fixed duration:

```css
.progress-bar {
  transition: width 300ms linear;
}
```

## Spring Animation Testing

### Visual Regression Testing

```tsx
import { render, screen } from '@testing-library/react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock motion to skip animation in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => {
      // Strip animation-specific props
      const { initial, animate, exit, transition, whileHover, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    span: ({ children, ...props }) => {
      const { initial, animate, exit, transition, whileHover, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
    img: ({ children, ...props }) => {
      const { initial, animate, exit, transition, whileHover, ...rest } = props;
      return <img {...rest}>{children}</img>;
    },
    path: ({ children, ...props }) => {
      const { initial, animate, exit, transition, whileHover, ...rest } = props;
      return <path {...rest}>{children}</path>;
    },
    button: ({ children, ...props }) => {
      const { initial, animate, exit, transition, whileHover, ...rest } = props;
      return <button {...rest}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }) => children,
  useMotionValue: (initial) => ({ get: () => initial, set: jest.fn() }),
  useTransform: () => 0,
}));
```

### Spring Duration Testing

```ts
function estimateSpringDuration(stiffness: number, damping: number, mass: number): number {
  // Critical damping coefficient
  const criticalDamping = 2 * Math.sqrt(stiffness * mass);
  const ratio = damping / criticalDamping;

  if (ratio >= 1) {
    // Critically damped or overdamped
    return mass / damping * 8; // approximate
  }

  // Underdamped
  const omega = Math.sqrt(stiffness / mass) * Math.sqrt(1 - ratio * ratio);
  return 3 / (ratio * omega); // approximate 95% settling
}
```

### E2E Testing for Gesture Animations

```ts
// Using Playwright
await page.mouse.move(100, 100);
await page.mouse.down();
await page.mouse.move(300, 100, { steps: 10 }); // drag 200px
await page.mouse.up();

// Wait for spring to settle
await page.waitForTimeout(500);

// Assert final position
const transform = await page.$eval('.draggable', el => el.style.transform);
```

## Gesture Detection Without Libraries

### Pointer Events

```js
class GestureHandler {
  constructor(element) {
    this.element = element;
    this.startX = 0;
    this.startY = 0;
    this.isDragging = false;
    this.lastMoveTime = 0;
    this.lastMoveX = 0;
    this.lastMoveY = 0;

    element.addEventListener('pointerdown', this.onPointerDown.bind(this));
    element.addEventListener('pointermove', this.onPointerMove.bind(this));
    element.addEventListener('pointerup', this.onPointerUp.bind(this));
  }

  onPointerDown(e) {
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.isDragging = false;
    this.lastMoveX = e.clientX;
    this.lastMoveY = e.clientY;
    this.lastMoveTime = e.timeStamp;
    this.element.setPointerCapture(e.pointerId);
  }

  onPointerMove(e) {
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Dead zone of 5px before considering it a drag
    if (absDeltaX < 5 && absDeltaY < 5) return;

    if (!this.isDragging) {
      this.isDragging = true;
      // Determine primary direction
      this.direction = absDeltaX > absDeltaY ? 'horizontal' : 'vertical';
    }

    // Calculate velocity
    const dt = e.timeStamp - this.lastMoveTime;
    if (dt > 0) {
      this.velocityX = (e.clientX - this.lastMoveX) / dt * 1000;
      this.velocityY = (e.clientY - this.lastMoveY) / dt * 1000;
    }

    this.lastMoveX = e.clientX;
    this.lastMoveY = e.clientY;
    this.lastMoveTime = e.timeStamp;

    if (this.onDrag) {
      this.onDrag({ deltaX, deltaY, direction: this.direction });
    }
  }

  onPointerUp(e) {
    if (this.isDragging && this.onSwipe) {
      const velocity = this.direction === 'horizontal'
        ? Math.abs(this.velocityX) : Math.abs(this.velocityY);
      const delta = this.direction === 'horizontal'
        ? (e.clientX - this.startX) : (e.clientY - this.startY);

      if (velocity > 500 || Math.abs(delta) > 100) {
        this.onSwipe({ delta, velocity, direction: this.direction });
      }
    }
    this.isDragging = false;
  }

  onDrag(callback) { this.onDrag = callback; return this; }
  onSwipe(callback) { this.onSwipe = callback; return this; }
}
```

## Spring Animation Reference Table

### Common UI Patterns with Spring Configurations

| UI Pattern | Stiffness | Damping | Mass | Purpose |
|-----------|-----------|---------|------|---------|
| Button hover | 400 | 20 | 0.5 | Snappy, professional |
| Button press | 500 | 25 | 0.3 | Instant feedback |
| Card hover lift | 300 | 15 | 0.8 | Playful, noticeable |
| Modal enter | 250 | 25 | 1.5 | Heavy, substantial |
| Modal exit | 200 | 15 | 1 | Bouncier on exit (perceived as faster) |
| Sidebar slide | 200 | 30 | 2 | Controlled, dampened |
| Toast enter | 350 | 20 | 0.5 | Quick, noticeable |
| Toast exit | 200 | 15 | 0.8 | Soft fade-out feel |
| List stagger | 200 | 20 | 0.5 | Gentle, sequential |
| Swipe card | 300 | 30 | 0.5 | Follows finger velocity |
| Drag reorder | 400 | 25 | 0.3 | Snappy displacement |
| Page transition | 150 | 20 | 1 | Smooth, unhurried |
| Drag scroll | 100 | 10 | 1 | Scroll-like momentum |
| Pull refresh | 200 | 25 | 2 | Heavy "rubber band" feel |
| Toggle switch | 500 | 30 | 0.3 | Snappy binary state |
