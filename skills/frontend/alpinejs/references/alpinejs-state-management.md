# Alpine.js State Management

## Overview

Alpine.js state management ranges from local component state with `x-data` to global stores with `Alpine.store()`, persisted state with `$persist`, and reactive side effects with `$watch` and `x-effect`. This reference covers every state management pattern: scoped state, shared stores, computed values, watchers, persistence, URL synchronization, and multi-component coordination.

## State Levels

### State Architecture

```
Level 1: Local State (x-data)
  └── Scoped to a single component
  └── Defined inline or via Alpine.data()

Level 2: Parent-Child State (x-data hierarchy)
  └── Nested components share parent scope
  └── Child can access parent state directly

Level 3: Global State (Alpine.store())
  └── Accessible across all components
  └── Registered in alpine:init event

Level 4: Persistent State ($persist)
  └── Survives page reloads (localStorage)
  └── Built on Alpine.store() or local x-data

Level 5: Server State (API data)
  └── Fetched in x-init or event handlers
  └── Stored in local or global state
```

## Local State (x-data)

### Basic Local State

```html
<div x-data="{ count: 0, name: 'Guest' }">
  <p x-text="name"></p>
  <button @click="count++">Count: <span x-text="count"></span></button>
</div>
```

### State with Initialization

```html
<div x-data="{
  products: [],
  loading: true,
  async init() {
    this.products = await (await fetch('/api/products')).json()
    this.loading = false
  }
}">
  <div x-show="loading">Loading products...</div>
  <template x-for="product in products" :key="product.id">
    <div x-text="product.name"></div>
  </template>
</div>
```

### Complex State Object

```html
<div x-data="{
  user: {
    profile: {
      firstName: '',
      lastName: '',
      avatar: null,
    },
    preferences: {
      theme: 'light',
      notifications: true,
    },
    metadata: {
      lastLogin: null,
      signupDate: null,
    },
  },
  async saveUser() {
    await fetch('/api/user', {
      method: 'PUT',
      body: JSON.stringify(this.user),
    })
  }
}">
  <input x-model="user.profile.firstName" placeholder="First name">
  <input x-model="user.profile.lastName" placeholder="Last name">
  <select x-model="user.preferences.theme">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
  <label>
    <input type="checkbox" x-model="user.preferences.notifications">
    Enable notifications
  </label>
  <button @click="saveUser">Save</button>
</div>
```

## Parent-Child State

### Nested State Access

```html
<div x-data="{ parentMessage: 'Hello from parent', items: ['A', 'B', 'C'] }">
  <p x-text="parentMessage"></p>

  <!-- Child can directly access parent state -->
  <div x-data="{ childMessage: 'Hello from child' }">
    <p x-text="parentMessage"></p>
    <p x-text="childMessage"></p>
  </div>

  <!-- Loops with scoped variables -->
  <template x-for="(item, index) in items" :key="index">
    <div x-data="{ isExpanded: false }">
      <span x-text="item"></span>
      <button @click="isExpanded = !isExpanded">
        <span x-text="isExpanded ? 'Collapse' : 'Expand'"></span>
      </button>
      <div x-show="isExpanded">
        Expanded content for item <span x-text="index"></span>
      </div>
    </div>
  </template>
</div>
```

### Child to Parent Communication

```html
<div x-data="{ total: 0 }">
  <p>Total: <span x-text="total"></span></p>

  <!-- Child dispatches event, parent listens -->
  <div x-data="{ local: 0 }"
       @click="
         local++
         $dispatch('item-added', { value: 1 })
       ">
    <button @click.stop>Click to add</button>
    <span x-text="local"></span>
  </div>

  <!-- Parent catches the event -->
  <div @item-added.window="total += $event.detail.value">
    <!-- This listens on window for the custom event -->
  </div>
</div>
```

## Global State (Alpine.store)

### Registering Stores

```html
<script>
  document.addEventListener('alpine:init', () => {
    Alpine.store('app', {
      name: 'My App',
      version: '1.0.0',
      theme: 'light',
      sidebar: {
        open: false,
        width: 280,
      },
    })

    Alpine.store('auth', {
      user: null,
      token: null,
      loading: true,
      async init() {
        this.loading = true
        try {
          const res = await fetch('/api/auth/me')
          this.user = await res.json()
        } catch {
          this.user = null
        } finally {
          this.loading = false
        }
      },
      async login(email, password) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        if (!res.ok) throw new Error('Login failed')
        this.user = await res.json()
      },
      logout() {
        this.user = null
        this.token = null
      },
      get isLoggedIn() {
        return this.user !== null
      },
      get displayName() {
        return this.user?.name || 'Guest'
      },
    })
  })
</script>

<!-- Usage in components -->
<div x-data>
  <p>App: <span x-text="$store.app.name"></span></p>
  <p>User: <span x-text="$store.auth.displayName"></span></p>
  <template x-if="$store.auth.loading">
    <p>Loading auth...</p>
  </template>
  <template x-if="!$store.auth.loading && !$store.auth.isLoggedIn">
    <button @click="$store.auth.login('admin@test.com', 'password')">Login</button>
  </template>
  <template x-if="$store.auth.isLoggedIn">
    <button @click="$store.auth.logout()">Logout</button>
  </template>
</div>
```

### Store with Computed Properties

```html
<script>
  document.addEventListener('alpine:init', () => {
    Alpine.store('cart', {
      items: [],
      addItem(product) {
        const existing = this.items.find(i => i.id === product.id)
        if (existing) {
          existing.qty++
        } else {
          this.items.push({ ...product, qty: 1 })
        }
      },
      removeItem(id) {
        this.items = this.items.filter(i => i.id !== id)
      },
      updateQty(id, qty) {
        const item = this.items.find(i => i.id === id)
        if (item) item.qty = Math.max(0, qty)
      },
      get itemCount() {
        return this.items.reduce((sum, i) => sum + i.qty, 0)
      },
      get subtotal() {
        return this.items.reduce((sum, i) => sum + i.price * i.qty, 0)
      },
      get tax() {
        return this.subtotal * 0.08
      },
      get total() {
        return this.subtotal + this.tax
      },
      get isEmpty() {
        return this.items.length === 0
      },
    })
  })
</script>

<!-- Cart counter (anywhere) -->
<div x-data>
  Cart: <span x-text="$store.cart.itemCount"></span> items
</div>

<!-- Cart details -->
<div x-data>
  <template x-for="item in $store.cart.items" :key="item.id">
    <div>
      <span x-text="item.name"></span>
      <input type="number" :value="item.qty"
             @input="$store.cart.updateQty(item.id, parseInt($event.target.value))">
      <span x-text="item.price * item.qty"></span>
      <button @click="$store.cart.removeItem(item.id)">Remove</button>
    </div>
  </template>
  <p x-show="$store.cart.isEmpty">Cart is empty</p>
  <p>Total: $<span x-text="$store.cart.total.toFixed(2)"></span></p>
</div>
```

## Reactive State Tracking

### $watch

```html
<div x-data="{
  search: '',
  results: [],
  init() {
    this.$watch('search', async (value, oldValue) => {
      if (value.length < 2) {
        this.results = []
        return
      }
      this.results = await (await fetch(`/api/search?q=${value}`)).json()
    })
  }
}">
  <input x-model="search" placeholder="Search...">
  <template x-for="r in results" :key="r.id">
    <div x-text="r.title"></div>
  </template>
</div>
```

### Deep Watch on Objects

```html
<div x-data="{
  filters: {
    category: '',
    priceRange: { min: 0, max: 1000 },
    inStock: false,
    sortBy: 'name',
  },
  products: [],
  init() {
    this.$watch('filters', () => this.fetchProducts(), { deep: true })
    this.fetchProducts()
  },
  async fetchProducts() {
    const params = new URLSearchParams({
      category: this.filters.category,
      minPrice: this.filters.priceRange.min,
      maxPrice: this.filters.priceRange.max,
      inStock: this.filters.inStock,
      sortBy: this.filters.sortBy,
    })
    this.products = await (await fetch(`/api/products?${params}`)).json()
  }
}">
  <select x-model="filters.category">
    <option value="">All</option>
    <option value="electronics">Electronics</option>
    <option value="clothing">Clothing</option>
  </select>
  <input type="range" x-model="filters.priceRange.max" min="0" max="1000">
  <label><input type="checkbox" x-model="filters.inStock"> In stock only</label>
  <select x-model="filters.sortBy">
    <option value="name">Name</option>
    <option value="price">Price</option>
  </select>

  <template x-for="p in products" :key="p.id">
    <div x-text="p.name"></div>
  </template>
</div>
```

### Watcher on Store

```html
<div x-data x-init="$watch('$store.auth.user', (user) => {
  if (user) {
    console.log('User logged in:', user.name)
  } else {
    console.log('User logged out')
  }
})">
  <!-- Component that reacts to auth changes -->
</div>
```

### x-effect

```html
<!-- x-effect runs when any dependency changes -->
<div x-data="{ count: 0, name: 'Alpine' }"
     x-effect="console.log(`Count: ${count}, Name: ${name}`)">
  <button @click="count++">Increment</button>
  <input x-model="name">
  <!-- Console logs every time count or name changes -->
</div>
```

## Persisted State ($persist)

### Basic Persistence

```html
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/persist@3.x.x/dist/cdn.min.js"></script>

<div x-data="{ theme: $persist('light'), count: $persist(0) }">
  <select x-model="theme">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
  <button @click="count++">Count: <span x-text="count"></span></button>
  <p>Values survive page reload!</p>
</div>
```

### Persisted Store

```html
<script>
  document.addEventListener('alpine:init', () => {
    Alpine.store('settings', {
      theme: Alpine.$persist('light').as('settings-theme'),
      fontSize: Alpine.$persist(16).as('settings-font-size'),
      sidebarOpen: Alpine.$persist(true).as('settings-sidebar'),
      language: Alpine.$persist('en').as('settings-lang'),
    })
  })
</script>
```

### Custom Storage Key

```html
<div x-data="{ token: $persist(null).using(sessionStorage).as('auth-token') }">
  <!-- Uses sessionStorage instead of localStorage with custom key -->
</div>
```

## URL State Synchronization

### Sync to URL Params

```html
<div x-data="{
  search: new URL(window.location).searchParams.get('q') || '',
  page: parseInt(new URL(window.location).searchParams.get('page')) || 1,
  init() {
    this.$watch('search', () => this.updateURL())
    this.$watch('page', () => this.updateURL())
  },
  updateURL() {
    const url = new URL(window.location)
    if (this.search) url.searchParams.set('q', this.search)
    else url.searchParams.delete('q')
    url.searchParams.set('page', this.page)
    window.history.replaceState({}, '', url)
  }
}">
  <input x-model="search" placeholder="Search...">
  <button @click="page = Math.max(1, page - 1)">Prev</button>
  <span x-text="page"></span>
  <button @click="page++">Next</button>
</div>
```

## Async State

### Loading States

```html
<div x-data="{
  data: null,
  error: null,
  loading: false,
  async fetchData() {
    this.loading = true
    this.error = null
    try {
      const res = await fetch('/api/data')
      if (!res.ok) throw new Error('Failed to fetch')
      this.data = await res.json()
    } catch (e) {
      this.error = e.message
    } finally {
      this.loading = false
    }
  }
}" x-init="fetchData()">
  <!-- Loading -->
  <div x-show="loading" role="status">
    <span class="spinner"></span> Loading...
  </div>

  <!-- Error -->
  <div x-show="error" class="error">
    <p x-text="error"></p>
    <button @click="fetchData">Retry</button>
  </div>

  <!-- Success -->
  <template x-if="data">
    <pre x-text="JSON.stringify(data, null, 2)"></pre>
  </template>
</div>
```

### Sequential Async Operations

```html
<div x-data="{
  step: 'idle',
  progress: 0,
  async processWorkflow() {
    this.step = 'loading'
    this.progress = 0

    try {
      this.step = 'fetching-user'
      this.progress = 25
      const user = await fetch('/api/user').then(r => r.json())

      this.step = 'fetching-orders'
      this.progress = 50
      const orders = await fetch(`/api/users/${user.id}/orders`).then(r => r.json())

      this.step = 'processing'
      this.progress = 75
      await fetch('/api/process', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, orders }),
      })

      this.step = 'complete'
      this.progress = 100
    } catch (e) {
      this.step = 'error'
      this.error = e.message
    }
  }
}">
  <button @click="processWorkflow" :disabled="step === 'loading'">
    Start Workflow
  </button>

  <div x-show="step !== 'idle'">
    <div class="progress-bar">
      <div class="progress-fill" :style="`width: ${progress}%`"></div>
    </div>
    <p x-text="step"></p>
  </div>
</div>
```

## Multi-Component Coordination

### Store-Based Coordination

```html
<script>
  document.addEventListener('alpine:init', () => {
    Alpine.store('notifications', {
      items: [],
      add(message, type = 'info') {
        const id = Date.now()
        this.items.push({ id, message, type })
        setTimeout(() => {
          this.items = this.items.filter(n => n.id !== id)
        }, 5000)
      },
      remove(id) {
        this.items = this.items.filter(n => n.id !== id)
      },
    })
  })
</script>

<!-- Component A: triggers notification -->
<button @click="$store.notifications.add('Item saved!', 'success')">
  Save
</button>

<!-- Component B: displays all notifications -->
<div x-data class="notification-container">
  <template x-for="note in $store.notifications.items" :key="note.id">
    <div class="toast" :class="`toast-${note.type}`">
      <span x-text="note.message"></span>
      <button @click="$store.notifications.remove(note.id)">x</button>
    </div>
  </template>
</div>
```

### Event-Based Coordination

```html
<!-- Component A: dispatches event -->
<div x-data="{ selectedUser: null }">
  <template x-for="user in users" :key="user.id">
    <button @click="
      selectedUser = user
      $dispatch('user-selected', { user })
    ">
      <span x-text="user.name"></span>
    </button>
  </template>
</div>

<!-- Component B: listens for event -->
<div x-data="{ user: null }"
     @user-selected.window="user = $event.detail.user">
  <template x-if="user">
    <div>
      <h2 x-text="user.name"></h2>
      <p x-text="user.email"></p>
    </div>
  </template>
  <p x-show="!user">Select a user</p>
</div>
```

## State Debugging

### DevTools

Alpine.js DevTools browser extension provides:

```
- Component tree with state inspection
- Store inspection and editing
- Console access to $store
- Time-travel debugging
- State change logging
```

### Console Access

```javascript
// Access Alpine stores from console
Alpine.store('auth').user
Alpine.store('cart').items

// Access component scope
$el.__x.$data  // Component's reactive data

// Watch all state changes
Alpine.effect(() => {
  console.log('State changed:', Alpine.store('app'))
})
```

### Debug Component

```html
<div x-data="debugState()">
  <pre x-text="JSON.stringify($data, null, 2)"></pre>
</div>

<script>
  function debugState() {
    return {
      count: 0,
      items: [],
      user: null,
    }
  }
</script>
```
