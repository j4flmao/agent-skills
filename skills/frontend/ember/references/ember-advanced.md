# Ember.js Advanced Topics

Advanced modern Ember: Embroider and Vite builds with code splitting, TypeScript with Glint, async state with ember-concurrency and resources, request management with WarpDrive/EmberData, rendering performance, server-side rendering with FastBoot, and incremental migration of classic apps.

## Build: Embroider and Vite

Embroider is Ember's modern build pipeline that produces standard ES modules for mainstream bundlers. Embroider with Vite is the recommended setup for new apps; classic `ember-cli` broccoli builds remain for older apps.

Benefits:
- Standard tooling (Vite dev server, Rollup-based production builds).
- Tree-shaking and route-based code splitting.
- Static analysis of template-tag components (explicit imports make "what is used" knowable at build time).

Route splitting (Embroider option `splitAtRoutes`) loads each route's code on demand; combine it with template tag and explicit imports so the bundler can split correctly.

Migration path for existing apps: adopt Embroider in compat mode, fix addons that rely on runtime resolution, enable static flags (`staticComponents`, `staticHelpers`, `staticModifiers`) step by step, then move to Vite.

## TypeScript and Glint

```gts
// app/components/user-card.gts
import Component from '@glimmer/component';

interface UserCardSignature {
  Args: { user: { name: string; email: string }; onSelect?: (email: string) => void };
  Blocks: { default: [] };
  Element: HTMLElement;
}

export default class UserCard extends Component<UserCardSignature> {
  select = () => this.args.onSelect?.(this.args.user.email);

  <template>
    <article ...attributes>
      <h3>{{@user.name}}</h3>
      {{yield}}
    </article>
  </template>
}
```

- Component signatures declare `Args`, `Blocks` and `Element` (target of `...attributes`).
- Glint type-checks templates (`glint` CLI, editor language server); add it to CI.
- Services are typed by registering them in the service registry declaration so `@service` injections are typed.

## Async State: ember-concurrency

Tasks give cancellation, concurrency control and derived state (`isRunning`, `last.value`).

```gts
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { restartableTask, timeout } from 'ember-concurrency';
import { on } from '@ember/modifier';

export default class SearchBox extends Component<{ Args: {} }> {
  @service declare api: ApiService;

  search = restartableTask(async (term: string) => {
    await timeout(250);                       // debounce: restartable cancels previous runs
    return this.api.searchProducts(term);
  });

  onInput = (event: Event) => {
    this.search.perform((event.target as HTMLInputElement).value);
  };

  <template>
    <input type="search" aria-label="Search products" {{on "input" this.onInput}} />
    {{#if this.search.isRunning}}<p>Searching…</p>{{/if}}
    {{#each this.search.lastSuccessful.value as |p|}}<p>{{p.name}}</p>{{/each}}
  </template>
}
```

| Modifier | Behaviour |
|----------|-----------|
| `task` | Unlimited concurrency |
| `restartableTask` | Cancel previous, run latest (search-as-you-type) |
| `dropTask` | Ignore new while running (prevent double submit) |
| `enqueueTask` | Run sequentially |
| `keepLatestTask` | Run current, keep only the latest queued |

Tasks are cancelled automatically when their owner (component) is destroyed, preventing "set on destroyed object" errors.

## Resources

Resources tie async or subscription-based data to the lifetime of whatever consumes it, using the `ember-resources` addon.

```js
import { resource, cell } from 'ember-resources';

export const Clock = resource(({ on }) => {
  const now = cell(new Date());
  const id = setInterval(() => (now.current = new Date()), 1000);
  on.cleanup(() => clearInterval(id));
  return now;
});
```

Use resources for data that depends on arguments and must be cleaned up (subscriptions, intervals, WebSockets).

## Data Layer: WarpDrive / EmberData

Modern EmberData (now developed under the WarpDrive name) centres on a request manager with handlers and a cache:

- `store.request({ url, method })` issues requests through a handler pipeline (auth headers, retries, caching).
- Request builders generate standard requests (e.g. JSON:API `findRecord`, `query`).
- Legacy adapters/serializers still work in compat mode; new code should use requests.

Choose plain `fetch` + services for small apps; WarpDrive when you need a normalized cache, relationship handling and request deduplication.

## Rendering Performance

- Provide `key=` in `{{#each}}` for lists whose items are replaced (so DOM is reused correctly).
- Keep tracked state granular: one tracked property per independent piece of state; avoid replacing large objects for small changes.
- Derived data in getters is recomputed on access; cache expensive derivations with `@cached` from `@glimmer/tracking`.
- Virtualize long lists (e.g. vertical-collection) instead of rendering thousands of rows.
- Profile with the Ember Inspector (render performance, component tree) and browser performance tools.

```js
import { cached, tracked } from '@glimmer/tracking';

export default class Report {
  @tracked rows = [];

  @cached
  get totalsByCategory() {
    const totals = new Map();
    for (const r of this.rows) totals.set(r.category, (totals.get(r.category) ?? 0) + r.amount);
    return totals;
  }
}
```

## Server-Side Rendering

FastBoot renders Ember apps on Node for first paint and SEO; prember pre-renders static routes at build time.

- Guard browser-only APIs (`window`, `document`, `localStorage`) using the `fastboot` service's `isFastBoot`.
- Use the shoebox to transfer data fetched on the server to the client and avoid refetching.
- Measure whether SSR is needed; many Ember apps are authenticated dashboards where pre-rendering a shell suffices.

## Migrating Classic Code

| Classic | Modern replacement |
|---------|--------------------|
| `Component.extend` / two-way bindings | Glimmer component, arguments + callbacks |
| `computed()` | Getters over `@tracked` state (`@cached` for expensive ones) |
| Mixins | Services, utility functions, class composition |
| Observers | Derived state, explicit actions, resources |
| `didInsertElement` etc. | Modifiers |
| `.hbs` + `.js` pairs, resolver lookup | Template tag (`.gjs`/`.gts`) with imports |
| `this.get`/`this.set` | Native property access |

Codemods help (e.g. native-class, Glimmer component, template-tag conversion codemods). Migrate leaf components first, enable lint rules (`ember-template-lint`, `eslint-plugin-ember`) that forbid classic patterns in new code, and track remaining classic usage.

## Testing at Scale

- Application tests with `visit()` and mock APIs (Mirage, MSW).
- Test ember-concurrency tasks via rendered behaviour; use `settled()` / waiters so tests wait for async work.
- Register test waiters (`@ember/test-waiters`) for custom async code not otherwise tracked.

## Checklist

- [ ] Embroider (Vite for new apps) with static flags and route splitting
- [ ] TypeScript signatures and Glint in CI
- [ ] ember-concurrency or resources for async UI state with cancellation
- [ ] WarpDrive requests or service-based fetch; no new adapter/serializer customizations without need
- [ ] Keyed lists, `@cached` derivations, virtualization for large lists
- [ ] Classic patterns blocked by lint for new code; migration tracked
