# Color Contrast Design

## Understanding Color Contrast
Color contrast is the difference in perceived luminance between two adjacent colors. Sufficient contrast is essential for readability, especially for users with low vision, color vision deficiencies, or when viewing screens in bright environments.

## WCAG Contrast Requirements

### Standard Text Contrast
| WCAG Level | Normal Text (< 18px) | Large Text (>= 18px bold or >= 24px) |
|------------|---------------------|---------------------------------------|
| AA (minimum) | 4.5:1 | 3:1 |
| AAA (enhanced) | 7:1 | 4.5:1 |

### Non-Text Contrast
WCAG 2.1 SC 1.4.11 requires a 3:1 contrast ratio for:
- User interface components (buttons, form controls)
- Graphical objects (icons, charts, infographics)
- States (hover, focus, selected, error)

### Contrast Calculation
Contrast ratio = (L1 + 0.05) / (L2 + 0.05)
Where L1 is the relative luminance of the lighter color and L2 is the relative luminance of the darker color.

```javascript
function calculateContrastRatio(hex1, hex2) {
  const luminance = (hex) => {
    const rgb = hex.match(/[A-Fa-f0-9]{2}/g).map(c => parseInt(c, 16) / 255);
    const srgb = rgb.map(c =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  };

  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

function meetsAA(ratio, fontSize, fontWeight) {
  const largeText = fontSize >= 24 || (fontSize >= 18 && fontWeight >= 700);
  return largeText ? ratio >= 3.0 : ratio >= 4.5;
}
```

## Color Contrast Testing Tools

### Programmatic Testing
```javascript
import axe from 'axe-core';

async function testAllElements() {
  const results = await axe.run({
    runOnly: ['color-contrast']
  });

  results.violations.forEach(violation => {
    violation.nodes.forEach(node => {
      const { foreground, background, contrastRatio } = node.any
        .find(c => c.id === 'color-contrast').data;
      console.log(
        `Element: ${node.target}\n` +
        `Foreground: ${foreground}\n` +
        `Background: ${background}\n` +
        `Ratio: ${contrastRatio.toFixed(2)}:1\n`
      );
    });
  });
}
```

### CI/CD Integration
```yaml
name: Color Contrast Audit
on:
  pull_request:
    paths:
      - 'src/**/*.css'
      - 'src/**/*.scss'
      - 'src/**/*.tsx'

jobs:
  contrast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - name: Run accessibility audit
        run: npx axe-core --tags wcag2aa,wcag21aa --dir ./dist
      - name: Parse contrast violations
        run: |
          npx pa11y-ci --json > pa11y-results.json
```

## Color Spaces and Accessibility

### Relative Luminance Formula
```javascript
function calculateRelativeLuminance(hex) {
  const rgb = hex.match(/[A-Fa-f0-9]{2}/g).map(c => parseInt(c, 16) / 255);
  const srgb = rgb.map(c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function isLightColor(hex) {
  return calculateRelativeLuminance(hex) > 0.179;
}
```

### APCA (Accessible Perceptual Contrast Algorithm)
APCA is the proposed replacement for WCAG's simple ratio, accounting for spatial frequency, lightness difference, and context.

```javascript
function apcaContrast(textColor, bgColor) {
  const sRGBtoY = (rgb) => {
    const val = rgb.map(c => {
      c = c / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * val[0] + 0.7152 * val[1] + 0.0722 * val[2];
  };

  const Yt = sRGBtoY(textColor);
  const Yb = sRGBtoY(bgColor);
  const YtAbs = Math.pow(Yt, 0.6);
  const YbAbs = Math.pow(Yb, 0.6);

  if (Yb > Yt) {
    return Math.round((YbAbs - YtAbs) * 1.14 * 100) / 100;
  } else {
    return Math.round((YbAbs - YtAbs) * 1.14 * 100) / 100;
  }
}
```

## Building Accessible Color Palettes

### Algorithmic Palette Generation
```javascript
function generateAccessiblePalette(baseHue, paletteSize = 5) {
  const palette = [];
  for (let i = 0; i < paletteSize; i++) {
    const lightness = 15 + (i * 70) / (paletteSize - 1);
    const saturation = 60 - (i * 20) / (paletteSize - 1);
    palette.push({
      name: `hue-${baseHue}-${Math.round(lightness)}`,
      css: `hsl(${baseHue}, ${saturation}%, ${lightness}%)`
    });
  }
  return palette;
}
```

### Design Tokens with Contrast
```css
:root {
  --brand-primary: #0052CC;
  --brand-primary-text: #FFFFFF;

  --surface-primary: #FFFFFF;
  --surface-primary-text: #1A1A2E;
  --text-primary: #1A1A2E;
  --text-secondary: #5A5A7A;
  --text-disabled: #9E9EB8;

  --success-bg: #E8F5E9;
  --success-text: #1B5E20;
  --error-bg: #FFEBEE;
  --error-text: #B71C1C;
  --warning-bg: #FFF8E1;
  --warning-text: #795548;
}
```

## Color Blindness Simulation

### Types of Color Vision Deficiency
| Type | Prevalence (Male) | Description |
|------|------------------|-------------|
| Deuteranomaly | 6% | Reduced sensitivity to green |
| Protanomaly | 1% | Reduced sensitivity to red |
| Protanopia | 1% | Inability to perceive red |
| Deuteranopia | 1% | Inability to perceive green |
| Tritanomaly | 0.01% | Reduced sensitivity to blue |

### CSS Filter Simulation
```css
.simulate-protanopia {
  filter: url('data:image/svg+xml,\
    <svg xmlns="..."><filter id="p">\
      <feColorMatrix type="matrix" \
        values="0.567,0.433,0,0,0 \
                0.558,0.442,0,0,0 \
                0,0.242,0.758,0,0 \
                0,0,0,1,0"/>\
    </filter></svg>#p');
}
```

## Charts and Data Visualization

### Accessible Chart Colors
```javascript
const accessibleChartPalette = [
  '#2166AC', '#D6604D', '#4DAF4A', '#FF7F00',
  '#984EA3', '#A65628', '#F781BF', '#999999',
];

function validateChartColors(colors) {
  return colors.map(color => ({
    color,
    onWhite: calculateContrastRatio(color, '#FFFFFF'),
    onBlack: calculateContrastRatio(color, '#000000'),
  }));
}
```

## Key Points
- WCAG AA requires 4.5:1 for normal text, 3:1 for large text (minimum)
- Non-text elements (icons, UI components, states) need 3:1 minimum
- APCA is the emerging standard that accounts for spatial frequency and context
- Never rely on color alone to convey information
- Test designs with color blindness simulators for all common deficiency types
- Generate palettes with sufficient contrast between adjacent shades
- Define accessible design tokens with verified contrast ratios
- Automate contrast checking in CI/CD pipelines
- Use texture patterns in charts alongside colors for redundant encoding
- Provide high-contrast mode support for users who need it
