# Developer Handoff Workflow Reference

## Handoff Package Contents

| Artifact | Format | Tool | Purpose |
|----------|--------|------|---------|
| Figma file link | URL | Figma | Dev Mode inspect |
| Interactive prototype | URL | Figma, ProtoPie | Behavior reference |
| Spec document | PDF, Notion, Confluence | Design tool | Component states, responsive rules |
| Asset exports | SVG, PNG, WebP | Figma, Sketch | Production-ready graphics |
| Design tokens | JSON, CSS variables | Figma tokens plugin, Specify | Colors, typography, spacing |
| Motion specs | Documentation | — | Trigger, duration, easing |

## Figma Dev Mode Workflow

1. Design complete → mark frame as "Ready for Dev" in Figma
2. Developer opens Dev Mode (Shift+D) in Figma
3. Inspect element → see CSS/iOS/Android values
4. Export asset: right-click → Copy/Paste as SVG, PNG, WebP
5. Redlines: Shift+click elements to measure spacing
6. Prototype: play mode to interact with transitions

## Spec Document Template

```
Screen: [screen name]
Breakpoints: 375 / 768 / 1024 / 1440px
Grid: 12 columns, 24px gutter, 24px margin

Components on screen:
  [Component name]
    Position: x, y (or responsive rule)
    Width: px / fill / fit
    States: default, hover, active, disabled, error
    Spacing: 16px padding all sides
    Typography: Inter Regular 14px, #171717
    Elevation: shadow level 1 (Y: 2px, blur: 8px, rgba(0,0,0,0.1))

Transitions:
  [Trigger] → [action]: [duration] [easing]
  Tap "Submit" → "Success Screen": 300ms ease-in-out
```

## Component States Matrix

For every interactive component, document:

| State | Visual | Typography | Background | Border | Shadow |
|-------|--------|------------|------------|--------|--------|
| Default | Appearance | Inter 14px #171717 | #FFFFFF | 1px #E5E7EB | none |
| Hover | Slight darken | Inter 14px #171717 | #F9FAFB | 1px #D1D5DB | sm |
| Active | Pressed | Inter 14px #171717 | #F3F4F6 | 1px #9CA3AF | none |
| Disabled | Faded | Inter 14px #D1D5DB | #F9FAFB | 1px #E5E7EB | none |
| Error | Red border | Inter 14px #171717 | #FFFFFF | 1px #EF4444 | none |
| Focus | Ring | Inter 14px #171717 | #FFFFFF | 2px #3B82F6 | ring |

## Responsive Behavior Spec

| Breakpoint | Layout | Grid | Navigation | Font Size |
|------------|--------|------|------------|-----------|
| Mobile (375px) | Single column | 4 cols | Hamburger menu | 14px body |
| Tablet (768px) | Two column | 8 cols | Horizontal nav | 15px body |
| Desktop (1024px) | Three column | 12 cols | Full nav | 16px body |
| Wide (1440px) | Three column | 12 cols | Full nav | 16px body |

## Export Asset Naming Convention

```
{component}-{variant}-{state}-{size}.{format}

Real examples:
  button-primary-hover-40.svg
  button-secondary-default-32.svg
  icon-close-active-24.svg
  icon-menu-default-24.svg
  illustration-empty-state-2x.png
  card-background-default.webp
  logo-acme-horizontal.svg
```

## Design Tokens Export (JSON)

```json
{
  "colors": {
    "brand-500": { "value": "#3B82F6", "type": "color" },
    "brand-600": { "value": "#2563EB", "type": "color" },
    "surface": { "value": "#FFFFFF", "type": "color" },
    "text-primary": { "value": "#171717", "type": "color" },
    "text-secondary": { "value": "#6B7280", "type": "color" }
  },
  "typography": {
    "body": { "fontFamily": "Inter", "fontSize": "14px", "fontWeight": 400, "lineHeight": 1.5 },
    "heading": { "fontFamily": "Inter", "fontSize": "24px", "fontWeight": 600, "lineHeight": 1.25 }
  },
  "spacing": { "xs": "4px", "sm": "8px", "md": "16px", "lg": "24px", "xl": "32px" },
  "shadow": { "sm": "0 1px 2px rgba(0,0,0,0.05)", "md": "0 4px 6px rgba(0,0,0,0.1)" }
}
```

## Motion Specs Documentation

| Interaction | Trigger | Duration | Easing | Property | Notes |
|-------------|---------|----------|--------|----------|-------|
| Button hover | Hover in | 150ms | ease-out | background-color | From #fff to #f9fafb |
| Button active | Mousedown | 100ms | ease-in | transform: scale(0.97) | — |
| Modal open | Click | 250ms | ease-out | opacity, transform: translateY | Overlay fades in 200ms |
| Page transition | Navigate | 300ms | ease-in-out | opacity | Cross-fade |
| Toast enter | Action | 250ms | ease-out | transform: translateY | Slide from top |
| Skeleton pulse | Page load | 400ms | ease-in-out | opacity | Infinite loop |

## Redlines Best Practices

- Include baseline grid (8px increments) in dev handoff files
- Call out edge cases: long text truncation, error states, empty states
- Annotate interactive states where not visually obvious
- Show responsive behavior at minimum 3 breakpoints: mobile, tablet, desktop
- Include loading, skeleton, error, and empty state designs
- Use red annotation lines for spacing, never assume developers will "eyeball it"
