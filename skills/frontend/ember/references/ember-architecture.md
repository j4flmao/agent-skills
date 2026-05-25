# Ember.js Architecture Patterns

## Route Architecture

```ts
// app/router.ts
import EmberRouter from '@ember/routing/router'

Router.map(function () {
  this.route('authenticated', { path: '' }, function () {
    this.route('dashboard')
    this.route('orders', function () {
      this.route('order', { path: '/:order_id' })
      this.route('create')
    })
  })
  this.route('login')
  this.route('register')
})
```

### Route Types

| Type | Purpose | Example |
|------|---------|---------|
| Resource route | CRUD entity | `this.route('posts')` |
| Singular route | Single entity | `this.route('post', { path: '/:post_id' })` |
| Index route | Default child | `posts/index.js` |
| Loading route | Async state | `posts/loading.js` |
| Error route | Error state | `posts/error.js` |

## Module Architecture

```
app/
  routes/             -- Route handlers
  components/         -- UI components
  controllers/        -- Route controllers (query params, actions)
  models/             -- Ember Data models
  services/           -- Shared singletons
  modifiers/          -- DOM modifiers
  helpers/            -- Template helpers
  adapters/           -- API adapters
  serializers/        -- API serializers
  utils/              -- Pure utility functions
  initializers/       -- App boot configuration
  instance-initializers/
  routes/             -- Route definitions
  styles/             -- CSS/Sass
  templates/          -- HTMLBars templates
```

## Component Architecture

### Glimmer Component

```ts
// app/components/data-table.ts
import Component from '@glimmer/component'
import { tracked } from '@glimmer/tracking'
import { action } from '@ember/object'

export interface DataTableSignature {
  Args: {
    rows: Array<Record<string, unknown>>
    columns: Array<{ key: string; label: string }>
    onSelect?: (row: Record<string, unknown>) => void
  }
  Blocks: {
    default: [{ row: Record<string, unknown>; column: { key: string; label: string } }]
  }
  Element: HTMLTableElement
}

export default class DataTableComponent extends Component<DataTableSignature> {
  @tracked sortKey = ''
  @tracked sortAsc = true

  get sortedRows() {
    if (!this.sortKey) return this.args.rows
    return this.args.rows.toSorted((a, b) => {
      const cmp = String(a[this.sortKey]).localeCompare(String(b[this.sortKey]))
      return this.sortAsc ? cmp : -cmp
    })
  }

  @action toggleSort(key: string) {
    if (this.sortKey === key) this.sortAsc = !this.sortAsc
    else { this.sortKey = key; this.sortAsc = true }
  }
}
```

```hbs
<table>
  <thead>
    <tr>
      {{#each @columns as |col|}}
        <th role="button" {{on "click" (fn this.toggleSort col.key)}}>
          {{col.label}}
          {{#if (eq this.sortKey col.key)}}
            {{if this.sortAsc "▲" "▼"}}
          {{/if}}
        </th>
      {{/each}}
    </tr>
  </thead>
  <tbody>
    {{#each this.sortedRows as |row|}}
      <tr {{on "click" (fn @onSelect row)}}>
        {{#each @columns as |col|}}
          <td>{{get row col.key}}</td>
        {{/each}}
      </tr>
    {{/each}}
  </tbody>
</table>
```

## Service Architecture

```ts
// app/services/notification.ts
import Service from '@ember/service'
import { tracked } from '@glimmer/tracking'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  timeout?: number
}

export default class NotificationService extends Service {
  @tracked notifications: Notification[] = []

  add(type: Notification['type'], message: string, timeout = 5000) {
    const notification = { id: crypto.randomUUID(), type, message, timeout }
    this.notifications = [...this.notifications, notification]
    if (timeout > 0) {
      setTimeout(() => this.remove(notification.id), timeout)
    }
  }

  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id)
  }
}
```

## Modifier Architecture

```ts
// app/modifiers/click-outside.ts
import Modifier from 'ember-modifier'
import { registerDestructor } from '@ember/destroyable'

export default class ClickOutsideModifier extends Modifier {
  handler: ((e: MouseEvent) => void) | null = null

  modify(element: HTMLElement, [callback]: [() => void]) {
    this.handler = (e: MouseEvent) => {
      if (!element.contains(e.target as Node)) callback()
    }
    document.addEventListener('click', this.handler, true)
    registerDestructor(this, () => {
      document.removeEventListener('click', this.handler!, true)
    })
  }
}
```

```hbs
<div {{click-outside this.close}}>
  Dropdown content
</div>
```

## Testing Architecture

| Test Type | File Location | Tool |
|-----------|--------------|------|
| Unit | `tests/unit/` | QUnit/Jasmine |
| Integration | `tests/integration/` | @ember/test-helpers |
| Acceptance | `tests/acceptance/` | @ember/test-helpers |
| Rendering | `tests/integration/components/` | @ember/test-helpers |
