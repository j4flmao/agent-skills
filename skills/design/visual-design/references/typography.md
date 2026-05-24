# Typography Reference

## Typeface Selection

### Classification
| Category | Examples | Best For |
|----------|----------|----------|
| Serif | Georgia, Merriweather, Playfair Display | Body text, editorial, print-like |
| Sans-Serif | Inter, Roboto, SF Pro | UI, digital-first, readability |
| Monospace | JetBrains Mono, Fira Code | Code, data, technical content |
| Display | Oswald, Bangers, Abril Fatface | Headlines, branding, decorative |
| Handwriting | Caveat, Patrick Hand | Quotes, informal, creative |

### Selection Criteria
- **Legibility**: Distinct letterforms at small sizes (16px body text)
- **x-height**: Taller x-heights improve readability at small sizes
- **Character spacing**: Open counters (a, e, g) aid recognition
- **Language support**: Does it cover the character sets needed?
- **Loading weight**: How much CSS/icon overhead? Variable fonts reduce payload

## Font Pairing

### Pairing Strategies
- **Contrast**: Serif heading + Sans body (or vice versa) — most reliable
- **Similarity**: Same type family (different weights) — safest, always harmonious
- **Superfamily**: Same designer, different classifications (e.g. Roboto + Roboto Slab)

### Proven Pairings
| Heading | Body | Vibe |
|---------|------|------|
| Inter | Inter (different weight) | Clean, modern |
| Playfair Display | Source Sans Pro | Editorial, premium |
| Merriweather | Montserrat | Authoritative, warm |
| Oswald | Open Sans | Bold, contemporary |
| DM Serif Display | DM Sans | Elegant, consistent |

## Responsive Type Scales

### Modular Scale Ratios
| Ratio | Value | Examples |
|-------|-------|----------|
| Minor Second | 1.067 | Subtle, dense content |
| Major Second | 1.125 | Good for dashboards |
| Minor Third | 1.200 | Standard UI |
| Major Third | 1.250 | Common, versatile |
| Perfect Fourth | 1.333 | Editorial, spacious |
| Golden Ratio | 1.618 | Dramatic, large displays |

### Example Scale (Major Third 1.25)
```css
--fs-xs: 0.64rem;    /* 10px */
--fs-sm: 0.8rem;     /* 13px */
--fs-base: 1rem;     /* 16px */
--fs-lg: 1.25rem;    /* 20px */
--fs-xl: 1.563rem;   /* 25px */
--fs-2xl: 1.953rem;  /* 31px */
--fs-3xl: 2.441rem;  /* 39px */
--fs-4xl: 3.052rem;  /* 49px */
--fs-5xl: 3.815rem;  /* 61px */
```

### Fluid Type with Clamp
```css
--fs-fluid-sm: clamp(0.8rem, 0.17vw + 0.76rem, 0.89rem);
--fs-fluid-base: clamp(1rem, 0.34vw + 0.91rem, 1.19rem);
--fs-fluid-lg: clamp(1.25rem, 0.61vw + 1.1rem, 1.58rem);
--fs-fluid-xl: clamp(1.563rem, 1vw + 1.31rem, 2.11rem);
```

## Line Height (Leading)

| Text Size | Recommended Line Height |
|-----------|----------------------|
| Small (<14px) | 1.5 – 1.6 |
| Body (14-18px) | 1.4 – 1.6 |
| Heading (18-36px) | 1.2 – 1.35 |
| Large (>36px) | 1.1 – 1.25 |
| Long-form (article) | 1.6 – 1.8 |

Rule of thumb: multiply font size by line-height to get at least 20px for body text.

## Letter Spacing (Tracking)

| Usage | Letter Spacing |
|-------|---------------|
| Body text | normal (0) |
| Small caps | 0.05em – 0.1em |
| Uppercase heading | 0.02em – 0.08em |
| UI labels | 0.01em – 0.03em |
| Display type | 0 – -0.02em (tighten) |

Avoid negative letter spacing on body text below 16px — it hurts readability.

## Web Font Optimization

### Loading Strategies
```html
<!-- Preconnect to font origin -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Preload key font files -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
```

### CSS Font-Display
```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap; /* FOUT - text shows in fallback, swaps when ready */
  /* Optional: font-display: optional; - no swap if font not loaded in 100ms */
}
```

### Performance Checklist
- Subset fonts to ASCII + Latin + needed characters
- Use WOFF2 format (30% smaller than WOFF)
- Self-host for cache control and reduced DNS lookups
- Font subsetting via glyphhanger or Google Fonts `&text=` parameter
- Subset CJK fonts aggressively (3x-5x size reduction)

## Variable Fonts

### Benefits
- Single file contains multiple weights, widths, and optical sizes
- CSS animation between font axes possible
- Typical 60-80% size reduction vs separate weight files

```css
@font-face {
  font-family: 'InterVariable';
  src: url('/fonts/inter-variable.woff2') format('woff2');
  font-weight: 100 900;
  font-stretch: 75% 100%;
}

.text {
  font-family: 'InterVariable', sans-serif;
  font-weight: 450; /* Arbitrary weight between 400 and 500 */
}
```

### Common Axes
| Axis | Tag | Range | Usage |
|------|-----|-------|-------|
| Weight | wght | 100-900 | Font weight |
| Width | wdth | 75-125 | Condensed to expanded |
| Italic | ital | 0-1 | Upright to italic |
| Slant | slnt | -90-0 | Oblique angle |
| Optical Size | opsz | 6-72 | Optimized for display size |

## Accessibility in Typography

- Minimum 16px body text (browsers default, don't go below 14px)
- Line length: 45-75 characters per line (ideal ~66 chars)
- Contrast ratio: 4.5:1 for small text, 3:1 for large text (≥18px bold or ≥24px)
- Avoid using color alone to convey meaning — use weight or decoration too
- Support user font-size zoom to 200% without clipping
- Use relative units (`rem`) not absolute (`px`) for font sizes
