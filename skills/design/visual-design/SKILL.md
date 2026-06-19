---
name: design-visual-design
description: >
  Use when the user asks about visual design, color theory, typography, layout, visual hierarchy, spacing, proportion, or UI aesthetics. Do NOT use for: design systems (design-design-systems), UX research (design-ux-research), or prototyping (design-prototyping).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [design, visual-design, phase-3]
---

# Visual Design

## Purpose
Apply visual design principles — color theory, typography, layout grids, spacing systems, visual hierarchy, and aesthetic consistency — to create interfaces that are both beautiful and functional. Visual design serves usability: every decision about color, type, spacing, or layout should support clarity, readability, and user goals.

## Agent Protocol

### Trigger
Exact user phrases: "visual design", "color theory", "typography", "layout", "visual hierarchy", "spacing", "proportion", "UI aesthetics", "make it look better", "design polish", "visual polish".

### Input Context
- Product type (dashboard, marketing site, mobile app, data-heavy tool)
- Existing brand assets or design system tokens
- Target user demographics (age, accessibility needs, cultural context)
- Platform constraints (responsive breakpoints, screen sizes, rendering engine)
- Brand personality (professional, playful, luxurious, minimalist)

### Output Artifact
Visual design specification with color system, typography scale, spacing grid, layout principles, and accessibility requirements.

### Completion Criteria
- [ ] Color palette defined with primary, secondary, neutral, semantic colors
- [ ] All color combinations meet WCAG AA contrast ratios (4.5:1 text)
- [ ] Typography scale established (typeface, size, weight, line-height, letter-spacing)
- [ ] Spacing system defined (4px or 8px base unit with consistent scale)
- [ ] Layout grid specified (columns, gutters, margins, breakpoints)
- [ ] Visual hierarchy defined (size, color, position, whitespace strategy)
- [ ] Accessibility requirements documented (focus indicators, reduced motion, text spacing)

### Max Response Length
200 lines of spec, patterns, and configuration.

## Framework/Methodology

### Visual Design Decision Tree
```
What is the primary design goal?
├── Clarity and readability → Typography-first approach
│   Select readable typeface, generous line-height, strong hierarchy
├── Brand expression and emotion → Color-first approach
│   Start with brand palette, extend to UI semantic colors
├── Data density and precision → Layout-first approach
│   Establish grid system, information density rules, spacing constraints
└── Engagement and delight → Motion + visual hierarchy
    Leading lines, focal points, depth through shadow/layering
```

### The Four Pillars of Visual Design

| Pillar | Definition | Key Techniques |
|--------|------------|----------------|
| Color | Hue, saturation, value relationships | Color harmony, contrast, temperature |
| Typography | Typeface selection and text styling | Hierarchy, readability, pairings |
| Layout | Spatial arrangement of elements | Grids, alignment, proximity |
| Spacing | Whitespace management | Padding, margin, density control |

### Visual Design Process
```
Problem → Information → Structure → Visual Design → Prototype → Validate
                    ↑                          ↓
              Layout wireframes           Visual spec + tokens
              Content hierarchy           Dark mode adaptation
              User flows                  Responsive behavior
```

## Workflow

### Step 1: Establish Color System

Color Theory Foundations:
- **Hue**: the pigment (red, blue, green) — 360° color wheel
- **Saturation**: intensity/purity of the color — 0% (gray) to 100% (pure)
- **Lightness**: how light or dark — 0% (black) to 100% (white)
- **Temperature**: warm (reds, oranges, yellows) vs cool (blues, greens, purples)

Color Harmonies:

| Harmony | Composition | Effect | Best For |
|---------|-------------|--------|----------|
| Complementary | Opposite on color wheel | High contrast, energetic | CTAs, emphasis |
| Analogous | Adjacent on color wheel | Harmonious, peaceful | Backgrounds, branding |
| Triadic | Evenly spaced (120°) | Balanced, vibrant | Colorful interfaces |
| Split-complementary | Base + two adjacent to complement | High contrast, less tension | Versatile UI |
| Monochromatic | Single hue, varying lightness | Clean, sophisticated | Data viz, minimal design |

Color Accessibility: Every text/background combination must meet WCAG AA (4.5:1 for text <18px, 3:1 for text >=18px bold). Use tools: WebAIM Contrast Checker, Stark for Figma, axe DevTools.

Dark Mode Strategy:
- Reduce contrast slightly (text: 87% white, secondary: 60%, disabled: 38%)
- Increase saturation on accent colors to maintain vibrancy on dark backgrounds
- Reduce saturation on large surface areas to prevent eye strain
- Preserve semantic color meanings (red = error, green = success)
- Test at low brightness settings on OLED displays

```css
:root {
  --color-primary: #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-primary-light: #DBEAFE;
  --color-secondary: #7C3AED;
  --color-neutral-50: #F9FAFB;
  --color-neutral-100: #F3F4F6;
  --color-neutral-200: #E5E7EB;
  --color-neutral-500: #6B7280;
  --color-neutral-700: #374151;
  --color-neutral-900: #111827;
  --color-success: #059669;
  --color-warning: #D97706;
  --color-error: #DC2626;
  --color-info: #0284C7;
}
[data-theme="dark"] {
  --color-primary: #3B82F6;
  --color-primary-hover: #60A5FA;
  --color-primary-light: #1E3A5F;
  --color-neutral-50: #18181B;
  --color-neutral-100: #27272A;
  --color-neutral-200: #3F3F46;
  --color-neutral-500: #A1A1AA;
  --color-neutral-700: #D4D4D8;
  --color-neutral-900: #FAFAFA;
}
```

### Step 2: Build Typography System

Type Classification:
- **Serif**: Traditional, readable in long form — best for body text in print, headlines in digital
- **Sans-serif**: Clean, modern, screen-optimized — default for digital UI
- **Monospace**: Equal-width characters — code, data, tabular figures
- **Display**: Decorative, limited use — headlines only, never body text

Type Pairing Principles:
- One typeface family with multiple weights is safer than two typefaces
- If pairing: contrast in structure (serif + sans-serif), not in mood
- Use the 1.25 (Major Third) or 1.333 (Perfect Fourth) modular scale
- Limit to 2 typefaces max — one for headings, one for body

```css
:root {
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;

  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  --tracking-tight: -0.025em;
  --tracking-normal: 0;
  --tracking-wide: 0.05em;
}
```

Readability Guidelines:
- Body text: 16-18px, line-height 1.5-1.7, max line length 60-75 characters
- Headings: bold weight, shorter line-height (1.2-1.3), letter-spacing tightened
- Labels: 13-14px, medium weight, letter-spacing slightly opened
- Avoid: text blocks wider than 75ch, body text under 14px, justified alignment

### Step 3: Design Spacing System

The 8px Grid System:
- Base unit: 8px (4px for micro-spacing)
- All margins, padding, gaps are multiples of 8px (or 4px for fine-tuning)
- Consistently applied across all components and layouts

```css
:root {
  --space-0: 0;
  --space-0\.5: 0.125rem;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;
}
```

Spacing Density:
- **Comfortable**: Generous whitespace (32-48px between sections) — content-focused, reading
- **Default**: Balanced (24-32px) — general purpose UI
- **Compact**: Tighter (8-16px) — data-heavy dashboards, tables, dense tools

Proximity Rule: Elements that are functionally related should be visually grouped through spacing. Items within a group use tighter spacing (8-16px); groups of items use more spacing (24-40px). This replaces visible borders in many cases.

### Step 4: Create Layout System

Grid Systems:

| Grid Type | Columns | Gutter | Margin | Best For |
|-----------|---------|--------|--------|----------|
| 12-col | 12 | 24px | 16-80px | General responsive web |
| 8-col | 8 | 16px | 16-48px | Mobile-first, compact |
| 6-col | 6 | 32px | 24px | Dashboard widgets |
| Fluid | Auto-fill | 16px | 16px | Content lists, galleries |

```css
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  padding: 0 24px;
  max-width: 1200px;
  margin: 0 auto;
}
@media (max-width: 768px) {
  .grid { grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 0 16px; }
}
```

Visual Hierarchy Tools:
- **Size**: Larger elements draw attention first — primary actions are bigger than secondary
- **Color**: Bright/high-contrast elements advance; muted/low-contrast recede
- **Weight**: Bold text stands out; regular weight recedes
- **Position**: Top-left (LTR) is primary attention zone; bottom-right is lowest
- **Whitespace**: More space around an element = more importance
- **Depth**: Shadows, elevation, and layering create focal planes
- **Texture**: Patterns, gradients, and imagery attract attention

F-Pattern Layout: Users scan content in an F-shaped pattern — horizontal across top, then down left side, then horizontal again. Place key information along these scan lines. For content-heavy pages, lead with the most important information in the top-left quadrant.

Z-Pattern Layout: For minimal or center-focused layouts (landing pages, marketing sites), users scan in a Z — top-left to top-right, diagonally down, bottom-left to bottom-right. Place your logo top-left, CTA top-right or bottom-right, and value prop along the diagonal path.

### Step 5: Apply Accessibility to Visual Design

- Focus indicators: 2px minimum, 3:1 contrast against adjacent colors, visible on all interactive elements
- Color-not-reliance: Never convey information through color alone — add icons, patterns, text labels
- Target sizes: 44x44px minimum for touch targets on mobile
- Text spacing: Ensure layouts don't break when users override text spacing (WCAG 1.4.12)
- Reduced motion: Test all animations reduce gracefully via `prefers-reduced-motion`
- Focus order: Visual order matches DOM/tab order for logical navigation

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Low contrast text | Light gray text (#999, #AAA) on white is unreadable | Minimum 4.5:1 contrast for all text |
| Too many colors | Using 10+ distinct colors creates visual noise | Limit palette to 3-5 UI colors + neutrals |
| Inconsistent spacing | Random padding/margin values across components | Enforce an 8px grid system |
| Ignoring type hierarchy | Same size/weight for headings and body | Define a clear type scale (5+ levels) |
| Decorative overload | Add gradients, shadows, and effects without purpose | Every visual element must serve a function |
| No dark mode | Light-only design that breaks in dark environments | Design both themes in parallel |
| Over-relying on color | Red-only error states that colorblind users miss | Pair color with icons, text, or patterns |
| Dense text blocks | No whitespace in long-form content | Max width 75ch, generous line-height 1.6+ |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| 60-30-10 color rule | 60% neutral, 30% primary, 10% accent — balanced palette |
| 8px grid for all spacing | Consistent rhythm, easier handoff, no arbitrary values |
| Modular typography scale | Mathematical consistency in type sizes, not guesswork |
| Max 75ch line length | Optimal reading speed and comprehension |
| Semantic color naming | `color-primary`, not `color-blue` — survives rebrands |
| Design in grayscale first | Forces focus on hierarchy and spacing before color |
| Test on actual devices | Emulators miss brightness, glare, and viewing angle issues |
| Consider colorblind users | 8% of males have some form of color vision deficiency |
| Respect OS-level preferences | Dark mode, reduced motion, high contrast settings |
| Consistent border radii | Pick one radius (4px) and use it everywhere |

## Templates & Tools

### Color Palette Generator Process
```yaml
primary: "#2563EB"
harmonies:
  complementary: "#EB9D25"
  analogous: ["#2596EB", "#2563EB", "#2546EB"]
  triadic: ["#25EB9D", "#2563EB", "#EB2596"]
neutrals:
  50: "#F9FAFB" (background)
  100: "#F3F4F6" (surface)
  200: "#E5E7EB" (border)
  500: "#6B7280" (secondary text)
  700: "#374151" (body text)
  900: "#111827" (headings)
semantic:
  success: "#059669"
  warning: "#D97706"
  error: "#DC2626"
  info: "#0284C7"
```

### Typography System Template
```yaml
typefaces:
  heading: "Inter, system-ui, sans-serif"
  body: "Inter, system-ui, sans-serif"
  mono: "JetBrains Mono, monospace"
scale:
  display: "3rem/1.2" (48px)
  h1: "2.25rem/1.3" (36px)
  h2: "1.875rem/1.3" (30px)
  h3: "1.5rem/1.4" (24px)
  h4: "1.25rem/1.4" (20px)
  body: "1rem/1.6" (16px)
  small: "0.875rem/1.5" (14px)
  caption: "0.75rem/1.5" (12px)
```

### Design Tools

| Tool | Purpose | Best For |
|------|---------|----------|
| Figma | Full design tool, prototyping | End-to-end visual design |
| Adobe Color | Color harmony exploration | Palette creation, harmony testing |
| WebAIM Contrast Checker | WCAG contrast verification | Accessibility validation |
| Stark | Contrast, colorblind sim | Figma accessibility plugin |
| Type Scale Calculator | Modular type scale | Typography system design |
| Coolors | Palette generator | Rapid color exploration |
| Material Design Color Tool | Color system, accessible variants | Systematic palette creation |
| Sim Daltonism | Colorblindness simulator | Accessibility testing |

## Case Studies

### Case Study 1: Dark Mode Redesign Reduces Eye Strain
A productivity app used a pure white (#FFFFFF) background. After implementing a proper dark mode with reduced contrast (87% text, 60% secondary, 38% disabled on #1E1E1E background), user surveys showed 40% reduction in reported eye strain during evening use. The key was using true dark grays (#1E1E1E) instead of pure black (#000000) to reduce halation on OLED screens, and reducing saturation on accent colors from 100% to 75% for large surface areas.

Method: Color system extension with dark theme overrides, tested on OLED and LCD displays
Key insight: Dark surfaces should be dark gray, not black, and accent colors need desaturation for comfort
Impact: Eye strain reports -40%, evening DAU +25%

### Case Study 2: Typography Overhaul Increases Readability Scores
A news website used 14px body text with 1.4 line-height and 90ch max-width. Readability testing showed 65% comprehension. After increasing to 18px body text, 1.6 line-height, 70ch max-width, and using a more open typeface (system fonts → Inter), comprehension improved to 85%. Time-on-page increased 35% and scroll depth improved by 50%.

Method: Typography audit → scale adjustment → readability testing with 30 participants
Key insight: Readability improvements benefit all users, not just those with visual impairments
Impact: Comprehension 65% to 85%, time-on-page +35%, scroll depth +50%

### Case Study 3: Spacing System Reduces Development Time
An e-commerce team had 47 distinct spacing values across their CSS. Implementing an 8px-grid spacing system with 12 values eliminated all arbitrary spacing decisions. Developer productivity for layout tasks improved by 30%, and the visual consistency score (measured by design audit) increased from 62% to 94% in 3 months.

Method: Audit all spacing → define 12-value 8px grid → codify in design tokens
Key insight: Constraining choices improves both consistency and velocity
Impact: Dev velocity +30%, visual consistency 62% to 94%

## Rules
- Minimum text size: 14px body, 12px caption (accessibility)
- Minimum contrast: 4.5:1 text, 3:1 large text, 3:1 UI elements (WCAG AA)
- Limit typeface families to 2 per interface
- Line length: 60-75 characters max for body text
- Spacing follows an 8px grid (4px for micro adjustments)
- Color conveys meaning, not decoration — semantic naming
- Never use color as the only differentiator — add text or icon
- Dark mode is not just inverted colors — redesign for dark environments
- Every component has hover, active, disabled, focus, error states
- Borders are last resort — use spacing and background to separate elements
- Consistent border radius: pick one value (4px) and use it everywhere
- Visual hierarchy should be apparent at a glance — 3 levels max depth
- Shadows map to z-depth layers (card, modal, toast) — 3 levels max
- Test all designs in grayscale to verify hierarchy works without color
- Responsive design: mobile, tablet, desktop — design from smallest first
- Loading states must match final layout structure (no layout shift)

## Color in Depth

### Color Psychology in UI
Color choices communicate meaning and influence user behavior:

| Color | Associations | Best For | Risk |
|-------|-------------|----------|------|
| Blue | Trust, stability, professionalism | Finance, healthcare, enterprise | Common — hard to differentiate |
| Green | Growth, health, success, wealth | Finance, environment, health | Cultural variance (some cultures: luck vs danger) |
| Red | Urgency, passion, error | CTAs, alerts, sales | High arousal — can cause anxiety if overused |
| Orange/Yellow | Energy, optimism, warmth | Entertainment, food, children | Low contrast on white — accessibility risk |
| Purple | Creativity, luxury, wisdom | Beauty, spiritual, premium | Gender bias perception |
| Black/White | Sophistication, minimalism | Luxury, fashion, tech | Can feel cold or stark without warm accent |
| Pink | Playful, nurturing, sweet | Beauty, fashion, children | Gender stereotypes — use with awareness |

### Color System Architecture
```
Global palette (100+ colors)
    ↓
Semantic tokens (30-50 colors)
    ↓
Component tokens (mapped to semantic)
```

**Global palette structure**:
- 10 neutral grays (50-900 scale) for text, backgrounds, borders
- 5-10 accent colors (each with 50-900 scale) for primary, secondary, tertiary
- 4 semantic colors: success (green), warning (amber/yellow), error (red), info (blue/cyan)
- Extended palette for data visualization (8-12 categorical colors, sequential + diverging scales)

### Color Contrast Calculation
WCAG contrast ratio = (L1 + 0.05) / (L2 + 0.05), where L1 is relative luminance of lighter color and L2 of darker color. Relative luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B (linearized sRGB values).

```typescript
// Quick contrast checker
function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
```

Tools: WebAIM Contrast Checker, Stark plugin, axe DevTools. Never guess contrast — always verify algorithmically.

## Typography in Depth

### Typeface Anatomy for UI Decision-Making
When evaluating typefaces for UI, assess:
- **x-height**: Larger x-height improves readability at small sizes (body text). Small x-height = more elegant, less readable.
- **Aperture**: Open apertures (a, c, e) improve legibility. Closed apertures can cause confusion at small sizes.
- **Stroke contrast**: Low contrast (sans-serif, humanist) for body text. High contrast (didone) for display only.
- **Counter size**: Open counters improve letter recognition, especially on low-resolution screens.
- **Numeric figures**: Tabular figures (fixed-width numbers) for tables and data. Proportional figures for running text.

### Web Font Loading Strategy
```html
<!-- Preload critical font -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>

<!-- Inline small font subset in CSS -->
<style>
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap;  /* Show fallback text immediately, swap when font loads */
  unicode-range: U+0000-00FF;  /* Latin subset only */
}
</style>
```

- `font-display: swap` prevents invisible text (FOIT) — text renders in fallback font immediately, swaps when custom font loads
- Subset fonts to Latin/ASCII for initial load, load full character set after first paint
- Use variable fonts (single .woff2 file for all weights) instead of individual weight files — reduces total font download 40-60%
- Preconnect to font CDN (Google Fonts, Typekit) to reduce DNS lookup time

### Readability Science
| Variable | Optimal Range | Impact |
|----------|--------------|--------|
| Line length | 50-75 characters (including spaces) | Too long: eye fatigue. Too short: disjointed reading |
| Line height | 1.5-1.7 for body, 1.2-1.3 for headings | Too tight: lines blur together. Too loose: disconnected |
| Font size | 16-18px body, 14px minimum for UI labels | Below 14px: significant readability decrease |
| Paragraph spacing | 1.5x line height between paragraphs | Separates thought groups without breaking flow |
| Column width | 1-3 columns for content | More than 3: scanning becomes difficult |
| Contrast | 4.5:1 minimum (AA), 7:1 preferred (AAA) | Below 4.5:1: significant readability decrease in suboptimal conditions |

## Layout Systems in Depth

### Grid Calculation Formula
```
Column width = (Content width - (Columns - 1) * Gutter) / Columns
```

Example: 12-column grid, 1200px content width, 24px gutter:
```
Column = (1200 - 11 * 24) / 12 = (1200 - 264) / 12 = 78px
```

### Responsive Breakpoint Decision Tree
```
Content layout change at viewport width?
├── <640px (mobile) → Single column, stacked layout, hamburger menu
│   Touch targets: 44x44px minimum
│   Typography: body 16px, maintain readability at narrow widths
├── 640-1024px (tablet) → 2-column grid, visible navigation
│   Consider: portrait vs landscape orientation differences
├── 1024-1440px (desktop) → 12-column grid, sidebar + main content
│   Most common target — optimize here first
└── >1440px (wide) → Constrain max-width (1200-1440px) or use fluid layout
    Extra whitespace on sides; consider multi-column layouts
```

Mobile-first approach: start with mobile layout, add complexity at each breakpoint.

### Visual Weight and Balance
Visual weight is determined by:
- **Size**: Larger = heavier. Balance a large element with multiple small elements.
- **Color**: Saturated colors weigh more than muted. Dark weighs more than light.
- **Texture**: Pattern, gradient, shadow add visual weight.
- **Whitespace**: More whitespace around an element = more emphasis (isolation).
- **Position**: Elements at the top and left (LTR) have more perceived weight.
- **Shape**: Irregular shapes draw more attention than regular ones.

Symmetrical balance: formal, stable. Asymmetrical balance: dynamic, interesting (requires more skill). Radial balance: powerful focal point.

## Component State Architecture

Every interactive component in visual design must define these visual states:

### Button State Examples
```
Default:   Solid blue bg #2563EB, white text, border-radius 8px
Hover:     Lighter blue bg #3B82F6, cursor pointer
Active:    Darker blue bg #1D4ED8, scale 0.97 (pressed)
Focus:     Same as default + 2px blue outline #2563EB with 4px offset
Disabled:  40% opacity, no hover/active effects, cursor not-allowed
Loading:   Spinner replaces text, button width preserved (prevents layout shift)
Success:   Green bg #059669, checkmark icon
Error:     Red bg #DC2626 (for destructive confirmation)
```

### Input State Examples
```
Default:       1px solid border #D1D5DB, white bg
Focus:         2px solid blue #2563EB, subtle shadow
Hover:         1px solid border #9CA3AF
Error:         2px solid red #DC2626, error icon + message below
Disabled:      Gray bg #F3F4F6, 40% opacity text, no interactions
Filled:        1px solid border, text content present
Active:        Cursor blinking, component focused
Read-only:     Gray bg, no editing possible, cursor default
```

## Production Considerations

### Design Token Governance
All visual design properties should be codified as design tokens:
- **Color tokens**: Namespaced by function, not appearance: `color-primary` not `color-blue`
- **Typography tokens**: `font-size-heading-1`, `font-weight-regular`, `line-height-body`
- **Spacing tokens**: `spacing-4` (4px), `spacing-8` (8px), `spacing-16` (16px)
- **Shadow tokens**: `shadow-sm`, `shadow-md`, `shadow-lg` (each with x/y/blur/spread/color)
- **Radius tokens**: `radius-sm` (4px), `radius-md` (8px), `radius-lg` (16px), `radius-full` (9999px)
- **Opacity tokens**: `opacity-disabled` (0.4), `opacity-overlay` (0.6)
- **Duration tokens**: `duration-fast` (150ms), `duration-normal` (200ms), `duration-slow` (300ms)

### Dark Mode Architecture
Dark mode requires independent color tokens, not simple inversion:
- **Surfaces**: Dark gray `#1E1E1E` instead of pure black `#000000` (reduces halation on OLED)
- **Text**: White `#E0E0E0` (not pure white `#FFFFFF`) to reduce eye strain at night
- **Elevation**: Lighter surfaces for higher elevation (cards are lighter than background)
- **Shadows**: Shadows become internal (inset) or use light-on-dark instead of dark-on-light
- **Images**: Reduce brightness by 20-30% for photos; avoid white backgrounds in illustrations
- **Accessibility**: Maintain 4.5:1 contrast ratio on ALL text — dark mode doesn't mean lower contrast

## Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|-------------|---------|-----|
| **Decorative overload** | Drop shadows, gradients, and borders on every element | Every visual element must serve a function. Remove decoration that doesn't aid communication |
| **Inconsistent visual language** | Different icons styles (line vs fill), different corner radii, inconsistent shadows | Adopt a design system with enforced visual rules; audit regularly |
| **80% gray text** | Light gray (#CCC, #999) body text on white background | Minimum 4.5:1 contrast. Use #666 or darker for body text |
| **No visual hierarchy** | Everything is the same size and weight | Establish 3+ levels of typographic hierarchy; use color, whitespace, and size to create focal points |
| **Ignoring the fold** | Critical content below viewport without indication | Place primary action and value proposition in the first viewport; use visual cues for scroll |
| **Color-blind inaccessible palettes** | Red-green status indicators without patterns/icons | Add icons/text/patterns to all color-coded information |
| **Stretching images** | Distorted aspect ratios | Always maintain aspect ratio; use `object-fit: cover` for containers |
| **Over-alignment** | Centering everything creates weak hierarchy | Left-align (LTR) content by default; center only for specific emphasis |
| **Border abuse** | Borders around everything instead of using spacing | Use whitespace and background color to separate content groups; borders are last resort |
| **Too many focal points** | Every element competes for attention with color/size/motion | Establish one primary action per screen; secondary actions are visually de-emphasized |

## Tools & Deliverables

| Deliverable | Contents | Tools |
|------------|----------|-------|
| Color palette | Primary, secondary, neutral, semantic colors with hex/HSL/RGB values | Figma, Adobe Color, Coolors |
| Typography scale | Font families, sizes, weights, line heights, letter spacing | Figma, Typescale, Google Fonts |
| Spacing system | 8px grid scale with usage rules | Figma, Token Studio |
| Layout grid | Column grid, breakpoints, responsive rules | Figma (Auto Layout), CSS Grid |
| Component library | Visual specs for each component state | Figma, Sketch |
| Icon system | Icon grid, stroke weights, sizing rules | Figma, Noun Project |
| Dark mode spec | Color overrides for dark theme | Figma, Token Studio |

## References
  - references/color-theory.md — Color Theory Reference
  - references/layout-principles.md — Layout Principles Guide
  - references/spacing-grid.md — Spacing and Grid Systems Reference
  - references/typography.md — Typography Reference
  - references/visual-design-advanced.md — Visual Design Advanced Topics
  - references/visual-design-fundamentals.md — Visual Design Fundamentals
  - references/visual-hierarchy.md — Visual Hierarchy Reference
  - references/visual-design-color-system.md — Color System Reference
  - references/visual-design-dark-mode.md — Dark Mode Design Reference
## Handoff
Hand off to `design-design-systems` for token implementation. Hand off to `design-brand-identity` for brand consistency. Hand off to `design-accessibility` for WCAG compliance audit.
