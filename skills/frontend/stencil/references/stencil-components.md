# Stencil Components & Patterns

## Decorator Reference

| Decorator | Purpose | Key Options |
|-----------|---------|-------------|
| `@Component` | Component metadata | `tag`, `styleUrl`, `shadow`, `scoped` |
| `@Prop` | Public property (attribute) | `mutable`, `reflect`, `required` |
| `@State` | Internal reactive state | — |
| `@Event` | Custom DOM event | `bubbles`, `composed`, `eventName` |
| `@Method` | Exposed public method | — |
| `@Element` | Host element reference | — |
| `@Watch` | Watch prop/state changes | — |
| `@Listen` | Listen to DOM events | `target`, `capture`, `passive` |

## Component Lifecycle

```
1. constructor()
2. connectedCallback()          — component inserted into DOM
3. componentWillLoad()          — once, before first render
4. componentWillRender()        — before each render
5. render()                     — JSX render
6. componentDidRender()         — after each render
7. componentDidLoad()           — once, after first render
8. disconnectedCallback()       — component removed from DOM
```

```tsx
@Component({ tag: 'my-lifecycle' })
export class MyLifecycle {
  componentWillLoad() {
    console.log('1. Will load')
  }

  componentDidLoad() {
    console.log('3. Did load')
  }

  componentWillRender() {
    console.log('2. Will render')
  }

  componentDidRender() {
    console.log('4. Did render')
  }

  disconnectedCallback() {
    console.log('5. Disconnected')
  }
}
```

## Component Patterns

### Basic Component with Props

```tsx
@Component({
  tag: 'my-avatar',
  styleUrl: 'my-avatar.css',
  shadow: true,
})
export class MyAvatar {
  @Prop() src: string
  @Prop() alt = 'Avatar'
  @Prop({ reflect: true }) size: 'sm' | 'md' | 'lg' = 'md'

  render() {
    return (
      <div class={`avatar avatar--${this.size}`}>
        {this.src
          ? <img src={this.src} alt={this.alt} loading="lazy" />
          : <slot />}
      </div>
    )
  }
}
```

### State & Events

```tsx
@Component({
  tag: 'my-accordion',
  shadow: true,
})
export class MyAccordion {
  @Prop() title: string
  @Prop({ reflect: true }) expanded = false
  @State() animating = false

  @Event() accordionToggle: EventEmitter<{ expanded: boolean }>

  @Watch('expanded')
  onExpandedChange(newVal: boolean, oldVal: boolean) {
    if (newVal !== oldVal) {
      this.accordionToggle.emit({ expanded: newVal })
    }
  }

  private toggle() {
    this.expanded = !this.expanded
  }

  render() {
    return (
      <div class="accordion">
        <button class="accordion-header" onClick={() => this.toggle()}>
          {this.title}
          <span class="icon">{this.expanded ? '−' : '+'}</span>
        </button>
        <div class="accordion-body" hidden={!this.expanded}>
          <slot />
        </div>
      </div>
    )
  }
}
```

### Form Component

```tsx
@Component({
  tag: 'my-input',
  shadow: true,
})
export class MyInput {
  @Prop() label: string
  @Prop() value: string
  @Prop() placeholder: string
  @Prop({ reflect: true }) error: string
  @Prop() disabled = false
  @Prop() type: 'text' | 'email' | 'password' = 'text'

  @Event() inputChange: EventEmitter<string>
  @Event() inputBlur: EventEmitter<void>

  private inputEl!: HTMLInputElement

  @Method()
  async focusInput() {
    this.inputEl?.focus()
  }

  @Method()
  async validate(): Promise<boolean> {
    if (this.required && !this.value) {
      this.error = `${this.label} is required`
      return false
    }
    this.error = ''
    return true
  }

  private handleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value
    this.inputChange.emit(val)
  }

  render() {
    return (
      <div class="input-wrapper">
        {this.label && <label>{this.label}</label>}
        <input
          ref={el => this.inputEl = el!}
          type={this.type}
          value={this.value}
          placeholder={this.placeholder}
          disabled={this.disabled}
          onInput={(e) => this.handleInput(e)}
          onBlur={() => this.inputBlur.emit()}
          class={{ 'has-error': !!this.error }}
        />
        {this.error && <span class="error-msg">{this.error}</span>}
      </div>
    )
  }
}
```

## Styling Strategies

### Shadow DOM (encapsulated)

```tsx
@Component({
  tag: 'my-card',
  styleUrl: 'my-card.css',  // Styles scoped via Shadow DOM
  shadow: true,
})
```

```css
/* my-card.css — scoped to shadow root */
:host {
  display: block;
  border-radius: 8px;
  padding: 16px;
  background: var(--card-bg, #fff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:host([variant="outlined"]) {
  border: 1px solid var(--color-border, #e0e0e0);
  box-shadow: none;
}

::slotted(img) {
  width: 100%;
  border-radius: 4px;
}
```

### Scoped CSS (encapsulated without Shadow DOM)

```tsx
@Component({
  tag: 'my-widget',
  styleUrl: 'my-widget.css',  // Scoped via attribute selectors
  scoped: true,                // Not true Shadow DOM
})
```

### Global + Shadow CSS Variables

```css
/* global/app.css — CSS custom properties */
:root {
  --color-primary: #6366f1;
  --color-primary-hover: #4f46e5;
  --color-text: #1a1a2e;
  --color-text-secondary: #64748b;
  --radius-sm: 4px;
  --radius-md: 8px;
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

```css
/* my-component.css — consumes variables */
button {
  background: var(--color-primary);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
}
```

## Slot Patterns

### Named Slots

```tsx
@Component({ tag: 'my-layout', shadow: true })
export class MyLayout {
  render() {
    return (
      <div class="layout">
        <header><slot name="header" /></header>
        <main><slot /></main>
        <footer><slot name="footer" /></footer>
      </div>
    )
  }
}
```

```html
<my-layout>
  <h1 slot="header">Page Title</h1>
  <p>Main content</p>
  <p slot="footer">Footer text</p>
</my-layout>
```

## Event Handling

```tsx
// Listening on host element
@Listen('click', { capture: true })
onClick(e: MouseEvent) {
  console.log('Host clicked', e)
}

// Listening on window
@Listen('resize', { target: 'window' })
onResize() {
  console.log('Window resized')
}

// Listening on document
@Listen('keydown', { target: 'document' })
onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') this.close()
}
```

## Composition Pattern

```tsx
// Parent component
@Component({ tag: 'my-select', shadow: true })
export class MySelect {
  @Prop() label: string
  @State() open = false

  @Event() selectChange: EventEmitter<string>

  render() {
    return (
      <div class="select">
        <button onClick={() => this.open = !this.open}>
          {this.label}
        </button>
        <div class="dropdown" hidden={!this.open}>
          <slot />
        </div>
      </div>
    )
  }
}

// Child for use inside select
@Component({ tag: 'my-option', shadow: true })
export class MyOption {
  @Prop() value: string

  render() {
    return (
      <div class="option" onClick={() => {
        this.selectChange.emit(this.value)
      }}>
        <slot />
      </div>
    )
  }
}
```

```html
<my-select label="Choose...">
  <my-option value="1">Option One</my-option>
  <my-option value="2">Option Two</my-option>
</my-select>
```

## Performance Patterns

1. **Use `@State` for internal, `@Prop` for external** — don't mix concerns
2. **Minimize reactive properties** — each `@Prop` and `@State` triggers re-render
3. **Use `componentWillLoad`** for async setup — runs before first render
4. **Use `shouldComponentUpdate`** (via Gurad) to skip unnecessary renders
5. **Lazy loading** is automatic — Stencil splits per component
6. **Use `key` in lists** — `{items.map(i => <div key={i.id} />)}` for stable identity
7. **Avoid heavy computation in render()** — cache with getters or `@Watch`
