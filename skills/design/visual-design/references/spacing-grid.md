# Spacing and Grid Systems Reference

## The 8px Grid System

### Core Principle
All spacing dimensions are multiples of 8px (4px for micro-spacing). This creates visual rhythm and consistency across breakpoints.

### Spacing Scale
```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px  — micro spacing */
  --space-2: 0.5rem;    /* 8px  — tight, icons */
  --space-3: 0.75rem;   /* 12px — compact */
  --space-4: 1rem;      /* 16px — standard */
  --space-5: 1.25rem;   /* 20px — comfortable */
  --space-6: 1.5rem;    /* 24px — relaxed */
  --space-8: 2rem;      /* 32px — sections */
  --space-10: 2.5rem;   /* 40px — large sections */
  --space-12: 3rem;     /* 48px — page sections */
  --space-16: 4rem;     /* 64px — major sections */
  --space-20: 5rem;     /* 80px — component groups */
  --space-24: 6rem;     /* 96px — page margins */
}
```

### Application Rules
- **Padding**: 8px, 16px, 24px, 32px (step by 8)
- **Margin**: 8px, 16px, 24px, 32px (step by 8)
- **Gap**: 4px, 8px, 12px, 16px, 24px, 32px
- **Icon sizing**: 16px, 24px, 32px, 48px
- **Border radius**: 4px, 8px, 12px, 16px (soft corners follow grid)

### When to Break the Grid
- Typography leading (line-height) may need non-8px values for optical alignment
- Fine-tune padding inside small components (buttons, tags) to the half-grid (4px)
- Custom illustrations and icons may not snap to grid

## Baseline Grid

A baseline grid aligns text baselines across columns for vertical rhythm.

```css
:root {
  --baseline: 0.25rem; /* 4px baseline grid */
}
/* Line heights should be multiples of baseline */
--lh-body: 1.5;    /* 24px at 16px base = 6 baselines */
--lh-heading: 1.25; /* 20px at 16px base = 5 baselines */
```

## Responsive Breakpoints

### Common Breakpoint Systems
```css
/* Standard Bootstrap/MUI breakpoints */
--bp-sm: 640px;   /* Mobile landscape */
--bp-md: 768px;   /* Tablet */
--bp-lg: 1024px;  /* Desktop */
--bp-xl: 1280px;  /* Wide desktop */
--bp-2xl: 1536px; /* Extra wide */

/* Container queries alternative */
.container-sm { container-type: inline-size; container-name: sm; }
```

### Atomic / Step-Based Breakpoints
Rather than device-specific breakpoints, use content-based:
```css
--bp-1: 480px;   /* Single column */
--bp-2: 720px;   /* Two columns */
--bp-3: 960px;   /* Three columns */
--bp-4: 1200px;  /* Four columns */
--bp-5: 1440px;  /* Five columns */
```

## CSS Grid Layout

### Grid Template Patterns
```css
/* Standard 12-column grid */
.page-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: var(--space-6);
}

/* Content + sidebar */
.content-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-8);
}

/* Auto-fill responsive grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-6);
}

/* Named grid areas */
.page-layout {
  display: grid;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
}
```

### Subgrid
```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.card {
  display: grid;
  grid-template-rows: subgrid; /* Align children across cards */
  grid-row: span 3;
}
```

## Flexbox Patterns

```css
/* Centered content */
.centered {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Sticky footer */
.page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}
.main { flex: 1; }

/* Equal-width children */
.equal-row {
  display: flex;
  gap: var(--space-4);
}
.equal-row > * { flex: 1; }

/* Wrapping tag list */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
```

## Container Queries

```css
@container (min-width: 400px) {
  .card { flex-direction: row; }
}
@container (min-width: 600px) {
  .card { grid-template-columns: 1fr 1fr; }
}

/* Setting container */
.widget-area {
  container-type: inline-size;
  container-name: sidebar;
}
```

## Whitespace and Density

| Density | Padding (card) | Gap (stack) | Row Height |
|---------|---------------|-------------|------------|
| Compact | 12px | 4px | 32px |
| Default | 16px | 8px | 40px |
| Comfortable | 24px | 16px | 48px |
| Spacious | 32px | 24px | 56px |

## Vertical Rhythm

```css
.stack > * + * {
  margin-block-start: var(--space-4);
}
.stack-lg > * + * {
  margin-block-start: var(--space-8);
}
.stack-xl > * + * {
  margin-block-start: var(--space-12);
}
```
