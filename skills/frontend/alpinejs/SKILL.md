---
name: alpinejs
description: >
  Use this skill when the user says 'Alpine.js', 'Alpine setup', 'Alpine component', 'Alpine x-data', 'Alpine x-init', 'Alpine reactive', 'Alpine project', or when building with Alpine.js. This skill enforces: HTML attribute-driven reactivity, Alpine directives (x-data, x-bind, x-on, x-show, x-for), store pattern for shared state, minimal JavaScript. Requires Alpine.js in the project (CDN or npm). Do NOT use for: Vue/React/Svelte component patterns, heavy JS frameworks, or non-Alpine projects.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, alpinejs, phase-1]
---

# Alpine.js

## Purpose
Add interactivity to HTML pages using Alpine.js directives — a lightweight, declarative framework that works directly in the DOM without a build step.

## Agent Protocol

### Trigger
Exact user phrases: "Alpine.js setup", "Alpine component", "Alpine x-data", "Alpine x-init", "Alpine store", "Alpine project", "Alpine directive", "alpine reactive".

### Input Context
Before activating, verify:
- Alpine.js is included (CDN script or npm).
- Whether the project uses Alpine + backend (Laravel, Django, etc.) or standalone.

### Output Artifact
No file output. Produces HTML snippets with Alpine directives as text.

### Response Format
HTML with Alpine directives:
```html
<div x-data="{ open: false }">
  <button @click="open = !open">Toggle</button>
  <div x-show="open">Content</div>
</div>
```

No preamble. No postamble. No explanations. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Component state defined with x-data on root element.
- [ ] Event handlers use x-on or @ shorthand.
- [ ] Dynamic attributes use x-bind or : shorthand.
- [ ] Conditional rendering uses x-show or x-if.
- [ ] Lists use x-for with unique :key.
- [ ] Shared state uses Alpine.store().
- [ ] Side effects use x-init or $watch.
- [ ] No external build step required (CDN-compatible).

### Max Response Length
~4096 tokens.

## Architecture Decision Trees

### State Management Decision
```
How many components need the state?
  Single component -> x-data with inline object
  Multiple sibling components -> Alpine.store()
  Nested components -> x-data on parent with scope inheritance

What type of state?
  UI toggles (open/close) -> x-data { open: false }
  Form data -> x-data with x-model binding
  Data from server -> x-data + fetch() in x-init
  Computed/derived -> $watch or x-effect for reactions
```

### Rendering Decision
```
Should the element be visible or removed?
  Frequently toggled -> x-show (CSS display toggle, faster)
  Rarely toggled or heavy content -> x-if (DOM add/remove)
  Initial render conditional -> x-init to set state, then x-show

Loop rendering:
  Array of items -> x-for on template tag
  Need stable identity -> :key binding (always add this)
```

### Plugin Selection Guide
```
Need:
  Collapse/expand animation -> @alpinejs/collapse
  Intersection observer -> @alpinejs/intersect
  Persist to localStorage -> @alpinejs/persist
  Focus trap (modals) -> @alpinejs/focus
  Smooth DOM morphing -> @alpinejs/morph
  Input masks -> @alpinejs/mask
  Tooltips -> alpinejs-tooltip
```

## Workflow

### Step 1: Install Alpine.js
```html
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
```

### Step 2: Basic Component
```html
<div x-data="{ count: 0 }">
  <button @click="count++">Increment</button>
  <span x-text="count"></span>
</div>
```

### Step 3: Forms and Binding
```html
<div x-data="{ name: '', email: '' }">
  <input x-model="name" placeholder="Name">
  <input x-model="email" placeholder="Email" type="email">
  <button @click="submit()" :disabled="!name || !email">Submit</button>

  <div x-show="name">
    <p>Hello, <span x-text="name"></span>!</p>
  </div>
</div>
```

### Step 4: Shared Store
```html
<script>
  document.addEventListener('alpine:init', () => {
    Alpine.store('user', {
      name: 'Guest',
      loggedIn: false,
      login(name) { this.name = name; this.loggedIn = true },
      logout() { this.name = 'Guest'; this.loggedIn = false },
    })
  })
</script>

<div x-data>
  <template x-if="$store.user.loggedIn">
    <p>Welcome, <span x-text="$store.user.name"></span></p>
  </template>
</div>
```

### Step 5: Fetching Data
```html
<div x-data="{
  posts: [],
  loading: false,
  async fetchPosts() {
    this.loading = true
    this.posts = await (await fetch('/api/posts')).json()
    this.loading = false
  }
}" x-init="fetchPosts()">
  <div x-show="loading">Loading...</div>
  <template x-for="post in posts" :key="post.id">
    <div>
      <h3 x-text="post.title"></h3>
      <p x-text="post.body"></p>
    </div>
  </template>
</div>
```

### Step 6: State Management Patterns

**Signal-like pattern with $watch:**
```html
<div x-data="{ count: 0, doubled: 0 }" x-init="$watch('count', val => doubled = val * 2)">
  <button @click="count++">+1</button>
  <p x-text="`Count: ${count}, Doubled: ${doubled}`"></p>
</div>
```

**Composable-like extracted component (magic $data):**
```html
<div x-data="counter()">
  <button @click="increment">+1</button>
  <span x-text="count"></span>
</div>

<script>
  document.addEventListener('alpine:init', () => {
    Alpine.data('counter', () => ({
      count: 0,
      increment() { this.count++ },
      reset() { this.count = 0 },
    }))
  })
</script>
```

**Persisted state across page loads:**
```html
<div x-data x-init="$store.theme = $persist('light').as('theme')">
  <button @click="$store.theme = $store.theme === 'light' ? 'dark' : 'light'">
    Toggle theme
  </button>
</div>
```

### Step 7: Modals and Tabs
```html
<div x-data="{ activeTab: 'info' }">
  <button @click="activeTab = 'info'" :class="{ active: activeTab === 'info' }">Info</button>
  <button @click="activeTab = 'settings'" :class="{ active: activeTab === 'settings' }">Settings</button>

  <div x-show="activeTab === 'info'">Info content</div>
  <div x-show="activeTab === 'settings'">Settings content</div>
</div>
```

### Step 8: Transitions
```html
<div x-data="{ open: false }">
  <button @click="open = !open">Toggle</button>
  <div x-show="open"
       x-transition:enter="transition ease-out duration-300"
       x-transition:enter-start="opacity-0 scale-90"
       x-transition:enter-end="opacity-100 scale-100"
       x-transition:leave="transition ease-in duration-200"
       x-transition:leave-start="opacity-100 scale-100"
       x-transition:leave-end="opacity-0 scale-90">
    Animated content
  </div>
</div>
```

### Step 9: x-teleport for Portals
```html
<div x-data="{ open: false }">
  <button @click="open = true">Open Modal</button>
  <template x-teleport="body">
    <div x-show="open" @click.outside="open = false">
      <div class="modal-backdrop" @click="open = false"></div>
      <div class="modal-content">
        <h2>Modal Title</h2>
        <p>Portal-rendered content</p>
        <button @click="open = false">Close</button>
      </div>
    </div>
  </template>
</div>
```

## Component Architecture

### Alpine.js Decision Tree
```
Does the component need:
  Local state only? -> x-data with inline object
  Shared state across components? -> Alpine.store()
  AJAX data loading? -> x-init with fetch()
  User input binding? -> x-model
  Conditional display? -> x-show (toggle) or x-if (DOM add/remove)
  Loops? -> x-for with :key
  Dynamic styles/classes? -> :style or :class binding
  Side effects on data change? -> $watch or x-effect
```

### Component Patterns

**Alpine.data() reusable components:**
```html
<script>
document.addEventListener('alpine:init', () => {
  Alpine.data('dropdown', () => ({
    open: false,
    toggle() { this.open = !this.open },
    close() { this.open = false },
  }))
})
</script>

<div x-data="dropdown">
  <button @click="toggle">Toggle</button>
  <div x-show="open" @click.outside="close">
    Dropdown content
  </div>
</div>
```

**Alpine.data() with props via $el:**
```html
<div x-data="tooltip({ text: 'Hello World' })">
  <span @mouseenter="show" @mouseleave="hide">Hover me</span>
  <div x-show="visible" x-text="text"></div>
</div>

<script>
document.addEventListener('alpine:init', () => {
  Alpine.data('tooltip', (config) => ({
    text: config.text,
    visible: false,
    show() { this.visible = true },
    hide() { this.visible = false },
  }))
})
</script>
```

## Common Pitfalls

1. **Forgetting x-data on parent**: Child elements can't access state without a parent x-data scope.
2. **Mixing Alpine with jQuery DOM manipulation**: Alpine manages the DOM — direct manipulation breaks reactivity.
3. **Complex expressions in x-data**: Extract complex logic into component methods.
4. **Overusing x-if instead of x-show**: x-show is more performant for frequent toggles.
5. **Not using :key in x-for**: Without keys, Alpine may reuse DOM elements incorrectly.
6. **Missing alpine:init for stores**: Alpine stores must be registered before components initialize.
7. **Async data in x-data constructor**: Use x-init or async methods, not the x-data expression itself.
8. **Leaking event listeners**: x-on has no built-in cleanup — use @click.window sparingly.
9. **x-model on non-input elements**: x-model only works on form inputs (input, select, textarea).
10. **Modifier stacking order**: @click.shift.prevent vs @click.prevent.shift — order matters.

## Best Practices

1. State belongs in x-data, not in external JS files.
2. Use Alpine.store() for global state shared across components.
3. Use x-model for form inputs (two-way binding).
4. Use x-show for toggles, x-if for conditional DOM removal.
5. Use @click.prevent or .window modifiers for event control.
6. Fetch side effects in x-init or via $nextTick.
7. Keep x-data expressions simple; extract complex logic into methods.
8. Use x-transition for smooth enter/leave animations.
9. Register reusable component logic via Alpine.data().
10. Debounce expensive operations with x-debounce modifier.

## Compared With

| Aspect | Alpine.js | Vue | React | htmx |
|--------|-----------|-----|-------|------|
| Bundle size | ~10KB | ~33KB | ~42KB | ~14KB |
| Build step | None | Optional | Required | None |
| State management | x-data/store | data/props | useState | Server |
| Templating | Directives | Vue templates | JSX | Server HTML |
| Learning curve | Low | Medium | High | Very Low |
| Best for | Server-rendered + interactivity | SPAs | SPAs/complex UIs | Hypermedia apps |

### Alpine.js vs htmx
Alpine excels at client-side interactivity (modals, tabs, toggles). htmx excels at server-driven HTML replacement. They complement each other well — use htmx for form submissions and navigation, Alpine for UI interactions.

### Alpine.js vs Vue
Both use similar directive syntax (x- vs v-), but Alpine has no build step, no virtual DOM, and no component system beyond DOM scoping. Vue is appropriate when the entire app is an SPA; Alpine shines when the backend renders most HTML.

## Performance

1. Alpine.js is ~10KB min+gzip — negligible bundle impact.
2. No virtual DOM — Alpine mutates real DOM directly.
3. x-show uses CSS display:none (no DOM removal, faster toggles).
4. x-if removes/adds DOM nodes (useful for conditional heavy content).
5. No build step means no compile time — just load and use.
6. Fine-grained reactivity — only updates change-dependent DOM parts.
7. Alpine.store() is persistent across page navigations if page is SPA-like.
8. x-teleport moves DOM nodes, doesn't clone — minimal overhead.
9. x-model.lazy defers sync to change event instead of input event.
10. x-cloak prevents flash of unstyled content before initialization.

## Testing Strategies

### Manual Testing
Alpine components can be tested by rendering HTML with directives and asserting DOM behavior:
```html
<!-- Test component in isolation -->
<div x-data="{ count: 0 }">
  <button @click="count++" x-test="increment-btn">+1</button>
  <span x-text="count" x-test="count-display"></span>
</div>
```

### Cypress Testing
```javascript
cy.visit('/page-with-alpine')
cy.get('button').click()
cy.contains('span', '1').should('exist')
```

### Playwright Testing
```javascript
await page.goto('/page-with-alpine')
await page.click('button')
const text = await page.textContent('span')
expect(text).toBe('1')
```

### Key Testing Practices
- Test Alpine components via the DOM, not the JS — Alpine is DOM-driven.
- Wait for Alpine initialization: `document.addEventListener('alpine:init', ...)` fires before components render.
- Use `Alpine.deferLoadingAlpine()` for controlling when Alpine boots in tests.
- Test stores independently by calling `Alpine.store()` methods directly.

## Migration Patterns

### From jQuery to Alpine
| jQuery Pattern | Alpine Equivalent |
|----------------|-------------------|
| `$(el).hide()` | `x-show="false"` |
| `$(el).text('hi')` | `x-text="'hi'"` |
| `$(el).on('click', fn)` | `@click="fn"` |
| `$.ajax()` | `fetch()` in x-init |
| `$(el).addClass('a')` | `:class="{ a: condition }"` |
| Global state via vars | Alpine.store() |
| DOM traversal | x-ref + $refs |

**Migration strategy:** Incrementally replace jQuery DOM manipulation with Alpine directives on the same elements. Alpine and jQuery can coexist temporarily — Alpine manages its own x-data scopes, jQuery manipulates outside them.

### From Vue 2 Options API to Alpine
If migrating a simple Vue app that doesn't need SPA features:
- `data()` → `x-data` object
- `computed` → `$watch` or expression in template
- `methods` → methods in Alpine.data()
- `v-model` → `x-model`
- `v-if` / `v-show` → `x-if` / `x-show`
- `Vuex` → `Alpine.store()`

## Tooling

1. Alpine.js DevTools browser extension — inspect components, state, stores.
2. `@alpinejs/collapse` — collapse/expand animation plugin.
3. `@alpinejs/intersect` — intersection observer plugin.
4. `@alpinejs/persist` — persist state to localStorage.
5. `@alpinejs/focus` — focus trap plugin for modals.
6. `@alpinejs/morph` — smooth DOM morphing plugin.
7. `@alpinejs/mask` — input mask plugin.
8. `alpine-ajax` — AJAX helper similar to htmx for Alpine.
9. `alpinejs-tooltip` — tooltip plugin.
10. `alpinejs-click-away` — click away utility.

## Build and Bundle Considerations

- Alpine works via CDN — no build step required.
- For npm installs: `npm install alpinejs` then `import Alpine from 'alpinejs'`.
- Tree-shaking: Alpine's npm package supports tree-shaking for plugins not imported.
- When bundled via webpack/Vite, Alpine adds ~10KB gzipped.
- Plugins each add 1-3KB — only load what you use.
- No SSR considerations — Alpine is purely client-side.

## Rules
- State belongs in x-data, not in external JS files.
- Use Alpine.store() for global state shared across components.
- Use x-model for form inputs (two-way binding).
- Use x-show for toggles, x-if for conditional DOM removal.
- Use @click.prevent or .window modifiers for event control.
- Fetch side effects in x-init or via $nextTick.
- Avoid mixing Alpine with jQuery-like DOM manipulation — let Alpine manage the DOM.
- Keep x-data expressions simple; extract complex logic into methods.

## References
  - references/alpine-patterns.md — Alpine.js Patterns & Best Practices
  - references/alpine-setup.md — Alpine.js Setup Guide
  - references/alpinejs-advanced.md — Alpine.js Advanced Patterns
  - references/alpinejs-deployment.md — Alpine.js Deployment
  - references/alpinejs-fundamentals.md — Alpinejs Fundamentals
  - references/alpinejs-testing.md — Alpine.js Testing Reference
  - references/alpinejs-component-patterns.md — Alpine.js Component Patterns
  - references/alpinejs-state-management.md — Alpine.js State Management Reference

## Handoff
No artifact produced.
Next skill: alpine-laravel (if Laravel backend) or frontend-testing.
Carry forward: x-data state pattern, x-model binding, store pattern.
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

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Complex logic in Alpine expressions | Unreadable, untestable | Extract to JavaScript functions, reference by name |
| Deeply nested x-data | State becomes tangled | Use $store or flat component state |
| Direct DOM manipulation alongside Alpine | Causes hydration conflicts | Always use Alpine directives (x-text, x-bind, x-model) |
| Ignoring x-cloak for dynamic content | FOUC on page load | Always add x-cloak to root Alpine elements |
| Overusing x-effect instead of computed | Effects run on every dependency change | Use x-data getters for computed values |

## Performance Optimization

- **x-if vs x-show**: Use `x-if` for content that toggles rarely (tabs, modals) - it removes DOM nodes. Use `x-show` for frequent toggles (dropdowns, tooltips) - it uses CSS display toggle. x-if is more expensive on first render but cheaper on memory.
- **Debounce expensive operations**: Attach `.debounce` modifier to inputs that trigger API calls or complex computations: `@input.debounce.300ms="search"`. Use `.throttle` for scroll/resize handlers.
- **Lazy-load Alpine components**: Split pages into multiple `x-data` scopes rather than one large scope. Each scope initializes independently. Use Intersection Observer with `x-intersect` to init components when visible.
- **Minimal reactivity**: Alpine tracks property access inside x-data. Use `Object.freeze()` for static data to prevent observation overhead. Avoid deeply nested reactive objects.

## Security Considerations

- **CSP mode**: Always prefer the CSP-compatible build (`alpinejs@3/dist/csp.min.js`) in production. It restricts expressions to `x-data` attributes only, preventing injection of arbitrary JS via `x-text` or `x-html`.
- **Sanitize x-html input**: `x-html` inserts raw HTML. Never bind user-generated content to `x-html`. Use `x-text` for user content. If HTML rendering is required, sanitize through DOMPurify first.
- **Avoid inline event handlers with user input**: `@click="handleUserInput(someUserValue)"` can be exploited if `someUserValue` contains expressions. Validate and escape user data before passing into Alpine expressions.
- **Protect $store from mutation**: Use `Object.freeze()` or proxy patterns to prevent accidental store corruption from third-party scripts. Validate store mutations in production.
