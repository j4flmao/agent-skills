# Alpine.js Component Patterns

## Overview

Alpine.js components are defined declaratively in HTML using directives. This reference covers every component pattern: basic state, computed properties, watchers, methods, event handling, conditional rendering, loops, transitions, modals, dropdowns, tabs, accordions, forms, and reusable component abstractions.

## Component Fundamentals

### Basic Component

```html
<div x-data="{ count: 0 }">
  <button @click="count++">Increment</button>
  <span x-text="count"></span>
</div>
```

### Component with Methods

```html
<div x-data="{
  count: 0,
  increment() { this.count++ },
  decrement() { this.count-- },
  reset() { this.count = 0 }
}">
  <button @click="increment()">+</button>
  <span x-text="count"></span>
  <button @click="decrement()">-</button>
  <button @click="reset()">Reset</button>
</div>
```

### Component with Initialization

```html
<div x-data="{ user: null }" x-init="user = await (await fetch('/api/user')).json()">
  <template x-if="user">
    <div>
      <h2 x-text="user.name"></h2>
      <p x-text="user.email"></p>
    </div>
  </template>
  <div x-show="!user">Loading...</div>
</div>
```

## Data and Computed Properties

### Simple Computed Property

```html
<div x-data="{
  firstName: 'John',
  lastName: 'Doe',
  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }
}">
  <input x-model="firstName" placeholder="First name">
  <input x-model="lastName" placeholder="Last name">
  <p>Full name: <span x-text="fullName"></span></p>
</div>
```

### Multiple Computed Properties

```html
<div x-data="{
  items: [
    { name: 'Widget', price: 10, qty: 2 },
    { name: 'Gadget', price: 20, qty: 1 },
  ],
  get subtotal() {
    return this.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  },
  get tax() {
    return this.subtotal * 0.08
  },
  get total() {
    return this.subtotal + this.tax
  }
}">
  <template x-for="(item, i) in items" :key="i">
    <div>
      <span x-text="item.name"></span>
      $<span x-text="item.price"></span>
      x <span x-text="item.qty"></span>
      = $<span x-text="item.price * item.qty"></span>
    </div>
  </template>
  <p>Subtotal: $<span x-text="subtotal.toFixed(2)"></span></p>
  <p>Tax: $<span x-text="tax.toFixed(2)"></span></p>
  <p>Total: $<span x-text="total.toFixed(2)"></span></p>
</div>
```

## Watchers

### $watch Basic

```html
<div x-data="{ search: '', results: [] }"
     x-init="$watch('search', async (value) => {
       if (value.length < 2) { results = []; return }
       results = await (await fetch(`/api/search?q=${value}`)).json()
     })">
  <input x-model="search" placeholder="Search...">
  <template x-for="result in results" :key="result.id">
    <div x-text="result.title"></div>
  </template>
</div>
```

### $watch Deep Tracking

```html
<div x-data="{
  form: { email: '', password: '' },
  errors: {},
  touched: {}
}" x-init="$watch('form', (value) => {
  validate(value)
}, { deep: true })">
  <input x-model="form.email" type="email">
  <span x-show="errors.email" x-text="errors.email" class="error"></span>

  <input x-model="form.password" type="password">
  <span x-show="errors.password" x-text="errors.password" class="error"></span>
</div>
```

### Debounced Watch

```html
<div x-data="{
  query: '',
  results: [],
  timeout: null,
  init() {
    this.$watch('query', (value) => {
      clearTimeout(this.timeout)
      if (value.length < 2) { this.results = []; return }
      this.timeout = setTimeout(async () => {
        this.results = await (await fetch(`/api/search?q=${value}`)).json()
      }, 300)
    })
  }
}">
  <input x-model="query" placeholder="Search...">
  <template x-for="r in results" :key="r.id">
    <div x-text="r.title"></div>
  </template>
</div>
```

## Event Handling

### Event Modifiers

```html
<!-- Prevent default -->
<form @submit.prevent="handleSubmit">
  <button type="submit">Submit</button>
</form>

<!-- Stop propagation -->
<div @click="parentClick">
  <button @click.stop="childClick">Don't bubble</button>
</div>

<!-- Once -->
<button @click.once="handleOnce">Fire once</button>

<!-- Window event -->
<div @resize.window="width = window.innerWidth">
  Window width: <span x-text="width"></span>
</div>

<!-- Outside click -->
<div x-data="{ open: false }"
     @click.away="open = false">
  <button @click="open = !open">Toggle</button>
  <div x-show="open">Dropdown content</div>
</div>

<!-- Key modifiers -->
<input @keydown.escape="search = ''" @keydown.enter="submit" x-model="search">

<!-- Multiple modifiers -->
<a href="/page" @click.prevent.stop="handleClick">Link</a>
```

### Custom Events

```html
<!-- Dispatching custom events -->
<div x-data="{ count: 0 }">
  <button @click="
    count++
    $dispatch('counter-updated', { count })
  ">
    Increment (<span x-text="count"></span>)
  </button>
</div>

<!-- Listening to custom events -->
<div x-data="{ total: 0 }"
     @counter-updated.window="total = $event.detail.count">
  Total: <span x-text="total"></span>
</div>
```

### Keyboard Navigation

```html
<div x-data="{
  selectedIndex: 0,
  items: ['Apple', 'Banana', 'Cherry', 'Date'],
  handleKeydown(event) {
    if (event.key === 'ArrowDown') {
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.items.length - 1)
    }
    if (event.key === 'ArrowUp') {
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0)
    }
    if (event.key === 'Enter') {
      this.selectItem(this.selectedIndex)
    }
  },
  selectItem(index) {
    alert('Selected: ' + this.items[index])
  }
}" @keydown="handleKeydown" tabindex="0">
  <template x-for="(item, i) in items" :key="i">
    <div @click="selectItem(i)"
         :class="{ 'bg-blue-100': selectedIndex === i }"
         x-text="item">
    </div>
  </template>
</div>
```

## Conditional Rendering

### x-show vs x-if

```html
<!-- x-show: toggles display:none (keeps DOM node, fast toggle) -->
<div x-data="{ show: false }">
  <button @click="show = !show">Toggle</button>
  <div x-show="show">
    This element stays in the DOM (display: none when hidden)
  </div>
</div>

<!-- x-if: removes/adds DOM node (good for heavy content) -->
<div x-data="{ show: false }">
  <button @click="show = !show">Toggle</button>
  <template x-if="show">
    <div>
      This element is removed from DOM when hidden
    </div>
  </template>
</div>
```

### Multi-Conditional

```html
<div x-data="{ status: 'loading' }">
  <div x-show="status === 'loading'">Loading...</div>
  <div x-show="status === 'error'">Error loading data</div>
  <div x-show="status === 'success'">Data loaded successfully</div>
  <div x-show="status === 'empty'">No data available</div>
</div>
```

## Loops

### Basic Loop

```html
<div x-data="{ items: ['Apple', 'Banana', 'Cherry'] }">
  <template x-for="(item, index) in items" :key="index">
    <div>
      <span x-text="index + 1"></span>. <span x-text="item"></span>
    </div>
  </template>
</div>
```

### Loop with Objects

```html
<div x-data="{
  users: [
    { id: 1, name: 'Alice', role: 'Admin' },
    { id: 2, name: 'Bob', role: 'User' },
    { id: 3, name: 'Charlie', role: 'User' },
  ]
}">
  <template x-for="user in users" :key="user.id">
    <div>
      <strong x-text="user.name"></strong>
      <span x-text="user.role"></span>
    </div>
  </template>
</div>
```

### Dynamic List with Add/Remove

```html
<div x-data="{
  todos: [],
  newTodo: '',
  addTodo() {
    if (this.newTodo.trim()) {
      this.todos.push({ id: Date.now(), text: this.newTodo, done: false })
      this.newTodo = ''
    }
  },
  removeTodo(id) {
    this.todos = this.todos.filter(t => t.id !== id)
  },
  toggleDone(id) {
    this.todos = this.todos.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    )
  }
}">
  <input x-model="newTodo" @keydown.enter="addTodo" placeholder="Add todo...">
  <button @click="addTodo">Add</button>

  <template x-for="todo in todos" :key="todo.id">
    <div>
      <input type="checkbox" :checked="todo.done" @click="toggleDone(todo.id)">
      <span x-text="todo.text" :class="{ 'line-through': todo.done }"></span>
      <button @click="removeTodo(todo.id)">x</button>
    </div>
  </template>
</div>
```

## Transitions

### Basic Transitions

```html
<div x-data="{ open: false }">
  <button @click="open = !open">Toggle</button>
  <div x-show="open"
       x-transition.duration.500ms>
    Transition with default timing
  </div>
</div>
```

### Custom Transition Classes

```html
<div x-data="{ open: false }">
  <button @click="open = !open">Toggle</button>
  <div x-show="open"
       x-transition:enter="transition ease-out duration-300"
       x-transition:enter-start="opacity-0 transform scale-90"
       x-transition:enter-end="opacity-100 transform scale-100"
       x-transition:leave="transition ease-in duration-200"
       x-transition:leave-start="opacity-100 transform scale-100"
       x-transition:leave-end="opacity-0 transform scale-90">
    Animated content
  </div>
</div>
```

### Slide Transition (Collapse Plugin)

```html
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/cdn.min.js"></script>

<div x-data="{ expanded: false }">
  <button @click="expanded = !expanded">Toggle</button>
  <div x-show="expanded" x-collapse.duration.300ms>
    <p>Content that slides open/closed</p>
    <p>Multiple paragraphs</p>
  </div>
</div>
```

## Modals

### Basic Modal

```html
<div x-data="{ open: false }">
  <button @click="open = true">Open Modal</button>

  <!-- Backdrop -->
  <div x-show="open"
       x-transition.opacity.duration.200ms
       @click="open = false"
       style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40;">
  </div>

  <!-- Modal panel -->
  <div x-show="open"
       x-transition
       @click.away="open = false"
       @keydown.escape="open = false"
       style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
              background: white; padding: 24px; border-radius: 8px; z-index: 50;">
    <h2>Modal Title</h2>
    <p>Modal content goes here.</p>
    <button @click="open = false">Close</button>
  </div>
</div>
```

### Reusable Modal Component

```html
<div x-data="{
  show(name) {
    Alpine.store('modal').open(name)
  }
}">
  <button @click="show('help')">Help</button>
  <button @click="show('settings')">Settings</button>
</div>

<script>
  document.addEventListener('alpine:init', () => {
    Alpine.store('modal', {
      current: null,
      open(name) { this.current = name },
      close() { this.current = null },
      isOpen(name) { return this.current === name }
    })
  })
</script>

<div x-data>
  <template x-if="$store.modal.isOpen('help')">
    <div @keydown.escape="$store.modal.close()">
      <div @click="$store.modal.close()" class="backdrop"></div>
      <div class="modal-panel">
        <h2>Help</h2>
        <p>Help content here</p>
        <button @click="$store.modal.close()">Close</button>
      </div>
    </div>
  </template>
</div>
```

## Dropdown

### Simple Dropdown

```html
<div x-data="{ open: false }" @click.away="open = false" class="relative">
  <button @click="open = !open" class="dropdown-trigger">
    Menu
    <span x-show="open">&uarr;</span>
    <span x-show="!open">&darr;</span>
  </button>

  <div x-show="open" x-transition class="dropdown-menu">
    <a href="#" @click="open = false">Profile</a>
    <a href="#" @click="open = false">Settings</a>
    <a href="#" @click="open = false">Logout</a>
  </div>
</div>
```

## Tabs

### Tab Component

```html
<div x-data="{ activeTab: 'tab1' }">
  <div class="tabs">
    <button @click="activeTab = 'tab1'" :class="{ active: activeTab === 'tab1' }">
      Tab 1
    </button>
    <button @click="activeTab = 'tab2'" :class="{ active: activeTab === 'tab2' }">
      Tab 2
    </button>
    <button @click="activeTab = 'tab3'" :class="{ active: activeTab === 'tab3' }">
      Tab 3
    </button>
  </div>

  <div class="tab-content" x-show="activeTab === 'tab1'" x-transition>
    Tab 1 content
  </div>
  <div class="tab-content" x-show="activeTab === 'tab2'" x-transition>
    Tab 2 content
  </div>
  <div class="tab-content" x-show="activeTab === 'tab3'" x-transition>
    Tab 3 content
  </div>
</div>
```

## Accordion

```html
<div x-data="{ expanded: null }">
  <template x-for="(section, i) in sections" :key="i">
    <div>
      <button @click="expanded = expanded === i ? null : i"
              :class="{ active: expanded === i }">
        <span x-text="section.title"></span>
        <span x-text="expanded === i ? '-' : '+'"></span>
      </button>
      <div x-show="expanded === i" x-collapse>
        <p x-text="section.content"></p>
      </div>
    </div>
  </template>
</div>
```

## Forms

### Form with Validation

```html
<div x-data="{
  form: { email: '', password: '', confirmPassword: '' },
  errors: {},
  validate() {
    this.errors = {}
    if (!this.form.email) this.errors.email = 'Required'
    else if (!this.form.email.includes('@')) this.errors.email = 'Invalid email'
    if (!this.form.password) this.errors.password = 'Required'
    else if (this.form.password.length < 8) this.errors.password = 'Min 8 chars'
    if (this.form.password !== this.form.confirmPassword)
      this.errors.confirmPassword = 'Passwords must match'
    return Object.keys(this.errors).length === 0
  },
  async submit() {
    if (!this.validate()) return
    const response = await fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify(this.form),
    })
    if (response.ok) window.location.href = '/welcome'
  }
}">
  <form @submit.prevent="submit">
    <input x-model="form.email" type="email" placeholder="Email">
    <span x-show="errors.email" x-text="errors.email" class="error"></span>

    <input x-model="form.password" type="password" placeholder="Password">
    <span x-show="errors.password" x-text="errors.password" class="error"></span>

    <input x-model="form.confirmPassword" type="password" placeholder="Confirm password">
    <span x-show="errors.confirmPassword" x-text="errors.confirmPassword" class="error"></span>

    <button type="submit">Register</button>
  </form>
</div>
```

### Dynamic Form Fields

```html
<div x-data="{
  contacts: [{ name: '', email: '' }],
  addContact() {
    this.contacts.push({ name: '', email: '' })
  },
  removeContact(index) {
    this.contacts.splice(index, 1)
  }
}">
  <template x-for="(contact, i) in contacts" :key="i">
    <div class="contact-row">
      <input x-model="contact.name" placeholder="Name">
      <input x-model="contact.email" type="email" placeholder="Email">
      <button @click="removeContact(i)" x-show="contacts.length > 1">Remove</button>
    </div>
  </template>
  <button @click="addContact">Add Contact</button>
</div>
```

### Checkbox Group

```html
<div x-data="{
  allItems: [
    { id: 1, label: 'Option A' },
    { id: 2, label: 'Option B' },
    { id: 3, label: 'Option C' },
  ],
  selected: [],
  toggleAll() {
    this.selected = this.selected.length === this.allItems.length
      ? []
      : this.allItems.map(i => i.id)
  },
  isAllSelected() {
    return this.selected.length === this.allItems.length
  }
}">
  <label>
    <input type="checkbox"
           :checked="isAllSelected()"
           @click="toggleAll()">
    Select All
  </label>

  <template x-for="item in allItems" :key="item.id">
    <label>
      <input type="checkbox"
             :value="item.id"
             x-model="selected">
      <span x-text="item.label"></span>
    </label>
  </template>

  <p>Selected: <span x-text="selected.join(', ')"></span></p>
</div>
```

## Data Fetching

### Basic Fetch

```html
<div x-data="{
  users: [],
  loading: true,
  error: null,
  async init() {
    try {
      this.users = await (await fetch('/api/users')).json()
    } catch (e) {
      this.error = e.message
    } finally {
      this.loading = false
    }
  }
}">
  <div x-show="loading">Loading...</div>
  <div x-show="error" x-text="error" class="error"></div>
  <template x-for="user in users" :key="user.id">
    <div x-text="user.name"></div>
  </template>
</div>
```

### Refetch on Interval

```html
<div x-data="{
  data: null,
  interval: null,
  async fetchData() {
    this.data = await (await fetch('/api/live')).json()
  },
  init() {
    this.fetchData()
    this.interval = setInterval(() => this.fetchData(), 5000)
  },
  destroy() {
    clearInterval(this.interval)
  }
}">
  <pre x-text="JSON.stringify(data, null, 2)"></pre>
</div>
```

## Reusable Components (Alpine.data)

### Global Component Registration

```html
<script>
  document.addEventListener('alpine:init', () => {
    Alpine.data('dropdown', () => ({
      open: false,
      toggle() { this.open = !this.open },
      close() { this.open = false },
    }))

    Alpine.data('counter', (initial = 0) => ({
      count: initial,
      increment() { this.count++ },
      decrement() { this.count-- },
      reset() { this.count = initial },
    }))
  })
</script>

<div x-data="dropdown" @click.away="close" class="dropdown">
  <button @click="toggle">Dropdown</button>
  <div x-show="open" x-transition>
    <a href="#">Item 1</a>
    <a href="#">Item 2</a>
  </div>
</div>

<div x-data="counter(10)">
  <button @click="decrement">-</button>
  <span x-text="count"></span>
  <button @click="increment">+</button>
  <button @click="reset">Reset</button>
</div>
```

### Component with Props

```html
<script>
  document.addEventListener('alpine:init', () => {
    Alpine.data('modal', (config = {}) => ({
      open: false,
      title: config.title || 'Modal',
      size: config.size || 'md',
      openModal() { this.open = true },
      closeModal() { this.open = false },
    }))
  })
</script>

<div x-data="modal({ title: 'Confirm Delete', size: 'sm' })">
  <button @click="openModal">Delete</button>

  <div x-show="open" @keydown.escape="closeModal">
    <div @click="closeModal" class="backdrop"></div>
    <div class="modal-panel" :class="`modal-${size}`">
      <h2 x-text="title"></h2>
      <p>Are you sure?</p>
      <button @click="closeModal">Cancel</button>
      <button @click="closeModal">Confirm</button>
    </div>
  </div>
</div>
```

## Plugins

### Intersection Observer

```html
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/intersect@3.x.x/dist/cdn.min.js"></script>

<div x-intersect.once.half="$el.classList.add('visible')"
     class="animate-on-scroll">
  This animates when 50% visible (once)
</div>

<div x-intersect:leave="console.log('left viewport')">
  Track when element leaves viewport
</div>
```

### Persist Plugin

```html
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/persist@3.x.x/dist/cdn.min.js"></script>

<div x-data="{ theme: $persist('light'), count: $persist(0) }">
  <select x-model="theme">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
  <button @click="count++">Count: <span x-text="count"></span></button>
  <p>Theme persists across page reloads!</p>
</div>
```

### Focus Plugin

```html
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/focus@3.x.x/dist/cdn.min.js"></script>

<div x-data="{ open: false }">
  <button @click="open = true">Open Modal</button>
  <div x-show="open"
       x-trap.noscroll="open"
       @keydown.escape="open = false">
    <h2>Focus is trapped inside this modal</h2>
    <input placeholder="Tab stays in modal">
    <button @click="open = false">Close</button>
  </div>
</div>
```

### Mask Plugin

```html
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/mask@3.x.x/dist/cdn.min.js"></script>

<input x-mask:dynamic="$money($input, '.', ',')" placeholder="0.00">
<input x-mask="(999) 999-9999" placeholder="Phone number">
<input x-mask="99/99/9999" placeholder="MM/DD/YYYY">
```

## Debugging

```html
<!-- Logging to console -->
<button @click="console.log(count)">Log count</button>

<!-- Watch all state changes -->
<div x-data x-effect="console.log($data)">
  <!-- Logs every state change in this component -->
</div>

<!-- Using $el for DOM reference -->
<div x-data x-init="console.log($el)">
  Component element reference
</div>
```
