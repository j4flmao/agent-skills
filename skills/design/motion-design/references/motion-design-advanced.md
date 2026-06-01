# Motion Design Advanced Topics

## Overview
Advanced motion design explores complex choreography, physics-based animation, gesture-driven interaction, performance optimization, motion accessibility, and motion design systems.

## Advanced Concepts

### Concept 1: Physics-Based Animation
Spring physics (mass, stiffness, damping) create natural motion without manual keyframes. Stiffness controls speed (higher = faster), damping controls bounce (0 = infinite bounce, 1 = no bounce), mass controls weight/heaviness. Framer Motion and Reanimated use spring physics natively.

### Concept 2: Gesture-Driven Motion
Touch and gesture interaction requires motion that responds to direct manipulation: velocity tracking (scroll speed affects duration), rubber-banding (overscroll resistance), momentum (fling gesture continues after release), snap points (carousel stops at items).

### Concept 3: Motion Choreography for Complex Interfaces
Multi-element transitions require orchestration: stagger children with increasing delays, group related elements for simultaneous motion, use shared element transitions for continuity, and sequence multi-step state changes. The user should never wonder "what happened?"

### Concept 4: Motion Performance
Motion must run at 60fps (ideally 120fps on ProMotion). Use hardware-accelerated properties only (transform, opacity). Avoid animating layout properties (width, height, top, left) which trigger layout. Use will-change to create compositor layers. Profile with FPS monitors.

### Concept 5: Motion Design Systems
Systematize motion like any other design system: motion tokens (duration, easing, delay), pattern library (standard transitions, micro-interactions), component-specific motion (modal enters from bottom, content fades in), and usage guidelines. Motion tokens should live alongside style tokens.

## Advanced Techniques

### Spring Animation Configuration
```typescript
// React Native / Reanimated
const springConfig = {
  stiffness: 100,    // How "tight" the spring is (higher = faster)
  damping: 10,       // How quickly motion stops (lower = more bounce)
  mass: 1,           // How "heavy" the element feels
  overshootClamping: false, // Prevent overscroll
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};
```

### Layout Animation
Animate between list/grid layouts: FLIP (First, Last, Invert, Play) technique records start and end positions, inverts the difference, then animates to identity. FLIP enables performant layout transitions. Libraries: Framer Motion's layout prop, React Native's LayoutAnimation.

### Gesture Handler Integration
```typescript
// Pan gesture + animation
const scale = useSharedValue(1);
const panGesture = Gesture.Pan()
  .onStart(() => { scale.value = withSpring(1.1); })
  .onUpdate((e) => { translateX.value = e.translationX; })
  .onEnd((e) => {
    if (Math.abs(e.translationX) > 100) {
      // Swipe threshold met → dismiss
      runOnJS(onDismiss)();
    } else {
      // Snap back
      translateX.value = withSpring(0);
    }
  });
```

## Anti-Patterns

- 60fps drops from animating layout properties
- Choreography without hierarchy (everything moves at once)
- Over-engineered spring animations (everything bounces)
- Motion that doesn't respect reduced-motion preference
- Gesture conflicts (scroll vs swipe, tap vs long press)
- Motion that works on iOS but stutters on Android
- All elements animating with the same duration and easing
- Motion designed without constraints (animations that overlap)
