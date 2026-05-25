# Alpine.js Advanced Patterns

## Custom Directives

Alpine allows creating custom directives using `Alpine.directive()`:

```js
Alpine.directive('tooltip', (el, { expression }, { evaluate }) => {
  const text = evaluate(expression)
  el.addEventListener('mouseenter', () => {
    const tip = document.createElement('div')
    tip.className = 'tooltip'
    tip.textContent = text
    document.body.appendChild(tip)
    const rect = el.getBoundingClientRect()
    tip.style.top = `${rect.top - tip.offsetHeight - 4}px`
    tip.style.left = `${rect.left}px`
  })
  el.addEventListener('mouseleave', () => {
    document.querySelector('.tooltip')?.remove()
  })
})
```

```html
<button x-tooltip="'Save changes'">Save</button>
```

## Custom Magics

Extend Alpine with custom `$` properties:

```js
Alpine.magic('now', () => Date.now())
Alpine.magic('scrollPosition', () => window.scrollY)

Alpine.magic('formatDate', () => {
  return (date: string, locale = 'en-US') =>
    new Date(date).toLocaleDateString(locale)
})
```

```html
<div x-data>
  <span x-text="$formatDate('2025-01-01')"></span>
</div>
```

## Plugin Development

```js
// plugins/intersect.js
export default function (Alpine) {
  Alpine.directive('intersect', (el, { expression }, { evaluateLater, cleanup }) => {
    const evaluate = evaluateLater(expression)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) evaluate()
      })
    })
    observer.observe(el)
    cleanup(() => observer.disconnect())
  })
}

// Register
Alpine.plugin(intersectPlugin)
```

## Async Initialization

```html
<div x-data="asyncComponent" x-init="init">
  <template x-if="!loading">
    <div>
      <h2 x-text="data.title"></h2>
      <p x-text="data.description"></p>
    </div>
  </template>
  <div x-show="loading">Loading...</div>
</div>

<script>
  Alpine.data('asyncComponent', () => ({
    data: null,
    loading: true,
    async init() {
      this.data = await fetch('/api/data').then(r => r.json())
      this.loading = false
    }
  }))
</script>
```

## URL Persistence

```html
<div x-data="{ tab: 'profile' }">
  <template x-if="$persist(tab)"></template>
  <button :class="{ active: tab === 'profile' }" @click="tab = 'profile'">Profile</button>
  <button :class="{ active: tab === 'settings' }" @click="tab = 'settings'">Settings</button>
</div>
```

## Focus Management

```html
<div x-data="{ open: false }">
  <button @click="open = true; $nextTick(() => $refs.name.focus())">Open Modal</button>
  <div x-show="open" @keydown.escape.window="open = false">
    <input x-ref="name" placeholder="Enter name">
    <button @click="open = false">Close</button>
  </div>
</div>
```

## Intersection Observer

```html
<div x-data="{ visible: false }"
     x-intersect="visible = true"
     :class="visible ? 'opacity-100' : 'opacity-0'">
  Animated on scroll
</div>
```

## Form Validation Patterns

```html
<div x-data="{
  form: { name: '', email: '' },
  errors: {},
  touched: {},
  validate(field) {
    if (field === 'name' && !this.form.name) this.errors.name = 'Required'
    if (field === 'email' && !/^[^\s@]+@[^\s@]+$/.test(this.form.email))
      this.errors.email = 'Invalid email'
  },
  isInvalid(field) { return this.touched[field] && this.errors[field] }
}">
  <input x-model="form.name" @blur="touched.name = true; validate('name')"
         :class="{ 'border-red': isInvalid('name') }">
  <span x-show="isInvalid('name')" x-text="errors.name"></span>
</div>
```

## CSP-Compatible Mode

```html
<script>
  Alpine.options = { defer: true, evaluate: false }
</script>
<script src="alpinejs" defer></script>
```
