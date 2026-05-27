# Remix Loader Patterns

## Route Loaders

```typescript
// app/routes/users._index.tsx
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { db } from '~/db.server'
import { requireUserId } from '~/session.server'

interface User {
  id: string
  name: string
  email: string
  role: string
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)

  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') || '1')
  const search = url.searchParams.get('search') || ''

  const users = await db.user.findMany({
    where: {
      name: { contains: search },
    },
    skip: (page - 1) * 20,
    take: 20,
    orderBy: { createdAt: 'desc' },
  })

  const total = await db.user.count({
    where: { name: { contains: search } },
  })

  return json({
    users,
    pagination: { page, total, pageSize: 20, totalPages: Math.ceil(total / 20) },
  })
}

export default function Users() {
  const { users, pagination } = useLoaderData<typeof loader>()

  return (
    <div>
      <div className="grid gap-4">
        {users.map(user => (
          <Link key={user.id} to={`/users/${user.id}`} className="card p-4">
            <h3>{user.name}</h3>
            <p className="text-gray-600">{user.email}</p>
          </Link>
        ))}
      </div>
      <Pagination pagination={pagination} />
    </div>
  )
}
```

## Form Actions

```typescript
// app/routes/users.new.tsx
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node'
import { Form, useActionData, useNavigation } from '@remix-run/react'
import { db } from '~/db.server'
import { z } from 'zod'

const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  role: z.enum(['admin', 'user', 'viewer']),
})

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const data = Object.fromEntries(formData)

  const result = CreateUserSchema.safeParse(data)
  if (!result.success) {
    return json({ errors: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const user = await db.user.create({ data: result.data })
  return redirect(`/users/${user.id}`)
}

export default function NewUser() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <Form method="post" className="max-w-md space-y-4">
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required />
        {actionData?.errors?.name && (
          <p className="text-red-500">{actionData.errors.name[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
        {actionData?.errors?.email && (
          <p className="text-red-500">{actionData.errors.email[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor="role">Role</label>
        <select id="role" name="role">
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create User'}
      </button>
    </Form>
  )
}
```

## Nested Routes and Outlets

```typescript
// app/routes/users.tsx
import { Outlet, NavLink } from '@remix-run/react'

export default function UsersLayout() {
  return (
    <div className="flex gap-6">
      <aside className="w-64">
        <nav>
          <NavLink to="/users" end>All Users</NavLink>
          <NavLink to="/users/new">New User</NavLink>
        </nav>
      </aside>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

// app/routes/users.$userId.tsx
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useParams } from '@remix-run/react'
import { db } from '~/db.server'

export async function loader({ params }: LoaderFunctionArgs) {
  const user = await db.user.findUnique({
    where: { id: params.userId },
    include: { posts: true },
  })

  if (!user) throw new Response('Not Found', { status: 404 })
  return json({ user })
}
```

## Key Points

- Use loader functions for server-side data fetching
- Use action functions for form submissions and mutations
- Leverage URL search params for pagination and filtering
- Handle errors with catch boundaries and error boundaries
- Use useNavigation for loading states during transitions
- Validate form data with Zod schemas
- Return json responses with proper status codes
- Use useFetcher for non-navigation data mutations
- Implement optimistic UI with useFetcher
- Use resource routes for API endpoints
- Leverage Remix's progressive enhancement
- Use session cookies for flash messages
