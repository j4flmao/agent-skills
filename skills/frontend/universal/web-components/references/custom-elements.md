# Custom Elements Reference

## Lifecycle

### Four Lifecycle Callbacks
```javascript
class MyElement extends HTMLElement {
  // 1. Called when element is created
  constructor() {
    super()
    // Initialize state, attach shadow DOM, create elements
    // Do NOT access attributes or children here — they may not exist yet
    this._clickHandler = this._handleClick.bind(this)
    this.attachShadow({ mode: 'open' })
  }

  // 2. Called when element is added to the DOM
  connectedCallback() {
    // Start observers, add event listeners, fetch data
    this.addEventListener('click', this._clickHandler)
    this._render()
  }

  // 3. Called when element is removed from the DOM
  disconnectedCallback() {
    // Clean up: remove listeners, disconnect observers, abort fetches
    this.removeEventListener('click', this._clickHandler)
    this._observer?.disconnect()
    this._abort?.abort()
  }

  // 4. Called when observed attribute changes
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) this._render()
  }
}
```

### Lifecycle Guarantees
- `constructor` is called once per element, before any other callback.
- `connectedCallback` may be called multiple times if element is moved.
- `disconnectedCallback` is called once per removal (no guarantee it's called before GC).
- `attributeChangedCallback` fires for attributes in `observedAttributes` only.

## Attributes & Properties

### Reactive Attribute/Property Pattern
```javascript
class UserAvatar extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'alt', 'size', 'variant']
  }

  // Property getters/setters delegate to attributes
  get src() { return this.getAttribute('src') ?? '' }
  set src(val) { this.setAttribute('src', val) }

  get alt() { return this.getAttribute('alt') ?? '' }
  set alt(val) { this.setAttribute('alt', val) }

  get size() { return parseInt(this.getAttribute('size') ?? '40') }
  set size(val) { this.setAttribute('size', String(val)) }

  get variant() { return (this.getAttribute('variant') ?? 'circle') as 'circle' | 'square' }
  set variant(val) { this.setAttribute('variant', val) }
}
```

### Attribute Serialization
| JS Property Type | Attribute Value | Example |
|-----------------|----------------|---------|
| String | As-is | `name="John"` |
| Number | String coerced | `count="5"` |
| Boolean | Present = true, absent = false | `<my-el active>` |
| Object/Array | JSON.stringify | `data='{"x":1}'` |

### Complex Properties (Object/Array)
```javascript
class ChartWidget extends HTMLElement {
  _data = []
  _config = {}

  get data() { return this._data }
  set data(val) {
    this._data = val
    this._render()
  }

  get config() { return this._config }
  set config(val) {
    this._config = val
    this._render()
  }

  connectedCallback() {
    // Try to parse from attribute if not set via property
    const dataAttr = this.getAttribute('data')
    if (dataAttr && !this._data.length) {
      try { this._data = JSON.parse(dataAttr) } catch {}
    }
  }
}

// Usage
const chart = document.createElement('chart-widget')
chart.data = [{ x: 1, y: 2 }, { x: 3, y: 4 }]  // property setter
chart.setAttribute('data', '[{"x":1,"y":2}]')     // attribute fallback
```

## ElementInternals

### Form-Associated Elements
```javascript
class FormField extends HTMLElement {
  static formAssociated = true // Required for form participation

  constructor() {
    super()
    this._internals = this.attachInternals()
    this._internals.setFormValue('')
  }

  get value() { return this._internals.formValue ?? '' }
  set value(val) {
    this.setAttribute('value', val)
    this._internals.setFormValue(val)
  }

  get form() { return this._internals.form }

  // Form lifecycle callbacks
  formAssociatedCallback(form) {
    // Called when element is associated with a form
  }

  formDisabledCallback(disabled) {
    // Called when parent fieldset/form toggles disabled
  }

  formResetCallback() {
    this.value = this.getAttribute('value') ?? ''
  }

  formStateRestoreCallback(state, mode) {
    // Called when form state is restored (back-forward cache)
    if (mode === 'restore') this.value = state
  }
}
customElements.define('form-field', FormField)
```

### Constraint Validation
```javascript
class ValidatedInput extends HTMLElement {
  static formAssociated = true

  connectedCallback() {
    this.shadowRoot.querySelector('input')
      .addEventListener('input', () => this._validate())
  }

  _validate() {
    const value = this.value
    if (this.hasAttribute('required') && !value) {
      this._internals.setValidity({
        valueMissing: true,
      }, 'This field is required', this.shadowRoot.querySelector('input'))
    } else if (this.hasAttribute('minlength') && value.length < parseInt(this.getAttribute('minlength'))) {
      this._internals.setValidity({
        tooShort: true,
      }, `Minimum ${this.getAttribute('minlength')} characters`, this.shadowRoot.querySelector('input'))
    } else {
      this._internals.setValidity({})
    }
  }

  get validity() { return this._internals.validity }
  get validationMessage() { return this._internals.validationMessage }
  checkValidity() { return this._internals.checkValidity() }
  reportValidity() { return this._internals.reportValidity() }
}
```

### ElementInternals Properties
| Property | Type | Description |
|----------|------|-------------|
| `form` | HTMLFormElement | Associated form (null if not in form) |
| `willValidate` | boolean | Whether element will be validated |
| `validity` | ValidityState | Current validity state |
| `validationMessage` | string | Current validation message |
| `labels` | NodeList | Associated label elements |

### ElementInternals Methods
| Method | Description |
|--------|-------------|
| `setFormValue(value)` | Set value for form submission |
| `setValidity(flags, message?, anchor?)` | Set validation state |
| `checkValidity()` | Returns true if valid |
| `reportValidity()` | Returns true if valid, fires invalid event |

## Element Registration

### Naming Rules
- Must contain a hyphen (`my-element`, `app-header`, `v2-button`).
- Cannot be a single word (`button`, `dialog`).
- Case-sensitive — use kebab-case consistently.
- Cannot shadow built-in elements (no `customElements.define('button', ...)`).

### Registration Patterns
```javascript
// Standard
customElements.define('my-element', MyElement)

// With options (not yet widely supported)
customElements.define('my-element', MyElement, { extends: 'button' })

// Check if defined
if (!customElements.get('my-element')) {
  customElements.define('my-element', MyElement)
}

// Using class getter
class MyElement extends HTMLElement {
  static define(tag = 'my-element') {
    if (!customElements.get(tag)) customElements.define(tag, this)
  }
}
MyElement.define()
```

## Custom Elements Anti-Patterns
- ❌ **Work in constructor**: Don't access attributes, children, or computed styles in constructor.
- ❌ **Event listeners without cleanup**: Always remove in `disconnectedCallback` to prevent memory leaks.
- ❌ **Missing `observedAttributes`**: Without it, `attributeChangedCallback` never fires.
- ❌ **Complex type attributes**: Attributes are strings — use property setters for objects/arrays.
- ❌ **Synchronous fetch in connectedCallback**: Elements can be moved in DOM — handle async with cleanup.
