---
name: stencil
description: >
  Use this skill when the user says 'Stencil', 'Stencil.js', 'Stencil component', 'Stencil web component', 'Stencil setup', 'Stencil compiler', 'Stencil design system', 'web component compiler', or when building reusable web components with Stencil. This skill enforces: Stencil decorators (@Component, @Prop, @State, @Event), JSX-based component compilation, lazy-loading for performance, framework-agnostic output. Requires Stencil CLI (@stencil/core). Do NOT use for: non-web-component projects, React/Vue components that don't need framework-agnostic output, or vanilla custom elements.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, stencil, phase-2]
---

# Stencil

## Purpose
Build reusable, framework-agnostic web components using Stencil's TypeScript-first compiler — optimized for design systems, component libraries, and performance-critical UIs.

## Agent Protocol

### Trigger
Exact user phrases: "Stencil setup", "Stencil component", "Stencil web component", "Stencil compiler", "Stencil design system", "Stencil project", "stencil component library".

### Input Context
Before activating, verify:
- @stencil/core is in devDependencies.
- Whether building a standalone component library, a design system, or embedded in an app.
- Target framework consumers (React, Vue, Angular, or vanilla).

### Output Artifact
No file output. Produces code snippets and config examples as text.

### Response Format
Component definition:
```tsx
@Component({ tag: 'my-button', styleUrl: 'my-button.css' })
export class MyButton { ... }
```

No preamble. No postamble. No explanations. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Components follow Stencil API: @Component, @Prop, @State, @Event, @Method.
- [ ] Styles scoped with Shadow DOM or scoped CSS.
- [ ] Reactive props with @Prop decorator (mutable or reflect).
- [ ] Events emitted with @Event and EventEmitter.
- [ ] Components tested with @stencil/jest or @stencil/playwright.
- [ ] Library can be consumed as framework-agnostic or via framework bindings.
- [ ] Build output includes lazy-loaded bundles.

### Max Response Length
~4096 tokens.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Component with shadow DOM | Style isolation | Design system components |
| Component with scoped CSS | Lighter, no shadow root | App-specific components |
| Lazy-loaded (default) | Loaded on demand | Library distributed via CDN |
| Eager (customElementsExportBehavior) | Available immediately | Bundled library |
| dist output target | Lazy loading + split | Most use cases |
| dist-custom-elements | Single bundle | Bundler integration |

### Component Configuration Decision

```
Does the component need style isolation?
  Yes -> shadow: true (Shadow DOM, full isolation)
  No -> scoped: true (Scoped CSS, lighter, no shadow root)

Should the component be lazy-loaded?
  Yes (default) -> Stencil's output target handles this
  No (eager) -> Set customElementsExportBehavior

What output targets are needed?
  Reusable library -> dist (custom elements bundle)
  Framework integration -> dist-react, dist-vue, dist-angular
  Vanilla HTML usage -> www (full app with lazy loading)
  CDN distribution -> dist-custom-elements
```

### Prop Design Decision

```
Should the prop be reflected to attribute?
  Yes -> reflect: true (useful for CSS selectors, framework bindings)
  No -> reflect: false (default, better performance)

Can the component mutate the prop internally?
  Yes -> mutable: true (component can change its own prop value)
  No -> mutable: false (default, prop is read-only)

What type is the prop?
  Primitive (string, number, boolean) -> Auto attribute serialization
  Complex (object, array) -> Pass via JS property (not HTML attr)
```

## Component Design Patterns

### Basic Component with Props

```tsx
import { Component, Prop, h } from '@stencil/core'

@Component({ tag: 'my-button', styleUrl: 'my-button.css', shadow: true })
export class MyButton {
  @Prop({ reflect: true }) variant: 'primary' | 'secondary' = 'primary'
  @Prop({ reflect: true }) disabled = false

  render() {
    return (
      <button class={`btn btn--${this.variant}`} disabled={this.disabled}>
        <slot />
      </button>
    )
  }
}
```

### Component with State and Events

```tsx
import { Component, State, Event, EventEmitter, h } from '@stencil/core'

@Component({ tag: 'my-counter', shadow: true })
export class MyCounter {
  @Prop({ mutable: true }) value = 0
  @State() private internalValue = 0
  @Event() valueChange: EventEmitter<number>

  componentWillLoad() {
    this.internalValue = this.value
  }

  @Watch('value')
  watchValue(newValue: number) {
    this.internalValue = newValue
  }

  private increment() {
    this.internalValue++
    this.valueChange.emit(this.internalValue)
  }

  render() {
    return (
      <div>
        <p>Value: {this.internalValue}</p>
        <button onClick={() => this.increment()}>+</button>
      </div>
    )
  }
}
```

### Form-Associated Component

```tsx
@Component({ tag: 'my-input', formAssociated: true, shadow: true })
export class MyInput {
  @Prop() value = ''
  @Event() valueChange: EventEmitter<string>

  private handleInput(e: InputEvent) {
    const target = e.target as HTMLInputElement
    this.value = target.value
    this.valueChange.emit(this.value)
  }

  render() {
    return <input value={this.value} onInput={(e) => this.handleInput(e)} />
  }
}
```

## State Management Patterns

### Local State with @State

```tsx
@State() private isOpen = false
@State() private items: Item[] = []
```

### Derived State

Use getters or methods. No built-in computed/watch pattern — use @Watch for side effects.

### Context via CSS Custom Properties

```css
/* Parent sets tokens */
:host { --button-bg: blue; --button-color: white; }

/* Child consumes */
:host { background: var(--button-bg); color: var(--button-color); }
```

## Performance Optimization

### Compile-Time Optimization
- Stencil's AOT compiler analyzes component usage and produces optimized bundles.
- Lazy loading: components load via IntersectionObserver when they enter viewport.
- Hydration: Stencil SSR components are incrementally hydrated on the client.
- Tree-shaking: unused components are excluded from production builds.

### Bundle Strategy
- Each component produces a separate chunk (~2-5KB each).
- The `dist` output target creates a custom elements bundle with lazy loading.
- The `dist-custom-elements` target creates a single bundle without lazy loading.
- Runtime: ~8KB gzipped (the Stencil runtime that manages component lifecycle).

### Optimization Techniques
- Use `@Prop({ mutable: false })` for pure inputs — enables better compiler optimizations.
- Use `@State` for internal state, not `@Prop({ mutable: true })`.
- Keep render() pure — no side effects, no data fetching.
- Use `componentShouldUpdate()` for fine-grained render control.

## Build & Bundle Considerations

- Output targets: Configure `stencil.config.ts` with appropriate targets.
- `dist` output: Self-lazy-loading custom elements bundle.
- `dist-custom-elements`: Single-file non-lazy bundle for bundler integration.
- `dist-react`: React component wrappers with proper prop types.
- `dist-vue`: Vue 3 component wrappers.
- `dist-angular`: Angular component wrappers.
- Production builds: `npm run build` with `--prod` flag.
- Source maps: Disable in production with `sourceMap: false`.

## Testing Strategies

### Unit Testing (Jest)

```typescript
import { newSpecPage } from '@stencil/core/testing'
import { MyButton } from './my-button'

describe('my-button', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [MyButton],
      html: '<my-button></my-button>',
    })
    expect(page.root).toEqualHtml(`
      <my-button>
        <mock:shadow-root>
          <button class="btn btn--primary"><slot /></button>
        </mock:shadow-root>
      </my-button>
    `)
  })

  it('renders with custom variant', async () => {
    const page = await newSpecPage({
      components: [MyButton],
      html: '<my-button variant="secondary"></my-button>',
    })
    expect(page.root?.shadowRoot?.querySelector('button')?.classList.contains('btn--secondary')).toBe(true)
  })
})
```

### E2E Testing (Playwright)

```typescript
test('counter increments on click', async ({ page }) => {
  await page.setContent('<my-counter initial-value="5"></my-counter>')
  const counter = page.locator('my-counter')
  await expect(counter).toContainText('5')
  await page.click('my-counter')
  await expect(counter).toContainText('6')
})
```

### Key Testing Practices
- `newSpecPage()` for unit tests — simulates Stencil's rendering without browser.
- `newE2EPage()` for E2E tests — Playwright-based browser testing.
- Test shadow DOM queries with `page.root.shadowRoot.querySelector`.
- Test event emission: `const spy = await page.spyOnEvent('countChanged')`.

## Migration Patterns

### From Vanilla Custom Elements to Stencil

| Vanilla WC | Stencil |
|------------|---------|
| `class MyEl extends HTMLElement` | `export class MyEl {` (no extends) |
| `observedAttributes()` | `@Prop()` decorator |
| `attributeChangedCallback()` | `@Watch(propName)` |
| `connectedCallback()` | `componentWillLoad()` / `componentDidLoad()` |
| `this.innerHTML = template` | `render() { return <div>...</div> }` |
| `this.dispatchEvent(new CustomEvent(...))` | `this.countChanged.emit(value)` |

### From React Component to Stencil

| React Concept | Stencil Equivalent |
|---------------|-------------------|
| Props | `@Prop()` decorator |
| State | `@State()` decorator |
| useEffect | `componentDidLoad()` / `@Watch()` |
| JSX return | `render()` method |
| Event callbacks | `@Event()` emitter |
| React.memo | `componentShouldUpdate()` |

## Anti-Patterns

1. **Forgetting mutable: true for internal prop changes**: Mark `mutable: true` or use @State copy.
2. **Over-using @Method**: Methods bypass the standard prop/event API — prefer props and events.
3. **Missing event typing**: `@Event() countChanged: EventEmitter<number>` — always type the generic.
4. **Large component bundles**: Keep components under 200 lines — extract helpers and sub-components.
5. **Not generating framework bindings**: dist-custom-elements + dist-react gives consumers JSX type safety.
6. **Shadow DOM + form elements**: Shadow DOM can prevent form submission — use `formAssociated`.
7. **Missing test for component lifecycle**: Test `componentWillLoad`, `componentDidLoad`, `componentWillUpdate`.
8. **CSS leaking without shadow or scoped**: Always set `shadow: true` or `scoped: true`.

## Common Pitfalls

1. Forgetting mutable: true for internal prop changes — use @State or mutable: true.
2. Over-using @Method — prefer props and events for public API.
3. Missing event typing — always type EventEmitter generic.
4. Shadow DOM + form elements — use formAssociated for native form behavior.
5. Not generating framework bindings — consumers lose type safety.

## Compared With

| Aspect | Stencil | Lit | Vanilla WC |
|--------|---------|-----|------------|
| Rendering | JSX (compiled) | lit-html (templates) | Manual DOM |
| Bundle | ~8KB runtime | ~5KB runtime | 0KB |
| Lazy loading | Built-in | Manual | Manual |
| Framework bindings | Auto (React, Vue, Angular) | Manual (@lit/react) | Manual |
| TypeScript | Required | Optional | Optional |
| Shadow DOM | Configurable | Configurable | Manual |

## Lifecycle Reference

| Method | Purpose |
|--------|---------|
| `connectedCallback()` | Element inserted into DOM |
| `disconnectedCallback()` | Element removed from DOM |
| `componentWillLoad()` | Once, before first render |
| `componentDidLoad()` | Once, after first render |
| `componentWillRender()` | Before each render |
| `componentDidRender()` | After each render |
| `componentWillUpdate()` | Before re-render |
| `componentDidUpdate()` | After re-render |
| `render()` | Return JSX for markup |

## Advanced Patterns

### Context / Theme via CSS Custom Properties
```css
:host { --button-bg: blue; --button-color: white; }
:host { background: var(--button-bg); color: var(--button-color); }
```

### Framework Binding Generation
```typescript
// stencil.config.ts
import { reactOutputTarget } from '@stencil/react-output-target'

export const config: Config = {
  outputTargets: [
    reactOutputTarget({ componentCorePackage: 'my-components', proxiesFile: './react-bindings.ts' }),
    { type: 'dist' },
    { type: 'dist-custom-elements' },
  ],
}
```

## Tooling

1. `npm init stencil` — project scaffolding
2. `npm run build` — production build
3. `npm start` — dev server with HMR
4. `npm test` — Jest unit tests
5. `npm run test:e2e` — Playwright E2E
6. Stencil VS Code Extension
7. `@stencil/react-output-target` — React bindings
8. `@stencil/vue-output-target` — Vue bindings
9. `@stencil/angular-output-target` — Angular bindings
10. `@stencil/sass` — Sass support

## Rules
- Use `shadow: true` for style encapsulation (Shadow DOM).
- Props are `camelCase` in JSX, `kebab-case` in HTML.
- Events are dispatched as CustomEvent with `@Event`.
- Use `@Method` sparingly — prefer props and events for public API.
- Render function returns JSX (not template strings).
- Style per component, not global (unless design tokens).
- Use `@stencil/core/testing` for unit tests, Playwright for e2e.
- Mark props as `mutable: true` only when the component itself mutates them.

## References
  - references/stencil-advanced.md — Stencil Advanced Topics
  - references/stencil-architecture.md — Stencil Architecture Patterns
  - references/stencil-components.md — Stencil Components & Patterns
  - references/stencil-deployment.md — Stencil Deployment
  - references/stencil-fundamentals.md — Stencil Fundamentals
  - references/stencil-setup.md — Stencil Setup Guide

## Handoff
No artifact produced.
Next skill: stencil-design-system (if building a design system) or frontend-testing.
Carry forward: @Component/@Prop/@Event pattern, shadow DOM, framework-agnostic output.
## Implementation Patterns

### Factory Pattern for Module Creation
`
function createModule<T>(config: ModuleConfig): T {
  const dependencies = initializeDependencies(config);
  const module = new Module(dependencies);
  module.hooks.onInit();
  return module as T;
}
`

### Builder Pattern for Complex Configuration
`
class ConfigBuilder {
  private config: AppConfig = new AppConfig();
  withDatabase(url: string): ConfigBuilder { ... }
  withCache(ttl: number): ConfigBuilder { ... }
  withLogging(level: string): ConfigBuilder { ... }
  build(): AppConfig { return this.config; }
}
`

## Production Considerations

### Deployment Checklist
- [ ] Production build with optimizations enabled
- [ ] Environment variables configured per environment
- [ ] Health check endpoint responds correctly
- [ ] Error tracking and monitoring integrated
- [ ] Logging level configured (not debug in production)
- [ ] Resource limits configured
- [ ] Database migrations applied
- [ ] Static assets built and served from CDN or cache
- [ ] Feature flags toggled appropriately
- [ ] Rollback plan documented and tested

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% | Critical | Rollback or fix |
| p95 latency | > 500ms | Warning | Profile and optimize |
| Uptime | < 99.9% | Critical | Investigate infrastructure |
| Memory usage | > 80% | Warning | Check for leaks |
| CPU usage | > 80% | Warning | Scale up or optimize |

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets


## Architecture Decision Trees

### Component Type Decision Tree
```
Does the component encapsulate visual rendering?
  ├── No  → Functional component (@stencil/store, no shadow DOM)
  └── Yes → Does it need style isolation?
       ├── Yes → Shadow DOM component (shadow: true)
       └── No  → Scoped component (scoped: true)
            Is it a leaf UI element or composite?
            ├── Leaf → @Prop-driven, no internal state management
            └── Composite → @State + @Watch for internal coordination
```

### Build Output Decision Tree
```
Who will consume this component?
  ├── Same app only → dist-custom-elements or dist
  ├── Multiple frameworks → dist-custom-elements (framework-agnostic)
  └── CDN script tag → dist (self-contained bundle)
       Do consumers use React/Vue/Angular?
       ├── Yes → Generate framework wrappers via outputTargets.bindings
       └── No  → Raw custom elements, document usage
```
