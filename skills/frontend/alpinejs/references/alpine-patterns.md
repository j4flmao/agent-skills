# Alpine.js Patterns & Best Practices

## Component Patterns

### Reusable Component (Alpine.data)

```js
// components/dropdown.js
export default () => ({
  open: false,
  toggle() { this.open = !this.open },
  close() { this.open = false },
  init() { console.log('Dropdown ready') },
})
```

```html
<!-- Register globally -->
<script>
  Alpine.data('dropdown', () => ({
    open: false,
    toggle() { this.open = !this.open },
  }))
</script>

<!-- Usage -->
<div x-data="dropdown">
  <button @click="toggle">Toggle</button>
  <div x-show="open" @click.outside="close">Menu items...</div>
</div>
```

### Component with Props

```js
Alpine.data('modal', (title = 'Modal') => ({
  title,
  open: false,
  show() { this.open = true },
  hide() { this.open = false },
}))
```

```html
<div x-data="modal('Confirm Delete')">
  <button @click="show">Delete</button>
  <div x-show="open">
    <h2 x-text="title"></h2>
    <button @click="hide">Cancel</button>
  </div>
</div>
```

## Directives Reference

| Directive | Shorthand | Purpose | Example |
|-----------|-----------|---------|---------|
| x-data | - | Declare component state | `x-data="{ count: 0 }"` |
| x-init | - | Run on initialization | `x-init="fetchData()"` |
| x-show | - | Toggle visibility (CSS) | `x-show="open"` |
| x-if | - | Conditional DOM | `x-if="user.loggedIn"` |
| x-for | - | Loop over array | `x-for="item in items"` |
| x-on | @ | Event listener | `@click="handler"` |
| x-bind | : | Bind attribute | `:class="{ active }"` |
| x-model | - | Two-way binding | `x-model="name"` |
| x-text | - | Set innerText | `x-text="message"` |
| x-html | - | Set innerHTML | `x-html="htmlContent"` |
| x-ref | - | Reference element | `x-ref="myDiv"` |
| x-cloak | - | Hide until ready | `x-cloak` |
| x-teleport | - | Teleport content | `x-teleport="body"` |
| x-transition | - | Animate transitions | `x-transition` |

## Event Modifiers

```html
<!-- Prevent default -->
<form @submit.prevent="handleSubmit">

<!-- Stop propagation -->
<button @click.stop="handleClick">

<!-- Outside click -->
<div @click.outside="close">

<!-- Window event -->
<div @resize.window="handleResize">

<!-- Debounce -->
<input @input.debounce.500ms="search">

<!-- Key modifiers -->
<input @keydown.escape="close" @keydown.enter="submit">

<!-- Once -->
<button @click.once="handleClick">

<!-- Self (ignore bubbled events) -->
<div @click.self="handleClick">
```

## Magic Properties

| Property | Purpose | Example |
|----------|---------|---------|
| `$store` | Access global store | `$store.user.name` |
| `$el` | Current DOM element | `$el.scrollTop` |
| `$refs` | Referenced elements | `$refs.input.focus()` |
| `$event` | Current event object | `$event.key` |
| `$dispatch` | Dispatch custom event | `$dispatch('notify', { msg })` |
| `$nextTick` | After Alpine re-render | `$nextTick(() => ...)` |
| `$watch` | Watch property changes | `$watch('count', val => ...)` |
| `$root` | Root component element | `$root.querySelector(...)` |
| `$data` | Component data object | `$data.count` |
| `$id` | Generate unique ID | `:id="$id('dropdown')"` |

## Event Dispatching

```html
<!-- Child component emits event -->
<div x-data="{ item: 'test' }">
  <button @click="$dispatch('item-selected', { item })">
    Select
  </button>
</div>

<!-- Parent listens (event bubbles up) -->
<div x-data @item-selected.window="handleSelect($event.detail)">
  <!-- or @item-selected="handleSelect($event.detail)" if direct parent -->
</div>
```

## Lifecycle Hooks

```js
Alpine.data('lifecycleDemo', () => ({
  // Called before Alpine initializes bindings
  init() {
    console.log('1. init()')
    // Access DOM: this.$el
    // Access Alpine: this.$data
  },

  // Custom methods
  afterInit() {
    console.log('2. Called via x-init')
  },
}))
```

```html
<div x-data="lifecycleDemo" x-init="afterInit">
</div>
```

## Loading States

```html
<div x-data="{
  data: null,
  loading: false,
  async load() {
    this.loading = true
    this.data = await fetch('/api/data').then(r => r.json())
    this.loading = false
  }
}" x-init="load()">

  <!-- Loading -->
  <div x-show="loading">Loading...</div>

  <!-- Empty -->
  <div x-show="!loading && !data.length">No results</div>

  <!-- Data -->
  <template x-for="item in data" :key="item.id">
    <div x-text="item.name"></div>
  </template>
</div>
```

## Form Validation

```html
<div x-data="{
  form: { email: '', password: '' },
  errors: {},
  validate() {
    this.errors = {}
    if (!this.form.email) this.errors.email = 'Email required'
    if (!this.form.password) this.errors.password = 'Password required'
    return Object.keys(this.errors).length === 0
  },
  submit() {
    if (!this.validate()) return
    // Submit form
  }
}">
  <input x-model="form.email" :class="{ 'border-red-500': errors.email }">
  <span x-show="errors.email" x-text="errors.email" class="text-red-500"></span>

  <input type="password" x-model="form.password">
  <span x-show="errors.password" x-text="errors.password" class="text-red-500"></span>

  <button @click="submit">Submit</button>
</div>
```

## Transitions

```html
<div x-data="{ open: false }">
  <button @click="open = !open">Toggle</button>

  <!-- Default transition -->
  <div x-show="open" x-transition>Content</div>

  <!-- Custom duration -->
  <div x-show="open" x-transition.duration.500ms>Content</div>

  <!-- Custom enter/leave -->
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

## Performance Tips

1. **Use `x-if` sparingly** — it removes/adds DOM nodes (costly). Prefer `x-show` for toggles.
2. **Extract complex logic** into methods, not inline expressions in x-data.
3. **Use `Alpine.data()`** for reusable components to avoid duplicate x-data definitions.
4. **Scope stores** by feature — avoid one monolithic store.
5. **Use `$watch`** for side effects instead of computed-like logic in x-init.
6. **`x-model` modifiers** like `.number` and `.debounce` reduce boilerplate.
7. **Limit DOM depth** — deep nesting with x-for can be slow.
8. **Use `key`** in x-for loops for stable identity.
