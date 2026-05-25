# Vue Routing Patterns

## Router Setup

```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/features/home/HomePage.vue'),
      meta: { title: 'Home' },
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('@/features/products/ProductList.vue'),
      meta: { title: 'Products' },
    },
    {
      path: '/products/:id',
      name: 'product-detail',
      component: () => import('@/features/products/ProductDetail.vue'),
      props: true,
      meta: { title: 'Product Detail' },
    },
  ],
})

router.afterEach((to) => {
  document.title = `${to.meta.title} | My App`
})
```

## Navigation Guards

```typescript
// Global guard
router.beforeEach(async (to, from) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresRole && !auth.hasRole(to.meta.requiresRole as string)) {
    return { name: 'forbidden' }
  }
})

// Per-route guard
const routes = [
  {
    path: '/admin',
    component: () => import('./AdminLayout.vue'),
    beforeEnter: (to, from) => {
      const auth = useAuthStore()
      if (!auth.isAdmin) return '/forbidden'
    },
  },
]
```

## Lazy Loading

```typescript
const routes = [
  // Route-level code splitting
  { path: '/dashboard', component: () => import('./pages/Dashboard.vue') },
  { path: '/settings', component: () => import('./pages/Settings.vue') },

  // Nested routes
  {
    path: '/admin',
    component: () => import('./layouts/AdminLayout.vue'),
    children: [
      { path: '', component: () => import('./pages/AdminDashboard.vue') },
      { path: 'users', component: () => import('./pages/AdminUsers.vue') },
    ],
  },
]
```

## Search Params

```typescript
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const page = computed(() => Number(route.query.page) || 1)
const search = computed(() => route.query.q || '')

function updateSearch(query: string) {
  router.replace({ query: { ...route.query, q: query, page: 1 } })
}

function goToPage(n: number) {
  router.push({ query: { ...route.query, page: n } })
}
```

## Route Props

```typescript
const routes = [
  {
    path: '/users/:id',
    component: UserDetail,
    props: true,  // Pass params as props
  },
  {
    path: '/search',
    component: SearchResults,
    props: (route) => ({ query: route.query.q }),
  },
]
```

## Navigation Methods

```typescript
// Programmatic navigation
router.push('/users')
router.push({ name: 'user-detail', params: { id: '123' } })
router.push({ path: '/search', query: { q: 'vue' } })
router.replace('/login')     // No history entry
router.back()                // Go back
router.go(-2)                // Go back 2 steps
```
