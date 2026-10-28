# Alpine.js Fundamentals (v3)

Alpine.js adds reactive behaviour directly in HTML markup with a small set of directives, magic properties, and global APIs. It suits server-rendered pages (Laravel, Rails, Django, htmx-driven apps) that need interactivity without a SPA framework. Component patterns, state management, testing, and deployment are covered in sibling references.

## 1. Installation

CDN (pin an exact version; plugins load before core):

```html
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/focus@3.14.9/dist/cdn.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.9/dist/cdn.min.js"></script>
```

npm / bundler:

```js
import Alpine from 'alpinejs'
import focus from '@alpinejs/focus'

Alpine.plugin(focus)
window.Alpine = Alpine        // optional, for devtools and inline access
Alpine.start()                // after registering plugins, data, and stores
```

Strict Content Security Policy: use the CSP build (`@alpinejs/csp`), which does not evaluate inline expressions with `new Function`; components must be registered with `Alpine.data` and expressions kept simple.

## 2. Directives

| Directive | Purpose | Example |
|---|---|---|
| `x-data` | Declare a component and its reactive state | `<div x-data="{ open: false }">` |
| `x-init` | Run code when the component initializes | `x-init="fetchItems()"` |
| `x-show` | Toggle `display` | `x-show="open"` |
| `x-if` | Add/remove DOM (on `<template>`) | `<template x-if="user">…</template>` |
| `x-for` | Loop (on `<template>`, single root element, use `:key`) | `<template x-for="t in todos" :key="t.id">` |
| `x-bind` / `:` | Bind attributes | `:class="{ 'is-active': open }"`, `:disabled="busy"` |
| `x-on` / `@` | Event listeners with modifiers | `@click.outside="open = false"`, `@submit.prevent="save"` |
| `x-text` / `x-html` | Set text / HTML content | `x-text="count"` (prefer over `x-html`) |
| `x-model` | Two-way binding for inputs | `x-model.number="qty"`, `.lazy`, `.debounce.300ms` |
| `x-effect` | Re-run when dependencies change | `x-effect="console.log(count)"` |
| `x-ref` | Name an element for `$refs` | `x-ref="input"` |
| `x-cloak` | Hide until Alpine initializes (needs CSS) | `[x-cloak] { display: none !important; }` |
| `x-transition` | Enter/leave transitions | `x-show="open" x-transition` |
| `x-teleport` | Render template elsewhere (modals) | `<template x-teleport="body">` |
| `x-ignore` | Skip initializing a subtree | Third-party widgets |
| `x-id` | Scoped unique IDs with `$id()` | Accessible label/field pairs |
| `x-modelable` | Expose a property to a parent's `x-model` | Reusable inputs |

## 3. Magic Properties

| Magic | Use |
|---|---|
| `$el` | Current element |
| `$refs` | Elements marked with `x-ref` |
| `$store` | Global stores |
| `$watch('prop', fn)` | React to a property change |
| `$dispatch('name', detail)` | Dispatch a bubbling custom event |
| `$nextTick(fn)` | Run after Alpine updates the DOM |
| `$root` | Root element of the component |
| `$data` | Current component data object |
| `$id('name')` | Generate scoped IDs (with `x-id`) |

## 4. A Complete Component

```html
<div x-data="dropdown" @keydown.escape.window="close()" class="relative">
  <button type="button" @click="toggle()" :aria-expanded="open" aria-haspopup="menu">
    Options
  </button>

  <ul x-show="open" x-transition x-cloak @click.outside="close()" role="menu">
    <template x-for="item in items" :key="item.id">
      <li role="menuitem">
        <a :href="item.href" x-text="item.label"></a>
      </li>
    </template>
  </ul>
</div>

<script>
  document.addEventListener('alpine:init', () => {
    Alpine.data('dropdown', () => ({
      open: false,
      items: [
        { id: 1, label: 'Profile', href: '/profile' },
        { id: 2, label: 'Settings', href: '/settings' },
      ],
      toggle() { this.open = !this.open },
      close() { this.open = false },
    }))
  })
</script>
```

- `Alpine.data` registers reusable components; register inside the `alpine:init` event (CDN) or before `Alpine.start()` (bundler).
- An `init()` method in the data object runs automatically; `destroy()` runs when the component is removed.

## 5. Global State with Stores

```js
document.addEventListener('alpine:init', () => {
  Alpine.store('cart', {
    items: [],
    add(product) { this.items.push(product) },
    get count() { return this.items.length },
  })
})
```

```html
<span x-data x-text="$store.cart.count"></span>
<button x-data @click="$store.cart.add({ id: 7, name: 'Mug' })">Add</button>
```

## 6. Fetching Data

```js
Alpine.data('userList', () => ({
  users: [],
  loading: false,
  error: null,
  async init() {
    this.loading = true
    try {
      const res = await fetch('/api/users', { signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error(`GET /api/users failed with ${res.status}`)
      this.users = await res.json()
    } catch (e) {
      this.error = e.message
      console.error('userList load failed', e)
    } finally {
      this.loading = false
    }
  },
}))
```

For server-driven partial updates, Alpine pairs well with htmx or Laravel Livewire (which bundles Alpine).

## 7. Official Plugins

| Plugin | Purpose |
|---|---|
| Mask | Input masking (`x-mask`) |
| Intersect | Run code when elements enter the viewport (`x-intersect`) |
| Persist | Persist state to localStorage (`$persist`) |
| Focus | Focus trapping and management (`x-trap`) for modals |
| Collapse | Smooth height transitions (`x-collapse`) |
| Morph | DOM morphing preserving state |
| Anchor | Position elements relative to others (`x-anchor`) |
| Sort | Drag-to-reorder lists (`x-sort`) |
| Resize | React to element size changes (`x-resize`) |

## 8. Security Notes

- `x-html` inserts raw HTML; never use it with user-supplied content unless sanitized (e.g. DOMPurify).
- Alpine expressions are evaluated JavaScript; do not render untrusted input into `x-data`/attribute expressions on the server side. Escape server-rendered values and pass data via JSON in a `<script type="application/json">` element or data attributes.

## Pitfalls

- Forgetting `x-cloak` CSS: content flashes before initialization.
- `x-for` on a non-`<template>` element or with multiple root children.
- Mutating state from plain DOM scripts outside Alpine; changes are not reactive.
- Registering `Alpine.data` after `Alpine.start()`.
- Large single-page apps in Alpine; at that scale a component framework is easier to maintain.

## Checklist

- [ ] Exact version pinned (CDN or package lock); plugins registered before start.
- [ ] Reusable components via `Alpine.data`, global state via `Alpine.store`.
- [ ] `x-cloak` styles present; accessible attributes (`aria-*`, focus management) on interactive widgets.
- [ ] No `x-html` with untrusted content; CSP build where required.
- [ ] Fetches have timeouts and visible error states.
