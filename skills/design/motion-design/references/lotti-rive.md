# Lottie and Rive Animation Reference

## Lottie Overview

Lottie is a JSON-based animation format rendered at runtime. Exported from Adobe After Effects via the Bodymovin plugin.

### Key Characteristics
| Property | Value |
|----------|-------|
| Format | JSON |
| File size | 5-100KB typical (can be larger) |
| Rendering | Canvas or SVG (library-dependent) |
| Interactivity | Play, pause, seek, speed control |
| Color override | Yes (via expression/key replacement) |
| Vector/raster | Vector (shapes), can embed raster |

### When to Use Lottie
- Complex vector animations (loading, illustrations, icons)
- Multi-step animated sequences
- Brand storytelling animations
- When designer control over every frame is needed

### When NOT to Use Lottie
- Simple transitions (CSS is lighter)
- UI micro-interactions under 200ms (CSS/JS is more performant)
- Text-heavy animations (text rendering varies by player)
- Real-time data visualizations (use D3/SVG directly)

## Lottie Export from After Effects

### Bodymovin Setup
1. Install Bodymovin extension (via AEUX or ZXP Installer)
2. Name layers and compositions clearly — key names carry into JSON
3. Use shape layers, not precomps containing footage
4. Keep expressions simple — not all expressions translate

### Export Settings
- **Composition**: Trim to work area before export
- **Assets**: Embed (for small files) or link (for large/raster assets)
- **Expressions**: Enable expression conversion (limited support)
- **Glyphs**: Convert text to shapes or embed font
- **Marker**: Add markers for keyframes events (loop points, triggers)

### Optimization
- Reduce shape layer point count
- Remove hidden layers before export
- Limit expression usage
- Merge identical shapes
- Use solid color fills instead of gradients where possible
- Compress After Effects project before export to remove unused footage

## Lottie Runtime Integration

### Web (Lottie-web / dotLottie)
```javascript
import lottie from 'lottie-web';

const animation = lottie.loadAnimation({
  container: document.getElementById('anim-container'),
  renderer: 'svg',       // 'svg' | 'canvas' | 'html'
  loop: true,
  autoplay: true,
  path: '/animations/loader.json'
});

// Control
animation.play();
animation.pause();
animation.goToAndStop(30, true);   // Frame 30
animation.setSpeed(2);             // 2x speed
animation.setDirection(-1);        // Reverse

// Events
animation.addEventListener('complete', () => {});
animation.addEventListener('loopComplete', () => {});
```

### Mobile (Lottie for Android / iOS)
```kotlin
// Android
val animationView = findViewById<LottieAnimationView>(R.id.animation)
animationView.setAnimation("loader.json")
animationView.playAnimation()
animationView.speed = 2f
animationView.repeatCount = ValueAnimator.INFINITE
animationView.addAnimatorListener(object : Animator.AnimatorListener { ... })
```

```swift
// iOS
let animation = LottieAnimation.named("loader")
let animationView = LottieAnimationView(animation: animation)
animationView.play()
animationView.loopMode = .loop
animationView.animationSpeed = 2.0
animationView.play(fromFrame: 30, toFrame: 60) { finished in }
```

### dotLottie Format
Newer container format bundling multiple Lottie animations with themes.
```javascript
import { DotLottie } from '@lottiefiles/dotlottie-web';

const dotLottie = new DotLottie({
  canvas: document.getElementById('canvas'),
  src: '/animations/bundle.lottie',
  autoplay: true,
  loop: true
});
// Switch between animations
dotLottie.setActiveAnimationId('loading-spinner');
```

## Rive Overview

Rive is a state-machine-driven animation tool. Unlike Lottie, Rive blends animations at runtime based on input.

### Key Concepts
| Concept | Description |
|---------|-------------|
| Artboard | Container for graphics and animations |
| State Machine | Declarative logic controlling animation transitions |
| Inputs | Boolean, number, or trigger inputs to the state machine |
| Animations | Linear animation tracks (similar to Lottie) |
| Bones | Skeletal animation for characters |

### State Machine Example

Rive state machines replace complex animation logic code:
```
States:
- idle (animation loop)
- hover  (animation)
- pressed (animation)
- active (animation state)

Transitions:
- idle -> hover: onMouseEnter trigger
- hover -> idle: onMouseLeave trigger
- hover -> pressed: onMouseDown trigger
- pressed -> hover: onMouseUp trigger
- idle -> active: onToggle trigger

Inputs:
- isActive: boolean (controls idle vs active loop)
- hover: trigger
```

## Rive Runtime Integration

```javascript
import Rive from '@rive-app/canvas';

const rive = new Rive({
  src: 'button.riv',
  canvas: document.getElementById('canvas'),
  autoplay: true,
  stateMachines: 'button-machine',
  onLoad: () => {
    rive.resizeDrawingSurfaceToCanvas();
  }
});

// Trigger inputs
rive.play('idle');
rive.play('hover');

// Set boolean inputs
rive.setInputState('button-machine', 'isActive', true);
```

```swift
// iOS Rive
let riveView = RiveView()
let resource = RiveFile(fileName: "button")
riveView.configure(resource: resource, autoPlay: true)
riveView.triggerInput("hover")
```

## Performance Optimization

| Technique | Impact | Notes |
|-----------|--------|-------|
| Canvas rendering | 2-5x faster | Use for many animations |
| Reduce frame rate to 30fps | 50% less CPU | Good for non-critical animation |
| Trim AE comps tightly | Smaller JSON | Remove empty leading/trailing frames |
| Disable expressions | Faster parse | Bake expressions into keyframes |
| Limit layer count < 50 | Linear scaling | Each layer adds draw call overhead |
| Use solid fills not gradients | 30-50% faster | Gradients are expensive to rasterize |

## File Size Targets

| Animation Complexity | Max File Size | Optimization |
|---------------------|---------------|-------------|
| Simple icon (1-2 layers) | 2-5KB | Export as GIF as fallback |
| Loading spinner | 5-15KB | Trim to 1 cycle |
| Illustration (10-30 layers) | 20-60KB | Reduce points, merge layers |
| Complex scene (50+ layers) | 60-200KB | Consider Rive or CSS instead |
| Character animation | 100-500KB | Use bones/skinning in Rive |
