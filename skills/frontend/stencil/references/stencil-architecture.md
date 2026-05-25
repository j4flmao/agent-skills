# Stencil Architecture Patterns

## Component Composition

### Parent-Child Communication

```tsx
@Component({ tag: 'user-list', shadow: true })
export class UserList {
  @Prop() users: User[] = []
  @Event() userSelect: EventEmitter<string>

  render() {
    return (
      <Host>
        {this.users.map(user => (
          <user-card
            user={user}
            onCardClick={() => this.userSelect.emit(user.id)}
          />
        ))}
      </Host>
    )
  }
}

@Component({ tag: 'user-card', shadow: true })
export class UserCard {
  @Prop() user!: User
  @Event() cardClick: EventEmitter<void>

  render() {
    return (
      <div class="card" onClick={() => this.cardClick.emit()}>
        <h3>{this.user.name}</h3>
        <slot />
      </div>
    )
  }
}
```

## State Management

### Internal State

```tsx
@Component({ tag: 'data-table', shadow: true })
export class DataTable {
  @Prop() data: Row[] = []
  @State() private sortField: string = ''
  @State() private sortAsc: boolean = true
  @State() private currentPage: number = 1

  private get sortedData(): Row[] {
    if (!this.sortField) return this.data
    return [...this.data].sort((a, b) => {
      const cmp = String(a[this.sortField]).localeCompare(String(b[this.sortField]))
      return this.sortAsc ? cmp : -cmp
    })
  }

  componentRender() {
    return this.sortedData
  }

  render() {
    return (
      <Host>
        <table>
          <thead>{this.renderHeaders()}</thead>
          <tbody>{this.renderRows()}</tbody>
        </table>
        {this.renderPagination()}
      </Host>
    )
  }

  private renderHeaders() {
    return (
      <tr>
        {this.columns.map(col => (
          <th onClick={() => this.toggleSort(col.key)}>
            {col.label} {this.sortField === col.key ? (this.sortAsc ? '▲' : '▼') : ''}
          </th>
        ))}
      </tr>
    )
  }

  private toggleSort(field: string) {
    if (this.sortField === field) this.sortAsc = !this.sortAsc
    else { this.sortField = field; this.sortAsc = true }
  }
}
```

### Global Store Pattern

```typescript
// store/app.store.ts
type Listener = () => void

export class AppStore {
  private state: Record<string, unknown> = {}
  private listeners = new Map<string, Set<Listener>>()

  get<T>(key: string): T { return this.state[key] as T }

  set<T>(key: string, value: T) {
    this.state[key] = value
    this.listeners.get(key)?.forEach(l => l())
  }

  subscribe(key: string, listener: Listener) {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set())
    this.listeners.get(key)!.add(listener)
    return () => this.listeners.get(key)?.delete(listener)
  }
}

export const store = new AppStore()
```

## Slot Composition

```tsx
@Component({ tag: 'modal-dialog', shadow: true })
export class ModalDialog {
  @Prop({ mutable: true, reflect: true }) open = false
  @Event() close: EventEmitter<void>

  render() {
    return (
      <Host>
        {this.open && (
          <div class="backdrop" onClick={() => this.close.emit()}>
            <div class="modal" onClick={e => e.stopPropagation()}>
              <div class="header">
                <slot name="title" />
                <button onClick={() => this.close.emit()}>×</button>
              </div>
              <div class="body">
                <slot />
              </div>
              <div class="footer">
                <slot name="actions" />
              </div>
            </div>
          </div>
        )}
      </Host>
    )
  }
}
```

## Form Architecture

```tsx
@Component({ tag: 'contact-form', shadow: true })
export class ContactForm {
  @State() private form = { name: '', email: '', message: '' }
  @State() private errors: Partial<Record<keyof typeof this.form, string>> = {}
  @State() private submitted = false
  @Event() formSubmit: EventEmitter<typeof this.form>

  private validate(): boolean {
    this.errors = {}
    if (!this.form.name) this.errors.name = 'Name is required'
    if (!/^[^\s@]+@[^\s@]+$/.test(this.form.email)) this.errors.email = 'Invalid email'
    if (!this.form.message) this.errors.message = 'Message is required'
    return Object.keys(this.errors).length === 0
  }

  private handleSubmit(e: Event) {
    e.preventDefault()
    if (!this.validate()) return
    this.formSubmit.emit(this.form)
    this.submitted = true
  }

  render() {
    if (this.submitted) return <div class="success">Thank you!</div>

    return (
      <form onSubmit={e => this.handleSubmit(e)}>
        <input value={this.form.name} onInput={e => this.form.name = e.target.value} />
        {this.errors.name && <span>{this.errors.name}</span>}

        <input type="email" value={this.form.email}
               onInput={e => this.form.email = e.target.value} />
        {this.errors.email && <span>{this.errors.email}</span>}

        <textarea value={this.form.message}
                  onInput={e => this.form.message = e.target.value} />
        {this.errors.message && <span>{this.errors.message}</span>}

        <button type="submit">Submit</button>
      </form>
    )
  }
}
```

## Lifecycle Flow

| Hook | Purpose | Called |
|------|---------|--------|
| connectedCallback | Element added to DOM | Once |
| componentWillLoad | First render before | Once |
| componentDidLoad | First render after | Once |
| componentWillRender | Before every render | Multiple |
| componentDidRender | After every render | Multiple |
| componentWillUpdate | Before re-render | Multiple |
| componentDidUpdate | After re-render | Multiple |
| disconnectedCallback | Element removed from DOM | Once |
