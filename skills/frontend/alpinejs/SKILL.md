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
<!-- CDN (recommended for simplicity) -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

<!-- npm -->
<!-- npm install alpinejs -->
<!-- import Alpine from 'alpinejs' -->
<!-- Alpine.start() -->
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

## Rules
- State belongs in x-data, not in external JS files.
- Use `Alpine.store()` for global state shared across components.
- Use `x-model` for form inputs (two-way binding).
- Use `x-show` for toggles, `x-if` for conditional DOM removal.
- Use `@click.prevent` or `.window` modifiers for event control.
- Fetch side effects in `x-init` or via `$nextTick`.
- Avoid mixing Alpine with jQuery-like DOM manipulation — let Alpine manage the DOM.
- Keep x-data expressions simple; extract complex logic into methods.

## References
  - references/alpine-patterns.md — Alpine.js Patterns & Best Practices
  - references/alpine-setup.md — Alpine.js Setup Guide
  - references/alpinejs-advanced.md — Alpine.js Advanced Patterns
  - references/alpinejs-deployment.md — Alpine.js Deployment
  - references/alpinejs-fundamentals.md — Alpinejs Fundamentals
  - references/alpinejs-testing.md — Alpine.js Testing Reference
## Handoff
No artifact produced.
Next skill: alpine-laravel (if Laravel backend) or frontend-testing.
Carry forward: x-data state pattern, x-model binding, store pattern.
