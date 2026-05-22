# Qwik City — Routing, Loaders, Actions, Middleware, Deployment

## File-Based Routing

```
src/routes/
  index.tsx                   ->  /
  about/index.tsx             ->  /about
  product/
    index.tsx                 ->  /product
    [id]/
      index.tsx               ->  /product/:id
  dashboard/
    layout.tsx                ->  layout for /dashboard/*
  api/
    users/
      index.ts                ->  /api/users (resource route)
```

## Route Loader — Server Data

```tsx
// src/routes/product/[id]/index.tsx
import { component$ } from '@builder.io/qwik'
import { routeLoader$ } from '@builder.io/qwik-city'

export const useProductData = routeLoader$(async ({ params, request, redirect }) => {
  const product = await db.product.findUnique({ where: { id: params.id } })
  if (!product) throw redirect(302, '/products')
  return product as Product
})

export default component$(() => {
  const productSignal = useProductData()
  return <h1>{productSignal.value.name}</h1>
})
```

## Route Action — Mutations

```tsx
import { component$ } from '@builder.io/qwik'
import { routeAction$, Form } from '@builder.io/qwik-city'

export const useDeleteProduct = routeAction$(async (form, { params, redirect }) => {
  const id = form.get('id') as string
  await db.product.delete({ where: { id } })
  throw redirect(302, '/products')
})

export default component$(() => {
  const deleteAction = useDeleteProduct()

  return (
    <Form action={deleteAction}>
      <input type="hidden" name="id" value="123" />
      <button type="submit">Delete</button>
    </Form>
  )
})
```

### Form Validation

```tsx
export const useCreateProduct = routeAction$(async (form, { fail }) => {
  const name = form.get('name') as string
  if (!name || name.length < 2) {
    return fail(400, { fieldErrors: { name: 'Name must be at least 2 characters' } })
  }
  await db.product.create({ data: { name } })
  return { success: true }
})

export default component$(() => {
  const action = useCreateProduct()
  return (
    <Form action={action}>
      <input name="name" />
      {action.value?.fieldErrors?.name && <p>{action.value.fieldErrors.name}</p>}
      <button type="submit">Create</button>
    </Form>
  )
})
```

## Layout Routes

```tsx
// src/routes/dashboard/layout.tsx
import { component$, Slot } from '@builder.io/qwik'
import { routeLoader$ } from '@builder.io/qwik-city'

export const useAuthGuard = routeLoader$(async ({ redirect, cookie }) => {
  const token = cookie.get('token')
  if (!token) throw redirect(302, '/login')
})

export default component$(() => {
  return (
    <div class="dashboard">
      <nav>Sidebar</nav>
      <main><Slot /></main>
    </div>
  )
})
```

## Middleware

```tsx
// src/routes/plugin@auth.ts
import { RequestHandler } from '@builder.io/qwik-city'

export const onRequest: RequestHandler = async ({ cookie, redirect, url }) => {
  if (!cookie.get('token') && !url.pathname.startsWith('/login')) {
    throw redirect(302, '/login')
  }
}
```

## Endpoints (Resource Routes)

```tsx
// src/routes/api/users/index.ts
import type { RequestHandler } from '@builder.io/qwik-city'

export const onGet: RequestHandler = async ({ json }) => {
  const users = await db.user.findMany()
  json(200, users)
}

export const onPost: RequestHandler = async ({ request, json }) => {
  const body = await request.json()
  const user = await db.user.create({ data: body })
  json(201, user)
}
```

## Deployment

```tsx
// vite.config.ts
import { defineConfig } from 'vite'
import { qwikCity } from '@builder.io/qwik-city/vite'
import qwikVite from '@builder.io/qwik/kit'

export default defineConfig({
  plugins: [qwikCity(), qwikVite()],
})
```

- Cloudflare Pages: `@builder.io/qwik-city/vite/cloudflare-pages`
- Netlify: `@builder.io/qwik-city/vite/netlify`
- Vercel: `@builder.io/qwik-city/vite/vercel`
- Node: built-in server adapter

## Prefetch Strategy

```tsx
// src/root.tsx — enable prefetching
import { PrefetchServiceWorker } from '@builder.io/qwik/prefetch-service-worker'

export default component$(() => {
  return (
    <>
      <head>
        <PrefetchServiceWorker />
      </head>
      <body>
        <Router />
      </body>
    </>
  )
})
```
