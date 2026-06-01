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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

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

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| LitElement | Full API (render, styles, lifecycle) | Most components |
| ReactiveElement | No template system, minimal | When bundle is critical |
| @lit-labs/ssr | Server rendering + hydration | SSR-required projects |
| @lit/react | React wrapper generation | React design systems |

### Base Class Decision

```
Do you need the full LitElement API (render, styles, lifecycle)?
  Yes -> LitElement (default)
  No -> Is bundle size critical?
    Yes -> ReactiveElement (no template system, manual DOM management)
    No -> LitElement for maintainability

Do you need SSR?
  Yes -> LitElement + @lit-labs/ssr
  No -> LitElement (default)
```

### Reactive Property Configuration

```
Is the property part of the public API?
  Yes -> @property() — exposes as HTML attribute, triggers update
  No -> @state() — internal only, triggers update but no attribute

How should the attribute be named?
  CamelCase property -> 'my-prop' attribute (auto kebab-case)
  Need custom name -> attribute: 'custom-name'
  No attribute needed -> attribute: false

Should the attribute reflect changes back to DOM?
  Yes -> reflect: true (useful for CSS attribute selectors)
  No -> reflect: false (default, better performance)
```

### Styling Strategy

```
How should styles be scoped?
  Shadow DOM -> static styles in LitElement (default, best encapsulation)
  Light DOM -> override createRenderRoot() for shared styles
  Adopted stylesheets -> adoptedStyleSheets for performance (multiple instances)
  CSS custom properties -> ::part() for component customization API
```

## Component Design Patterns

### Basic Component with Properties

```typescript
import { LitElement, html, css } from 'lit'
import { property, state } from 'lit/decorators.js'

export class MyCounter extends LitElement {
  static styles = css`
    :host { display: block; padding: 1rem; }
    button { cursor: pointer; }
  `

  @property({ type: Number }) initial = 0
  @state() private count = 0

  connectedCallback() {
    super.connectedCallback()
    this.count = this.initial
  }

  render() {
    return html`
      <p>Count: ${this.count}</p>
      <button @click=${() => this.count++}>+</button>
      <button @click=${() => this.count--}>-</button>
    `
  }
}
```

### Component with Typed Events

```typescript
import { LitElement, html } from 'lit'
import { property } from 'lit/decorators.js'

export class MyDropdown extends LitElement {
  @property({ type: Array }) options: string[] = []
  @property({ type: String }) value = ''

  private select(option: string) {
    this.value = option
    this.dispatchEvent(new CustomEvent('select', {
      detail: option,
      bubbles: true,
      composed: true,
    }))
  }

  render() {
    return html`
      <div @click=${(e: Event) => {
        const target = e.target as HTMLElement
        if (target.dataset.value) this.select(target.dataset.value)
      }}>
        ${this.options.map(o => html`
          <div data-value=${o} class=${o === this.value ? 'active' : ''}>
            ${o}
          </div>
        `)}
      </div>
    `
  }
}
```

### Renderless Controller Pattern

```typescript
import { ReactiveController, ReactiveControllerHost } from 'lit'

export class ResizeController implements ReactiveController {
  private entries: ResizeObserverEntry[] = []
  private observer: ResizeObserver | null = null

  constructor(private host: ReactiveControllerHost) {
    this.host.addController(this)
  }

  hostConnected() {
    this.observer = new ResizeObserver(entries => {
      this.entries = entries
      this.host.requestUpdate()
    })
    this.observer.observe(this.host as HTMLElement)
  }

  hostDisconnected() {
    this.observer?.disconnect()
  }
}
```

## State Management Patterns

### Local State with @state

```typescript
@state() private visible = false
@state() private items: Item[] = []
```

### Derived State via Getter

```typescript
get total() { return this.items.reduce((s, i) => s + i.price, 0) }
get count() { return this.items.length }
```

### Reactive Controller for Shared Logic

Controllers encapsulate stateful behavior (resize observers, intersection observers, form state) and can be reused across components.

## Performance Optimization

### Rendering Performance
- lit-html: templates parsed once, cloned on each render.
- Only dynamic parts (expressions) updated, not entire template.
- No virtual DOM diffing — direct DOM manipulation at expression level.
- `repeat()` directive uses key-based identity for efficient list updates.

### Bundle Size
- Lit runtime: ~5KB gzipped (no dependencies).
- ReactiveElement: ~3KB without template system.
- No JSX runtime needed — templates are standard tagged templates.

### Optimization Techniques
- Use `@property({ hasChanged })` to customize change detection.
- Use `shouldUpdate()` to skip renders when inputs haven't meaningfully changed.
- Batch property changes — Lit automatically batches updates via microtask.
- Use `adoptedStyleSheets` for shared styles across many component instances.

## Build & Bundle Considerations

- Lit uses standard ES modules — works with any bundler (Rollup, webpack, Vite).
- `lit` package includes lit-html and LitElement in one import.
- For tree-shaking: import only what you use from `lit/directives/*`.
- Production build: minify + bundle with Rollup or Vite.
- SSR: `@lit-labs/ssr` for Node.js rendering, `@lit-labs/ssr-client` for hydration.
- `@lit/react` creates React wrappers for Lit components.
- Use `@lit/localize` for internationalization.

## Testing Strategies

### Unit Testing with Web Test Runner

```typescript
import { fixture, assert } from '@open-wc/testing'
import './my-element.js'

describe('MyElement', () => {
  it('renders with default properties', async () => {
    const el = await fixture('<my-element></my-element>')
    assert.equal(el.shadowRoot?.querySelector('button')?.textContent?.trim(), 'Click me')
  })

  it('reacts to property changes', async () => {
    const el = await fixture<MyElement>('<my-element></my-element>')
    el.count = 5
    await el.updateComplete
    assert.include(el.shadowRoot?.textContent ?? '', '5')
  })
})
```

### Event Testing

```typescript
it('dispatches custom event on button click', async () => {
  const el = await fixture<MyElement>('<my-element></my-element>')
  const handler = sinon.spy()
  el.addEventListener('my-event', handler)
  el.shadowRoot?.querySelector('button')?.click()
  assert.isTrue(handler.calledOnce)
  assert.equal(handler.firstCall.args[0].detail, 'clicked')
})
```

### Key Testing Practices
- Use `@open-wc/testing` for test helpers (fixture, assert, waitFor).
- Wait for `el.updateComplete` before asserting after property changes.
- Test property → attribute reflection and attribute → property deserialization.
- Test shadow DOM queries with `el.shadowRoot.querySelector`.

## Migration Patterns

### From Vanilla Custom Elements to Lit

| Vanilla | Lit |
|---------|-----|
| `class MyEl extends HTMLElement` | `class MyEl extends LitElement` |
| `observedAttributes()` | `@property()` decorator |
| `attributeChangedCallback()` | `willUpdate()` / `updated()` |
| `connectedCallback()` + manual render | `render()` auto-called |
| `this.innerHTML = template` | `return html\`...\`` |
| Manual style attachment | `static styles = css\`...\`` |

**Migration order**: 1) Change extends to LitElement, 2) Replace observedAttributes with @property, 3) Replace innerHTML with render(), 4) Add static styles, 5) Convert lifecycle methods.

### From React to Lit

| React Concept | Lit Equivalent |
|---------------|----------------|
| `useState` | `@state()` property |
| `useEffect` | `updated()` / `willUpdate()` |
| `useMemo` | `shouldUpdate()` for control |
| JSX | html tagged template literal |
| Props | `@property()` decorator |
| Event callbacks | CustomEvent dispatch |

## Anti-Patterns

1. **Forgetting to call super on lifecycle**: `super.connectedCallback()`, `super.disconnectedCallback()`, `super.updated()`.
2. **Imperative DOM manipulation in render()**: render() should be pure — side effects go in updated().
3. **Large template literals**: Break templates into helper functions or sub-components.
4. **Missing @state for internal state**: Using @property for internal state exposes it as an HTML attribute.
5. **Events without composed: true**: Events can't cross shadow DOM boundaries without composed: true.
6. **Not using lit-html directives**: Directives (repeat, classMap, styleMap) optimize rendering vs manual DOM.
7. **Memory leaks from missing disconnectedCallback**: Always clean up timers, observers, and event listeners.
8. **Shadow DOM a11y issues**: ARIA attributes on host may not cross shadow boundary without :host.

## Common Pitfalls

1. Forgetting to call super on lifecycle — always call `super.connectedCallback()`.
2. Missing @state for internal state — @property exposes it as HTML attribute.
3. Events without composed: true — can't cross shadow boundaries.
4. Large template literals — break into smaller functions.
5. Memory leaks — always clean up in disconnectedCallback.

## Compared With

| Aspect | Lit | Stencil | Vanilla WC |
|--------|------|---------|------------|
| Bundle size | ~5KB | ~8KB | 0KB |
| Rendering | lit-html (template literal) | JSX (compiled) | Manual |
| Reactivity | @property/@state decorators | @Prop/@State decorators | attributeChangedCallback |
| SSR | @lit-labs/ssr | @stencil/core (SSR) | Manual |
| TypeScript | Full support | Required | Optional |

## Template Directives Reference

| Directive | Purpose |
|-----------|---------|
| `ifDefined` | Render attr only if defined |
| `classMap` | Toggle CSS classes |
| `styleMap` | Inline styles |
| `repeat` | Keyed list rendering |
| `when` | Conditional rendering |
| `until` | Promise placeholder |
| `live` | Attribute always matches live value |
| `keyed` | Force DOM reuse |
| `guard` | Memoize template parts |
| `cache` | Cache DOM across conditionals |

## Lifecycle Reference

| Method | Purpose |
|--------|---------|
| `connectedCallback()` | Element added to DOM |
| `disconnectedCallback()` | Element removed from DOM |
| `willUpdate(changed)` | Before render |
| `update(changed)` | Before render (read prop values) |
| `render()` | Return lit-html template |
| `updated(changed)` | After render |
| `firstUpdated(changed)` | First render only |
| `shouldUpdate(changed)` | Control whether render fires |

## Tooling

1. Lit VS Code Extension — syntax highlighting
2. `@lit/reactive-element` — base class without template
3. `@lit-labs/ssr` — server-side rendering
4. `@lit/react` — React wrapper generation
5. `@lit/localize` — i18n
6. `lit-analyzer` — type checking
7. `@open-wc/testing` — testing utilities
8. `@web/test-runner` — test runner
9. Storybook for Lit — component development

## Ecosystem

### UI Libraries Built with Lit
- **Shoelace** — Most popular Lit library
- **Material Web** — Google's MD3 components
- **Wired Elements** — Hand-drawn style
- **Vaadin Components** — Enterprise UI

### Integration Patterns
- React: `@lit/react` creates wrappers
- Vue: Native custom elements
- Angular: Custom Elements Schema
- Svelte: `<svelte:options tag="my-el" />`

## Rules
- Extend LitElement for full feature set, ReactiveElement for minimal footprint.
- Use @property decorator for public API, @state for internal state.
- Shadow DOM is default — use `createRenderRoot()` override for light DOM only when unavoidable.
- Events use CustomEvent with typed `detail` — always set `bubbles` and `composed`.
- Styles are scoped via static `styles` — avoid global leak from shadow DOM.
- Use lit-html directives (`repeat`, `classMap`, `ifDefined`, `when`) over imperative DOM.

## References
  - references/lit-advanced.md — Lit Advanced
  - references/lit-architecture.md — Lit Architecture Patterns
  - references/lit-deployment.md — Lit Deployment
  - references/lit-essentials.md — Lit Essentials
  - references/lit-fundamentals.md — Lit Fundamentals
  - references/lit-testing.md — Lit Testing Reference

## Handoff
No artifact produced.
Next skill: frontend-universal-web-components for vanilla custom elements and cross-framework compatibility.
Carry forward: LitElement patterns, reactive property config, shadow DOM conventions.
