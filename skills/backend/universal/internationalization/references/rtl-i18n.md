# RTL and Complex Scripts Reference

## RTL Languages Support

### Languages Requiring RTL Layout
| Language | Script | Locale | Speakers |
|----------|--------|--------|----------|
| Arabic | Arabic | ar-SA, ar-EG, ar-AE | 420M |
| Hebrew | Hebrew | he-IL | 9M |
| Persian / Farsi | Persian | fa-IR | 110M |
| Urdu | Persian | ur-PK, ur-IN | 230M |
| Pashto | Arabic | ps-AF | 50M |
| Kurdish (Sorani) | Arabic | ku-IQ | 10M |
| Sindhi | Arabic | sd-PK | 30M |
| Yiddish | Hebrew | yi | 1.5M |

### HTML Setup
```html
<!-- Per-page override -->
<html dir="rtl" lang="ar">

<!-- Per-element override (for mixed content) -->
<p dir="rtl" lang="he">עברית טקסט</p>
<p>Normal English text <bdi dir="rtl">עברית</bdi> inline.</p>
```

## Bidirectional Text (BiDi)

The Unicode Bidirectional Algorithm (UBA) handles mixing LTR and RTL text in the same document.

```html
<!-- bdi isolates embedded text direction -->
<ul>
  <li>User <bdi>Ahmed</bdi>: 5 comments</li>
  <li>User <bdi>John</bdi>: 3 comments</li>
  <li>User <bdi>محمد</bdi>: 8 comments</li>
</ul>
```

### Unicode Control Characters

| Character | Code | Purpose |
|-----------|------|---------|
| LRM | U+200E | Marks LTR text in RTL context |
| RLM | U+200F | Marks RTL text in LTR context |
| LRE | U+202A | Start LTR embedding |
| RLE | U+202B | Start RTL embedding |
| PDF | U+202C | Pop directional formatting |
| LRI | U+2066 | Start LTR isolate (preferred) |
| RLI | U+2067 | Start RTL isolate (preferred) |
| PDI | U+2069 | Pop directional isolate |

### Resolving Mixed Direction

```html
<!-- Phone number in RTL text: direction should stay LTR -->
<p dir="rtl">اتصل بنا على <bdo dir="ltr">+1-555-123-4567</bdo></p>

<!-- Product name with English in Arabic text -->
<p dir="rtl">قم بشراء <bdi>iPhone 15</bdi> الآن</p>
```

## CSS Logical Properties

Instead of physical properties (left/right), use logical properties that adapt to direction.

```css
/* Physical (avoid) */
.element {
  margin-left: 16px;
  padding-right: 8px;
  border-left: 2px solid blue;
  text-align: left;
}

/* Logical (preferred) */
.element {
  margin-inline-start: 16px;   /* left in LTR, right in RTL */
  padding-inline-end: 8px;     /* right in LTR, left in RTL */
  border-inline-start: 2px solid blue;
  text-align: start;           /* left in LTR, right in RTL */
}
```

### Common Logical Property Mappings

| Physical | Logical (inline-axis) |
|----------|----------------------|
| left | inline-start |
| right | inline-end |
| margin-left | margin-inline-start |
| margin-right | margin-inline-end |
| padding-left | padding-inline-start |
| padding-right | padding-inline-end |
| border-left | border-inline-start |
| border-right | border-inline-end |
| text-align: left | text-align: start |
| text-align: right | text-align: end |
| float: left | float: inline-start |
| float: right | float: inline-end |

```css
/* Full example: sidebar layout */
.layout {
  display: flex;
}
.sidebar {
  order: 0; /* First in LTR, last in RTL */
  border-inline-end: 1px solid var(--border);
  padding-inline-end: 16px;
}
.main {
  order: 1;
  padding-inline-start: 16px;
}

/* Direction-aware grid */
.grid {
  display: grid;
  grid-template-columns: 1fr 3fr;
  /* Automatically flips in RTL */
}
```

## Mirroring UI Elements

### Elements that Need Mirroring
| Element | Physical | Mirrored (RTL) |
|---------|----------|----------------|
| Arrow right → | → | ← |
| Back button ← | ← | → |
| Chevron > | > | < |
| Progress bar fill | Left to right fill | Right to left fill |
| Timeline | Left to right | Right to left |
| Checkbox | Left of label | Right of label |
| Action icons | Right of item | Left of item |

### CSS Logical for Icons
```css
/* Icon should flip in RTL if it implies direction */
.icon-arrow {
  transform: scaleX(1);
}
[dir="rtl"] .icon-arrow {
  transform: scaleX(-1);
}

/* Non-directional icons should NOT flip */
.icon-settings, .icon-user {
  transform: none !important;
}
```

## Number and Date Formatting per Locale

```typescript
// Use Intl API for all locale-aware formatting
const locale = 'ar-SA';
const numberFormat = new Intl.NumberFormat(locale, {
  style: 'decimal',
  useGrouping: true
  // Arabic: ١٬٢٣٤٫٥٦
});
console.log(numberFormat.format(1234.56));

// Currency
const currencyFormat = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: 'SAR'
});
// Arabic: ١٬٢٣٤٫٥٦ ر.س.

// Dates
const dateFormat = new Intl.DateTimeFormat(locale, {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
// Arabic: ١٥ يناير ٢٠٢٥

// Relative time
const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
rtf.format(-1, 'day'); // أمس (yesterday)
```

## RTL Testing Checklist

- [ ] Page renders with `dir="rtl"` and correct `lang` attribute
- [ ] Text alignment is correct (start vs end, not left vs right)
- [ ] All CSS uses logical properties (no hardcoded left/right)
- [ ] Icons with directional meaning are mirrored (arrows, chevrons)
- [ ] Forms: labels on right, inputs on left of labels
- [ ] Navigation: sidebar on right, main content on left
- [ ] Mixed LTR/RTL content renders correctly (phone numbers, emails)
- [ ] Numbers show in correct script (Arabic-Indic, not Western)
- [ ] Date/time/currency formatted per locale
- [ ] Overflow and text truncation doesn't break layout
- [ ] Responsive design works in RTL at all breakpoints
