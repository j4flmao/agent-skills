# Lit Architecture Patterns

## Component Composition

### Parent-Child Communication

```typescript
// Parent component
@customElement('user-form')
export class UserForm extends LitElement {
  @state() private users: User[] = []
  @state() private selectedId: string | null = null

  render() {
    return html`
      <user-list
        .users=${this.users}
        .selectedId=${this.selectedId}
        @user-select=${(e: CustomEvent) => this.selectedId = e.detail}>
      </user-list>
      ${when(this.selectedId, () => html`
        <user-detail .userId=${this.selectedId}></user-detail>
      `)}
    `
  }
}
```

### Slot-Based Composition

```typescript
@customElement('card-layout')
export class CardLayout extends LitElement {
  static styles = css`
    :host { display: block; border: 1px solid #ddd; border-radius: 8px; }
    .header { padding: 16px; border-bottom: 1px solid #eee; }
    .body { padding: 16px; }
    .footer { padding: 16px; border-top: 1px solid #eee; }
  `

  render() {
    return html`
      <div class="header"><slot name="header"><h2>Card</h2></slot></div>
      <div class="body"><slot></slot></div>
      <div class="footer"><slot name="footer"></slot></div>
    `
  }
}
```

```typescript
// Usage
html`
  <card-layout>
    <span slot="header">User Details</span>
    <p>Main content here</p>
    <div slot="footer">
      <button @click=${this.save}>Save</button>
    </div>
  </card-layout>
`
```

## State Management

### External Store Pattern

```typescript
// store/user-store.ts
type Listener = () => void

class UserStore {
  private users: User[] = []
  private listeners = new Set<Listener>()

  getUsers() { return this.users }
  async fetchUsers() {
    this.users = await api.getUsers()
    this.notify()
  }
  addUser(user: User) {
    this.users = [...this.users, user]
    this.notify()
  }
  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  private notify() { this.listeners.forEach(l => l()) }
}

export const userStore = new UserStore()
```

```typescript
// Component consuming the store
@customElement('user-count')
export class UserCount extends LitElement {
  private _users: User[] = []
  private _unsub?: () => void

  connectedCallback() {
    super.connectedCallback()
    this._unsub = userStore.subscribe(() => {
      this._users = userStore.getUsers()
      this.requestUpdate()
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._unsub?.()
  }

  render() {
    return html`<span>Users: ${this._users.length}</span>`
  }
}
```

## Routing Pattern

```typescript
@customElement('app-root')
export class AppRoot extends LitElement {
  @state() private route = ''

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('popstate', () => this._updateRoute())
    this._updateRoute()
  }

  private _updateRoute() {
    this.route = window.location.pathname
  }

  private _navigate(path: string, event: Event) {
    event.preventDefault()
    history.pushState(null, '', path)
    this._updateRoute()
  }

  render() {
    const route = this.route
    return html`
      <nav>
        <a href="/" @click=${(e: Event) => this._navigate('/', e)}>Home</a>
        <a href="/about" @click=${(e: Event) => this._navigate('/about', e)}>About</a>
      </nav>
      <main>
        ${route === '/' ? html`<home-page></home-page>` :
         route === '/about' ? html`<about-page></about-page>` :
         html`<not-found></not-found>`}
      </main>
    `
  }
}
```

## Context Protocol

```typescript
import { createContext, ContextConsumer, ContextProvider } from '@lit/context'

export interface Theme {
  primary: string
  background: string
  text: string
}

export const themeContext = createContext<Theme>(Symbol('theme'))

// Provider
@customElement('theme-provider')
export class ThemeProvider extends LitElement {
  @property({ type: Object }) theme: Theme = {
    primary: '#3b82f6',
    background: '#ffffff',
    text: '#1a1a1a',
  }

  render() {
    return html`
      <context-provider .value=${this.theme} .context=${themeContext}>
        <slot></slot>
      </context-provider>
    `
  }
}

// Consumer
@customElement('themed-button')
export class ThemedButton extends LitElement {
  @consume({ context: themeContext })
  theme: Theme = { primary: '#3b82f6', background: '#fff', text: '#000' }

  static styles = css`:host { display: inline-block; }`

  render() {
    return html`
      <button style="background: ${this.theme.primary}; color: white;">
        <slot></slot>
      </button>
    `
  }
}
```

## Testing Architecture

```typescript
import { fixture, assert } from '@open-wc/testing'
import './my-component.js'

describe('MyComponent', () => {
  it('renders with default props', async () => {
    const el = await fixture<MyComponent>(html`<my-component></my-component>`)
    await el.updateComplete
    assert.shadowDom.equal(el, '<div>Hello World</div>')
  })

  it('reacts to property changes', async () => {
    const el = await fixture<MyComponent>(html`<my-component></my-component>`)
    el.name = 'Lit'
    await el.updateComplete
    assert.shadowDom.equal(el, '<div>Hello Lit</div>')
  })
})
```
