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

## Workflow

### Step 1: New Project
```bash
npm init stencil
# Select component (library) or app
cd my-components
npm install
npm start
```

### Step 2: Basic Component
```tsx
// src/components/my-button/my-button.tsx
import { Component, Prop, h } from '@stencil/core'

@Component({
  tag: 'my-button',
  styleUrl: 'my-button.css',
  shadow: true,
})
export class MyButton {
  @Prop() variant: 'primary' | 'secondary' = 'primary'
  @Prop() disabled = false

  render() {
    return (
      <button class={`btn btn--${this.variant}`} disabled={this.disabled}>
        <slot />
      </button>
    )
  }
}
```

### Step 3: State & Events
```tsx
import { Component, State, Event, EventEmitter, Prop, h } from '@stencil/core'

@Component({
  tag: 'my-counter',
  styleUrl: 'my-counter.css',
  shadow: true,
})
export class MyCounter {
  @Prop() initialValue = 0
  @State() count = 0
  @Event() countChanged: EventEmitter<number>

  componentWillLoad() {
    this.count = this.initialValue
  }

  private increment() {
    this.count++
    this.countChanged.emit(this.count)
  }

  render() {
    return (
      <div>
        <p>Count: {this.count}</p>
        <button onClick={() => this.increment()}>+1</button>
      </div>
    )
  }
}
```

### Step 4: Methods
```tsx
import { Component, Method, h } from '@stencil/core'

@Component({ tag: 'my-dialog', shadow: true })
export class MyDialog {
  private dialogEl!: HTMLDialogElement

  @Method()
  async open() {
    this.dialogEl.showModal()
  }

  @Method()
  async close() {
    this.dialogEl.close()
  }

  render() {
    return (
      <dialog ref={el => this.dialogEl = el as HTMLDialogElement}>
        <slot />
      </dialog>
    )
  }
}
```

### Step 5: Consuming Components
```html
<!-- Vanilla HTML -->
<my-counter initial-value="5"></my-counter>

<!-- React via bindings -->
<MyCounter initialValue={5} onCountChanged={handleChange} />
```

### Step 6: Build
```bash
npm run build
# Output: dist/ with lazy-loaded bundles
```

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
- `references/stencil-setup.md` — CLI, config, build output, testing, framework bindings
- `references/stencil-components.md` — decorators, lifecycle, slots, styling, patterns

## Handoff
No artifact produced.
Next skill: stencil-design-system (if building a design system) or frontend-testing.
Carry forward: @Component/@Prop/@Event pattern, shadow DOM, framework-agnostic output.
