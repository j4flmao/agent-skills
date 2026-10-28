# Ember.js Fundamentals (Octane and Template Tag)

Core concepts of modern Ember: the router and routes, components written in template-tag format (`.gjs`/`.gts`), tracked state, actions and modifiers, helpers, services, and data loading. This describes Octane-era idioms; classic components, mixins and computed properties are legacy.

## Mental Model

```text
URL ─► Router ─► Route (model hook loads data) ─► Template (renders) ─► Components
                                                            │
                                         Services (shared state, singletons, injected)
```

- **Router** maps URLs to nested routes.
- **Routes** load data and handle transitions.
- **Components** render UI and own local state.
- **Services** hold app-wide state and side effects (session, API client, notifications).
- **Autotracking** re-renders whatever reads `@tracked` state that changed.

## Routing

```js
// app/router.js
import EmberRouter from '@ember/routing/router';
import config from 'my-app/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('orders', function () {
    this.route('order', { path: '/:order_id' });
  });
  this.route('not-found', { path: '/*path' });
});
```

```js
// app/routes/orders/order.js
import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class OrderRoute extends Route {
  @service api;

  async model({ order_id }) {
    return this.api.fetchOrder(order_id);
  }
}
```

The model hook may return a promise; Ember waits for it and shows `loading` substates (`orders/order-loading` or `loading` templates) and `error` substates on rejection.

## Components (template tag)

```gjs
// app/components/order-summary.gjs
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';

const formatMoney = (minor, currency) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(minor / 100);

export default class OrderSummary extends Component {
  @tracked expanded = false;

  toggle = () => {
    this.expanded = !this.expanded;
  };

  get itemCount() {
    return this.args.order.lines.length;
  }

  <template>
    <section class="order-summary">
      <h2>Order {{@order.id}}</h2>
      <p>{{this.itemCount}} items, total {{formatMoney @order.totalMinor @order.currency}}</p>
      <button type="button" {{on "click" this.toggle}} aria-expanded="{{this.expanded}}">
        {{if this.expanded "Hide" "Show"}} details
      </button>
      {{#if this.expanded}}
        <ul>
          {{#each @order.lines key="id" as |line|}}
            <li>{{line.name}} × {{line.qty}}
              <button type="button" {{on "click" (fn @onRemove line.id)}}>Remove</button>
            </li>
          {{/each}}
        </ul>
      {{/if}}
    </section>
  </template>
}
```

Key points:
- `@name` reads arguments passed by the parent; `this.x` reads component state. Arguments are read-only; communicate upward with callback arguments (`@onRemove`).
- Template-tag files import everything they use (components, helpers, modifiers), giving explicit dependencies and better tooling.
- Plain functions work as helpers; getters derive state and are autotracked.
- Template-only components can be just a `<template>` in a `.gjs` file.

## Tracked State

```js
import { tracked } from '@glimmer/tracking';
import { TrackedArray, TrackedMap } from 'tracked-built-ins';

class Cart {
  @tracked coupon = null;
  lines = new TrackedArray([]);    // mutations like push() are tracked
}
```

- Re-assign `@tracked` properties to trigger updates; mutating a plain array/object in place does not notify.
- Use `tracked-built-ins` (or reassign copies) for collections.
- Avoid setting tracked state during render (it triggers an assertion about updating a value already consumed in the same render).

## Modifiers

Modifiers attach behaviour to DOM elements.

```gjs
import { modifier } from 'ember-modifier';

const autofocus = modifier((element) => {
  element.focus();
});

<template>
  <input {{autofocus}} aria-label="Search" />
</template>
```

Built-in `{{on}}` handles events; use modifiers instead of `didInsertElement`-style lifecycle hooks.

## Services

```js
// app/services/session.js
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class SessionService extends Service {
  @tracked user = null;

  get isAuthenticated() {
    return this.user !== null;
  }

  signIn(user) { this.user = user; }
  signOut() { this.user = null; }
}
```

Inject with `@service session;` in routes, components, or other services. Services are singletons per application instance (per test in tests).

## Data Loading Options

| Option | Use |
|--------|-----|
| `fetch` in a service | Simple APIs, full control |
| EmberData / WarpDrive | Normalized cache, requests, JSON:API or custom formats |
| GraphQL clients | GraphQL backends |

Load route-level data in `model()`; load component-level data with resources or tasks (see advanced reference) rather than in constructors.

## Forms and Input

```gjs
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';

export default class EmailForm extends Component {
  @tracked email = '';

  update = (event) => { this.email = event.target.value; };
  submit = (event) => {
    event.preventDefault();
    this.args.onSubmit(this.email);
  };

  <template>
    <form {{on "submit" this.submit}}>
      <label for="email">Email</label>
      <input id="email" type="email" required value={{this.email}} {{on "input" this.update}} />
      <button type="submit">Save</button>
    </form>
  </template>
}
```

Ember favours "data down, actions up": the component owns the input value, and the parent receives the result via a callback.

## Testing Basics

```js
import { module, test } from 'qunit';
import { setupRenderingTest } from 'my-app/tests/helpers';
import { render, click } from '@ember/test-helpers';
import OrderSummary from 'my-app/components/order-summary';

module('Integration | Component | order-summary', function (hooks) {
  setupRenderingTest(hooks);

  test('toggles details', async function (assert) {
    const order = { id: '7', totalMinor: 1999, currency: 'EUR', lines: [{ id: 'a', name: 'Mug', qty: 1 }] };
    const noop = () => {};
    await render(<template><OrderSummary @order={{order}} @onRemove={{noop}} /></template>);
    assert.dom('ul').doesNotExist();
    await click('button');
    assert.dom('li').hasText(/Mug × 1/);
  });
});
```

Test types: unit (services, utils), rendering/integration (components), application/acceptance (`visit`, full routing).

## Checklist

- [ ] Glimmer components with template tag; no classic components or mixins in new code
- [ ] State in `@tracked` properties or tracked collections; arguments treated as read-only
- [ ] Route `model()` for page data; loading/error substates provided
- [ ] Modifiers for DOM behaviour; services for shared state
- [ ] Rendering and application tests for user-visible behaviour
