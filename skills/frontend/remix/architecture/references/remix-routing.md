# Remix Routing — Route Modules, Nested Routes, Layouts

## Route File Conventions (Vite)

```
app/
  routes/
    _index.tsx              ->  /
    about.tsx               ->  /about
    products.tsx            ->  /products
    products.$id.tsx        ->  /products/:id
    products.$id.edit.tsx   ->  /products/:id/edit
    admin.tsx               ->  /admin
    admin.users.tsx         ->  /admin/users
    admin.users.$id.tsx     ->  /admin/users/:id
  root.tsx                  ->  root layout
```

## Route Module Exports

```tsx
// app/routes/products.$id.tsx
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node'
import { useLoaderData, Form, Outlet } from '@remix-run/react'

// Required: defines the component to render
export default function ProductDetail() {
  const product = useLoaderData<typeof loader>()
  return (
    <div>
      <h1>{product.name}</h1>
      <Form method="post">
        <input type="hidden" name="id" value={product.id} />
        <button type="submit">Delete</button>
      </Form>
      <Outlet /> {/* nested child routes render here */}
    </div>
  )
}

// Data loading — runs on server only
export async function loader({ params, request }: LoaderFunctionArgs) {
  const product = await db.product.findUnique({ where: { id: params.id } })
  if (!product) throw new Response('Not Found', { status: 404 })
  return json(product)
}

// Mutations — runs on server only
export async function action({ params, request }: ActionFunctionArgs) {
  const formData = await request.formData()
  await db.product.delete({ where: { id: params.id } })
  return json({ ok: true })
}
```

## Layout Routes

A layout route wraps child routes. Create a file without a default export — it acts as a layout wrapper:

```tsx
// app/routes/admin.tsx
import { Outlet } from '@remix-run/react'
import AdminSidebar from '~/components/AdminSidebar'

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex' }}>
      <AdminSidebar />
      <main>
        <Outlet /> {/* child routes render here */}
      </main>
    </div>
  )
}

// Loader runs for ALL nested admin routes
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request)
  if (user.role !== 'admin') throw new Response('Forbidden', { status: 403 })
  return json({ user })
}
```

## Pathless Layout Routes

Use `__` prefix for routes that add layout without affecting the URL path:

```
app/routes/__auth.login.tsx    ->  /login
app/routes/__auth.register.tsx ->  /register
```

```tsx
// app/routes/__auth.tsx
import { Outlet } from '@remix-run/react'

export default function AuthLayout() {
  return (
    <div className="auth-container">
      <Outlet />
    </div>
  )
}
```

## Resource Routes

API endpoints without a UI component. Export loader and/or action but no default component:

```tsx
// app/routes/api.products.tsx
import { json } from '@remix-run/node'

export async function loader() {
  const products = await db.product.findMany()
  return json(products, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  })
}

// No default export — this is a resource route
```

- Return JSON, text, CSV, or any response type
- Use `Response` for non-JSON responses (e.g., file downloads, redirects)

## Nested Routes & Shared State

Parent loader data is accessible via `useRouteLoaderData`:

```tsx
const adminData = useRouteLoaderData<typeof loader>('routes/admin')
// ^ matches the id of the parent route module
```

## Linking Between Routes

```tsx
import { Link, NavLink } from '@remix-run/react'

<Link to="/products/123">View</Link>
<NavLink to="/products" className={({ isActive }) => isActive ? 'active' : ''}>
  Products
</NavLink>
```

Use `<Link prefetch="intent">` to preload data on hover. Use `<NavLink end>` to match exactly.
