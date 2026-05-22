# Remix Data — Loaders, Actions, Forms, and Pending UI

## Loader — Parallel Data Loading

All matched route loaders run in parallel on every navigation:

```tsx
// app/routes/products.tsx
import { json, type LoaderFunctionArgs } from '@remix-run/node'

export async function loader({ request }: LoaderFunctionArgs) {
  const [products, categories] = await Promise.all([
    db.product.findMany(),
    db.category.findMany(),
  ])
  return json({ products, categories })
}
```

### Caching Headers

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const data = await db.product.findMany()
  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  })
}
```

### Deferred Data (non-critical)

```tsx
import { defer } from '@remix-run/node'
import { Await, useLoaderData } from '@remix-run/react'
import { Suspense } from 'react'

export async function loader({ params }: LoaderFunctionArgs) {
  const product = await db.product.findUnique({ where: { id: params.id } })
  const reviews = db.review.findMany({ where: { productId: params.id } }) // no await
  return defer({ product, reviews })
}

export default function ProductPage() {
  const { product, reviews } = useLoaderData<typeof loader>()
  return (
    <div>
      <h1>{product.name}</h1>
      <Suspense fallback={<div>Loading reviews...</div>}>
        <Await resolve={reviews}>
          {(resolvedReviews) => (
            <ul>{resolvedReviews.map(r => <li key={r.id}>{r.text}</li>)}</ul>
          )}
        </Await>
      </Suspense>
    </div>
  )
}
```

## Action — Form Mutations

```tsx
// app/routes/products.$id.tsx
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'

export async function action({ params, request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'delete') {
    await db.product.delete({ where: { id: params.id } })
    return redirect('/products')
  }

  if (intent === 'update') {
    const name = formData.get('name')
    const errors: Record<string, string> = {}
    if (!name || typeof name !== 'string') errors.name = 'Name is required'
    if (Object.keys(errors).length) return json({ errors }, { status: 400 })
    await db.product.update({ where: { id: params.id }, data: { name } })
    return json({ ok: true })
  }

  return json({ error: 'Invalid intent' }, { status: 400 })
}

export default function ProductDetail() {
  const actionData = useActionData<typeof action>()
  return (
    <Form method="post">
      <input type="hidden" name="intent" value="update" />
      <input type="text" name="name" />
      {actionData?.errors?.name && <p style={{ color: 'red' }}>{actionData.errors.name}</p>}
      <button type="submit">Update</button>
    </Form>
  )
}
```

## useFetcher — Non-Navigation Mutations

```tsx
import { useFetcher } from '@remix-run/react'

function AddToCartButton({ productId }: { productId: string }) {
  const fetcher = useFetcher()
  const busy = fetcher.state !== 'idle'

  return (
    <fetcher.Form method="post" action="/api/cart">
      <input type="hidden" name="productId" value={productId} />
      <button type="submit" disabled={busy}>
        {busy ? 'Adding...' : 'Add to Cart'}
      </button>
    </fetcher.Form>
  )
}
```

### Fetcher States

- `fetcher.state` — `'idle' | 'submitting' | 'loading'`
- `fetcher.formData` — submitted form data while in flight
- `fetcher.data` — response data from the action

## Progressive Enhancement

Forms work without JavaScript. Remix adds pending UI on top when JS loads:

```tsx
<Form method="post">
  {/* works with or without JS */}
  <input type="text" name="search" />
  <button type="submit">Search</button>
</Form>
```

When JS is available, Remix intercepts the submission, provides `useNavigation()` for pending state, and updates the DOM efficiently. No `onSubmit` handlers needed.

## Search Params & Filtering

```tsx
import { useSearchParams } from '@remix-run/react'

function ProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') || 'all'

  return (
    <select
      value={category}
      onChange={(e) => {
        setSearchParams(prev => {
          prev.set('category', e.target.value)
          return prev
        })
      }}
    >
      <option value="all">All</option>
      <option value="electronics">Electronics</option>
    </select>
  )
}
```

## Session & Auth Guard in Root Loader

```tsx
// app/root.tsx
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { getSession } from '~/sessions'

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')
  return json({ isAuthenticated: !!userId, userId })
}
```
