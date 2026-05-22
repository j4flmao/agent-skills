# Lit Advanced

## Events

### Dispatching Events
```typescript
@customElement('input-field')
export class InputField extends LitElement {
  @property({ type: String }) value = ''

  private _onInput(e: InputEvent) {
    const target = e.target as HTMLInputElement
    this.value = target.value
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: target.value },
      bubbles: true,
      composed: true,  // crosses shadow DOM boundary
    }))
  }

  render() {
    return html`
      <input .value=${this.value} @input=${this._onInput} />
    `
  }
}
```

### Event Listener Options
```typescript
render() {
  return html`
    <button
      @click=${this._handleClick}
      @mouseenter=${this._handleEnter}
      @keydown=${this._handleKeydown}
      @focus=${this._handleFocus}
      @blur=${this._handleBlur}
    >Click</button>
  `
}
```

### Event Options Map
```typescript
render() {
  return html`
    <div
      @click=${this._handleClick}
      .options=${{ capture: true, passive: true }}
    ></div>
  `
}
```

### Imperative Event Manager
```typescript
export class ResizablePanel extends LitElement {
  private _resizeObserver: ResizeObserver | null = null
  private _intersectionObserver: IntersectionObserver | null = null

  connectedCallback() {
    super.connectedCallback()
    this._resizeObserver = new ResizeObserver((entries) => {
      this.dispatchEvent(new CustomEvent('resize', { detail: entries[0].contentRect }))
    })
    this._resizeObserver.observe(this)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._resizeObserver?.disconnect()
    this._resizeObserver = null
  }
}
```

## Directives

### Built-in Directives
```typescript
import { ifDefined } from 'lit/directives/if-defined.js'
import { repeat } from 'lit/directives/repeat.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'
import { when } from 'lit/directives/when.js'
import { until } from 'lit/directives/until.js'
import { live } from 'lit/directives/live.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { cache } from 'lit/directives/cache.js'
import { ref } from 'lit/directives/ref.js'
import { guard } from 'lit/directives/guard.js'

render() {
  const classes = { active: this.active, disabled: this.disabled }
  const styles = { color: this.color, fontSize: this.size + 'px' }
  const detailsPromise = fetch('/details').then(r => r.json())

  return html`
    <div class=${classMap(classes)} style=${styleMap(styles)}>
      <input ?disabled=${this.disabled} .value=${live(this.value)} />

      ${when(this.loading, () => html`<spinner />`)}
      ${until(detailsPromise, html`<p>Loading...</p>`)}

      <div ref=${(el: HTMLElement) => this._container = el}>Ref</div>

      ${cache(this.view === 'list'
        ? html`<list-view .items=${this.items}></list-view>`
        : html`<grid-view .items=${this.items}></grid-view>`)}
    </div>
  `
}
```

### Custom Directive
```typescript
import { directive, Directive, PartType } from 'lit/directive.js'
import { type ElementPart, nothing } from 'lit'

class OutsideClickDirective extends Directive {
  private _handler: ((e: MouseEvent) => void) | null = null

  render(active: boolean, callback: () => void) {
    return active ? nothing : nothing // never renders content
  }

  update(part: ElementPart, [active, callback]: [boolean, () => void]) {
    if (active && !this._handler) {
      this._handler = (e: MouseEvent) => {
        if (!(part.element as HTMLElement).contains(e.target as Node)) callback()
      }
      document.addEventListener('click', this._handler)
    } else if (!active && this._handler) {
      document.removeEventListener('click', this._handler)
      this._handler = null
    }
  }
}

export const outsideClick = directive(OutsideClickDirective)

// Usage
html`<div ${outsideClick(this.open, () => this.open = false)}>Menu</div>`
```

## Lit SSR

### Server-Side Rendering Setup
```typescript
// server/app.ts
import { render } from '@lit-labs/ssr'
import { html } from 'lit'
import './components/my-component.js'

async function renderPage() {
  const body = await render(html`
    <html>
      <head><title>SSR Lit</title></head>
      <body>
        <my-component name="World"></my-component>
        <script type="module" src="/components/my-component.js"></script>
      </body>
    </html>
  `)
  return `<!DOCTYPE html>${body.join('')}`
}
```

### Declarative Shadow DOM
Lit SSR produces declarative shadow DOM (`<template shadowroot="open">`), which browsers parse without JavaScript. Client-side Lit hydrates by attaching the existing shadow root.

## Testing

### Web Test Runner Setup
```typescript
// web-test-runner.config.js
import { playwrightLauncher } from '@web/test-runner-playwright'

export default {
  files: 'test/**/*.test.js',
  nodeResolve: true,
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'firefox' }),
  ],
  testFramework: {
    config: { timeout: 10000 },
  },
}
```

### Component Test
```typescript
import { fixture, assert, aTimeout } from '@open-wc/testing'
import { html } from 'lit'
import '../src/components/my-component.js'

suite('my-component', () => {
  test('renders with default name', async () => {
    const el = await fixture(html`<my-component></my-component>`)
    assert.shadowDom.equal(el, '<p>Hello, World!</p>')
  })

  test('renders with custom name', async () => {
    const el = await fixture(html`<my-component name="Jane"></my-component>`)
    assert.shadowDom.equal(el, '<p>Hello, Jane!</p>')
  })

  test('dispatches event on click', async () => {
    const el = await fixture(html`<my-component></my-component>`)
    const button = el.shadowRoot!.querySelector('button')!
    const events: CustomEvent[] = []
    el.addEventListener('my-event', (e: Event) => events.push(e as CustomEvent))
    button.click()
    await aTimeout(0)
    assert.lengthOf(events, 1)
  })
})
```

## Sharing Components

### Package Structure
```
my-lib/
  src/
    components/
      my-button.ts
      my-dialog.ts
    index.ts
  package.json
  tsconfig.json
```

### package.json for Distribution
```json
{
  "name": "@my-org/lit-components",
  "version": "1.0.0",
  "main": "index.js",
  "module": "index.js",
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./my-button.js": "./src/components/my-button.js"
  },
  "customElements": "custom-elements.json",
  "dependencies": {
    "lit": "^3.0.0"
  }
}
```

### Generating Custom Elements Manifest
```bash
npx @custom-elements/manifest analyze --outdir .
```
Produces `custom-elements.json` for IDE tooling, documentation generators, and framework wrappers.

## Lit Advanced Anti-Patterns
- ❌ **Events without `composed: true`**: Events won't cross shadow DOM boundaries.
- ❌ **Direct DOM manipulation in render()**: Use directives or lifecycle hooks instead.
- ❌ **Synchronous render in SSR**: Always await async render operations.
- ❌ **Skipping `super.connectedCallback()`**: Breaks Lit's internal event and observer setup.
- ❌ **Dynamic tag names without `customElements.define`**: Registration must happen before element use.
