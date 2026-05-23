# Color Theory Guide

## Color Harmonies
| Harmony | Description | Use Case |
|---------|-------------|----------|
| Monochromatic | Single hue, varying saturation/lightness | Clean, minimal designs |
| Analogous | Adjacent hues on color wheel | Cohesive, harmonious feel |
| Complementary | Opposite hues on color wheel | High contrast, emphasis |
| Triadic | Three evenly spaced hues | Balanced, vibrant |
| Split-complementary | Base + two adjacent to complement | Contrast with less tension |

## WCAG Contrast Requirements
| Level | Normal Text | Large Text | UI Components |
|-------|-------------|------------|---------------|
| AA | 4.5:1 | 3:1 | 3:1 |
| AAA | 7:1 | 4.5:1 | 3:1 |

## Color Naming Convention
`
--color-primary-50  (lightest)
--color-primary-100
--color-primary-200
--color-primary-300
--color-primary-400
--color-primary-500  (base)
--color-primary-600
--color-primary-700
--color-primary-800
--color-primary-900  (darkest)
`
"@ | Set-Content -Path "D:\j4flmao-org\skills\design\visual-design\references\color-theory.md" -Encoding UTF8

@"
# Typography Guide

## Typeface Categories
| Category | Character | Use Case |
|----------|-----------|----------|
| Serif | Decorative strokes, classic | Headings, editorial |
| Sans-serif | Clean, modern | Body text, UI |
| Monospace | Fixed-width | Code, data |
| Display | Decorative, unique | Branding, titles |
| Handwriting | Organic, personal | Accents, quotes |

## Font Pairing Principles
- Contrast: serif heading + sans-serif body
- Consistency: same family, different weights
- Hierarchy: size + weight distinguish levels
- Readability: body text at 16px minimum

## System Font Stack
`css
font-family: -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    'Helvetica Neue', Arial, sans-serif;
`
"@ | Set-Content -Path "D:\j4flmao-org\skills\design\visual-design\references\typography-guide.md" -Encoding UTF8

@"
# Layout Principles

## Grid Systems
| Grid Type | Description | Best For |
|-----------|-------------|----------|
| Column grid | Vertical divisions | Page layouts |
| Modular grid | Columns + rows | Card layouts, dashboards |
| Baseline grid | Horizontal alignment | Text-heavy layouts |
| Hierarchical | Freestyle, no strict grid | Editorial, creative |

## Visual Hierarchy Techniques
- **Size**: Larger elements draw attention first
- **Color**: Bright/saturated colors stand out
- **Contrast**: High contrast creates focal points
- **Whitespace**: More space around = more importance
- **Proximity**: Related items grouped together
- **Alignment**: Consistent alignment creates order
