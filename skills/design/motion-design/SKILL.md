---
name: design-motion-design
description: >
  Use when the user asks about motion design, animation, micro-interactions, Lottie, animation principles, UI animation, transition design, or motion guidelines. Do NOT use for: frontend animation implementation (frontend-animation), or visual design (design-visual-design).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [design, motion-design, phase-3]
---

# Motion Design

## Purpose
Design motion systems for digital products: animation principles, micro-interactions, transitions, Lottie animations, and motion guidelines that enhance user experience. Motion should serve a functional purpose — guiding attention, providing feedback, communicating hierarchy, and creating continuity between states.

## Agent Protocol

### Trigger
Exact user phrases: "motion design", "animation", "micro-interaction", "Lottie", "transition", "UI animation", "motion guidelines", "easing", "keyframe animation", "spring animation", "motion system".

### Input Context
- What is the product type and platform (web, mobile, native)?
- What is the purpose of the animation (feedback, navigation, delight)?
- What existing motion system or design system is in place?
- What are the performance constraints (device targets, frame rate)?
- What accessibility requirements exist (reduced motion preferences)?
- What is the animation complexity budget?

### Output Artifact
Motion design system with animation principles, duration/easing specifications, micro-interaction patterns, and implementation guidelines.

### Response Format
```
## Motion Design Specification
### Animation Principles
{principle}: {application}

### Timing Scale
{action}: {duration} | {easing} | {use case}

### Micro-interaction Patterns
{pattern}: {trigger} → {animation} → {feedback}

### Implementation
{platform}: {technique} | {code example}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Motion principles defined and documented
- [ ] Timing scale established with duration and easing values
- [ ] Micro-interaction patterns cataloged
- [ ] Page/view transitions specified
- [ ] Loading and progress animations designed
- [ ] Reduced motion fallback defined
- [ ] Lottie animation specifications (if applicable)
- [ ] Implementation guidance for developers

### Max Response Length
150 lines of spec and patterns.

## Framework/Methodology

### Functional Motion Framework
All motion in UI should serve one of four functional roles:

| Role | Purpose | Example | Duration |
|------|---------|---------|----------|
| Feedback | Confirm user action | Button press, toggle switch | 100-200ms |
| Focus | Direct user attention | Notification, error state | 200-400ms |
| Continuity | Maintain context during change | Page transition, element morph | 200-500ms |
| Expression | Communicate brand personality | Logo animation, loading | 400-1000ms |

### Motion Design Process

```
User Need → Which functional role?
               ↓
Role → Which pattern?
               ↓
Pattern → Timing & Easing
               ↓
Spec → Implementation (CSS, Lottie, Rive, etc.)
               ↓
QA → Verify reduced motion, performance, feel
```

### Animation Complexity Budget

| Complexity | Description | Performance Impact | When to Use |
|------------|-------------|-------------------|-------------|
| Minimal | 0-5 animated elements, simple CSS transitions | Negligible | Critical tasks, data-heavy screens |
| Moderate | 5-15 animated elements, coordinated timing | Low | Standard UI transitions, navigation |
| Complex | 15+ animated elements, staggered choreography | Medium | Marketing, onboarding, celebrations |
| Heavy | Full-scene animation, particle systems, video | High | Splash screens, immersive experiences |

### Motion Design Principles

| Principle | UI Application |
|-----------|----------------|
| Easing | Natural acceleration/deceleration, not linear |
| Duration | Short for functional (100-300ms), longer for expressive (300-500ms) |
| Stagger | Offset animations for visual interest |
| Hierarchy | Important elements animate first |
| Spatial continuity | Elements should animate as if in physical space |
| Transformation | Same element morphs between states; don't replace |
| Masking | Use reveal/conceal to manage attention |
| Depth | Use scale, shadow, and blur for z-space |
| Overlap | Overlap animations to create fluidity |
| Anticipation | Brief reverse motion before forward action |

## Workflow

### Step 1: Define Motion Principles
Establish the core principles that guide all animations in the product. These should align with brand personality and UX goals.

Example motion principles for different brand personalities:
- Professional: 300ms, ease-in-out, subtle, consistent
- Playful: 400-500ms, spring easing, bouncy, expressive
- Minimal: 200ms, ease-out, subtle, no decorative animation
- Bold: 500ms+ with anticipation, dramatic entrances

Document each principle with:
- Name and description
- Application guidelines (when to use, when to avoid)
- Code reference (easing function, duration range)
- Example of correct and incorrect usage

### Step 2: Create Timing Scale
Define a consistent timing scale that covers all common animation needs.

| Type | Duration | Easing | Use Cases |
|------|----------|--------|-----------|
| Instant | 0-50ms | None | Micro-feedback, cursor states |
| Fast | 100-150ms | ease-out | Button press, hover, toggle, checkbox |
| Normal | 200-300ms | ease-in-out | State changes, element appear/disappear, accordion |
| Slow | 300-500ms | ease-in-out | Page transitions, modal, drawer, notifications |
| Expressive | 500-1000ms | ease-out / spring | Hero animations, onboarding, celebrations |

Easing reference:

| Easing | CSS Value | Feel |
|--------|-----------|------|
| ease-out | cubic-bezier(0, 0, 0.2, 1) | Natural deceleration, elements entering |
| ease-in | cubic-bezier(0.4, 0, 1, 1) | Acceleration, elements leaving |
| ease-in-out | cubic-bezier(0.4, 0, 0.2, 1) | Standard UI transitions |
| spring-light | cubic-bezier(0.34, 1.56, 0.64, 1) | Subtle bounce, playful |
| spring-strong | cubic-bezier(0.175, 0.885, 0.32, 1.275) | Exaggerated bounce |
| decelerate | cubic-bezier(0, 0, 0.1, 1) | Fast start, gradual end |
| accelerate | cubic-bezier(0.4, 0, 1, 1) | Slow start, fast end |

### Step 3: Design Micro-interaction Patterns
Document reusable micro-interaction patterns. Each pattern should specify:
- Trigger (user action or system event)
- Animation (what animates, duration, easing)
- Feedback (what the user perceives)
- Edge cases (rapid triggering, interrupt, reduced motion)

| Interaction | Trigger | Response | Duration | Easing |
|-------------|---------|----------|----------|--------|
| Button hover | Mouse enter | Background shade, slight scale | 150ms | ease-out |
| Button press | Mouse down | Scale 0.95, reduced shadow | 100ms | ease-in |
| Toggle switch | Click | Knob slides, background color changes | 200ms | ease-in-out |
| Card hover | Mouse enter | Elevation increase (shadow) | 300ms | ease-out |
| Card expand | Click | Scale + reveal content | 300ms | ease-out |
| Page transition | Navigation | Slide (direction based on hierarchy) | 300ms | ease-in-out |
| Toast appear | Event trigger | Slide in from top | 250ms | ease-out |
| Toast dismiss | Timeout/click | Fade out | 200ms | ease-in |
| Modal open | Click | Backdrop fade (200ms) + content scale (300ms) | 300ms | ease-out |
| Error shake | Validation failure | Horizontal shake 3px x 3 cycles | 400ms | ease-in-out |
| Success check | Validation pass | Checkmark draw animation | 500ms | ease-out |
| Accordion open | Click | Height expand | 250ms | ease-out |
| Notification badge | Trigger | Scale bounce | 300ms | spring |
| Dragging | Mouse/touch down | Element follows, slight lift | 50ms | none |
| Pull to refresh | Overscroll | Icon rotation, indicator reveal | 200-500ms | spring |

### Step 4: Design Page and View Transitions

Transition types by navigation context:

| Navigation Type | Transition Pattern | Direction | Duration |
|----------------|-------------------|-----------|----------|
| Push (drill down) | Slide left | Forward: left, Back: right | 300ms |
| Modal/Popover | Scale up + fade | Center to full | 300ms |
| Tab switch | Fade | No directional movement | 200ms |
| Sidebar/drawer | Slide from edge | From left or right | 250ms |
| Full-screen content | Slide up from bottom | Bottom to top | 350ms |
| Image gallery | Swipe | Direction of swipe | 300ms |
| Step wizard | Slide forward/back | Direction of progress | 200ms |
| Search expand | Morph search icon to bar | Icon to full bar | 300ms |

Shared element transitions:
- When the same element exists in both source and destination states
- The element "morphs" between states (position, size, shape, content)
- Creates continuity: user perceives the element is the same, just transformed
- Common use cases: list item to detail view, thumbnail to full image, icon to expanded form

### Step 5: Design Loading and Progress Animations

| Context | Pattern | Duration | Notes |
|---------|---------|----------|-------|
| Page load | Skeleton screen (shimmer) | Until content loads | Match skeleton shape to content layout |
| Button action | Button-inline spinner | Until action completes | Maintains context; don't disable button |
| Image load | Blur-up (progressive JPEG) | 200-500ms | Pleasant preview before full image |
| Refresh | Pull-to-refresh spinner | 200-500ms | Spring animation on release |
| Background sync | Subtle indicator | Continuous | Minimize visual noise |
| Long operation | Progress bar with percentage | Variable | Use determinate (known duration) or indeterminate (unknown) |

Skeleton screen guidelines:
- Match approximate layout of actual content
- Use subtle shimmer or pulse animation (400ms)
- Transition to content with cross-fade (300ms)
- Never show skeleton for more than 10 seconds
- Show error state if content fails to load

### Step 6: Create Motion Guidelines Document
Organize all motion specifications into a reference document:

1. Motion principles (3-5 principles with examples)
2. Timing scale (duration + easing table)
3. Easing reference (cubic-bezier values with descriptions)
4. Micro-interaction library (trigger → animation → feedback per component)
5. Transition patterns (by navigation type)
6. Loading patterns (skeleton, spinner, progress)
7. Accessibility: reduced motion implementation
8. Performance guidelines (GPU-accelerated properties, avoiding layout triggers)

### Step 7: Implement Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```
For complex animations, provide alternative non-moving states:
- Skeleton: show static placeholder
- Carousel: instant slide change
- Parallax: static layered image
- Confetti: static celebratory graphic

### Step 8: Lottie and Rive Animation Workflow

Lottie:
1. Design animation in After Effects
2. Export as JSON using Bodymovin
3. Optimize: reduce keyframes, remove unused assets
4. Test on target devices (performance, rendering)
5. Integrate using Lottie-web, Lottie-iOS, or Lottie-Android

Rive:
1. Design animation in Rive editor
2. Set up state machine for interaction-driven animation
3. Export as .riv file
4. Integrate using Rive runtime

Lottie optimization checklist:
- Remove unused layers before exporting
- Keep animation under 30KB for UI micro-interactions
- Test at 60fps on target devices
- Avoid expressions in After Effects (not supported in Lottie)
- Use solid color fills over gradients (smaller file size)
- Set Bodomovin to "Minimum" image quality

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Gratuitous animation | Motion without purpose distracts and annoys | Every animation must serve a functional role (feedback, focus, continuity, expression) |
| Linear easing | Feels robotic and unnatural | Always use cubic-bezier, ease-in-out, or spring easings |
| Inconsistent timing | Similar interactions animate at different speeds | Define a timing scale and stick to it |
| No reduced motion support | Excludes users with vestibular disorders | Add prefers-reduced-motion to every animation |
| Performance-heavy animations | Animating expensive properties causing jank | Animate only transform and opacity; avoid animating layout properties |
| Too slow | >500ms feels sluggish for functional UI | Functional animations: 100-300ms. Expressive only for special moments |
| Ignoring loading states | Users see blank screen while content loads | Always show skeleton or loading indicator within 200ms |
| Conflicting animations | Multiple animations fight for attention | Use stagger and hierarchy; one primary animation at a time |
| Missing exit animations | Elements disappear without transition | Every entrance should have a corresponding exit |
| Over-engineered Lottie | Large files causing download delays | Keep Lottie under 30KB for UI, optimize before export |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Animate only transform and opacity | These are GPU-accelerated and won't trigger layout recalculations |
| Use consistent duration for similar interactions | 200ms for all state changes builds predictability |
| Always test on lowest-powered target device | Animations that work on iPhone 16 may stutter on iPhone 12 |
| Respect prefers-reduced-motion for every animation | Required for accessibility; benefits users with vestibular disorders |
| Document motion in design system | Ensures consistency across team and product |
| Use ease-out for entrances, ease-in for exits | Natural feel: things slow down when arriving, speed up when leaving |
| Avoid animating on page load for first-time visitors | Wait until user interacts before showing animations |
| Coordinate animation timing across elements | Stagger multiple animations by 30-80ms for natural feel |
| Provide visual feedback within 100ms | Users perceive actions as instant if feedback is within 100ms |
| Use spring animations sparingly | Effective for delight; overuse feels gimmicky |

## Templates & Tools

### Micro-interaction Specification Template
```
Component: {component name}
Trigger: {user action or system event}

Animation:
- Target: {element(s) being animated}
- Duration: {N}ms
- Easing: cubic-bezier({x1}, {y1}, {x2}, {y2})
- Delay: {N}ms (if applicable)
- Properties: {properties animated}

State Change:
- From: {starting state}
- To: {ending state}

Reduced Motion Fallback: {description}

Edge Cases:
- Rapid trigger: {how animation handles rapid repeated triggers}
- Interrupt: {what happens if triggered again during animation}
```

### Motion Spec Sheet Template
```
Motion Piece: {name}
Classification: {feedback / focus / continuity / expression}

Timing:
- Total duration: {N}ms
- Stagger delay: {N}ms per item (if applicable)

Easing:
- Entrance: {type}
- Exit: {type}
- Internal: {type}

Interaction:
- Trigger: {what initiates}
- Loop: {yes/no} — if yes, {loops condition}
- Progress: {linear / user-controlled / automatic}

Platform Notes:
- CSS: {implementation notes}
- Lottie: {file size, platform compatibility}
- Handoff: {link to Lottie JSON or code}
```

### Implementation Reference

**CSS transitions (simple states):**
```css
.button {
  transition: transform 150ms ease-out, background-color 150ms ease-out;
}
.button:active {
  transform: scale(0.97);
}
```

**CSS keyframes (complex sequences):**
```css
@keyframes slideIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.element {
  animation: slideIn 300ms ease-out both;
}
```

**JavaScript Web Animations API:**
```javascript
element.animate([
  { opacity: 0, transform: 'translateY(20px)' },
  { opacity: 1, transform: 'translateY(0)' }
], {
  duration: 300,
  easing: 'ease-out',
  fill: 'both'
});
```

**Spring animation (React Spring):**
```javascript
import { useSpring, animated } from '@react-spring/web';

function AnimatedComponent() {
  const props = useSpring({
    from: { opacity: 0, transform: 'scale(0.9)' },
    to: { opacity: 1, transform: 'scale(1)' },
    config: { mass: 1, tension: 200, friction: 16 }
  });
  return <animated.div style={props} />;
}
```

### Tools

| Tool | Purpose | Best For | Export |
|------|---------|----------|--------|
| After Effects + Bodymovin | Lottie animation creation | Complex vector animations | Lottie JSON |
| Rive | Interactive animations, state machines | Game-like UI, avatars | .riv file |
| Principle | UI animation prototyping | Timeline-based motion design | Video, GIF |
| ProtoPie | Advanced interaction prototyping | Multi-device, sensor-based | Prototype link |
| Haiku Animator | Code-focused motion design | Developer handoff | React/Vue components |
| LottieFiles | Lottie preview, optimization, library | Lottie workflow | Optimized Lottie JSON |
| Framer Motion (React) | React animation library | Production web animation | React code |
| Greensock (GSAP) | JavaScript animation library | High-performance web animation | JavaScript code |

## Case Studies

### Case Study 1: E-commerce Micro-interaction Overhaul Increases Conversion 12%
An e-commerce site had no micro-interactions — buttons simply changed appearance without animation. They implemented purposeful micro-interactions: hover animations on product cards (300ms, ease-out, shadow lift), button press feedback (100ms, scale 0.95), cart add confirmation (badge bounce animation), and smooth page transitions between categories. The result: 12% increase in add-to-cart rate, 8% increase in conversion, and a 5% decrease in bounce rate. Users perceived the site as faster and more responsive even though actual load times hadn't changed.

Method: Systematic micro-interaction audit and redesign
Key insight: Perceived performance (mediated by animation) matters as much as actual performance
Impact: Add-to-cart +12%, conversion +8%, bounce -5%

### Case Study 2: Motion Design System for Enterprise SaaS
An enterprise SaaS platform had 40+ teams building features with inconsistent animation — some used 1000ms transitions, others had none. A centralized motion system was created with: timing scale (100/200/300/400/500ms), easing specifications (ease-out, ease-in-out, spring), micro-interaction patterns per component, and page transition guidelines. After adoption, user satisfaction scores for "smoothness" improved by 22%, and development time for animation decreased by 40% because patterns were pre-defined.

Method: Centralized motion design system with documented patterns and code
Key insight: Design systems must include motion, not just visual components
Impact: Satisfaction score +22%, animation dev time -40%

### Case Study 3: Lottie Optimization for Mobile Performance
A mobile app used Lottie animations for onboarding illustrations but users experienced jank on mid-range Android devices. Analysis showed Lottie files were averaging 120KB each with 2000+ keyframes. After optimization — reducing to 6 keyframes per animation, removing unused layers, using solid fills instead of gradients, and converting complex shapes to simpler paths — file sizes dropped to 18KB average and frame rate improved from 30fps to 58fps on target devices.

Method: Lottie file optimization audit and reconstruction
Key insight: Animation file size and complexity directly impact runtime performance
Impact: File size 120KB to 18KB, frame rate 30fps to 58fps on mid-range devices

## Rules
- Every animation must serve a functional role (feedback, focus, continuity, or expression).
- Never use linear easing — always use ease-in-out, ease-out, or spring.
- Functional animations must be 100-300ms; only expressive animations may exceed 500ms.
- Animate only transform and opacity properties for UI elements.
- Respect prefers-reduced-motion with an alternative static state for every animation.
- Similar interactions must use consistent duration and easing.
- Every entrance animation should have a corresponding exit animation.
- Stagger multiple related animations by 30-80ms for natural-feeling sequences.
- Lottie files for UI micro-interactions must be under 30KB.
- Test all animations on the lowest-powered target device in the product's supported range.
- Avoid animating on initial page load for first-time visitors.
- Skeleton screens must appear within 200ms of navigation start.
- Spring animations should be used sparingly for delight, not routine interactions.
- Conflicting animations (multiple elements animating simultaneously) must be avoided.
- Motion documentation must include timing, easing, and reduced motion fallback for every pattern.
- Color transitions need easing, not just an instant swap.
- Animation specs must be included in developer handoff documentation.
- Motion design review must include a playback speed check at 0.5x for accuracy.
- Shared element transitions require identical element structure (same name, matching layers).
- Metrics must be defined to measure animation effectiveness before implementation.

## References
  - references/animation-principles.md — Animation Principles Reference
  - references/lotti-rive.md — Lottie and Rive Animation Reference
  - references/motion-accessibility.md — Motion Accessibility Reference
  - references/motion-design-advanced.md — Motion Design Advanced Topics
  - references/motion-design-fundamentals.md — Motion Design Fundamentals
  - references/ui-animation-patterns.md — UI Animation Patterns Reference
  - references/motion-design-principles.md — Motion Design Principles
  - references/motion-design-implementation.md — Motion Design Implementation
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Architecture Decision Trees

### Animation Strategy Decision Tree
`
What is the purpose of the animation?
  ├── Functional feedback (button click, form submit) → 100-200ms, subtle
  ├── Navigation transition (page change, route switch) → 200-400ms, directional
  └── Storytelling/hero (marketing, onboarding) → 400-2000ms, expressive
       Does the animation convey meaning?
       ├── Yes → Purpose-driven motion with clear start/end states
       └── No  → Decorative motion, reduced motion preference respected
            Platform constraints?
            ├── Mobile → 60fps target, avoid GPU-intensive effects, battery aware
            └── Desktop → Higher complexity acceptable, multiple simultaneous animations
`

### Tool Selection Decision Tree
`
Does the animation need interactivity?
  ├── No  → Lottie (JSON) exported from After Effects with bodymovin
  └── Yes → Does it need state-driven animation?
       ├── Yes → Rive (state machine) for interactive animated components
       └── No  → CSS transitions/animations for simple micro-interactions
            Developer handoff format?
            ├── Lottie → JSON file for Lottie-web, Lottie-iOS, Lottie-Android
            └── Rive → .riv file with runtimes for web, iOS, Android
`
