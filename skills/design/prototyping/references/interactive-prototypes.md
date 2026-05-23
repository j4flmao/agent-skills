# Interactive Prototypes

## Fidelity Levels

| Fidelity | Purpose | Tools | Time | Interactivity |
|----------|---------|-------|------|---------------|
| Low-fidelity | Concept validation | Pen & paper, Balsamiq, Excalidraw | Hours | Click-through only |
| Mid-fidelity | Flow validation | Figma, Sketch, XD | Days | Transitions, basic interactions |
| High-fidelity | Usability testing | Figma, Principle, Protopie, Framer | Weeks | Full interactions, micro-animations |
| Code prototype | Technical validation | HTML/CSS/JS, React | Days-Weeks | Full browser behavior |

## Prototyping Tools

| Tool | Fidelity | Learning Curve | Collaboration | Animation | Handoff |
|------|----------|---------------|---------------|-----------|---------|
| Figma | Low to High | Low | Real-time | Smart Animate | Dev mode |
| Framer | High | Medium | Comments | Advanced | React code |
| Protopie | High | High | Limited | Very advanced | Video specs |
| Principle | High | Medium | Limited | Advanced | Video specs |
| Axure | Mid to High | High | Comments | Conditionals | Spec docs |
| HTML/CSS/JS | Production | High | Git | Full control | Production code |

## Common Prototyping Patterns

### Onboarding Flow

```
Screen 1: Welcome → Screen 2: Permission → Screen 3: Preferences → Screen 4: Done
         (swipe/tap)    Screen: Allow    Select: topics    Button: Get started
```

```typescript
// Prototype logic for onboarding flow
const onboardingFlow = {
  screens: ["welcome", "permissions", "preferences", "done"],
  currentScreen: 0,
  transitions: {
    next: { type: "slide-left", duration: 300 },
    back: { type: "slide-right", duration: 300 },
    skip: { type: "fade", duration: 200 },
  },
  interactions: {
    "welcome.cta": { action: "goTo", target: "permissions" },
    "permissions.allow": { action: "goTo", target: "preferences" },
    "permissions.skip": { action: "goTo", target: "done" },
    "preferences.continue": { action: "goTo", target: "done" },
    "done.cta": { action: "navigate", target: "/dashboard" },
  },
};
```

### Form Validation

Interactive behavior for form prototypes:

```
User types → Real-time validation icon → Error message after blur → Success state on valid

States per field:
- Empty (default): Label above, placeholder text
- Focused: Label animates up, border highlight
- Typing: Character count (if applicable), hide/show toggle (password)
- Blur with error: Red border, error icon, error message below
- Valid: Green checkmark, success border
- Filled: Label stays up, value visible
```

```javascript
// Form validation prototype logic
const validation = {
  rules: {
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Please enter a valid email address",
    },
    password: {
      required: true,
      minLength: 8,
      message: "Password must be at least 8 characters",
    },
  },
  states: ["empty", "focused", "valid", "invalid", "disabled"],
  transitions: {
    empty → focused: "Focus animation (300ms)",
    focused → typing: "Character appears, inline validation icon",
    typing → valid: "Green checkmark (500ms delay after valid)",
    typing → invalid: "Red X + error message (on blur)",
    invalid → focused: "Hide error, show focus state",
  },
};
```

### Navigation Patterns

```
Mobile Bottom Nav:
  Tab 1 (Home)    Tab 2 (Search)    Tab 3 (Profile)    Tab 4 (Settings)
  Active: icon filled, label colored
  Inactive: icon outlined, label gray

Desktop Sidebar:
  [Collapsed: icons only] → [Expanded: icons + labels]
  Expand on hover or click hamburger
  Active item: highlighted background
  Sub-items: nested, collapsible

Breadcrumb:
  Home > Category > Product > Current Page
  Each item clickable (except current)
  Responsive: collapse to icon on mobile
```

### Loading States

```
Skeleton Loader:
  ▓▓▓▓▓▓▓▓▓▓  (text line, shimmer animation)
  ▓▓▓▓▓▓       (shorter line)
  ▓▓▓▓▓▓▓▓▓▓▓▓ (full width)

Spinner:
  Size: 20px (inline), 40px (button), 60px (page)
  Variants: circle, dots, pulse, progress bar

Skeleton → content: Cross-fade transition (300ms)
Error → retry button: Fade in with shake animation
Empty state → illustration + CTA: Staggered fade in
```

## Micro-Interactions

| Interaction | Trigger | Response | Duration |
|-------------|---------|----------|----------|
| Button hover | Mouse enter | Background shade, slight scale | 200ms |
| Button press | Mouse down | Scale to 0.95, shadow depth | 100ms |
| Card hover | Mouse enter | Elevation increase (shadow) | 300ms |
| Menu open | Click | Fade + scale (transform origin at click) | 200ms |
| Page transition | Navigation | Slide (direction based on hierarchy) | 300ms |
| Toast appear | Event trigger | Slide in from top, auto-dismiss after 3s | 350ms |
| Error shake | Validation failure | Horizontal shake 3px × 3 cycles | 400ms |
| Success check | Validation pass | Checkmark draw animation | 500ms |
| Accordion open | Click | Height expand with ease-out | 250ms |
| Modal appear | Click | Backdrop fade (200ms) + content scale (300ms) |

## Prototyping Checklist

- [ ] All screens linked — no dead ends
- [ ] Loading states shown for data-heavy screens
- [ ] Error states shown for form submissions
- [ ] Empty states shown for lists/tables
- [ ] Handle back navigation correctly
- [ ] Edge cases: very long names, very long lists, no network
- [ ] Responsive: prototype works at target breakpoints
- [ ] Accessibility: tab order, focus states, screen reader labels
- [ ] All micro-interactions have timing defined
- [ ] Gesture-based navigation works (swipe, pull-to-refresh)
- [ ] Form validation shows before and after states
- [ ] Success and error feedback shown for all actions

## Prototyping Principles

1. **Start low, refine up** — Validate concept with low-fi before spending time on visual polish
2. **Don't prototype everything** — Prototype the risky or unknown parts, not the obvious ones
3. **Imperfect is fine** — A prototype doesn't need to look final to test a hypothesis
4. **Name your screens** — Clear naming helps stakeholders and developers navigate the prototype
5. **Document interactions** — Note timing, easing, and states for each interaction
6. **Test with real users** — A prototype not tested is a prototype that might be wrong
7. **Iterate quickly** — Make changes during testing sessions, don't wait for the next version
