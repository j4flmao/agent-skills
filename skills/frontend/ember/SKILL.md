---
name: ember
description: >
  Use this skill when the user says 'Ember.js', 'Ember app', 'Ember setup', 'Ember CLI', 'Ember Data', 'Ember Octane', 'Ember component', 'Ember route', 'Ember service', or when building ambitious web applications with Ember.js. This skill enforces: convention over configuration, Ember CLI for code generation, Ember Data for state management, Octane patterns (glimmer components, tracked properties, native classes). Requires package.json with ember-source or ember-cli. Do NOT use for: React/Vue/Angular projects, vanilla JS, or non-Ember projects.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, ember, phase-2]
---

# Ember.js

## Purpose
Build ambitious web applications using Ember's convention-over-configuration approach — Ember CLI for scaffolding, Ember Data for state management, and Octane-era patterns for modern components.

## Agent Protocol

### Trigger
Exact user phrases: "Ember setup", "Ember app", "Ember CLI", "Ember Data", "Ember Octane", "Ember component", "Ember route", "Ember service", "Ember project", "ember.js".

### Input Context
Before activating, verify:
- package.json has ember-source or ember-cli.
- Whether the project uses Ember Octane (v3.15+) or classic (v3.14-).
- Whether Ember Data or other data layer (Apollo, fetch).

### Output Artifact
No file output. Produces code snippets and structural guidance as text.

### Response Format
Code with Ember conventions:
```ts
// app/routes/index.ts
import Route from '@ember/routing/route'
import { service } from '@ember/service'
```

No preamble. No postamble. No explanations. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Routes defined in app/router.ts with corresponding route files.
- [ ] Templates use Ember/Glimmer syntax ({{each}}, {{if}}).
- [ ] Components are Glimmer components (native class, <template> or template-only).
- [ ] Ember Data models defined with @attr, @belongsTo, @hasMany.
- [ ] Services for shared state with @service injection.
- [ ] Modifiers for DOM interactions (ember-render-modifiers or custom).
- [ ] Tests for routes, components, and services.

### Max Response Length
~4096 tokens.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Glimmer component (native class) | Full lifecycle, tracked state | Interactive components with logic |
| Template-only (.hbs) | Zero JS, pure display | Static UI, presentational |
| Classic component | Legacy, deprecated | Old code, migration path only |
| Custom modifier | DOM interaction only | Event listeners, scroll handling |
| Helper function | Pure transformations | Formatting, math, string utils |

### Component Type Decision

```
What is the component's purpose?
  Pure display (no logic, no state) -> Template-only component (.hbs only)
  Display with local state -> Glimmer component (native class + @tracked)
  Encapsulated behavior + template -> Classic component (deprecated, avoid)
  Reusable DOM interaction -> Custom modifier (use:)
  Contextual helper -> Helper function (pure, no state)
```

### State Management Decision

```
Where does the data live?
  Per-component, ephemeral -> @tracked property on the component
  Shared across routes -> Route model hook + service caching
  Global application state -> Service (@service injection)
  Persisted server data -> Ember Data store (this.store.findAll)
  URL state -> Query params on controller
```

### Data Loading Decision

```
Where is the data needed?
  Single route -> model() hook in route
  Multiple routes sharing data -> Parent route model + modelFor on child
  Global (user, session) -> Service loaded in application route
  Lazy / on-demand -> this.store.findRecord in component (Octane)
  Real-time -> Ember Concurrency or tracked tasks
```

## Component Design Patterns

### Route with Model Hook

```typescript
// app/routes/posts.ts
import Route from '@ember/routing/route'
import { service } from '@ember/service'

export default class PostsRoute extends Route {
  @service declare store: Store

  async model(params: { page: string }) {
    const page = parseInt(params.page) || 1
    return this.store.findAll('post', { page })
  }
}
```

### Glimmer Component with Tracked

```typescript
// app/components/post-card.ts
import Component from '@glimmer/component'
import { tracked } from '@glimmer/tracking'
import { action } from '@ember/object'

interface Args {
  post: Post
  onSelect: (id: string) => void
}

export default class PostCard extends Component<Args> {
  @tracked isExpanded = false

  get excerpt() {
    return this.args.post.body.length > 100
      ? this.args.post.body.slice(0, 100) + '...'
      : this.args.post.body
  }

  @action
  toggleExpand() {
    this.isExpanded = !this.isExpanded
  }

  @action
  select() {
    this.args.onSelect(this.args.post.id)
  }
}
```

```handlebars
{{! app/components/post-card.hbs }}
<article class="post-card">
  <h2>{{@post.title}}</h2>
  <p>{{if this.isExpanded @post.body this.excerpt}}</p>
  <button type="button" {{on "click" this.toggleExpand}}>
    {{if this.isExpanded "Show less" "Show more"}}
  </button>
</article>
```

### Template-Only Component

```handlebars
{{! app/components/ui/button.hbs }}
<button class="btn btn--{{@variant}}" type="button" ...attributes>
  {{yield}}
</button>
```

### Service with Ember Data

```typescript
// app/services/post-store.ts
import Service from '@ember/service'
import { service } from '@ember/service'
import { tracked } from '@glimmer/tracking'

export default class PostStoreService extends Service {
  @service declare store: Store
  @tracked currentPostId: string | null = null

  get currentPost() {
    return this.currentPostId
      ? this.store.peekRecord('post', this.currentPostId)
      : null
  }

  async findByTag(tag: string) {
    return this.store.query('post', { tag })
  }

  async createPost(data: Partial<Post>) {
    const post = this.store.createRecord('post', data)
    await post.save()
    return post
  }
}
```

### Custom Modifier

```typescript
// app/modifiers/click-outside.ts
import Modifier from 'ember-modifier'

interface Args {
  positional: []
  named: { action: () => void }
}

export default class ClickOutsideModifier extends Modifier<Args> {
  private handler: ((e: MouseEvent) => void) | null = null

  didReceiveArguments() {
    this.handler = (e: MouseEvent) => {
      if (!this.element.contains(e.target as Node)) {
        this.args.named.action()
      }
    }
    document.addEventListener('click', this.handler, true)
  }

  willRemove() {
    if (this.handler) {
      document.removeEventListener('click', this.handler, true)
    }
  }
}
```

## State Management Patterns

### Ember Data Store

```typescript
// Fetching
const posts = await this.store.findAll('post')
const post = await this.store.findRecord('post', id)
const results = await this.store.query('post', { category: 'tech' })

// Creating
const post = this.store.createRecord('post', { title: 'New', body: '...' })
await post.save()

// Updating
post.title = 'Updated'
await post.save()

// Deleting
await post.destroyRecord()
```

### Service-Based State

Services are singletons injected with `@service`. Use `@tracked` for reactive properties:

```typescript
@service declare auth: AuthService
@service declare cart: CartService

// In template: {{this.auth.user.name}}
```

### URL State via Query Params

```typescript
// app/controllers/posts.ts
import Controller from '@ember/controller'
import { tracked } from '@glimmer/tracking'

export default class PostsController extends Controller {
  @tracked page = 1
  queryParams = ['page']
}
```

## Performance Optimization

### Rendering Performance
- Glimmer VM is the fastest Ember rendering engine — Octane apps render 3-5x faster than classic.
- @tracked properties enable fine-grained reactivity — only dependent DOM sections re-render.
- Template-only components have zero JS overhead.
- Angle bracket syntax (<MyComponent />) is faster than classic {{my-component}} invocation.

### Bundle Size
- Ember base: ~100KB gzipped (larger than React/Vue due to built-in features).
- Lazy loading via ember-engines for route-based code splitting.
- Tree-shake by removing unused addons from package.json.
- Use `ember-cli-bundle-analyzer` to inspect bundle composition.

### Optimization Techniques
- Use `tracked` over `computed` for local state — computed has caching overhead.
- Avoid creating new objects/arrays in tracked getters — use cached references.
- Use `ember-concurrency`'s `dropTask` for rapidly firing events (typeahead).
- Debounce expensive operations with `ember-concurrency`'s `restartableTask`.
- Virtual scrolling for large lists with `ember-collection` or `vertical-collection`.

## Build & Bundle Considerations

- Ember CLI uses Broccoli.js as the build pipeline.
- Addons add to bundle size — audit `package.json` periodically.
- Use `ember-auto-import` for npm package imports.
- `ember-cli-code-coverage` for tracking unused code.
- Lazy load engines with `ember-engines` for large feature areas.
- Production builds: `ember build --environment=production` enables minification and tree-shaking.

## Testing Strategies

### Component Tests

```typescript
// tests/integration/components/post-card-test.ts
import { module, test } from 'qunit'
import { setupRenderingTest } from 'ember-qunit'
import { render, click } from '@ember/test-helpers'
import { hbs } from 'ember-cli-htmlbars'

module('Integration | Component | post-card', function (hooks) {
  setupRenderingTest(hooks)

  test('it toggles expanded state', async function (assert) {
    this.set('title', 'Test Post')
    this.set('body', 'Test body')
    await render(hbs`<PostCard @title={{this.title}} @body={{this.body}} />`)
    assert.dom('article').exists()
    await click('h2')
    assert.dom('p').hasText('Test body')
  })
})
```

### Route Tests

```typescript
module('Acceptance | posts', function (hooks) {
  setupApplicationTest(hooks)

  test('visiting /posts loads data', async function (assert) {
    await visit('/posts')
    assert.dom('[data-test-post]').exists({ count: 10 })
  })
})
```

### Key Testing Practices
- Use `ember-qunit` with `@ember/test-helpers` for DOM interaction.
- Use `ember-cli-mirage` for mocking Ember Data responses.
- Prefer integration tests over unit tests for components.
- Use `settled()` after async operations to wait for rendering.

## Migration Patterns

### Classic (v3.14-) to Octane (v3.15+)

| Classic | Octane |
|---------|--------|
| `EmberObject.extend()` | Native class `extends Component` |
| `computed()` | `@tracked` + getter |
| `.observes()` | `@tracked` + `@action` |
| `didInsertElement` | `{{did-insert}}` modifier |
| `this.set('prop', val)` | `this.prop = val` |
| `{{my-component}}` | `<MyComponent />` |
| `this._super()` | No equivalent (native class) |
| `Ember.Component` | `@glimmer/component` |

**Migration order**: 1) Update Ember CLI to v3.15+, 2) Convert components one by one, 3) Replace computed with @tracked, 4) Replace observers with native getters, 5) Use `ember-cli-update` for automated migration.

### From React to Ember

| React Pattern | Ember Equivalent |
|---------------|------------------|
| `useState` | `@tracked` property |
| `useEffect` | Modifiers ({{did-insert}}, {{did-update}}) |
| `useContext` | `@service` injection |
| Props | `@arg` (named args in .hbs template) |
| JSX | Handlebars (.hbs) templates |
| `React.memo` | Template-only component (no JS class) |

## Anti-Patterns

1. **Using classic components for new code**: Always use Glimmer components.
2. **Mutating @tracked with set()**: `set()` is for classic mode. Octane uses `this.property = value`.
3. **Over-nesting routes**: Each nesting adds a template + controller + route file.
4. **Missing outlet in layout templates**: Child routes won't render without {{outlet}}.
5. **Service as a data dump**: Services should encapsulate logic.
6. **Direct DOM manipulation**: Use modifiers or {{did-insert}} instead of lifecycle hooks.
7. **Not using ember-concurrency for async**: Raw promises in @tracked cause memory leaks.
8. **Over-using observers**: Use @tracked + getters/computed.

## Common Pitfalls

1. Missing outlet in layout templates — {{outlet}} is required for child routes.
2. Forgetting to import types — Ember's TS support requires explicit type imports.
3. Using classic components for new code — always Glimmer.
4. Mutating @tracked with set() — use `this.prop = value`.
5. Service as a data dump — encapsulate logic in services.
6. Direct DOM manipulation in components — use modifiers.

## Compared With

| Aspect | Ember | React | Vue |
|--------|-------|-------|-----|
| Architecture | Convention over config | Library + choices | Framework |
| Build tool | Ember CLI | Vite/CRA | Vite/Vue CLI |
| State mgmt | Ember Data + Services | Zustand/Redux | Pinia/Vuex |
| Templating | Handlebars (.hbs) | JSX/TSX | .vue SFC |
| Routing | Built-in, config | React Router | Vue Router |
| TypeScript | First-class since v4 | Optional | Via vue-tsc |
| Learning curve | Steep | Moderate | Moderate |

## Ecosystem & Tooling

1. Ember CLI — `ember generate component`, `ember generate route`
2. Ember Inspector browser extension
3. `ember-cli-mirage` — API mocking
4. `ember-concurrency` — async task management
5. `ember-truth-helpers` — boolean template helpers
6. `ember-composable-helpers` — functional helpers
7. `ember-test-selectors` — data-test-* stripped from production
8. `ember-cli-update` — automated migration
9. `ember-template-lint` — template linting
10. `ember-cli-bundle-analyzer` — bundle analysis

### UI Libraries
- **ember-cli-addon-docs** — Component documentation
- **ember-paper** — Material Design
- **ember-bootstrap** — Bootstrap integration
- **ember-power-select** — Advanced select

## Rules
- Use Ember CLI commands for scaffolding — never write boilerplate by hand.
- Routes define model hooks; controllers only for query params or actions.
- Glimmer components (<template> or .hbs with .ts) for all new code.
- Use `@tracked` for reactive properties, never `set()`.
- Use `@action` decorator for event handlers.
- Ember Data is the default data layer — use adapters/serializers for API customization.
- Services are singletons — inject with `@service`.
- Modifiers handle DOM interactions, not component lifecycle hooks.
- Follow the `app/` folder convention: routes/, components/, services/, models/, modifiers/.

## References
  - references/ember-advanced.md — Ember Advanced Topics
  - references/ember-architecture.md — Ember.js Architecture Patterns
  - references/ember-deployment.md — Ember.js Deployment
  - references/ember-fundamentals.md — Ember Fundamentals
  - references/ember-patterns.md — Ember.js Patterns & Best Practices
  - references/ember-setup.md — Ember.js Setup Guide

## Handoff
No artifact produced.
Next skill: ember-data (if complex data layer) or frontend-testing.
Carry forward: route/service pattern, Glimmer component conventions, @tracked/@action.
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

## Architecture Decision Trees

### Component Strategy Decision Tree
```
Does the component need lifecycle hooks or DOM access?
  ├── No  → Template-only component (Glimmer) - fastest, no JS class
  └── Yes → Does it manage state shared across components?
       ├── Yes → Service + component pattern
       └── No  → Classic Glimmer component with @tracked
            Is the DOM interaction imperative (drag/drop, canvas)?
            ├── Yes → Use modifier (ember-modifier)
            └── No  → Use component lifecycle (constructor, willDestroy)
```

### Routing Strategy Decision Tree
```
Is the route data-driven (model-dependent)?
  ├── No  → Static route with template content
  └── Yes → Does the model come from API?
       ├── Yes → Route model() hook with ember-data or fetch
       └── No  → Route model() with local computation
            Are there multiple async dependencies?
            ├── Yes → RSVP.hash() in model() with parallel loading
            └── No  → Single async model() return
```

## Security Considerations

- **Safe strings**: Use `{{someProperty}}` for auto-escaped output. For trusted HTML, use `{{{htmlContent}}}` only after sanitization via `ember-cli-htmlbars` or DOMPurify. Never triple-stash user content.
- **CSRF protection**: Ember Data automatically reads CSRF token from meta tag. Ensure backend sets `<meta name="csrf-token" content="...">`. For non-ember-data requests, read the meta tag and include in headers.
- **Content Security Policy**: Configure CSP in `config/content-security-policy.js`. Ember's `ember-cli-build` can inject meta CSP tags. Set `script-src 'self'` and use nonces for inline scripts in production.
- **Dependency auditing**: Run `ember-cli-deprecation-workflow` to track deprecations. Use `npm audit` or `yarn audit` in CI. Pin major dependency versions. Avoid deprecated Ember addons without active maintenance.
