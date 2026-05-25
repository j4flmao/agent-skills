# Web Components Implementation

## Custom Element Lifecycle

```javascript
class MyElement extends HTMLElement {
  // 1. Called when element is created
  constructor() {
    super()
    // Initialize state, create shadow DOM
    this.attachShadow({ mode: 'open' })
    this._count = 0
  }

  // 2. Called when element is added to DOM
  connectedCallback() {
    this._render()
    this._addEventListeners()
  }

  // 3. Called when element is removed from DOM
  disconnectedCallback() {
    this._removeEventListeners()
  }

  // 4. Called when observed attribute changes
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) this._render()
  }

  // 5. Called when element moves to a new document
  adoptedCallback() {
    this._render()
  }
}
```

## Complete Counter Component

```javascript
class CounterElement extends HTMLElement {
  static observedAttributes = ['value', 'min', 'max', 'step', 'label']

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this._internals = this.attachInternals()
  }

  get value() { return parseInt(this.getAttribute('value') ?? '0') }
  set value(val) { this.setAttribute('value', String(val)) }

  get min() { return parseInt(this.getAttribute('min') ?? '0') }
  get max() { return parseInt(this.getAttribute('max') ?? '100') }
  get step() { return parseInt(this.getAttribute('step') ?? '1') }

  connectedCallback() {
    this._render()
    this.shadowRoot.getElementById('inc')?.addEventListener('click', () => this._increment())
    this.shadowRoot.getElementById('dec')?.addEventListener('click', () => this._decrement())
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal) this._render()
  }

  _increment() {
    const newVal = Math.min(this.value + this.step, this.max)
    this.value = newVal
    this._internals.setFormValue(String(newVal))
    this.dispatchEvent(new CustomEvent('change', { detail: { value: newVal }, bubbles: true, composed: true }))
  }

  _decrement() {
    const newVal = Math.max(this.value - this.step, this.min)
    this.value = newVal
    this._internals.setFormValue(String(newVal))
    this.dispatchEvent(new CustomEvent('change', { detail: { value: newVal }, bubbles: true, composed: true }))
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-flex; align-items: center; gap: 8px; }
        button { width: 32px; height: 32px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        span { min-width: 24px; text-align: center; font-variant-numeric: tabular-nums; }
      </style>
      <button id="dec" ${this.value <= this.min ? 'disabled' : ''}>−</button>
      <span>${this.value}</span>
      <button id="inc" ${this.value >= this.max ? 'disabled' : ''}>+</button>
    `
  }
}

customElements.define('x-counter', CounterElement)
```

## Form-Associated Element

```javascript
class FormInput extends HTMLElement {
  static formAssociated = true
  static observedAttributes = ['value', 'name', 'required', 'disabled', 'placeholder']

  constructor() {
    super()
    this._internals = this.attachInternals()
    this.attachShadow({ mode: 'open' })
  }

  get value() { return this.getAttribute('value') ?? '' }
  set value(val) { this.setAttribute('value', val) }
  get name() { return this.getAttribute('name') ?? '' }

  connectedCallback() {
    this._render()
    this.shadowRoot.querySelector('input')
      ?.addEventListener('input', (e) => {
        this.value = e.target.value
        this._internals.setFormValue(this.value)
        this._checkValidity()
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      })
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal) this._render()
  }

  _checkValidity() {
    if (this.hasAttribute('required') && !this.value) {
      this._internals.setValidity({ valueMissing: true }, 'This field is required', this.shadowRoot.querySelector('input'))
    } else {
      this._internals.setValidity({})
    }
  }

  formAssociatedCallback(form) {
    console.log('Associated with form:', form)
  }

  formResetCallback() {
    this.value = ''
    this._internals.setFormValue('')
    this._render()
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        input { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
        :host([invalid]) input { border-color: red; }
      </style>
      <input type="text" value="${this.value}" placeholder="${this.getAttribute('placeholder') ?? ''}" />
    `
  }
}
customElements.define('form-input', FormInput)
```

## Shadow DOM Styling

```css
/* Inside shadow root */
:host { display: block; }                     /* styles the custom element itself */
:host(.active) { border-color: blue; }        /* host matches class */
:host-context(.dark-theme) { color: white; }  /* host inside .dark-theme */
::slotted(p) { color: gray; }                 /* styles slotted content */

/* CSS parts — exposed for external styling */
/* Inside shadow: */
.panel-header { part: header; }

/* Outside shadow: */
x-panel::part(header) { background: blue; }
```

## Declarative Shadow DOM

```html
<!-- Server-rendered shadow DOM -->
<my-element>
  <template shadowrootmode="open">
    <style>p { color: blue; }</style>
    <p>Shadow content</p>
  </template>
</my-element>
```

## Testing Web Components

```javascript
describe('x-counter', () => {
  beforeEach(() => {
    document.body.innerHTML = '<x-counter value="5" min="0" max="10"></x-counter>'
  })

  it('renders initial value', () => {
    const el = document.querySelector('x-counter')
    expect(el.shadowRoot.querySelector('span').textContent).toBe('5')
  })

  it('increments value on click', () => {
    const el = document.querySelector('x-counter')
    el.shadowRoot.querySelector('#inc').click()
    expect(el.value).toBe(6)
  })

  it('disables decrement at min', () => {
    const el = document.querySelector('x-counter')
    el.setAttribute('value', '0')
    expect(el.shadowRoot.querySelector('#dec').disabled).toBe(true)
  })
})
```

## WC Implementation Checklist

- [ ] Element name contains a hyphen (required)
- [ ] Lifecycle methods properly implemented
- [ ] observedAttributes defined for reactive properties
- [ ] Property setters call setAttribute
- [ ] Shadow DOM mode is open (for testability)
- [ ] Form participation via attachInternals (if form element)
- [ ] Events dispatched with composed: true (cross shadow boundary)
- [ ] disconnectedCallback cleanup (event listeners, observers)
- [ ] Framework wrappers provided for React/Vue/Angular
- [ ] Declarative Shadow DOM for SSR support
