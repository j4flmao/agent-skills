# Prototyping Tools Reference

## Tool Comparison

| Tool | Best For | Fidelity | Interactivity | Learning Curve | Price |
|------|----------|----------|---------------|----------------|-------|
| Figma | UI design, team collaboration, dev handoff | Low-High | Screen transitions, basic animation | Low | Free-$$$ |
| ProtoPie | Complex interactions, sensors, hardware | Mid-High | Advanced (conditional, variable-based) | Medium | $$-$$$ |
| Framer | Design + code, production-ready UI | Mid-High | Advanced (React-based, custom code) | Medium | $$ |
| Sketch + Axure | Rapid wireframing, complex logic | Low-Mid | Conditional logic, adaptive views | Medium | $$ |
| Balsamiq | Early wireframes, low-fidelity | Low | Click-through only | Very low | $ |

## Figma Prototyping

### Interactions
| Trigger | Action | Use |
|---------|--------|-----|
| On click | Navigate to | Button → next screen |
| On drag | Navigate to | Swipe → next carousel item |
| While hovering | Open overlay | Tooltip appear |
| After delay | Navigate to | Auto-advance onboarding |
| On key press | Navigate to | Keyboard shortcut demo |

### Smart Animate
Match layer names between frames for automatic morphing transitions:
- Same-named layers animate between states
- Set transition: "Smart Animate" with 300ms ease-in-out
- Use variants in component sets for state-based animations

### Variables & Expressions (Figma 2024+)
Define variables for design tokens and prototype logic:
- Local variables: component-level (e.g., `isOpen: boolean`)
- Mode: light/dark theme switching
- Expressions: `if isOpen = true → show menu`

### Conditional Prototyping
```yaml
Condition: if formComplete = true
  Action: Navigate to "Success Screen"
Otherwise:
  Action: Show "Error" overlay
```

## ProtoPie

### Advanced Interactions
- **Conditional logic**: If/else, switch statements
- **Variables**: String, number, boolean, color
- **Formulas**: Math operations, string concatenation
- **Sensors**: Gyroscope, accelerometer, microphone (mobile testing)

### Example: Toggle Switch
```
Trigger: Tap on toggle
  → Variable: toggleState = !toggleState
  → If toggleState = true
    → Move toggle knob right (200ms, ease-out)
    → Change track color to green
  → Else
    → Move toggle knob left (200ms, ease-out)
    → Change track color to gray
```

### Best For
- Complex micro-interactions (drag, swipe, pinch)
- Multi-step form flows with validation
- Hardware interaction prototypes (mobile sensors)
- Handoff to developers with exact timing specs

## Framer

### Design + Code
Framer components are React components — design directly translates to code:
- Visual editor generates real React components
- Add custom code via Code Overrides
- Supports Framer Motion for animations

### When to Use Framer
- Team uses React for production
- Need high-fidelity interactive prototypes
- Want to reuse prototype components in production
- Complex, gesture-based mobile interactions

### Code Override Example
```tsx
import type { ComponentType } from 'react';
import { motion } from 'framer-motion';

export function withFadeIn(Component: ComponentType): ComponentType {
  return (props) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Component {...props} />
    </motion.div>
  );
}
```

## Tool Selection Decision Tree

```
What are you prototyping?
├─ Wireframes, early concepts
│  └─ Low fidelity → Balsamiq, Figma
├─ UI design + team collaboration
│  └─ Mid-high fidelity → Figma
├─ Complex interactions (drag, conditional, hardware)
│  └─ High fidelity → ProtoPie
├─ Production code generation
│  └─ High fidelity → Framer
└─ Stakeholder sign-off
   └─ Mid-high fidelity → Figma + mirror app
```

## Cross-Tool Workflow

1. **Figma** — Design screens and component library
2. **Figma → ProtoPie** — Import via plugin for advanced interactions
3. **Framer** — Rebuild key flows in code if production code handoff needed
4. **Handoff** — Figma Dev Mode as source of truth, ProtoPie for motion specs
