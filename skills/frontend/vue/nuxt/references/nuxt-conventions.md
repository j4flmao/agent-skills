# Nuxt Conventions

## Directory Structure
```
app/
├── app.vue
├── layouts/
│   ├── default.vue
│   └── auth.vue
├── pages/
│   ├── index.vue
│   ├── orders/
│   │   ├── index.vue
│   │   └── [id].vue
│   └── login.vue
├── components/
│   ├── OrderList.vue
│   └── OrderCard.vue
├── composables/
│   ├── useOrders.ts
│   └── useAuth.ts
├── server/
│   ├── api/
│   │   └── orders.get.ts
│   └── middleware/
│       └── auth.ts
├── stores/
│   └── orders.ts
└── public/
```

## Auto-imports
- Nuxt auto-imports composables, components, and utils
- No manual import needed for `useFetch`, `useState`, `definePageMeta`

```typescript
// composables/useOrders.ts — auto-imported
export const useOrders = () => {
  return useFetch('/api/orders')
}
```

## useFetch vs useAsyncData
```typescript
// Preferred: useFetch (simpler, handles URL + options)
const { data: orders, pending, error } = useFetch('/api/orders')

// useAsyncData (custom fetcher, more control)
const { data: orders } = useAsyncData('orders', () => $fetch('/api/orders'))
```

## Server Routes
```typescript
// server/api/orders.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const orders = await db.orders.findMany({ where: { userId: query.userId } })
  return orders
})
```

## Middleware
```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { user } = useAuth()
  if (!user.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})
```
