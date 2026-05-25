# Qwik Data Patterns

## Data Loading with routeLoader$

```tsx
// src/routes/products/index.tsx
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city'

export const useProducts = routeLoader$(async ({ query, url }) => {
  const page = Number(url.searchParams.get('page')) || 1
  const search = url.searchParams.get('q') || ''
  const [products, total] = await Promise.all([
    db.product.findMany({ skip: (page - 1) * 20, take: 20, where: search ? { name: { contains: search } } : {} }),
    db.product.count(),
  ])
  return { products: products as Product[], total, page, pageSize: 20 }
})

export default component$(() => {
  const products = useProducts()
  return <div>...</div>
})
```

## Actions with routeAction$

```tsx
export const useUpdateProduct = routeAction$(async (form, { params, fail }) => {
  const name = form.get('name') as string
  const price = Number(form.get('price'))
  if (!name || name.length < 2) return fail(400, { field: 'name', message: 'Name too short' })
  if (!price || price <= 0) return fail(400, { field: 'price', message: 'Invalid price' })
  await db.product.update({ where: { id: params.id }, data: { name, price } })
  return { success: true }
})

export default component$(() => {
  const action = useUpdateProduct()
  return (
    <Form action={action} spaReset>
      <input name="name" />
      <input name="price" type="number" />
      <button type="submit">Save</button>
    </Form>
  )
})
```

## Server Functions

```ts
// src/components/server-functions.ts
import { server$ } from '@builder.io/qwik-city'

export const chargeCustomer = server$(async (amount: number, token: string) => {
  const charge = await stripe.charges.create({ amount, currency: 'usd', source: token })
  await db.transaction.create({ data: { stripeId: charge.id, amount } })
  return charge.id
})
```

## Data Flow

| Source | API | Where it runs | When |
|--------|-----|---------------|------|
| Database | `routeLoader$` | Server | Per request or build |
| External API | `routeLoader$` | Server | Per request |
| Browser state | `useSignal` | Client | On interaction |
| Form submission | `routeAction$` | Server | On submit |
| WebSocket | `useVisibleTask$` | Client | On mount |

## Error Handling

```tsx
export const useUserData = routeLoader$(async ({ params, redirect }) => {
  const user = await db.user.findUnique({ where: { id: params.id } })
  if (!user) throw redirect(308, '/users')
  return user as User
})

export default component$(() => {
  const data = useUserData()
  return <div>{data.value.name}</div>
})
```

## Caching Strategy

```tsx
export const useProducts = routeLoader$(async ({ request, cache }) => {
  const cached = await cache.get('products')
  if (cached) return JSON.parse(cached)
  const products = await db.product.findMany()
  await cache.set('products', JSON.stringify(products), { ttl: 60 })
  return products as Product[]
})
```
