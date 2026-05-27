# Next.js App Router Architecture

## Route Groups and Layouts

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav>{/* Global navigation */}</nav>
        </header>
        <main>{children}</main>
        <footer>{/* Global footer */}</footer>
      </body>
    </html>
  )
}

// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <aside>{/* Sidebar */}</aside>
      <section className="flex-1">{children}</section>
    </div>
  )
}

// app/(dashboard)/settings/layout.tsx
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="settings-container">
      <nav>{/* Settings tabs */}</nav>
      {children}
    </div>
  )
}
```

## Server Components

```typescript
// app/users/page.tsx
interface User {
  id: string
  name: string
  email: string
}

async function getUsers(): Promise<User[]> {
  const res = await fetch('https://api.example.com/users', {
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

export default async function UsersPage() {
  const users = await getUsers()

  return (
    <div className="users-grid">
      {users.map(user => (
        <div key={user.id} className="user-card">
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      ))}
    </div>
  )
}
```

## Client Components and Data Fetching

```typescript
'use client'

import { useState, useEffect } from 'react'

interface ClientUserListProps {
  initialUsers: User[]
}

export default function ClientUserList({ initialUsers }: ClientUserListProps) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const params = new URLSearchParams({ search })
    fetch(`/api/users?${params}`)
      .then(res => res.json())
      .then(setUsers)
  }, [search])

  return (
    <div>
      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search users..."
      />
      <div className="users-list">
        {users.map(user => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  )
}
```

## Server Actions

```typescript
// app/actions/users.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

export async function createUser(formData: FormData) {
  const validated = CreateUserSchema.parse({
    name: formData.get('name'),
    email: formData.get('email'),
  })

  const res = await fetch('https://api.example.com/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validated),
  })

  if (!res.ok) throw new Error('Failed to create user')

  revalidatePath('/users')
  return { success: true }
}
```

## Key Points

- Use the App Router for nested layouts and route groups
- Leverage Server Components for data fetching and SEO
- Use Client Components for interactivity and browser APIs
- Implement Server Actions for form handling and mutations
- Use revalidatePath and revalidateTag for cache invalidation
- Configure ISR with revalidation intervals per route
- Use loading.tsx for streaming Suspense boundaries
- Implement error.tsx for route-level error handling
- Use Route Handlers for API endpoints
- Leverage middleware for authentication and redirects
- Use generateStaticParams for static generation
- Configure metadata for SEO optimization
