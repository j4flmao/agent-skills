# Visual Hierarchy Reference

## Core Principles

Visual hierarchy controls the order in which users perceive information. Every screen has a primary action, secondary content, and supporting details. The goal is to guide attention without conscious effort.

### Factors Affecting Visual Weight

| Factor | High Weight | Low Weight |
|--------|-------------|------------|
| Size | Large | Small |
| Color | High contrast | Low contrast |
| Position | Top-left / center | Bottom / edges |
| Whitespace | More surrounding | Less surrounding |
| Density | Dense texture | Empty / sparse |
| Shape | Irregular | Regular |
| Depth | Shadow, elevation | Flat |

## F-Pattern

Users scan screens in an F-shaped pattern: horizontal across the top, then down the left side, then horizontal again.

```
F F F F F F F F F F F F
F F F F
F F F F
F F F F F F F F F F F
F F F F
```

### Application
- Place key information in the top-left zone
- Put CTAs on the right side of the horizontal scan lines
- Left-align body text (centered text breaks F-pattern scanning)
- Use bold subheadings as rest stops in the left-aligned scan
- Avoid lengthy right-side content that breaks the "stem" of the F

## Z-Pattern

For simpler or more visual layouts (landing pages, hero sections), users scan in a Z: top-left → top-right → bottom-left → bottom-right.

### Application
- Logo in top-left corner (start of Z)
- Primary CTA in top-right (end of first horizontal)
- Image/visual in center diagonal
- Secondary CTA in bottom-right (end of Z)

## Focal Points

### Creating Focal Points
- **Scale**: Make the primary element larger than surrounding elements
- **Color**: Use brand/highlight color for the focal element
- **Whitespace**: Isolate the focal element with generous spacing
- **Typography**: Different weight, style, or font family
- **Visual embellishment**: Icon, illustration, or image as anchor
- **Motion**: Animation draws the eye (use sparingly)

### Limit Focal Points
- One primary focal point per viewport
- Maximum 2-3 secondary focal points
- Everything else should recede into supporting content

## Proximity

Elements placed close together are perceived as related.

```css
/* Good: related fields grouped */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px; /* Tight: label + input are related */
}
.field-group + .field-group {
  margin-top: 24px; /* Loose: separate fields */
}
```

### Proximity Rules
- Related controls: 4-8px gap
- Related sections: 16-24px gap
- Unrelated sections: 32-48px gap
- Page sections: 64-96px gap

## Similarity

Elements that look similar (color, shape, size) are perceived as related.

### Applications
- All links: same color with underline
- All buttons: consistent shape, size, and color per type
- All cards: same aspect ratio and border style
- All headings: same font family, varying size

### Similarity Dimensions
- **Color**: Same hue = same type
- **Shape**: Same icon style = same function
- **Size**: Same size = same importance
- **Texture**: Same pattern = same category
- **Orientation**: Same direction = same group

## Enclosure

Elements enclosed by a border, background, or whitespace are perceived as a group.

```css
/* Card enclosure */
.card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  background: var(--surface);
}

/* Minimalist enclosure */
.card-group {
  display: flex;
  gap: 1px; /* Creates implicit enclosure through proximity + separator */
}
```

### Enclosure Types
| Type | Strength | When to Use |
|------|----------|-------------|
| Border + background | Strong | Cards, modals, dialogs |
| Background only (no border) | Medium | Sections, navigation |
| Border only | Medium | Side panels, containers |
| Whitespace gap | Subtle | Related content sections |
| Divider line | Weakest | List items, table rows |

## Gestalt Principles

| Principle | Definition | Design Application |
|-----------|------------|-------------------|
| Similarity | Similar items appear grouped | Consistent styling for same-type elements |
| Proximity | Close items appear grouped | Spacing to define relationships |
| Closure | Mind completes incomplete shapes | Icon design, loading spinners |
| Continuity | Smooth lines are seen as paths | Visual flow, breadcrumbs, carousels |
| Figure-Ground | Distinguish foreground from background | Cards, modals, shadows |
| Common Fate | Moving items are grouped | Animated transitions, scroll effects |
| Symmetry | Symmetrical elements feel ordered | Layout balance, form alignment |
| Prägnanz | Simple shapes are preferred | Clean iconography, minimal UI |

## Applying Hierarchy in Practice

### Form Hierarchy
```
[Title]           ← Large, bold (primary focal point)
[Description]     ← Smaller, grayed (secondary)
[Field Group 1]
  [Label]         ← 14px semibold
  [Input]         ← 16px regular
  [Error]         ← 12px red (conditional attention)
[Field Group 2]
  ...
[Submit Button]   ← High contrast, prominent (primary action)
[Cancel Link]     ← Lower contrast, less prominent (secondary action)
```

### Page Hierarchy
```
1. Page title (largest, boldest)
2. Hero/banner image (visual anchor)
3. Section headings (h2)
4. Sub-section headings (h3)
5. Body text (lowest visual weight)
6. Captions, footnotes, meta (smallest)
```

### Card Hierarchy
```css
.card {
  position: relative;
}
.card-image { height: 200px; }              /* Visual anchor — highest weight */
.card-title { font-size: 1.25rem; }         /* Second level */
.card-description { color: var(--text-secondary); font-size: 0.875rem; }
.card-meta { color: var(--text-tertiary); font-size: 0.75rem; } /* Lowest */
```

## Testing Hierarchy

- **5-second test**: Show the design for 5 seconds, ask what the user remembers
- **First-click test**: Where would you click to perform X action?
- **Heat maps**: Eye-tracking or click maps validate hierarchy assumptions
- **Blur test**: Blur the screen — only the highest hierarchy elements should remain legible
