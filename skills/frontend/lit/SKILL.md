---
name: frontend-lit
description: >
  Use this skill when the user says 'Lit', 'LitElement', 'lit-html', 'web component Lit', 'reactive element', '@lit/reactive-element', 'Lit SSR', 'Lit component', 'Lit decorator', 'Lit reactive property'. This skill enforces: LitElement base class with reactive properties, declarative templates with lit-html, shadow DOM encapsulation by default, typed events with CustomEvent, and Lit SSR for server rendering. Requires Lit project (package.json with lit). Do NOT use for: vanilla web components, non-Lit custom elements, or framework-specific components (React/Vue/Angular).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, lit, web-components, phase-10]
---

# Lit

## Purpose
Build standard web components with Lit: reactive properties, shadow DOM templates, typed events, and SSR-compatible rendering.

## Agent Protocol

### Trigger
Exact user phrases: "Lit", "LitElement", "lit-html", "web component Lit", "reactive element", "@lit/reactive-element", "Lit SSR", "Lit component", "Lit decorator", "Lit reactive property".

### Input Context
Before activating, verify:
- package.json has lit dependency.
- Whether the project uses decorators (experimentalDecorators) or the reactive-element base class.
- Whether Lit SSR (@lit-labs/ssr or @lit/react) is needed.

### Output Artifact
No file output. Produces component design, property configuration, template patterns, and SSR setup as text.

### Response Format
```
Component: {name} — {purpose}
Properties: {reactive attributes/properties}
Template: {shadow DOM structure}
Events: {CustomEvent dispatch}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Components extend LitElement or ReactiveElement.
- [ ] Reactive properties defined with @property() decorator or static properties.
- [ ] Templates use Lit's html tagged template literal.
- [ ] Shadow DOM enabled (default in LitElement).
- [ ] Events dispatched as typed CustomEvent.
- [ ] Lit SSR configured for server-side rendering if needed.
- [ ] Styles scoped via shadow DOM or adoptedStyleSheets.

### Max Response Length
2560 tokens.

## Workflow

### Step 1: LitElement Component
```typescript
import { LitElement, html, css, PropertyValues } from 'lit'
import { property, customElement, state } from 'lit/decorators.js'

@customElement('user-card')
export class UserCard extends LitElement {
  static styles = css`
    :host { display: block; padding: 16px; border: 1px solid #ccc; border-radius: 8px; }
    .name { font-size: 1.2em; font-weight: 600; }
    .role { color: #666; }
  `

  @property({ type: String }) name = ''
  @property({ type: String }) role = 'member'
  @property({ type: Boolean, reflect: true }) active = false

  @state() private expanded = false

  render() {
    return html`
      <div class="name">${this.name}</div>
      <div class="role">${this.role}</div>
      <button @click=${() => this.expanded = !this.expanded}>
        ${this.expanded ? 'Less' : 'More'}
      </button>
      ${this.expanded ? html`<div><slot></slot></div>` : ''}
    `
  }
}
```

### Step 2: Reactive Properties Configuration
```typescript
@property({
  type: Number,
  attribute: 'max-items',
  reflect: true,
  converter: {
    fromAttribute: (value) => value ? parseInt(value) : 10,
    toAttribute: (value) => value?.toString() ?? null,
  },
}) maxItems = 10

// Internal state
@state() private _loading = false
```
| Option | Purpose |
|--------|---------|
| `type` | Serialization/deserialization between property and attribute |
| `attribute` | Custom attribute name (kebab-case) |
| `reflect` | Sync property changes back to attribute |
| `converter` | Custom fromAttribute/toAttribute logic |
| `hasChanged` | Custom change detection function |

### Step 3: Lifecycle
```typescript
@customElement('data-widget')
export class DataWidget extends LitElement {
  @property({ type: String }) endpoint = ''

  @state() private data: unknown = null
  @state() private error: string | null = null

  connectedCallback() {
    super.connectedCallback()
    this._loadData()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._abortController?.abort()
  }

  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has('endpoint')) this._loadData()
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('data')) this.dispatchEvent(new CustomEvent('data-loaded', { detail: this.data }))
  }

  private _abortController?: AbortController

  private async _loadData() {
    this._abortController?.abort()
    this._abortController = new AbortController()
    try {
      const res = await fetch(this.endpoint, { signal: this._abortController.signal })
      this.data = await res.json()
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') this.error = e.message
    }
  }

  render() {
    return html`<pre>${JSON.stringify(this.data, null, 2)}</pre>`
  }
}
```

### Step 4: Events
```typescript
// Dispatch typed events
@customElement('form-input')
export class FormInput extends LitElement {
  @property({ type: String }) value = ''
  @property({ type: String }) label = ''

  private _handleInput(e: Event) {
    const target = e.target as HTMLInputElement
    this.value = target.value
    this.dispatchEvent(new CustomEvent<string>('input-change', {
      detail: target.value,
      bubbles: true,
      composed: true,
    }))
  }

  render() {
    return html`
      <label>${this.label}
        <input .value=${this.value} @input=${this._handleInput} />
      </label>
    `
  }
}
```
Use `bubbles: true` for parent catching. Use `composed: true` to cross shadow DOM boundaries.

### Step 5: Templates & Directives
```typescript
import { LitElement, html } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { repeat } from 'lit/directives/repeat.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'
import { when } from 'lit/directives/when.js'
import { until } from 'lit/directives/until.js'

@customElement('data-table')
export class DataTable extends LitElement {
  @property({ type: Array }) data: Row[] = []
  @property({ type: String }) sortKey = ''

  render() {
    const classes = { 'sortable': true, 'sorted': !!this.sortKey }

    return html`
      <table>
        ${repeat(this.data, (row) => row.id, (row) => html`
          <tr class=${classMap(classes)}>
            <td>${row.name}</td>
            <td>${row.value}</td>
          </tr>
        `)}
      </table>
      ${when(this.data.length === 0, () => html`<p>No data</p>`)}
    `
  }
}
```

### Step 6: Lit SSR
```typescript
// server/render.js
import { render } from '@lit-labs/ssr/lib/render-with-global-dom-shim.js'
import { html } from 'lit'
import './components/my-component.js'

const app = express()
app.get('/', async (req, res) => {
  const rendered = await render(html`<my-component></my-component>`)
  res.send(`<!DOCTYPE html><html><body>${rendered}</body></html>`)
})
```
For React integration, use `@lit/react` to create React wrappers:
```typescript
import { createComponent } from '@lit/react'
import { MyElement } from './my-element.js'

export const MyReactComponent = createComponent({
  tagName: 'my-element',
  elementClass: MyElement,
  react: React,
  events: { onMyEvent: 'my-event' },
})
```

## Rules
- Extend LitElement for full feature set, ReactiveElement for minimal footprint.
- Use @property decorator for public API, @state for internal state.
- Shadow DOM is default — use `createRenderRoot()` override for light DOM only when unavoidable.
- Events use CustomEvent with typed `detail` — always set `bubbles` and `composed`.
- Styles are scoped via static `styles` — avoid global leak from shadow DOM.
- Use lit-html directives (`repeat`, `classMap`, `ifDefined`, `when`) over imperative DOM.
- Lit SSR is required for server rendering — lit-html templates render to string synchronously.

## References
- `references/lit-essentials.md` — component design, reactive properties, lifecycle, shadow DOM
- `references/lit-advanced.md` — events, directives, SSR, testing, sharing

## Handoff
No artifact produced.
Next skill: frontend-universal-web-components for vanilla custom elements and cross-framework compatibility.
Carry forward: LitElement patterns, reactive property config, shadow DOM conventions.
