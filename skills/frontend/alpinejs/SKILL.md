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

### Step 6: Modals and Tabs
```html
<div x-data="{ activeTab: 'info' }">
  <button @click="activeTab = 'info'" :class="{ active: activeTab === 'info' }">Info</button>
  <button @click="activeTab = 'settings'" :class="{ active: activeTab === 'settings' }">Settings</button>

  <div x-show="activeTab === 'info'">Info content</div>
  <div x-show="activeTab === 'settings'">Settings content</div>
</div>
```

### Step 7: Transitions
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

## Common Pitfalls

1. **Forgetting x-data on parent**: Child elements can't access state without a parent x-data scope.
2. **Mixing Alpine with jQuery DOM manipulation**: Alpine manages the DOM — direct manipulation breaks reactivity.
3. **Complex expressions in x-data**: Extract complex logic into component methods.
4. **Overusing x-if instead of x-show**: x-show is more performant for frequent toggles.
5. **Not using :key in x-for**: Without keys, Alpine may reuse DOM elements incorrectly.
6. **Missing alpine:init for stores**: Alpine stores must be registered before components initialize.
7. **Async data in x-data constructor**: Use x-init or async methods, not the x-data expression itself.

## Best Practices

1. State belongs in x-data, not in external JS files.
2. Use Alpine.store() for global state shared across components.
3. Use x-model for form inputs (two-way binding).
4. Use x-show for toggles, x-if for conditional DOM removal.
5. Use @click.prevent or .window modifiers for event control.
6. Fetch side effects in x-init or via $nextTick.
7. Keep x-data expressions simple; extract complex logic into methods.
8. Use x-transition for smooth enter/leave animations.

## Compared With

| Aspect | Alpine.js | Vue | React | htmx |
|--------|-----------|-----|-------|------|
| Bundle size | ~10KB | ~33KB | ~42KB | ~14KB |
| Build step | None | Optional | Required | None |
| State management | x-data/store | data/props | useState | Server |
| Templating | Directives | Vue templates | JSX | Server HTML |
| Learning curve | Low | Medium | High | Very Low |
| Best for | Server-rendered + interactivity | SPAs | SPAs/complex UIs | Hypermedia apps |

## Performance

1. Alpine.js is ~10KB min+gzip — negligible bundle impact.
2. No virtual DOM — Alpine mutates real DOM directly.
3. x-show uses CSS display:none (no DOM removal, faster toggles).
4. x-if removes/adds DOM nodes (useful for conditional heavy content).
5. No build step means no compile time — just load and use.
6. Fine-grained reactivity — only updates change-dependent DOM parts.
7. Alpine.store() is persistent across page navigations if page is SPA-like.

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
