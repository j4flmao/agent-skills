# Ember.js Patterns & Best Practices

## Component Patterns

### Glimmer Component (Octane)

```ts
// app/components/ui/button.ts
import Component from '@glimmer/component'
import { action } from '@ember/object'

export interface UIButtonSignature {
  Args: {
    label: string
    variant?: 'primary' | 'secondary'
    disabled?: boolean
    onClick?: () => void
  }
  Element: HTMLButtonElement
}

export default class UIButtonComponent extends Component<UIButtonSignature> {
  get classes() {
    return [
      'btn',
      this.args.variant ?? 'primary',
      this.args.disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ')
  }

  @action
  handleClick(event: MouseEvent) {
    if (this.args.disabled) return
    this.args.onClick?.()
  }
}
```

```hbs
{{! app/components/ui/button.hbs }}
<button
  type="button"
  class="btn {{this.variant}}"
  disabled={{@disabled}}
  {{on "click" this.handleClick}}
>
  {{yield}}
</button>
```

### Template-Only Component

```hbs
{{! app/components/ui/badge.hbs }}
{{! No backing class needed }}
<span class="badge badge--{{@variant}}">
  {{yield}}
</span>
```

### Contextual Component

```hbs
{{! app/components/ui/menu.hbs }}
<div class="menu">
  <button {{on "click" this.toggle}}>
    {{@label}}
  </button>
  {{#if this.isOpen}}
    <div class="menu-items" {{on-click-outside this.close}}>
      {{yield (hash
        item=(component "ui/menu-item")
      )}}
    </div>
  {{/if}}
</div>
```

## Route Patterns

### Route with Dynamic Segment

```ts
// app/routes/posts/post.ts
import Route from '@ember/routing/route'
import { service } from '@ember/service'

export default class PostRoute extends Route {
  @service declare store: any
  @service declare router: any

  async model(params: { post_id: string }) {
    return this.store.findRecord('post', params.post_id)
  }

  afterModel(model: any) {
    if (!model) {
      this.router.transitionTo('not-found')
    }
  }

  setupController(controller: any, model: any) {
    super.setupController(controller, model)
    controller.set('relatedPosts', model.hasMany('comments').value())
  }
}
```

### Route with Query Params

```ts
// app/controllers/posts.ts
import Controller from '@ember/controller'
import { tracked } from '@glimmer/tracking'
import { action } from '@ember/object'

export default class PostsController extends Controller {
  @tracked page = 1
  @tracked sort = 'date'

  queryParams = ['page', 'sort']

  get hasNextPage() {
    return this.model?.length >= 20
  }

  @action
  nextPage() {
    this.page += 1
  }
}
```

## Ember Data Patterns

### Model Definition

```ts
// app/models/post.ts
import Model, { attr, hasMany, belongsTo } from '@ember-data/model'

export default class PostModel extends Model {
  @attr('string') declare title: string
  @attr('string') declare body: string
  @attr('date') declare createdAt: Date
  @attr('boolean') declare published: boolean
  @attr('number') declare viewCount: number
  @attr('object') declare metadata: Record<string, unknown>

  @belongsTo('user', { async: true, inverse: 'posts' }) declare author: any
  @hasMany('comment', { async: true, inverse: 'post' }) declare comments: any

  get excerpt() {
    return this.body?.substring(0, 200)
  }

  get formattedDate() {
    return this.createdAt?.toLocaleDateString()
  }
}
```

### Querying Data

```ts
// In a route or service
const posts = await this.store.findAll('post', {
  include: 'author,comments',
  reload: true,
})

const post = await this.store.findRecord('post', id, {
  adapterOptions: { version: 2 },
})

const results = await this.store.query('post', {
  filter: { published: true },
  sort: '-createdAt',
  page: { number: 1, size: 20 },
})

const cached = this.store.peekRecord('post', id)
const allCached = this.store.peekAll('post')
```

### Creating & Updating

```ts
// Create
const post = this.store.createRecord('post', {
  title: 'New Post',
  body: 'Content',
})
await post.save()

// Update
post.title = 'Updated Title'
await post.save()

// Delete
await post.destroyRecord()
```

## Service Patterns

```ts
// app/services/current-user.ts
import Service from '@ember/service'
import { tracked } from '@glimmer/tracking'
import { service } from '@ember/service'

export default class CurrentUserService extends Service {
  @service declare session: any
  @service declare store: any

  @tracked user: any = null
  @tracked loading = false

  get isLoggedIn() {
    return !!this.user
  }

  get isAdmin() {
    return this.user?.role === 'admin'
  }

  async load() {
    if (!this.session.isAuthenticated) return
    this.loading = true
    this.user = await this.store.findRecord('user', this.session.currentUserId)
    this.loading = false
  }

  async logout() {
    this.user = null
    await this.session.invalidate()
  }
}
```

```ts
// In consuming code
import { service } from '@ember/service'

export default class SomeComponent extends Component {
  @service declare currentUser: any

  get greeting() {
    return `Hello, ${this.currentUser.user?.name ?? 'Guest'}`
  }
}
```

## Modifier Patterns

### Built-in Modifier (ember-render-modifiers)

```hbs
<div {{did-insert this.setupChart @data}}
     {{did-update this.updateChart @data}}
     {{will-destroy this.teardownChart}}>
</div>
```

### Custom Modifier

```ts
// app/modifiers/click-outside.ts
import Modifier from 'ember-modifier'
import { service } from '@ember/service'

interface ClickOutsideSignature {
  Args: {
    Positional: [handler: () => void]
  }
  Element: HTMLElement
}

export default class ClickOutsideModifier extends Modifier<ClickOutsideSignature> {
  handler = (event: MouseEvent) => {
    if (!this.element.contains(event.target as Node)) {
      this.args.positional[0]()
    }
  }

  modify(element: HTMLElement, [handler]: [() => void]) {
    document.addEventListener('click', this.handler, true)
    return () => document.removeEventListener('click', this.handler, true)
  }
}
```

```hbs
<div {{click-outside this.close}}>
  Dropdown content
</div>
```

## Helper Patterns

```ts
// app/helpers/format-date.ts
import { helper } from '@ember/component/helper'

export function formatDate([date]: [Date], options: { format?: string } = {}) {
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(options.format ? {} : {}),
  })
}

export default helper(formatDate)
```

```hbs
{{format-date post.createdAt}}
{{format-date post.createdAt format="short"}}
```

## Testing Patterns

### Component Test

```ts
// tests/integration/components/ui/button-test.ts
import { module, test } from 'qunit'
import { setupRenderingTest } from 'my-app/tests/helpers'
import { render, click } from '@ember/test-helpers'
import { hbs } from 'ember-cli-htmlbars'

module('Integration | Component | ui/button', function (hooks) {
  setupRenderingTest(hooks)

  test('it renders and handles clicks', async function (assert) {
    this.set('label', 'Click me')
    this.set('onClick', () => assert.step('clicked'))

    await render(hbs`
      <UIButton @label={{this.label}} @onClick={{this.onClick}} />
    `)

    assert.dom('button').hasText('Click me')
    await click('button')
    assert.verifySteps(['clicked'])
  })
})
```

### Route Test

```ts
// tests/unit/routes/posts-test.ts
import { module, test } from 'qunit'
import { setupTest } from 'my-app/tests/helpers'

module('Unit | Route | posts', function (hooks) {
  setupTest(hooks)

  test('it exists', function (assert) {
    const route = this.owner.lookup('route:posts')
    assert.ok(route)
  })
})
```

## Performance Patterns

1. **Avoid rerenders** — use `{{fn}}` instead of creating closures in templates
2. **Track minimal state** — only `@tracked` what changes
3. **Use `ember-concurrency`** for async tasks instead of manual promise management
4. **Lazy load routes** — split routes lazily with dynamic imports
5. **Use `@cached`** for expensive computed properties
6. **Pagination** — use query params for server-side pagination
7. **Immutable data** — treat Ember Data records as immutable; create new records for edits
