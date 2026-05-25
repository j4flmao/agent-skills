# SvelteKit Data Loading Patterns

## Page Load Functions

### Server Load (+page.server.ts)

```typescript
// src/routes/orders/+page.server.ts
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, url, locals, parent, depends }) => {
  const page = Number(url.searchParams.get('page')) || 1
  const status = url.searchParams.get('status') || 'all'

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where: { userId: locals.user.id, ...(status !== 'all' ? { status } : {}) },
      skip: (page - 1) * 20,
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
    db.order.count({ where: { userId: locals.user.id } }),
  ])

  return { orders, total, page, status }
}
```

### Universal Load (+page.ts)

```typescript
// src/routes/products/[slug]/+page.ts
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, fetch }) => {
  const res = await fetch(`/api/products/${params.slug}`)

  if (!res.ok) {
    throw error(res.status, 'Product not found')
  }

  return { product: await res.json() }
}
```

### Layout Load (+layout.server.ts)

```typescript
// src/routes/+layout.server.ts
export const load: PageServerLoad = async ({ locals, cookies }) => {
  const session = cookies.get('session')
  if (!session) return { user: null }

  const user = await db.user.findUnique({
    where: { session },
    select: { id: true, name: true, email: true, role: true },
  })

  return { user }
}
```

## Form Actions

```typescript
// src/routes/orders/create/+page.server.ts
import type { Actions } from './$types'
import { fail, redirect } from '@sveltejs/kit'
import { z } from 'zod'

const orderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().min(1) })),
})

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData()
    const parsed = orderSchema.safeParse({
      customerId: data.get('customerId'),
      items: JSON.parse(data.get('items') as string),
    })

    if (!parsed.success) {
      return fail(422, { errors: parsed.error.flatten().fieldErrors })
    }

    const order = await db.order.create({
      data: { ...parsed.data, userId: locals.user.id },
    })

    redirect(303, `/orders/${order.id}`)
  },
}
```

## Invalidate & Re-fetch

```typescript
import { invalidate, invalidateAll } from '$app/navigation'

async function refreshOrders() {
  await invalidate('app:orders')  // Re-runs load functions with depends('app:orders')
}

async function fullRefresh() {
  await invalidateAll()  // Re-runs all load functions
}
```

## Data Flow

| Source | File | Runs On |
|--------|------|---------|
| Server data | `+page.server.ts` | Server only |
| Universal data | `+page.ts` | Server (SSR) and client (CSR) |
| API endpoints | `+server.ts` | Server |
| Client fetch | `onMount` + `$state` | Client only |

## await parent()

```typescript
// src/routes/orders/[id]/+page.server.ts
export const load: PageServerLoad = async ({ params, parent }) => {
  const { user } = await parent()  // Data from layout load

  const order = await db.order.findUnique({
    where: { id: params.id, userId: user.id },
  })

  if (!order) throw error(404, 'Order not found')
  return { order }
}
```
