# Animation Tools Reference

## Animation Libraries

```bash
# Framer Motion (React)
npm install framer-motion

# GSAP (universal)
npm install gsap

# Anime.js (lightweight)
npm install animejs

# Lottie-web (JSON animations)
npm install lottie-web

# Three.js (3D)
npm install three
```

## Framer Motion

```tsx
import { motion, AnimatePresence } from 'framer-motion';

function Page({ items }) {
  return (
    <AnimatePresence>
      {items.map(item => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          layout
        >
          {item.name}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
```

## GSAP

```javascript
import gsap from 'gsap';

function animateCard(element) {
  gsap.fromTo(element,
    { opacity: 0, y: 50 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
  );
}
```

## Key Points

- Framer Motion for React declarative animations
- GSAP for complex timeline-based animations
- Lottie renders After Effects animations at runtime
- Three.js for 3D and WebGL animation
- CSS animations for simple state transitions
- requestAnimationFrame for performant custom animations
- Web Animations API for native browser animations
- will-change hints optimize GPU compositing
- prefers-reduced-motion respects user preferences
- Animation libraries should be lazy-loaded on interaction
