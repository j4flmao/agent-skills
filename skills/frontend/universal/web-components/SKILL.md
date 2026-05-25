---
name: frontend-web-components
description: >
  Use this skill when the user says 'web component', 'custom element', 'shadow DOM', 'HTML template', 'CustomElementsRegistry', 'ElementInternals', 'form-associated element', 'cross-framework component', 'vanilla web component'. This skill enforces: custom element lifecycle methods, shadow DOM for style encapsulation, <slot> and <template> patterns, ElementInternals for form participation, and attribute/property reflection for cross-framework compatibility. Requires no specific framework — works in any web project. Do NOT use for: Lit-specific components, framework-specific components (React/Vue/Angular), or projects that should use a library-based approach.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, universal, web-components, phase-10]
---

# Web Components

## Purpose
Build vanilla web components using the native Custom Elements API: encapsulated shadow DOM, typed lifecycle, form participation via ElementInternals, and cross-framework compatibility patterns.

## Agent Protocol

### Trigger
Exact user phrases: "web component", "custom element", "shadow DOM", "HTML template", "CustomElementsRegistry", "ElementInternals", "form-associated element", "cross-framework component", "vanilla web component".

### Input Context
Before activating, verify:
- No Lit, Stencil, or other web component library in dependencies.
- Whether the component needs shadow DOM or light DOM.
- Whether the component participates in a form (ElementInternals).
- Target browsers (check CustomElementRegistry and ElementInternals support).

### Output Artifact
No file output. Produces element design, encapsulation strategy, framework integration as text.

### Response Format
```
Element Design: {name} — {purpose}
Encapsulation: {open shadow DOM / closed / light DOM}
Framework Integration: {attribute reflection, event mapping}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Custom element registered via customElements.define() with kebab-case name.
- [ ] Lifecycle methods implemented (connected, disconnected, attributeChanged).
- [ ] observedAttributes defined for reactive attribute sync.
- [ ] Properties reflect to attributes and vice versa.
- [ ] Shadow DOM used for style encapsulation (open mode).
- [ ] ElementInternals used if form-associated.
- [ ] Framework wrappers provided or documented for React/Vue/Angular.
- [ ] DisconnectedCallback cleans up event listeners and observers.

### Max Response Length
2560 tokens.

## Workflow

### Step 1: Custom Element Lifecycle
```javascript
class BaseElement extends HTMLElement {
  constructor() {
    super()
    this._internals = this.attachInternals?.()
  }

  connectedCallback() {
    this._render()
    this._addListeners()
  }

  disconnectedCallback() {
    this._removeListeners()
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) this._render()
  }

  adoptedCallback() {
    this._render()
  }
}
```
Four lifecycle hooks: constructor → connected → disconnected → attributeChanged. `adoptedCallback` fires when element moves between documents.

### Step 2: Attributes & Properties
```javascript
class UserAvatar extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'alt', 'size']
  }

  get src() { return this.getAttribute('src') ?? '' }
  set src(val) { this.setAttribute('src', val) }

  get alt() { return this.getAttribute('alt') ?? '' }
  set alt(val) { this.setAttribute('alt', val) }

  get size() { return parseInt(this.getAttribute('size') ?? '40') }
  set size(val) { this.setAttribute('size', String(val)) }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this._render()
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal) this._render()
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <img src="${this.src}" alt="${this.alt}"
           style="width:${this.size}px;height:${this.size}px;border-radius:50%;" />
    `
  }
}
customElements.define('user-avatar', UserAvatar)
```
Property setter delegates to `setAttribute`, triggering `attributeChangedCallback`. This ensures consistency whether the consumer sets properties or attributes.

### Step 3: Shadow DOM Encapsulation
```javascript
class Tooltip extends HTMLElement {
  constructor() {
    super()
    const template = document.getElementById('tooltip-template')
    this.attachShadow({ mode: 'open' })
      .appendChild(template.content.cloneNode(true))
  }

  connectedCallback() {
    this.shadowRoot.querySelector('slot')
      .addEventListener('slotchange', () => this._position())
  }
}
```
| Mode | Behavior |
|------|----------|
| `open` | Accessible via `element.shadowRoot` — testing and inspection |
| `closed` | Not accessible externally — `element.shadowRoot` is null |

Use `open` mode for testability. Use `closed` only when absolute encapsulation is required (design system internals).

### Step 4: Slots & Templates
```html
<template id="accordion-template">
  <style>
    :host { display: block; border: 1px solid #ddd; border-radius: 4px; }
    .header { padding: 12px 16px; cursor: pointer; background: #f5f5f5; }
    .content { padding: 0 16px; max-height: 0; overflow: hidden; transition: max-height 0.3s; }
    :host([open]) .content { max-height: 500px; padding: 16px; }
  </style>
  <div class="header" part="header">
    <slot name="summary">Details</slot>
  </div>
  <div class="content" part="content">
    <slot></slot>
  </div>
</template>
```
```javascript
customElements.define('my-accordion', class extends HTMLElement {
  constructor() {
    super()
    const tmpl = document.getElementById('accordion-template')
    this.attachShadow({ mode: 'open' }).appendChild(tmpl.content.cloneNode(true))
  }

  connectedCallback() {
    this.shadowRoot.querySelector('.header')
      .addEventListener('click', () => this.toggleAttribute('open'))
  }
})
```
Usage:
```html
<my-accordion open>
  <span slot="summary">Shipping Info</span>
  <p>Orders ship within 2-3 business days.</p>
</my-accordion>
```

### Step 5: Form-Associated Elements (ElementInternals)
```javascript
class FormInput extends HTMLElement {
  static formAssociated = true

  constructor() {
    super()
    this._internals = this.attachInternals()
    this.attachShadow({ mode: 'open' })
    this._internals.setFormValue('')
  }

  static get observedAttributes() { return ['value', 'required', 'disabled', 'name'] }

  get value() { return this.getAttribute('value') ?? '' }
  set value(val) { this.setAttribute('value', val); this._internals.setFormValue(val) }

  get form() { return this._internals.form }

  connectedCallback() {
    this._render()
    this.shadowRoot.querySelector('input')
      .addEventListener('input', (e) => {
        this.value = e.target.value
        this._internals.setValidity({})
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      })
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal) this._render()
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <input type="text" .value="${this.value}"
             ?disabled="${this.hasAttribute('disabled')}"
             ?required="${this.hasAttribute('required')}" />
    `
  }
}
customElements.define('form-input', FormInput)
```
`formAssociated = true` enables native form participation — values submit with parent `<form>`. Use `_internals.setValidity()` for constraint validation.

### Step 6: Cross-Framework Compatibility
```javascript
// React wrapper
export function ReactUserAvatar(props) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (props.src) el.src = props.src
    if (props.alt) el.alt = props.alt
    if (props.size) el.size = props.size
    const handler = (e) => props.onSelect?.(e.detail)
    el.addEventListener('select', handler)
    return () => el.removeEventListener('select', handler)
  }, [props.src, props.alt, props.size])
  return <user-avatar ref={ref} />
}

// Vue wrapper
const VueUserAvatar = {
  props: ['src', 'alt', 'size'],
  emits: ['select'],
  template: '<user-avatar :src="src" :alt="alt" :size="size" @select="$emit(\'select\', $event.detail)" />',
}
```
Key compatibility rules:
- Set properties (not attributes) for complex types (objects, arrays).
- Listen for CustomEvent using `addEventListener` (not `on*` attributes).
- Reflect primitive properties as attributes for declarative HTML usage.
- Avoid internal state that depends on framework reactivity.

## Rules
- Always define `observedAttributes` for reactive attribute-to-property sync.
- Property setters must call `setAttribute` to trigger `attributeChangedCallback`.
- Use `attachShadow({ mode: 'open' })` for testability — closed mode breaks external tooling.
- Clean up event listeners, observers, and timers in `disconnectedCallback`.
- For form elements, set `static formAssociated = true` and use `attachInternals()`.
- Dispatch events with `bubbles: true` and `composed: true` to cross shadow boundaries.
- Provide framework wrappers (React, Vue, Angular) for ergonomic usage — set properties via refs.

## References
- `references/custom-elements.md` — lifecycle, attributes, properties, ElementInternals, form participation
- `references/shadow-dom.md` — encapsulation, slots, CSS parts, theming, cross-framework
- `references/web-components-implementation.md` — Complete component patterns (counter, form input), shadow DOM styling, declarative shadow DOM, testing
- `references/web-components-frameworks.md` — React/Vue/Angular/Svelte/Lit integration, event handling, cross-framework compatibility rules

## Handoff
No artifact produced.
Next skill: frontend-lit for Lit-based web components. Or frontend-universal-design-system for design token integration.
Carry forward: custom element patterns, shadow DOM conventions, cross-framework wrapper approach.
