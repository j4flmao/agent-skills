# Developer Handoff

## Figma Dev Mode Workflow

1. Design complete → mark as "Ready for Dev" in Figma
2. Developer opens Dev Mode in Figma (Shift+D)
3. Inspect: select element → see CSS/ iOS/Android values
4. Export: right-click → Copy/Paste as SVG, PNG, WebP
5. Redlines: Shift+click elements → measure spacing
6. Prototype: play mode → interact with transitions

## Handoff Package Contents

1. **Figma file link** with Dev Mode enabled
2. **Interactive prototype link** for behavior reference
3. **Spec document** (PDF or Notion) with:
   - Screen list with purpose and entry points
   - Component matrix (all states for every component)
   - Layout grid and responsive breakpoints
   - Typography scale
   - Color palette with hex/rgba values
   - Elevation/shadow values
   - Icon set with naming
4. **Asset exports** organized by component/screen
5. **Motion specs** (see Export Asset Naming section below)

## Export Asset Naming

`{component}-{variant}-{state}-{size}.{format}`

```
button-primary-hover-40.svg
icon-close-active-24.svg
illustration-empty-state-2x.png
card-background-default.webp
```

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
    Elevation: shadow level 1

Transitions:
  [Trigger] → [action]: [duration] [easing]
```

## Redlines Best Practice
- Include baseline grid (8px increments) in dev handoff files
- Call out edge cases: long text truncation, error states, empty states
- Annotate interactive states where not obvious
- Show responsive behavior at minimum 3 breakpoints: mobile, tablet, desktop
- Include loading, skeleton, and error states

## Spec Document Example

| Property | Value |
|----------|-------|
| Font Family | Inter |
| Font Weight | 500 (Medium) |
| Font Size | 16px |
| Line Height | 24px (1.5) |
| Letter Spacing | 0.01em |
| Color | #171717 |
| Padding | 12px horizontal, 8px vertical |
| Border Radius | 8px |
| Background | #FFFFFF |
| Shadow | 0px 1px 3px rgba(0,0,0,0.1) |
