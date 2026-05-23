# RTL Support

## Direction Detection

```typescript
const RTL_LOCALES = new Set(['ar', 'arc', 'ckb', 'dv', 'fa', 'ha', 'he', 'khw', 'ks', 'ku', 'ps', 'sd', 'ug', 'ur', 'yi'])

function getDirection(locale: string): 'ltr' | 'rtl' {
  const lang = locale.split('-')[0]
  return RTL_LOCALES.has(lang) ? 'rtl' : 'ltr'
}

// Apply to document
document.documentElement.dir = getDirection(locale)
document.documentElement.lang = locale
```

## CSS Logical Properties

### Property Mapping
| Physical (avoid) | Logical (use) |
|-----------------|---------------|
| left | inline-start |
| right | inline-end |
| top | block-start |
| bottom | block-end |
| margin-left | margin-inline-start |
| margin-right | margin-inline-end |
| padding-left | padding-inline-start |
| padding-right | padding-inline-end |
| border-left | border-inline-start |
| border-right | border-inline-end |
| text-align: left | text-align: start |
| text-align: right | text-align: end |

### Example
```css
/* BAD — breaks in RTL */
.card {
  margin-left: 16px;
  padding-right: 8px;
  border-left: 2px solid blue;
  text-align: left;
}

/* GOOD — works in both LTR and RTL */
.card {
  margin-inline-start: 16px;
  padding-inline-end: 8px;
  border-inline-start: 2px solid blue;
  text-align: start;
}
```

### RTL Override (when logical properties don't cover it)
```css
.card {
  background: url('arrow-right.svg') no-repeat left center;

  [dir="rtl"] & {
    background-image: url('arrow-left.svg');
    background-position: right center;
  }
}
```

## Icons & SVG in RTL

Mirror icons that imply direction (arrows, chevrons, carets, back/forward):

```css
.icon-arrow-right {
  [dir="rtl"] & {
    transform: scaleX(-1);
  }
}
```

Animated icons: mirror the animation direction as well using the same `scaleX(-1)`.

## RTL Testing

### Cypress RTL Test
```typescript
describe('RTL layout', () => {
  beforeEach(() => {
    cy.visit('/', { onBeforeLoad(win) {
      cy.stub(win, 'navigator').value({ language: 'ar' })
    }})
  })

  it('renders with correct dir attribute', () => {
    cy.get('html').should('have.attr', 'dir', 'rtl')
  })

  it('aligns text to start in RTL', () => {
    cy.get('.card-title').should('have.css', 'text-align', 'start') // left in LTR, right in RTL
  })

  it('reverses arrow icon direction', () => {
    cy.get('.back-arrow').should('have.css', 'transform', 'matrix(-1, 0, 0, 1, 0, 0)')
  })
})
```

### Storybook RTL Mode
```typescript
// .storybook/preview.ts
import { withRTL } from 'storybook-addon-rtl'

export const decorators = [withRTL]
export const globalTypes = {
  direction: {
    name: 'Direction',
    defaultValue: 'ltr',
    toolbar: { items: ['ltr', 'rtl'] },
  },
}
```

## RTL-Aware Component Patterns

### Form Fields
```typescript
// Input icon positioning
<Input
  startAdornment={<SearchIcon />} // renders inline-start — left in LTR, right in RTL
  endAdornment={<ClearIcon />}    // renders inline-end — right in LTR, left in RTL
/>
```

### Navigation
```typescript
// Drawer slides from inline-start
// In LTR: drawer slides from left
// In RTL: drawer slides from right
const Drawer = styled.div`
  position: fixed;
  inset-inline-start: 0;
  inset-block-start: 0;
  height: 100%;
  width: 280px;
  transform: translateX(${({ open }) => (open ? '0' : '-100%')});

  [dir="rtl"] & {
    transform: translateX(${({ open }) => (open ? '0' : '100%')});
  }
`
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Third-party UI library ignores dir | Wrap in `[dir="rtl"] { /* overrides */ }` |
| CSS-in-JS doesn't support logical properties | Add postcss-logical or use inline-start utility classes |
| Canvas/SVG absolute coordinates | Calculate positions from inline-start edge |
| Scrollbar on wrong side | Use `overflow-inline: auto` instead of `overflow-x: auto` |
| Text overflow direction | Use `text-overflow: ellipsis` with `direction: inherit` |
| Popover/tooltip positioning | Use `inset-inline-start` / `inset-inline-end` for positioning |
| Right-aligned input type="number" | Use `text-align: end` on number inputs |
| Mixing LTR and RTL text in same element | Apply `dir` attribute on the inner span: `<span dir="ltr">{englishVariable}</span>` |

## CSS-in-JS RTL Plugins

- **styled-components**: `StyleSheetManager` with stylis RTL plugin
- **Emotion**: RTL plugin via stylis
- **Tailwind CSS**: `rtl:` variant prefix (`rtl:ml-0 rtl:mr-4`)
- **PostCSS**: `postcss-logical` for automatic logical property conversion

## Testing Checklist

- [ ] `dir` attribute on `<html>` matches locale
- [ ] Text-alignment uses `start`/`end` not `left`/`right`
- [ ] Margin/padding/border use inline-start/end
- [ ] Directional icons are mirrored
- [ ] Navigation drawer slides from correct side
- [ ] Form inputs show adornments on correct side
- [ ] Popovers/tooltips open toward inline-end
- [ ] Scroll overflow direction matches writing direction
- [ ] Third-party components render correctly (check modals, datepickers, dropdowns)
- [ ] Responsive layout maintains RTL at all breakpoints
