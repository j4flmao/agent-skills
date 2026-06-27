---
name: frontend-web-components
description: >
  Use this skill when the user says 'web component', 'custom element', 'shadow DOM', 'HTML template', 'CustomElementsRegistry', 'ElementInternals', 'form-associated element', 'cross-framework component', 'vanilla web component'. This skill enforces: custom element lifecycle methods, shadow DOM for style encapsulation, <slot> and <template> patterns, ElementInternals for form participation, and attribute/property reflection for cross-framework compatibility. Requires no specific framework — works in any web project. Do NOT use for: Lit-specific components, framework-specific components (React/Vue/Angular), or projects that should use a library-based approach.
version: "2.0.0"
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

## Web Component Architecture / Decision Trees

### Architecture Decision Tree
```
Is this a reusable component shared across frameworks?
  |-- YES --> Web Components (framework-agnostic by nature)
  |     Use case: design system components, shared widgets
  |
  |-- NO, single framework only -->
        |-- Using React? --> React component (simpler, better DX)
        |-- Using Vue? --> Vue SFC (simpler, better DX)
        |-- Using Angular? --> Angular component (simpler, better DX)
        |-- Vanilla JS project? --> Web Component
```

### Shadow DOM Decision Tree
```
Does the component need style encapsulation?
  |-- YES -->
  |     |-- Needs to be accessible from outside for testing? -->
  |     |     YES: attachShadow({ mode: 'open' })
  |     |     NO:  attachShadow({ mode: 'closed' }) — rare, breaks tooling
  |     |
  |     |-- Content projection needed? -->
  |           Use <slot> elements in shadow DOM template
  |
  |-- NO -->
        Light DOM (no shadow root, styles are global)
        Simpler, but CSS can leak in/out
```

### Form-Associated Decision Tree
```
Does the component represent a form value?
  |-- YES (input, select, checkbox, custom file picker) -->
  |     Set static formAssociated = true
  |     Use attachInternals() for form participation
  |     Update value: _internals.setFormValue(val)
  |     Report validity: _internals.setValidity(flags)
  |
  |-- NO (button, tooltip, accordion, card) -->
        Regular custom element, no form involvement
```

### Cross-Framework Wrapper Decision Tree
```
What framework consumes this component?
  |-- React -->
  |     Wrapper: useRef + useEffect to set properties/attributes
  |     Events: addEventListener in useEffect, cleanup in return
  |     Complex props: set via element.property (not attribute)
  |
  |-- Vue -->
  |     Wrapper: template with :prop binding + @event handler
  |     v-model: implement with :value + @input pattern
  |
  |-- Angular -->
  |     Wrapper: CUSTOM_ELEMENTS_SCHEMA for template
  |     or Angular wrapper component with ElementRef
```

---

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

## Common Pitfalls

### 1. Not Cleaning Up in disconnectedCallback
Event listeners and MutationObservers attached in `connectedCallback` must be removed in `disconnectedCallback`. Otherwise, the element leaks memory.

### 2. attributeChangedCallback Not Triggering
`attributeChangedCallback` only fires for attributes listed in `observedAttributes`. If you add a custom attribute without listing it, the callback won't fire.

### 3. Property Setters Not Using setAttribute
```javascript
// BAD -- setting internal state without triggering attributeChanged
set size(val) { this._size = val; this._render(); }

// GOOD -- delegates to setAttribute, triggers attributeChanged
set size(val) { this.setAttribute('size', val); }
```

### 4. Events Not Crossing Shadow Boundary
Events dispatched from within shadow DOM don't cross the boundary by default. Use `composed: true` to bubble up through shadow roots.

### 5. Naming Without Hyphen
Custom element names MUST contain a hyphen (e.g., `my-button`). Single-word names conflict with built-in HTML elements.

## Compared With

| Approach | Bundle Size | Framework Agnostic | SSR | Learning Curve |
|----------|------------|-------------------|-----|---------------|
| Vanilla Web Component | 0KB (native) | Yes | Limited (declarative shadow DOM) | Medium |
| Lit | ~5KB | Yes | Yes | Low |
| Stencil | ~8KB | Yes | Yes | Medium |
| React component | 0KB (runtime) | No (React only) | Yes | Low |
| Vue SFC | 0KB (runtime) | No (Vue only) | Yes | Low |

## Performance Considerations

- Web Components are native browser APIs — no framework overhead
- Shadow DOM style scoping is built into the browser CSS engine — no runtime cost
- `attributeChangedCallback` is synchronous and runs during the attribute change microtask
- Custom elements registered once via `customElements.define()` — no runtime registration cost
- Declarative Shadow DOM (HTML streaming with shadow root) enables SSR for web components
- Chrome DevTools Performance shows custom element lifecycle as distinct markers

## Accessibility Considerations

- Shadow DOM preserves accessibility tree — ARIA attributes inside shadow root are exposed
- Use `:host` and `::part()` for styling without breaking accessibility
- Form-associated custom elements participate in native form validation (accessible error messages)
- Slotted content inherits light DOM accessibility — don't duplicate ARIA roles in shadow DOM
- Focus management must be handled explicitly in `connectedCallback` if the component manages focus
- Use `ElementInternals.aria*` properties for setting ARIA attributes from JavaScript

## Security Considerations

- `innerHTML` in shadow DOM can introduce XSS if user content is not sanitized
- Closed shadow DOM mode prevents external inspection but doesn't improve security
- Custom elements inherit the page's CSP — no special security consideration
- Form-associated custom elements participate in the parent form — validate on the server

## Rules
- Always define `observedAttributes` for reactive attribute-to-property sync.
- Property setters must call `setAttribute` to trigger `attributeChangedCallback`.
- Use `attachShadow({ mode: 'open' })` for testability — closed mode breaks external tooling.
- Clean up event listeners, observers, and timers in `disconnectedCallback`.
- For form elements, set `static formAssociated = true` and use `attachInternals()`.
- Dispatch events with `bubbles: true` and `composed: true` to cross shadow boundaries.
- Provide framework wrappers (React, Vue, Angular) for ergonomic usage — set properties via refs.

## References
  - references/custom-elements.md — Custom Elements Reference
  - references/shadow-dom.md — Shadow DOM Reference
  - references/wc-performance.md — Web Component Performance
  - references/wc-testing.md — Web Component Testing
  - references/web-components-frameworks.md — Web Components in Frameworks
  - references/web-components-implementation.md — Web Components Implementation
## Handoff
No artifact produced.
Next skill: frontend-lit for Lit-based web components. Or frontend-universal-design-system for design token integration.
Carry forward: custom element patterns, shadow DOM conventions, cross-framework wrapper approach.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Architecture Decision Trees

### Shadow DOM Decision Tree
`
Does the component need style isolation?
  ├── No  → Light DOM component (styles inherited, faster)
  └── Yes → Does it need to be styled from outside?
       ├── Yes → Open shadow DOM + CSS custom properties + ::part()
       └── No  → Closed shadow DOM (max isolation, cannot style externally)
            Does the component contain light DOM children (slots)?
            ├── Yes → Shadow DOM with slot elements
            └── No  → Shadow DOM with no slots
`

### Custom Element Registration Decision Tree
`
Is the element used in a single app?
  ├── Yes → Define directly with customElements.define()
  └── No  → Package as library with lazy registration
       Does it depend on other custom elements?
       ├── Yes → Export registration function that registers dependencies first
       └── No  → Self-registering module via side-effect import
            Need polyfills for legacy browsers?
            ├── Yes → Dynamic polyfill loading with feature detection
            └── No  → Modern browsers only, no polyfills
`
