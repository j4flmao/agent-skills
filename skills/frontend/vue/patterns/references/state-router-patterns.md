# Vue State & Router Patterns

## Pinia Setup Stores

### Setup Store Syntax (Composition API)
```typescript
// stores/auth.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/shared/api'
import type { User, LoginCredentials } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const userName = computed(() => user.value?.name ?? 'Guest')

  async function login(credentials: LoginCredentials) {
    loading.value = true
    try {
      const res = await api.login(credentials)
      user.value = res.user
      token.value = res.token
      localStorage.setItem('token', res.token)
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  return { user, token, loading, isAuthenticated, userName, login, logout }
})
```

### Store Composition
```typescript
// stores/cart.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth.store'

export const useCartStore = defineStore('cart', () => {
  const auth = useAuthStore()
  const items = ref<CartItem[]>([])
  const savedForLater = ref<CartItem[]>([])

  const itemCount = computed(() => items.value.reduce((s, i) => s + i.quantity, 0))
  const subtotal = computed(() => items.value.reduce((s, i) => s + i.price * i.quantity, 0))
  const total = computed(() => subtotal.value - discount.value)
  const discount = computed(() => coupon.value ? subtotal.value * 0.1 : 0)
  const isGuest = computed(() => !auth.isAuthenticated)

  const coupon = ref<string | null>(null)

  function addItem(product: Product, qty = 1) {
    const existing = items.value.find(i => i.productId === product.id)
    if (existing) existing.quantity += qty
    else items.value.push({ productId: product.id, name: product.name, price: product.price, quantity: qty })
  }

  function removeItem(productId: string) {
    items.value = items.value.filter(i => i.productId !== productId)
  }

  async function syncWithServer() {
    if (!auth.isAuthenticated) return
    await api.syncCart(items.value)
  }

  return { items, savedForLater, coupon, itemCount, subtotal, discount, total, isGuest, addItem, removeItem, syncWithServer }
})
```

### Options API Style (Legacy)
```typescript
export const useProductStore = defineStore('products', {
  state: () => ({ products: [] as Product[], filters: {} as ProductFilters }),
  getters: {
    filtered: (state) => state.products.filter(p => /* ... */),
    inStock: (state) => state.products.filter(p => p.stock > 0),
  },
  actions: {
    async fetchProducts() {
      this.products = await api.getProducts(this.filters)
    },
  },
})
```

## Router Guards

### Auth Guard
```typescript
// router/guards.ts
import { useAuthStore } from '@/stores/auth.store'
import type { RouteLocationNormalized } from 'vue-router'

export async function authGuard(to: RouteLocationNormalized, from: RouteLocationNormalized) {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresRole && !auth.hasRole(to.meta.requiresRole as string)) {
    return { name: 'forbidden' }
  }
}
```

### Data Prefetch Guard
```typescript
export async function prefetchGuard(to: RouteLocationNormalized) {
  if (to.meta.prefetch) {
    await to.meta.prefetch(to)
  }
}
```

### Guard Registration
```typescript
import { createRouter, createWebHistory } from 'vue-router'
import { authGuard, prefetchGuard } from './guards'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/products/:id',
      name: 'product-detail',
      component: () => import('@/features/products/ProductDetailPage.vue'),
      meta: {
        prefetch: async (to: RouteLocationNormalized) => {
          const store = useProductStore()
          await store.fetchProduct(to.params.id as string)
        },
      },
    },
  ],
})

router.beforeEach(prefetchGuard)
router.beforeEach(authGuard)
```

## Lazy Route Configuration

### Child Routes
```typescript
{
  path: '/admin',
  component: () => import('@/features/admin/AdminLayout.vue'),
  meta: { requiresAuth: true, requiresRole: 'admin' },
  children: [
    {
      path: '',
      redirect: { name: 'admin-dashboard' },
    },
    {
      path: 'dashboard',
      name: 'admin-dashboard',
      component: () => import('@/features/admin/DashboardPage.vue'),
    },
    {
      path: 'users',
      name: 'admin-users',
      component: () => import('@/features/admin/UserManagementPage.vue'),
    },
  ],
}
```

### Named Views
```typescript
{
  path: '/profile',
  components: {
    default: () => import('@/features/profile/ProfileContent.vue'),
    sidebar: () => import('@/features/profile/ProfileSidebar.vue'),
  },
}
```

## Navigation Guards Decision Table

| Guard Type | Purpose | Usage |
|-----------|---------|-------|
| `beforeEach` | Global auth, redirect | Check auth, redirect to login |
| `beforeResolve` | Data prefetching | Load data before component mounts |
| `afterEach` | Analytics, scroll restoration | Log page views, reset scroll |
| `beforeEnter` (route) | Route-specific checks | Role/permission per route |
| `beforeEnter` (component) | Component-level guards | Form dirty check, unsaved changes |

## Router Anti-Patterns
- ❌ **Eager route imports**: `import Page from '...'` instead of dynamic `import()`.
- ❌ **Auth logic in components**: Route guards should handle auth — not `onMounted` checks.
- ❌ **Mixing Options API and Setup API stores**: Pick one syntax consistently.
- ❌ **Store in `onMounted`**: Initialize stores in route guards or composables, not lifecycle hooks.
- ❌ **Global state in `provide`**: Use Pinia for global state, `provide/inject` for dependency injection.
