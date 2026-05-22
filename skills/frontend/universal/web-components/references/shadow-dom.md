# Shadow DOM Reference

## Encapsulation

### Shadow DOM Modes
```javascript
// Open — accessible via element.shadowRoot (preferred)
const shadow = this.attachShadow({ mode: 'open' })
console.log(this.shadowRoot) // Returns shadow root

// Closed — not externally accessible
this.attachShadow({ mode: 'closed' })
console.log(this.shadowRoot) // null
```

### What Shadow DOM Encapsulates
- **DOM**: `<style>` and selectors are scoped to the shadow tree.
- **CSS**: External styles don't leak in; internal styles don't leak out.
- **Events**: Events retarget to the host element (except composed events).

### createRenderRoot Patterns
```javascript
// Light DOM rendering (no encapsulation)
class LightElement extends HTMLElement {
  constructor() {
    super()
    // No attachShadow — element renders in light DOM
    // Suitable for form elements, inline components
  }
}

// Open shadow DOM (encapsulation)
class ShadowElement extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }
}
```

## Slots

### Named Slots
```html
<template id="card-template">
  <style>
    :host { display: block; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
    .header { padding: 12px 16px; background: #f5f5f5; font-weight: 600; }
    .body { padding: 16px; }
    .footer { padding: 12px 16px; border-top: 1px solid #eee; }
    ::slotted(img) { width: 100%; height: 200px; object-fit: cover; }
  </style>
  <div class="header"><slot name="title">Default Title</slot></div>
  <div class="body"><slot></slot></div>
  <div class="footer"><slot name="actions"></slot></div>
</template>
```

Usage:
```html
<my-card>
  <span slot="title">Product Card</span>
  <p>Product description goes here.</p>
  <div slot="actions">
    <button>Buy Now</button>
    <button>Add to Cart</button>
  </div>
</my-card>
```

### slotchange Event
```javascript
connectedCallback() {
  const slot = this.shadowRoot.querySelector('slot[name="items"]')
  slot.addEventListener('slotchange', (e) => {
    const assigned = slot.assignedElements()
    // React to dynamic slot content changes
    this._updateCount(assigned.length)
  })
}
```

### Fallback Content
```html
<slot name="empty-message">
  <p class="empty">No items to display.</p>
</slot>
```
Fallback renders when no element is assigned to the slot.

### Slot Methods
```javascript
const slot = element.shadowRoot.querySelector('slot')

// Returns all assigned nodes (including text)
const nodes = slot.assignedNodes()

// Returns only assigned elements
const elements = slot.assignedElements()

// With flatten: true — includes fallback content
const flatNodes = slot.assignedNodes({ flatten: true })
```

## CSS Parts

### Exposing Parts for Styling
```html
<template id="button-template">
  <style>
    :host { display: inline-block; }
    .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
    .btn--primary { background: blue; color: white; }
    .btn--secondary { background: gray; color: white; }
  </style>
  <button class="btn btn--${this.variant || 'primary'}" part="button">
    <slot></slot>
  </button>
  <span part="badge" class="badge"><slot name="badge"></slot></span>
</template>
```

### Styling from Outside
```css
/* Consumer stylesheet */
my-button::part(button) {
  font-size: 1.2em;
  text-transform: uppercase;
}

my-button::part(button):hover {
  opacity: 0.8;
}

my-button::part(badge) {
  background: red;
  color: white;
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 10px;
}
```

### Part Best Practices
- Export meaningful part names (`button`, `input`, `label`, `icon`, `badge`).
- Don't rely on parts for critical layout — they're a customization API.
- Document available parts in component README or custom elements manifest.

## Theming

### CSS Custom Properties
```html
<template id="themed-card">
  <style>
    :host {
      --card-bg: var(--surface, white);
      --card-border: var(--border, #ddd);
      --card-radius: var(--radius, 8px);
      display: block;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--card-radius);
      padding: var(--spacing, 16px);
    }
    h2 { color: var(--heading-color, inherit); font-size: var(--heading-size, 1.2em); }
    p { color: var(--text-color, inherit); font-size: var(--text-size, 0.9em); }
  </style>
  <slot name="title"></slot>
  <slot></slot>
</template>
```

### Theme Application
```css
/* Global theme */
:root {
  --surface: #f8f9fa;
  --border: #dee2e6;
  --radius: 12px;
  --heading-color: #1a1a2e;
  --text-color: #495057;
  --spacing: 24px;
}

/* Dark theme */
.dark-theme {
  --surface: #1a1a2e;
  --border: #2d2d44;
  --heading-color: #e8e8e8;
  --text-color: #adb5bd;
}
```

### Theme Inheritance
CSS custom properties inherit through shadow DOM boundaries naturally — they're not blocked by encapsulation. This is the official theming mechanism for web components.

## Cross-Framework Compatibility

### React
```jsx
function WebComponentWrapper({ tag, properties, events, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    // Set complex properties (not attributes)
    Object.entries(properties ?? {}).forEach(([key, val]) => {
      el[key] = val
    })
    // Add event listeners
    Object.entries(events ?? {}).forEach(([event, handler]) => {
      el.addEventListener(event, handler)
    })
    return () => {
      Object.entries(events ?? {}).forEach(([event, handler]) => {
        el.removeEventListener(event, handler)
      })
    }
  })

  return React.createElement(tag, { ref }, children)
}

// Usage
<WebComponentWrapper
  tag="chart-widget"
  properties={{ data: chartData, config: { animate: true } }}
  events={{ 'series-click': handleSeriesClick }}
/>
```

### Vue
```vue
<template>
  <chart-widget
    :ref="el => { if (el) { el.data = chartData; el.config = { animate: true } } }"
    @series-click="handleSeriesClick"
  />
</template>
```

### Angular
```typescript
// app.module.ts
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}

// component usage
@Component({
  template: `<chart-widget #chart></chart-widget>`,
})
export class ChartComponent implements AfterViewInit {
  @ViewChild('chart', { static: true }) chartEl!: ElementRef<HTMLElement>

  ngAfterViewInit() {
    this.chartEl.nativeElement.data = this.chartData
  }
}
```

### Framework Integration Rules
| Concern | Approach |
|---------|----------|
| Complex types (objects, arrays) | Set via property, not attribute |
| Events | Use addEventListener (React) or framework event binding |
| Lifecycle | Framework mount/unmount maps to connected/disconnected |
| Form participation | Works natively with formAssociated elements |
| SSR | Use Declarative Shadow DOM for server-rendered web components |

## Shadow DOM Anti-Patterns
- ❌ **Closed mode**: Breaks tooling (devtools, test runners, accessibility tools). Use open mode.
- ❌ **Inline styles in shadow DOM**: Use `<style>` in template or adoptedStyleSheets.
- ❌ **ID conflicts**: Shadow DOM scopes IDs, but avoid them — CSS classes are safer.
- ❌ **Forgotten `composed: true`**: Events don't cross shadow boundary without `composed: true`.
- ❌ **Global font/box-sizing assumptions**: Shadow DOM inherits inheritable properties (font, color) but not non-inheritable ones (display, margin).
