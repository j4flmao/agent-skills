# Motion Accessibility Reference

## Prefers-Reduced-Motion

The `prefers-reduced-motion` media query lets users request minimal animation. This must be respected by all motion in the application.

```css
/* Disable all non-essential animation */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Progressive Enhancement Approach
```css
/* Motion-first: animation enabled by default */
.card {
  transition: transform 200ms ease-out, opacity 200ms ease-out;
}

/* Reduce: only essential transitions remain */
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: opacity 200ms ease-out;  /* Keep fade for state change */
    transform: none;                     /* Remove decorative movement */
  }
}
```

### JavaScript Detection
```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Check on load
if (prefersReducedMotion.matches) {
  disableNonEssentialAnimations();
}

// Listen for changes
prefersReducedMotion.addEventListener('change', (e) => {
  if (e.matches) {
    disableNonEssentialAnimations();
  } else {
    enableAnimations();
  }
});
```

### Animation Frameworks
```javascript
// Framer Motion — respects prefers-reduced-motion automatically
<motion.div
  animate={{ x: 100 }}
  transition={{ type: 'spring', stiffness: 200 }}
/>

// GSAP — manual check
const safeDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.5;
gsap.to('.element', { x: 100, duration: safeDuration });
```

## Vestibular Disorders

### Impact of Motion
- **Labyrinthitis**: Inner ear inflammation — motion in peripheral vision triggers nausea
- **Meniere's disease**: Vertigo episodes triggered by large-scale motion
- **Vestibular migraine**: Sensitivity to visual motion stimuli
- **Motion sickness**: Discrepancy between visual motion and perceived motion

### Triggers to Avoid
| Trigger | Severity | Alternative |
|---------|----------|-------------|
| Parallax scrolling | High | Remove or make still on reduce |
| Full-page transitions | High | Fade-only or instant |
| Auto-scrolling carousels | Medium | User-controlled only |
| Continuous animation (spinners) | Medium | Fade in/out alternatives |
| Zoom animations | High | Use fade instead |
| Horizontal sliding | Medium | Fade or no motion |
| Parallax mouse-follow | High | Disable entirely |
| Background video | Medium | Still image fallback |

### Safe Animation Properties
| Safe | Avoid |
|------|-------|
| Opacity fade | translateX large distance |
| Color transitions | Scale > 1.5x |
| Very short duration (< 300ms) | Long duration (> 1s) |
| Small transforms (< 20px) | 3D perspective transforms |
| Centered transforms | Off-screen movement |

## Motion Budget

Define a motion budget for each screen — limit the number and intensity of simultaneous animations.

```yaml
motion_budget:
  max_concurrent_animations: 3
  max_duration_ms: 500
  max_distance_px: 200
  allow_parallax: false
  allow_video_bg: conditional
  reduced_motion_mode: "essential-only"
```

### Prioritization Matrix
| Animation | Priority | Reduced Motion Behavior |
|-----------|----------|----------------------|
| Form validation error | Essential | Keep (state feedback) |
| Button hover | Essential | Keep |
| Page transition | Essential | Fade only |
| Loading spinner | Essential | Keep (show/hide) |
| Skeleton pulse | Medium | Keep with slower pulse |
| Parallax background | Decorative | Disable |
| Confetti animation | Decorative | Static image or hide |
| Mouse trail effect | Decorative | Disable entirely |

## Alternative Static States

Every animated element must present a complete, usable static state.

```css
.button-loader {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.button-loader .spinner {
  animation: spin 1s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .button-loader .spinner {
    animation: none;
    opacity: 0.6; /* Static indicator */
  }
  .button-loader::after {
    content: "Loading..."; /* Text fallback */
  }
}
```

## WCAG Motion Guidelines

### SC 2.3.1: Three Flashes or Below Threshold
No animation that flashes more than three times per second.

### SC 2.3.2: Three Flashes
No animation that flashes more than three times in any one-second period.

### SC 2.3.3: Animation from Interactions (WCAG 2.2)
Motion animation triggered by interaction can be disabled unless essential.

### Criteria for Essential Motion
- Loading indicator (user expects activity feedback)
- Progress indication (task completion tracking)
- Navigational cue (direction indicator)
- Error attention (shake on invalid input)

## Implementation Checklist

- [ ] `prefers-reduced-motion: reduce` disables all non-essential animation
- [ ] No animation exceeds 500ms functional duration
- [ ] No continuous animation runs for more than 5 seconds
- [ ] All motion is triggered by CSS or controlled JS (no unexpected animation)
- [ ] No parallax or background video in reduced motion mode
- [ ] Carousels do not auto-advance when reduced motion is active
- [ ] Feedback animations (success, error) have static alternatives
- [ ] Skeleton loaders use static gradient or simpler pulse
- [ ] Page transitions use fade-only fallback
- [ ] All animation respects the user's OS-level motion preference
