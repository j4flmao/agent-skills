# React Server Components

## Introduction

React Server Components (RSC) represent a paradigm shift in React architecture. They allow components to run exclusively on the server, sending only their output (not client-side JavaScript) to the browser. This eliminates the need to ship component code, reduces bundle size, and enables direct access to server-side resources.

## Core Concepts

### Server Components vs Client Components

| Aspect | Server Component | Client Component |
|---|---|---|
| Execution environment | Server only | Browser (and SSR) |
| Bundle size | Zero JS shipped | Full JS shipped |
| State | None (no hooks) | Full state support |
| Effects | Cannot use useEffect | Full effect support |
| Event handlers | None | onClick, onSubmit, etc |
| Data fetching | Direct (async) | useEffect, SWR, TanStack |
| SEO | Full HTML output | Requires SSR |
| Interactivity | None | Full interactivity |
| File convention | `page.tsx`, `layout.tsx` (default) | `"use client"` directive |

## The "use client" Directive

```tsx
// app/components/Counter.tsx
'use client'

import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  )
}
```

## Data Fetching in Server Components

### Direct Database Access

```tsx
// app/page.tsx
import { db } from '@/lib/db'

async function getPosts() {
  const posts = await db.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  return posts
}

export default async function HomePage() {
  const posts = await getPosts()

  return (
    <main>
      <h1>Latest Posts</h1>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </main>
  )
}
```

### Fetch API (Native)

```tsx
// app/components/UserProfile.tsx
async function getUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`, {
    next: { revalidate: 60 }, // ISR-like caching
  })

  if (!res.ok) throw new Error('Failed to fetch user')
  return res.json()
}

export default async function UserProfile({ userId }: { userId: string }) {
  const user = await getUser(userId)

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

### Parallel Data Fetching

```tsx
export default async function Dashboard() {
  const [user, posts, analytics] = await Promise.all([
    getUser(),
    getPosts(),
    getAnalytics(),
  ])

  return (
    <div>
      <UserCard user={user} />
      <PostList posts={posts} />
      <AnalyticsChart data={analytics} />
    </div>
  )
}
```

### Sequential Data Fetching (Dependent Queries)

```tsx
export default async function TeamPage({ teamId }: { teamId: string }) {
  const team = await getTeam(teamId)
  const members = await getTeamMembers(team.id)
  const projects = await getTeamProjects(team.id)

  return (
    <div>
      <TeamHeader team={team} />
      <MemberList members={members} />
      <ProjectList projects={projects} />
    </div>
  )
}
```

## Streaming & Suspense Boundaries

### Streaming with Suspense

```tsx
import { Suspense } from 'react'

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Immediate content */}
      <Nav />

      {/* Stream in as data arrives */}
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfile />
      </Suspense>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsChart />
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivity />
      </Suspense>
    </div>
  )
}
```

### Suspense Wrapper Pattern

```tsx
// app/components/async-wrapper.tsx
import { Suspense } from 'react'

export function AsyncWrapper({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <Suspense fallback={fallback ?? <DefaultFallback />}>
      {children}
    </Suspense>
  )
}
```

## Composition Patterns

### Server + Client Component Composition

```tsx
// app/page.tsx — Server Component (default)
import { ClientCounter } from './ClientCounter'
import { ServerRenderedList } from './ServerRenderedList'

export default function Page() {
  return (
    <div>
      {/* Server component — renders on server */}
      <ServerRenderedList />

      {/* Client component — hydrates in browser */}
      <ClientCounter />

      {/* Server component wrapping client component */}
      <div className="card">
        <h2>Card Title</h2>
        <ClientCounter />
      </div>
    </div>
  )
}
```

### Passing Server Data to Client Components

```tsx
// app/components/DataTable.tsx — Server Component
import { ClientTable } from './ClientTable'

export async function DataTable() {
  const data = await fetchData()

  // Pass serializable props to client component
  return <ClientTable data={data} onSort={(col) => console.log(col)} />
}
```

```tsx
// app/components/ClientTable.tsx — Client Component
'use client'

export function ClientTable({
  data,
  onSort,
}: {
  data: Array<{ id: string; name: string }>
  onSort: (column: string) => void
}) {
  return (
    <table>
      <thead>
        <tr>
          <th onClick={() => onSort('id')}>ID</th>
          <th onClick={() => onSort('name')}>Name</th>
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id}>
            <td>{row.id}</td>
            <td>{row.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

### Children as Props Pattern

Pass client components as children to server components:

```tsx
// app/components/ServerLayout.tsx — Server Component
export function ServerLayout({ children }: { children: React.ReactNode }) {
  const data = getCachedData()

  return (
    <div className="layout">
      <header>Header</header>
      <main>{children}</main>
      <footer>Footer</footer>
    </div>
  )
}
```

## Server Component Restrictions

### Cannot Use:

```tsx
// ❌ State
const [count, setCount] = useState(0)

// ❌ Effects
useEffect(() => {}, [])

// ❌ Event handlers
const handleClick = () => {}

// ❌ Browser APIs
localStorage
window
document

// ❌ Context (consumer side)
useContext(ThemeContext)

// ❌ Custom hooks that use client features
const data = useCustomHook()
```

### Can Use:

```tsx
// ✅ Async/await
async function Component() { ... }

// ✅ Direct database access
await db.query(...)

// ✅ File system access
import fs from 'fs/promises'
await fs.readFile(...)

// ✅ Environment variables (server only)
process.env.API_KEY

// ✅ Server-side caching
import { cache } from 'react'

// ✅ Third-party libraries (server-safe)
import marked from 'marked'
```

## Caching with React.cache

```tsx
// app/lib/data.ts
import { cache } from 'react'

export const getPost = cache(async (id: string) => {
  const post = await db.post.findUnique({ where: { id } })
  return post
})

// Multiple components can call this — deduplicated per request
export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id)
  // ...
}

export async function PostSidebar({ params }: { params: { id: string } }) {
  const post = await getPost(params.id) // Same call, cached
  // ...
}
```

## Server Actions

### Form Actions

```tsx
// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  await db.post.create({
    data: { title, content },
  })

  revalidatePath('/posts')
}
```

```tsx
// app/page.tsx
import { createPost } from './actions'

export default function Page() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="Title" />
      <textarea name="content" placeholder="Content" />
      <button type="submit">Create Post</button>
    </form>
  )
}
```

### Mutations with Server Actions

```tsx
// app/actions/posts.ts
'use server'

import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updatePost(id: string, formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  const post = await db.post.update({
    where: { id },
    data: { title, content },
  })

  revalidateTag(`post-${id}`)
  redirect(`/posts/${post.slug}`)
}
```

```tsx
// app/posts/[id]/page.tsx
import { updatePost } from '@/actions/posts'

export default async function EditPostPage({
  params,
}: {
  params: { id: string }
}) {
  const updatePostWithId = updatePost.bind(null, params.id)

  return (
    <form action={updatePostWithId}>
      <input name="title" />
      <textarea name="content" />
      <button type="submit">Update</button>
    </form>
  )
}
```

## RSC Payload Format

The RSC payload is a serialized JSON-like stream:

```
M1:{"id":"./app/page.tsx","chunks":["page"],"name":""}
J0:["$","div",null,{"children":["$","h1",null,{"children":"Hello World"}]}]
```

This format allows:
- Streaming HTML progressively
- Selective hydration
- Component-level granularity
- Efficient updates

## Server Components vs Alternative Approaches

### RSC vs Traditional SSR

| Aspect | Traditional SSR | RSC |
|---|---|---|
| Component model | All client components | Server + Client split |
| Bundle size | Full component JS | Server components excluded |
| Data fetching | getServerSideProps | Inline async components |
| Re-rendering | Full page refresh | Granular updates |
| Interactivity | Full CSR after hydration | Selective hydration |

### RSC vs Static Site Generation

| Aspect | SSG | RSC |
|---|---|---|
| Build time | All pages pre-built | Per-request |
| Freshness | Requires rebuild | Always fresh |
| Speed | Fastest TTFB | Fast (streaming) |
| Dynamic data | Client-side fetch | Server fetch |

## Performance Considerations

| Strategy | Benefit | Trade-off |
|---|---|---|
| Move data fetching to server | Smaller bundle, faster loads | Server cost |
| Streaming with Suspense | Progressive rendering | Complex loading UX |
| React.cache | Request deduplication | Memory per request |
| Minimal "use client" | Less JS shipped | More server load |
| Parallel data fetching | Faster page loads | Connection overhead |

## Common Gotchas

### Mixing Server and Client Context

```tsx
// ❌ Server component cannot provide context consumed by client siblings
async function ServerProvider({ children }: { children: React.ReactNode }) {
  const data = await getData()
  return <Context.Provider value={data}>{children}</Context.Provider>
}

// ✅ Move context provider to a client component
'use client'
export function ClientProvider({ children, value }: {
  children: React.ReactNode
  value: unknown
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>
}
```

### Importing Client Components in Server Components

```tsx
// This is fine — React handles the boundary automatically
import { ClientComponent } from './ClientComponent'

// But you CANNOT pass functions or non-serializable props
// ❌
<ClientComponent onSubmit={(e) => console.log(e)} />

// ✅
<ClientComponent onSubmitAction={actionFunction} />
```

## Testing Server Components

```tsx
import { render, screen } from '@testing-library/react'

// Server components can be rendered in tests
it('renders post title', async () => {
  const { container } = render(await PostPage({ params: { id: '1' } }))
  expect(screen.getByText('My Post')).toBeInTheDocument()
})
```

## Migration Guide

### Step-by-Step Migration

1. Identify interactive components → add `'use client'`
2. Move data fetching from useEffect to server components
3. Extract non-interactive presentational components as server components
4. Use Suspense boundaries for loading states
5. Replace API routes with server actions for mutations
6. Use React.cache for request deduplication

## Summary

| Concept | File Type | Directive | Use Case |
|---|---|---|---|
| Server Component | `.tsx` | None (default) | Data fetching, static content |
| Client Component | `.tsx` | `'use client'` | Interactivity, state, effects |
| Server Action | `.ts` | `'use server'` | Form submissions, mutations |
| Layout | `layout.tsx` | None | Shared UI, nested routes |
| Loading | `loading.tsx` | None | Suspense fallback |
| Error | `error.tsx` | `'use client'` | Error boundaries |
