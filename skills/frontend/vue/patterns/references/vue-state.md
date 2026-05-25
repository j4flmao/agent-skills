# Vue State Management Patterns

## Pinia Setup Stores

### Basic Store

```typescript
// stores/counter.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)

  function increment() { count.value++ }
  function reset() { count.value = 0 }

  return { count, doubled, increment, reset }
})
```

### Store with API Integration

```typescript
// stores/users.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '@/api/users'

export const useUserStore = defineStore('users', () => {
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedId = ref<string | null>(null)

  const selectedUser = computed(() =>
    users.value.find(u => u.id === selectedId.value) ?? null
  )

  const userCount = computed(() => users.value.length)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try { users.value = await userApi.getAll() }
    catch (e) { error.value = e instanceof Error ? e.message : 'Failed' }
    finally { loading.value = false }
  }

  async function createUser(data: CreateUserDto) {
    const user = await userApi.create(data)
    users.value.push(user)
  }

  async function deleteUser(id: string) {
    await userApi.delete(id)
    users.value = users.value.filter(u => u.id !== id)
  }

  return { users, loading, error, selectedId, selectedUser, userCount, fetchUsers, createUser, deleteUser }
})
```

### Store Composition

```typescript
// stores/checkout.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCartStore } from './cart'
import { useUserStore } from './users'

export const useCheckoutStore = defineStore('checkout', () => {
  const cart = useCartStore()
  const users = useUserStore()

  const step = ref<'cart' | 'shipping' | 'payment' | 'confirm'>('cart')
  const shippingAddress = ref<Address | null>(null)
  const paymentMethod = ref<'card' | 'paypal'>('card')

  const canProceed = computed(() => {
    if (step.value === 'cart') return cart.items.length > 0
    if (step.value === 'shipping') return !!shippingAddress.value
    return true
  })

  async function placeOrder() {
    const order = {
      items: cart.items,
      shipping: shippingAddress.value,
      payment: paymentMethod.value,
      userId: users.selectedId,
    }
    await api.createOrder(order)
    cart.$reset()
    step.value = 'cart'
  }

  return { step, shippingAddress, paymentMethod, canProceed, placeOrder }
})
```

## State Architecture Rules

| State Type | Solution |
|------------|----------|
| Server data | Pinia store with fetch |
| UI state | Component ref/composable |
| Global auth | Pinia store |
| Form state | Component ref |
| URL state | Vue Router query |
| Theme/prefs | Pinia or localStorage |

## Pinia Plugin Example

```typescript
// plugins/pinia-persist.ts
export function persistPlugin({ store }) {
  const key = `pinia-${store.$id}`

  // Hydrate
  const saved = localStorage.getItem(key)
  if (saved) store.$patch(JSON.parse(saved))

  // Persist on change
  store.$subscribe(() => {
    localStorage.setItem(key, JSON.stringify(store.$state))
  })
}

const pinia = createPinia()
pinia.use(persistPlugin)
```
