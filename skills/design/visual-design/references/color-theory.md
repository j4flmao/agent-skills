# Color Theory Reference

## The Color Wheel

### Primary Colors
- Red, Yellow, Blue (subtractive / RYB model — traditional art)
- Red, Green, Blue (additive / RGB model — digital screens)
- Cyan, Magenta, Yellow, Key (CMYK — print)

### Secondary Colors
- RYB: Orange (R+Y), Green (Y+B), Purple (B+R)
- RGB: Yellow (R+G), Cyan (G+B), Magenta (R+B)

### Tertiary Colors
RYB: Yellow-Orange, Red-Orange, Red-Purple, Blue-Purple, Blue-Green, Yellow-Green

## Color Harmony Schemes

| Scheme | Description | Best For |
|--------|-------------|----------|
| Monochromatic | Single hue, varying saturation/lightness | Clean, minimal, branded |
| Analogous | 2-4 adjacent hues on wheel | Harmonious, serene |
| Complementary | Opposite on wheel | High contrast, emphasis |
| Split-Complementary | Base + two adjacent to complement | Contrast with nuance |
| Triadic | 120° apart on wheel | Vibrant, balanced |
| Tetradic (Double-Complementary) | Two complementary pairs | Rich, complex |
| Square | 90° apart on wheel | Bold, dynamic |

```css
/* Example: Triadic scheme */
:root {
  --hue-primary: 210;   /* Blue */
  --hue-secondary: 330; /* Red-violet */
  --hue-accent: 90;     /* Green-yellow */
}
```

## Contrast and Accessibility (WCAG)

### WCAG 2.2 Contrast Ratios
| Level | Normal Text (<18px) | Large Text (≥18px bold / ≥24px) | UI Components |
|-------|---------------------|-------------------------------|---------------|
| AA | 4.5:1 | 3:1 | 3:1 |
| AAA | 7:1 | 4.5:1 | 3:1 |

### Calculation
```
Contrast Ratio = (L1 + 0.05) / (L2 + 0.05)
L = 0.2126 * R + 0.7152 * G + 0.0722 * B
```
Where R, G, B are sRGB values linearized.

### Testing Tools
- WebAIM Contrast Checker
- axe DevTools (automated in CI)
- Chrome DevTools color picker (built-in ratio display)
- Stark plugin (Figma/Sketch)
- Colour Contrast Analyser (desktop app)

### Common Failures
- Gray text on white (#999 on #fff = 2.8:1 — fails AA)
- Links distinguished only by color (must have underline or icon)
- Placeholder text too light (#ccc on #fff = 1.6:1 — fails everything)

## Color Psychology

| Color | Associations | Common UI Uses |
|-------|-------------|----------------|
| Blue | Trust, stability, professionalism | Finance, healthcare, enterprise |
| Green | Growth, nature, safety, money | Environmental, fintech, success states |
| Red | Urgency, passion, danger, energy | Errors, sales, food, entertainment |
| Yellow | Optimism, warmth, caution | Warnings, children, hospitality |
| Orange | Creativity, enthusiasm, confidence | CTA buttons, call-to-action, fitness |
| Purple | Luxury, creativity, wisdom | Beauty, spirituality, premium |
| Black | Power, elegance, sophistication | Luxury, fashion, high-end |
| White | Purity, clarity, simplicity | Healthcare, minimal design |

## Brand Palette Construction

### Palette Structure
```yaml
brand_palette:
  primary:
    - 50: "#E3F2FD"  # Lightest — backgrounds
    - 500: "#2196F3" # Base brand color
    - 900: "#0D47A1" # Darkest — text on light
  secondary:
    - 500: "#FF9800" # Supporting brand
  neutral:
    - 50: "#FAFAFA"  # Page background
    - 100: "#F5F5F5" # Card background
    - 300: "#E0E0E0" # Borders
    - 500: "#9E9E9E" # Disabled text
    - 700: "#616161" # Secondary text
    - 900: "#212121" # Primary text
  semantic:
    success: "#4CAF50"
    warning: "#FF9800"
    error: "#F44336"
    info: "#2196F3"
```

### Tint and Shade Generation
```css
/* Using CSS color-mix for tonal palettes */
--primary-100: color-mix(in srgb, var(--primary-500), white 80%);
--primary-200: color-mix(in srgb, var(--primary-500), white 60%);
--primary-300: color-mix(in srgb, var(--primary-500), white 40%);
--primary-700: color-mix(in srgb, var(--primary-500), black 30%);
--primary-900: color-mix(in srgb, var(--primary-500), black 60%);
```

## Dark Mode Design

### Strategy
1. **Invert luminance, not hue**: Light grays become dark grays; preserve brand accent colors
2. **Reduce saturation**: Highly saturated colors on dark backgrounds cause eye strain — desaturate 20-40%
3. **Depth through elevation**: Darker surfaces recede, lighter surfaces come forward

### Dark Mode Palette Transformation
```css
:root[data-theme="dark"] {
  --bg-primary: #121212;
  --bg-secondary: #1E1E1E;
  --bg-elevated: #2D2D2D;
  --text-primary: #E4E4E7;
  --text-secondary: #A1A1AA;
  --border: rgba(255, 255, 255, 0.1);
  --shadow: rgba(0, 0, 0, 0.3);
  --primary-500: #64B5F6; /* Lightened accent for dark bg */
}
```

### Dark Mode Pitfalls
- Pure black (#000) backgrounds cause halation / eye strain — prefer dark gray (#121212)
- Shadows are invisible on dark backgrounds — use lighter "shadow" colors instead
- Long-form text: increase line-height to 1.6+ and reduce font-weight by one step
- Color contrast changes in dark mode — re-verify WCAG ratios
- Images with transparent backgrounds need white/gray fills in dark mode

## Semantic Color Usage

```css
:root {
  --success-bg: #E8F5E9;
  --success-text: #2E7D32;
  --success-border: #A5D6A7;
  --warning-bg: #FFF3E0;
  --warning-text: #E65100;
  --warning-border: #FFCC80;
  --error-bg: #FFEBEE;
  --error-text: #C62828;
  --error-border: #EF9A9A;
  --info-bg: #E3F2FD;
  --info-text: #1565C0;
  --info-border: #90CAF9;
}
```

## Color and Cultural Considerations

- **Western**: White = purity, Black = mourning
- **Eastern (India/China)**: Red = luck/prosperity, White = mourning
- **Middle East**: Green = sacred/Islam, Blue = protection
- **Japan**: White = mourning, Red = life/energy
- Consider the primary market when selecting brand and semantic colors
