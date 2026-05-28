# Design System Token Architecture

## Token Hierarchy Deep Dive

A design token is a named entity that stores a visual design attribute. The three-tier hierarchy (primitive, semantic, component) is the industry standard for scalable design systems.

### Tier 1: Primitive Tokens

Primitive tokens are the raw atomic values from a design specification. They represent the base palette, spacing scale, type ramp, and shadow definitions. These tokens never change meaning within a brand -- `--color-blue-500` always represents the same hex value regardless of context or theme.

**Characteristics**:
- Named by visual property, not usage (e.g., `blue-500`, `spacing-4`)
- Never change value within a brand iteration
- Single source of truth for all derived tokens
- Typically 100-300 tokens for a complete system

```json
{
  "color": {
    "blue": {
      "50": { "value": "#eff6ff", "type": "color" },
      "100": { "value": "#dbeafe", "type": "color" },
      "200": { "value": "#bfdbfe", "type": "color" },
      "300": { "value": "#93c5fd", "type": "color" },
      "400": { "value": "#60a5fa", "type": "color" },
      "500": { "value": "#3b82f6", "type": "color" },
      "600": { "value": "#2563eb", "type": "color" },
      "700": { "value": "#1d4ed8", "type": "color" },
      "800": { "value": "#1e40af", "type": "color" },
      "900": { "value": "#1e3a8a", "type": "color" },
      "950": { "value": "#172554", "type": "color" }
    },
    "gray": {
      "50": { "value": "#f9fafb", "type": "color" },
      "100": { "value": "#f3f4f6", "type": "color" },
      "200": { "value": "#e5e7eb", "type": "color" },
      "300": { "value": "#d1d5db", "type": "color" },
      "400": { "value": "#9ca3af", "type": "color" },
      "500": { "value": "#6b7280", "type": "color" },
      "600": { "value": "#4b5563", "type": "color" },
      "700": { "value": "#374151", "type": "color" },
      "800": { "value": "#1f2937", "type": "color" },
      "900": { "value": "#111827", "type": "color" },
      "950": { "value": "#030712", "type": "color" }
    },
    "green": {
      "50": { "value": "#f0fdf4", "type": "color" },
      "100": { "value": "#dcfce7", "type": "color" },
      "200": { "value": "#bbf7d0", "type": "color" },
      "300": { "value": "#86efac", "type": "color" },
      "400": { "value": "#4ade80", "type": "color" },
      "500": { "value": "#22c55e", "type": "color" },
      "600": { "value": "#16a34a", "type": "color" },
      "700": { "value": "#15803d", "type": "color" },
      "800": { "value": "#166534", "type": "color" },
      "900": { "value": "#14532d", "type": "color" }
    },
    "red": {
      "50": { "value": "#fef2f2", "type": "color" },
      "100": { "value": "#fee2e2", "type": "color" },
      "200": { "value": "#fecaca", "type": "color" },
      "300": { "value": "#fca5a5", "type": "color" },
      "400": { "value": "#f87171", "type": "color" },
      "500": { "value": "#ef4444", "type": "color" },
      "600": { "value": "#dc2626", "type": "color" },
      "700": { "value": "#b91c1c", "type": "color" },
      "800": { "value": "#991b1b", "type": "color" },
      "900": { "value": "#7f1d1d", "type": "color" }
    },
    "amber": {
      "50": { "value": "#fffbeb", "type": "color" },
      "100": { "value": "#fef3c7", "type": "color" },
      "200": { "value": "#fde68a", "type": "color" },
      "300": { "value": "#fcd34d", "type": "color" },
      "400": { "value": "#fbbf24", "type": "color" },
      "500": { "value": "#f59e0b", "type": "color" },
      "600": { "value": "#d97706", "type": "color" },
      "700": { "value": "#b45309", "type": "color" }
    }
  }
}
```

### Tier 2: Semantic Tokens

Semantic tokens express design intent. They reference primitive tokens but are named by their purpose, not their appearance. When the theme changes (e.g., light to dark), semantic tokens map to different primitives, but their meaning stays the same.

**Characteristics**:
- Named by usage (`color-bg-primary`, `color-text-body`)
- Reference primitive tokens via `var()` or Style Dictionary aliases
- Represent the contract between design and code
- Typically 50-100 tokens per theme

```json
{
  "color": {
    "bg": {
      "primary": { "value": "{color.gray.50}", "type": "color" },
      "secondary": { "value": "{color.gray.100}", "type": "color" },
      "tertiary": { "value": "{color.gray.200}", "type": "color" },
      "inverse": { "value": "{color.gray.900}", "type": "color" },
      "brand": { "value": "{color.blue.600}", "type": "color" },
      "success": { "value": "{color.green.100}", "type": "color" },
      "warning": { "value": "{color.amber.100}", "type": "color" },
      "error": { "value": "{color.red.100}", "type": "color" }
    },
    "text": {
      "primary": { "value": "{color.gray.900}", "type": "color" },
      "secondary": { "value": "{color.gray.500}", "type": "color" },
      "tertiary": { "value": "{color.gray.400}", "type": "color" },
      "inverse": { "value": "{color.gray.50}", "type": "color" },
      "brand": { "value": "{color.blue.600}", "type": "color" },
      "success": { "value": "{color.green.700}", "type": "color" },
      "error": { "value": "{color.red.700}", "type": "color" },
      "disabled": { "value": "{color.gray.300}", "type": "color" }
    },
    "border": {
      "default": { "value": "{color.gray.200}", "type": "color" },
      "hover": { "value": "{color.gray.300}", "type": "color" },
      "focus": { "value": "{color.blue.500}", "type": "color" },
      "success": { "value": "{color.green.500}", "type": "color" },
      "error": { "value": "{color.red.500}", "type": "color" },
      "disabled": { "value": "{color.gray.100}", "type": "color" }
    }
  }
}
```

### Tier 3: Component Tokens

Component tokens are scoped to specific components. They reference semantic tokens and provide the final mapping layer. This indirection means you can redesign a component's visual appearance without changing its semantic meaning.

**Characteristics**:
- Scoped to a component namespace (`--button-bg`, `--card-padding`)
- Reference semantic tokens only, never primitives
- Typically 5-15 tokens per component
- Provide default values in the component's CSS

```css
/* Button component tokens */
--button-bg: var(--color-bg-brand);
--button-text: var(--color-text-inverse);
--button-border: transparent;
--button-bg-hover: var(--color-blue-700);
--button-text-hover: var(--color-text-inverse);
--button-radius: var(--border-radius-md);
--button-padding-x: var(--spacing-4);
--button-padding-y: var(--spacing-2);
--button-font-size: var(--font-size-md);
--button-font-weight: var(--font-weight-medium);
--button-shadow: var(--shadow-sm);
```

## Token Naming Conventions

### Category-Concept-Variant Pattern

The most widely adopted naming convention for design tokens:

```
{category}-{concept}-{variant}

Examples:
color-bg-primary     (category: color, concept: bg, variant: primary)
spacing-padding-md   (category: spacing, concept: padding, variant: md)
font-size-body       (category: font, concept: size, variant: body)
elevation-shadow-card (category: elevation, concept: shadow, variant: card)
motion-duration-fast (category: motion, concept: duration, variant: fast)
```

### Token Categories

| Category | Examples | Scale |
|----------|----------|-------|
| color | bg, text, border, icon | 50-950 or named variants |
| spacing | padding, margin, gap | 0-96 (4px base) |
| font | family, size, weight, lineHeight | xs-4xl |
| border | radius, width, color | sm, md, lg, xl |
| shadow | sm, md, lg, xl | Named levels |
| motion | duration, easing | fast, normal, slow |
| z-index | modal, dropdown, tooltip | Named layers |
| opacity | disabled, hover, active | 0-100% |

## Opposing Naming Conventions

### Option A: Aliased (used in this guide)
```
Primitives: color-blue-500
Semantic: color-bg-primary
Component: button-bg
```
Best for: Systems with theming, multiple brands.

### Option B: Flat Role-Based
```
surface-primary, surface-secondary
text-primary, text-secondary
border-default, border-hover
```
Best for: Single-brand systems, small teams.

### Option C: Object-Oriented
```
Button.background, Button.textColor
Card.padding, Card.borderRadius
```
Best for: JS-first design systems (styled-components, Theme UI).

### Option D: Tailwind-Inspired
```
bg-primary, text-primary
border-default, shadow-card
```
Best for: Tailwind-based design systems.

## Style Dictionary Configuration

### Basic Setup

```json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "buildPath": "dist/css/",
      "files": [{
        "destination": "tokens.css",
        "format": "css/variables"
      }]
    },
    "js": {
      "transformGroup": "js",
      "buildPath": "dist/js/",
      "files": [{
        "destination": "tokens.js",
        "format": "javascript/es6"
      }]
    },
    "ts": {
      "transformGroup": "js",
      "buildPath": "dist/js/",
      "files": [{
        "destination": "tokens.d.ts",
        "format": "typescript/es6-declarations"
      }]
    }
  }
}
```

### Custom Transforms

```js
// Style Dictionary custom transform: px to rem
const StyleDictionary = require('style-dictionary');

StyleDictionary.registerTransform({
  name: 'size/pxToRem',
  type: 'value',
  matcher: (token) => token.type === 'dimension',
  transformer: (token) => `${parseFloat(token.value) / 16}rem`,
});

StyleDictionary.registerFormat({
  name: 'css/custom-variables',
  formatter: function({ dictionary, options }) {
    return `:root {\n${dictionary.allTokens.map(token =>
      `  --${token.name}: ${token.value};`
    ).join('\n')}\n}`;
  },
});
```

### Platform-Specific Build

```json
{
  "platforms": {
    "web": {
      "transformGroup": "custom-web",
      "buildPath": "dist/web/",
      "files": [
        { "destination": "tokens.css", "format": "css/variables" },
        { "destination": "tokens.js", "format": "javascript/es6" }
      ]
    },
    "ios": {
      "transformGroup": "ios",
      "buildPath": "dist/ios/",
      "files": [
        { "destination": "StyleDictionaryColor.h", "format": "ios/colors.h" },
        { "destination": "StyleDictionaryColor.m", "format": "ios/colors.m" }
      ]
    },
    "android": {
      "transformGroup": "android",
      "buildPath": "dist/android/",
      "files": [
        { "destination": "StyleDictionary.java", "format": "android/colors" }
      ]
    }
  }
}
```

## Token Organization by File

```
tokens/
  globals/
    color/core.json        # Brand colors (primary palette)
    color/neutral.json     # Grays and neutrals
    color/semantic.json    # Status colors (success, error, warning)
    typography.json        # Font families, sizes, weights, line heights
    spacing.json           # Spacing scale (0-96)
    border.json            # Border radii and widths
    shadow.json            # Elevation/shadow levels
    motion.json            # Duration and easing
    opacity.json           # Opacity levels
    z-index.json           # Z-index layers
  themes/
    light.json             # Light theme semantic overrides
    dark.json              # Dark theme semantic overrides
    high-contrast.json     # Accessibility theme overrides
  components/
    button.json            # Button component tokens
    card.json              # Card component tokens
    input.json             # Input component tokens
    modal.json             # Modal component tokens
```

### Example Token File

```json
// tokens/globals/color/core.json
{
  "color": {
    "brand": {
      "primary": { "value": "#6366f1", "type": "color" },
      "secondary": { "value": "#818cf8", "type": "color" },
      "tertiary": { "value": "#a5b4fc", "type": "color" }
    },
    "accent": {
      "primary": { "value": "#f59e0b", "type": "color" },
      "secondary": { "value": "#fbbf24", "type": "color" }
    }
  }
}
```

## Theme Architecture

### Light Theme

```json
// tokens/themes/light.json
{
  "color": {
    "bg": {
      "primary": { "value": "#ffffff", "type": "color" },
      "secondary": { "value": "#f9fafb", "type": "color" },
      "tertiary": { "value": "#f3f4f6", "type": "color" }
    },
    "text": {
      "primary": { "value": "#111827", "type": "color" },
      "secondary": { "value": "#6b7280", "type": "color" }
    },
    "border": {
      "default": { "value": "#e5e7eb", "type": "color" }
    }
  }
}
```

### Dark Theme

```json
// tokens/themes/dark.json
{
  "color": {
    "bg": {
      "primary": { "value": "#111827", "type": "color" },
      "secondary": { "value": "#1f2937", "type": "color" },
      "tertiary": { "value": "#374151", "type": "color" }
    },
    "text": {
      "primary": { "value": "#f9fafb", "type": "color" },
      "secondary": { "value": "#9ca3af", "type": "color" }
    },
    "border": {
      "default": { "value": "#374151", "type": "color" }
    }
  }
}
```

## Spacing Scale Architecture

### Base Unit

A spacing scale should be based on a base unit, typically 4px or 8px. The 4px base is more flexible and is the industry standard (Material Design, Tailwind, IBM Carbon).

```
Base unit: 4px (0.25rem)

Scale progression: geometric (approximately)
0:   0px
0.5: 2px   (0.125rem)
1:   4px   (0.25rem)   Base unit
2:   8px   (0.5rem)
3:   12px  (0.75rem)
4:   16px  (1rem)
5:   20px  (1.25rem)
6:   24px  (1.5rem)
8:   32px  (2rem)
10:  40px  (2.5rem)
12:  48px  (3rem)
16:  64px  (4rem)
20:  80px  (5rem)
24:  96px  (6rem)
```

### When to Use Which Step

| Token | Spacing | Use Case |
|-------|---------|----------|
| spacing-0.5 | 2px | Dense table borders, compact UI |
| spacing-1 | 4px | Input padding, icon margins |
| spacing-2 | 8px | Button padding, chip spacing |
| spacing-3 | 12px | Card padding (compact), form field gaps |
| spacing-4 | 16px | Default padding, section spacing |
| spacing-6 | 24px | Card padding (comfortable), modal padding |
| spacing-8 | 32px | Section margins, page padding |
| spacing-12 | 48px | Hero section padding, major sections |
| spacing-16 | 64px | Page gutters on desktop |
| spacing-24 | 96px | Massive page padding |

## Typography Scale

### Type Ramp

A type ramp creates rhythmic hierarchy through geometric progression. The most common ratio is 1.25 (Major Third) for web.

```json
{
  "font": {
    "size": {
      "xs":     { "value": "0.75rem",   "lineHeight": "1rem" },
      "sm":     { "value": "0.875rem",  "lineHeight": "1.25rem" },
      "base":   { "value": "1rem",      "lineHeight": "1.5rem" },
      "lg":     { "value": "1.125rem",  "lineHeight": "1.75rem" },
      "xl":     { "value": "1.25rem",   "lineHeight": "1.75rem" },
      "2xl":    { "value": "1.5rem",    "lineHeight": "2rem" },
      "3xl":    { "value": "1.875rem",  "lineHeight": "2.25rem" },
      "4xl":    { "value": "2.25rem",   "lineHeight": "2.5rem" },
      "5xl":    { "value": "3rem",      "lineHeight": "1" },
      "6xl":    { "value": "3.75rem",   "lineHeight": "1" },
      "7xl":    { "value": "4.5rem",    "lineHeight": "1" },
      "8xl":    { "value": "6rem",      "lineHeight": "1" },
      "9xl":    { "value": "8rem",      "lineHeight": "1" }
    },
    "weight": {
      "normal":   { "value": "400" },
      "medium":   { "value": "500" },
      "semibold": { "value": "600" },
      "bold":     { "value": "700" }
    },
    "family": {
      "sans": { "value": ["Inter", "system-ui", "-apple-system", "sans-serif"] },
      "serif": { "value": ["Merriweather", "Georgia", "serif"] },
      "mono": { "value": ["JetBrains Mono", "Fira Code", "monospace"] }
    }
  }
}
```

### Semantic Type Assignments

| Token | Font Size | Weight | Usage |
|-------|-----------|--------|-------|
| text-display-1 | 4xl+ | Bold | Hero headings, landing pages |
| text-heading-1 | 3xl | Bold | Page title (h1) |
| text-heading-2 | 2xl | Semibold | Section heading (h2) |
| text-heading-3 | xl | Semibold | Subsection heading (h3) |
| text-heading-4 | lg | Medium | Card title (h4) |
| text-body-lg | lg | Normal | Large body text |
| text-body | base | Normal | Default body text |
| text-body-sm | sm | Normal | Small body text |
| text-caption | xs | Normal | Captions, timestamps |
| text-label | sm | Medium | Form labels |
| text-overline | xs | Semibold | Overline, uppercase |

## Elevation / Shadow System

```json
{
  "elevation": {
    "shadow": {
      "none": { "value": "none", "type": "shadow" },
      "sm": {
        "value": "0 1px 2px 0 rgba(0,0,0,0.05)",
        "type": "shadow"
      },
      "base": {
        "value": "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)",
        "type": "shadow"
      },
      "md": {
        "value": "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
        "type": "shadow"
      },
      "lg": {
        "value": "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
        "type": "shadow"
      },
      "xl": {
        "value": "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
        "type": "shadow"
      },
      "2xl": {
        "value": "0 25px 50px -12px rgba(0,0,0,0.25)",
        "type": "shadow"
      },
      "inner": {
        "value": "inset 0 2px 4px 0 rgba(0,0,0,0.05)",
        "type": "shadow"
      }
    }
  }
}
```

### Semantic Shadow Assignments

| Token | Shadow Value | Usage |
|-------|-------------|-------|
| shadow-button | sm | Button default state |
| shadow-button-hover | base | Button hover state |
| shadow-card | base | Card component |
| shadow-card-hover | md | Card hover state |
| shadow-dropdown | lg | Dropdown menu |
| shadow-modal | xl | Modal/Dialog |
| shadow-tooltip | md | Tooltip |
| shadow-toast | lg | Toast notification |

## Motion / Animation Tokens

```json
{
  "motion": {
    "duration": {
      "instant": { "value": "0ms", "type": "duration" },
      "fast":    { "value": "100ms", "type": "duration" },
      "normal":  { "value": "200ms", "type": "duration" },
      "slow":    { "value": "300ms", "type": "duration" },
      "slower":  { "value": "500ms", "type": "duration" }
    },
    "easing": {
      "linear":     { "value": "linear", "type": "cubicBezier" },
      "in":         { "value": "cubic-bezier(0.4, 0, 1, 1)", "type": "cubicBezier" },
      "out":        { "value": "cubic-bezier(0, 0, 0.2, 1)", "type": "cubicBezier" },
      "in-out":     { "value": "cubic-bezier(0.4, 0, 0.2, 1)", "type": "cubicBezier" },
      "bounce":     { "value": "cubic-bezier(0.34, 1.56, 0.64, 1)", "type": "cubicBezier" },
      "spring-gentle": { "value": "cubic-bezier(0.22, 1, 0.36, 1)", "type": "cubicBezier" }
    }
  }
}
```

## Token Audit Checklist

- [ ] Every color, spacing, and typography value in the design system is tokenized
- [ ] No hardcoded values exist in component CSS
- [ ] Primitive tokens cover the full design palette
- [ ] Semantic tokens cover all component use cases
- [ ] Component tokens exist for every reusable component
- [ ] Token naming convention is consistent and documented
- [ ] Dark theme overrides are complete (no missing semantic tokens)
- [ ] Style Dictionary build produces all required outputs (CSS, JS, TypeScript)
- [ ] Token documentation is available in Storybook or similar tool
- [ ] Token values match the design specification (verifiable via visual regression)
