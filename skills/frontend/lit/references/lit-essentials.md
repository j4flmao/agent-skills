# Lit Essentials

## Component Design

### Base Classes
| Class | When to Use |
|-------|-------------|
| `LitElement` | Most components — full feature set with reactive properties, shadow DOM, and rendering |
| `ReactiveElement` | Minimal footprint — no template rendering, use with custom renderers |

### Component Structure
```typescript
import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('my-element')
export class MyElement extends LitElement {
  static styles = css`
    :host { display: block; }
    .highlight { color: var(--accent, blue); }
  `

  @property({ type: String }) name = 'World'

  render() {
    return html`<p class="highlight">Hello, ${this.name}!</p>`
  }
}
```

### Non-Decorator Syntax (for targets without experimentalDecorators)
```typescript
export class MyElement extends LitElement {
  static properties = {
    name: { type: String },
    count: { type: Number },
    active: { type: Boolean, reflect: true },
  }

  static styles = css`...`

  constructor() {
    super()
    this.name = 'World'
    this.count = 0
    this.active = false
  }
}
customElements.define('my-element', MyElement)
```

## Reactive Properties

### Property Options
```typescript
@property({
  type: String,           // Attribute serialization/deserialization
  attribute: 'my-prop',   // Custom attribute name (default: camelCase→kebab-case)
  reflect: true,          // Sync property changes back to HTML attribute
  converter: {            // Custom attribute conversion
    fromAttribute(value) { return value?.toUpperCase() },
    toAttribute(value) { return value?.toLowerCase() },
  },
  hasChanged(value, oldValue) { return value !== oldValue }, // Custom change check
  noAccessor: true,       // Don't define getter/setter on prototype
})
```

### Type Mappings
| `@property` type | Attribute | Property | Reflect example |
|-----------------|-----------|----------|-----------------|
| `String` | `name="Jane"` | `el.name = 'Jane'` | `<x-el name="Jane">` |
| `Number` | `count="5"` | `el.count = 5` | `<x-el count="5">` |
| `Boolean` | `active` | `el.active = true` | `<x-el active>` |
| `Array` | — | `el.items = [1,2,3]` | — |
| `Object` | — | `el.config = {x:1}` | — |

### Internal State
```typescript
@state() private _loading = false
@state() private _data: User[] = []
```
`@state` is identical to `@property` but doesn't reflect to attributes and is not part of the public API.

## Lifecycle

```typescript
export class DataWidget extends LitElement {
  @property({ type: String }) url = ''

  // Called when element is added to DOM
  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('resize', this._resizeHandler)
  }

  // Called when element is removed from DOM
  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('resize', this._resizeHandler)
    this._abortController?.abort()
  }

  // Called when properties change before render
  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('url')) {
      this._fetchData()
    }
  }

  // Called after render completes
  updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('data')) {
      this.dispatchEvent(new CustomEvent('data-changed', { detail: this.data }))
    }
  }

  // Called after every update — use for imperative DOM access
  firstUpdated(changedProperties: PropertyValues<this>) {
    this.shadowRoot?.getElementById('focus-me')?.focus()
  }
}
```

### Lifecycle Order
1. `connectedCallback` — element connected, subscriptions safe
2. `willUpdate` — before render, queues new updates
3. `render` — returns TemplateResult
4. `update` — before DOM update (rarely overridden)
5. `firstUpdated` — first render completed, DOM available
6. `updated` — every render completed
7. `disconnectedCallback` — cleanup

## Shadow DOM

### Creating Shadow Root
```typescript
// Default (LitElement): open shadow DOM
constructor() {
  super() // automatically calls this.attachShadow({ mode: 'open' })
}

// Override render root for light DOM (avoid unless necessary)
protected createRenderRoot() {
  return this // render to light DOM — no encapsulation
}
```

### Styling in Shadow DOM
```typescript
static styles = css`
  /* :host targets the element itself */
  :host { display: block; padding: 16px; }
  :host([hidden]) { display: none; }
  :host-context(.dark-theme) { background: #222; color: #fff; }

  /* ::slotted targets slotted children */
  ::slotted(h2) { margin-top: 0; }
  ::slotted(.highlight) { color: var(--accent, blue); }

  /* CSS custom properties pierce shadow DOM */
  --card-padding: 16px;
`
```

### Adopted Stylesheets (Performance)
```typescript
const baseStyles = css`
  :host { box-sizing: border-box; }
  *, *::before, *::after { box-sizing: inherit; }
`

@customElement('fast-element')
export class FastElement extends LitElement {
  static styles = [baseStyles, css`
    :host { display: flex; }
  `]
}
```
Multiple stylesheet arrays are combined efficiently. Useful for sharing base styles across components.

## Render Function

### Basic Template
```typescript
render() {
  return html`
    <div class=${this.active ? 'active' : ''}>
      <h1>${this.title}</h1>
      <slot></slot>
    </div>
  `
}
```

### Conditional Rendering
```typescript
render() {
  return html`
    ${this.loading
      ? html`<loading-spinner></loading-spinner>`
      : this.error
        ? html`<error-state message=${this.error}></error-state>`
        : html`
          <data-table .data=${this.items}></data-table>
        `}
  `
}
```

### Lists
```typescript
import { repeat } from 'lit/directives/repeat.js'

render() {
  return html`
    <ul>
      ${repeat(this.items, (item) => item.id, (item, index) => html`
        <li data-index=${index}>${item.name}</li>
      `)}
    </ul>
  `
}
```
Use `repeat` over `map` for stable keyed updates. `repeat` minimizes DOM mutations by key.

## Lit Essentials Anti-Patterns
- ❌ **Property mutation without `@property`**: Properties not decorated won't trigger re-render.
- ❌ **Forgetting `super.connectedCallback()`**: Breaks Lit's internal setup.
- ❌ **Shadow DOM with global styles**: CSS in shadow DOM can't be styled from outside (use CSS custom properties).
- ❌ **Heavy computation in render()**: Use `willUpdate` or `updated` for side effects.
