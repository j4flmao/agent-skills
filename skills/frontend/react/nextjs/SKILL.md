---
name: react-nextjs
description: >
  Use this skill when the user says 'Next.js', 'App Router', 'Server Component', 'Client Component', 'Next.js structure', 'SSR Next.js', 'SSG Next.js', 'Next.js data fetching', 'use server', 'use client', or when building a Next.js application with App Router. This skill enforces: default to Server Components, add 'use client' only when necessary (event listeners, browser APIs, hooks), data fetching in Server Components with async/await, route/layout conventions (loading.tsx, error.tsx, not-found.tsx), and metadata API for SEO. Requires Next.js 14+ (next.config). Do NOT use for: CRA, Vite, Remix, or other React frameworks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, react, nextjs, phase-3]
---

# Next.js

## Purpose
Build Next.js apps with App Router. Server Components by default. 'use client' only when required. Data fetching in Server Components with async/await.

## Agent Protocol

### Trigger
Exact user phrases: "Next.js", "App Router", "Server Component", "Client Component", "Next.js structure", "SSR Next.js", "SSG Next.js", "Next.js data fetching", "use server", "use client".

### Input Context
Before activating, verify:
- next.config exists (Next.js 14+).
- Whether the project uses Pages Router or App Router.

### Output Artifact
No file output. Produces page file structure and component code as text.

### Response Format
File structure:
```
app/
  layout.tsx
  page.tsx
  loading.tsx
  error.tsx
  users/[id]/page.tsx
```

Code: show component and data fetching. No import statements.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Server Components used by default. 'use client' only when interactivity is needed.
- [ ] Data fetching in Server Components with async/await (no useEffect for data).
- [ ] Route groups, parallel routes, or intercepting routes used appropriately.
- [ ] loading.tsx, error.tsx, not-found.tsx present for each route segment.
- [ ] Metadata API used for SEO on every page.
- [ ] Client boundaries are as small as possible (wrap interactive widgets, not pages).

### Max Response Length
2560 tokens.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Server Component | Zero client JS, direct DB access | Data fetching, static content |
| Client Component | Interactivity, hooks, browser APIs | Forms, animations, state |
| Route Handler (route.ts) | Standard API endpoint | Webhooks, third-party integration |
| Server Action | Form mutation, revalidation | All form submissions |
| Middleware | Edge, runs before request | Auth redirects, A/B testing |
| ISR (revalidate) | Stale-while-revalidate | Content pages, blogs |

### Decision Tree: Server vs Client

```
Does the component need:
  ├── Event listeners (onClick, onChange) -> Client Component
  ├── Hooks (useState, useEffect, useContext) -> Client Component
  ├── Browser APIs (localStorage, window) -> Client Component
  ├── Direct DB access / file system -> Server Component
  └── Fetch data from API -> Server Component
```

### Decision Tree: Rendering Strategy

```
How often does the data change?
  ├── Never (blog post, docs) -> static (default, no revalidate)
  ├── Occasionally (product catalog) -> ISR with revalidate: 3600
  ├── On demand (CMS content) -> revalidatePath / revalidateTag
  └── Every request (auth user) -> dynamic (no cache)
```

### Decision Tree: Caching

```
Is the fetch result user-specific?
  ├── Yes -> no cache
  │    ├── User in cookie -> `cache: 'no-store'`
  │    └── User in header -> `cache: 'no-store'`
  └── No -> cache (default)
       ├── Can be stale 60s -> `next: { revalidate: 60 }`
       └── Never stale -> default fetch caching
```

## Component Design Patterns

### Server Component Data Fetching

```typescript
// app/users/page.tsx
async function UsersPage() {
  const users = await db.user.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })
  return (
    <div>
      <h1>Users</h1>
      {users.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  )
}
```

### Client Component with Server Action

```typescript
// app/users/UserForm.tsx
'use client'
import { useActionState } from 'react'
import { createUser } from './actions'

export function UserForm() {
  const [state, formAction, pending] = useActionState(createUser, null)

  return (
    <form action={formAction}>
      <input name="name" required />
      {state?.error && <p>{state.error}</p>}
      <button disabled={pending}>{pending ? 'Saving...' : 'Create'}</button>
    </form>
  )
}
```

### Server Action

```typescript
// app/users/actions.ts
'use server'
import { z } from 'zod'

const schema = z.object({ name: z.string().min(2), email: z.string().email() })

export async function createUser(_: any, formData: FormData) {
  const data = Object.fromEntries(formData)
  const result = schema.safeParse(data)
  if (!result.success) return { error: 'Validation failed', issues: result.error.flatten().fieldErrors }
  await db.user.create({ data: result.data })
  revalidatePath('/users')
  return { success: true }
}
```

### Parallel Route

```typescript
// app/layout.tsx
export default function Layout({ children, feed, notifications }: {
  children: React.ReactNode
  feed: React.ReactNode
  notifications: React.ReactNode
}) {
  return (
    <div>
      <main>{children}</main>
      <aside>
        {feed}
        {notifications}
      </aside>
    </div>
  )
}
```

### Intercepting Route

```typescript
// app/(.)photo/[id]/page.tsx
export default function PhotoModal({ params }: { params: { id: string } }) {
  return <div className="modal"><Photo id={params.id} /></div>
}
```

### Route Handler

```typescript
// app/api/users/route.ts
export async function GET() {
  const users = await db.user.findMany()
  return Response.json(users)
}

export async function POST(request: Request) {
  const body = await request.json()
  const user = await db.user.create({ data: body })
  return Response.json(user, { status: 201 })
}
```

## State Management Patterns

### Server State via Data Fetching (Primary)

```typescript
async function ProfilePage() {
  const user = await db.user.findUnique({ where: { id } })
  return <ProfileCard user={user} />
}
```

### URL State via searchParams

```typescript
function ProductsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const results = await db.product.search(searchParams.q || '', { page: Number(searchParams.page) || 1 })
  return <ProductList items={results} />
}
```

### Client State with Context

```typescript
// app/Providers.tsx
'use client'
import { createContext, useContext } from 'react'

const ThemeContext = createContext<'light' | 'dark'>('light')
export const useTheme = () => useContext(ThemeContext)
```

### Client State with Zustand

```typescript
// store/cart.ts
import { create } from 'zustand'

export const useCart = create<{ items: CartItem[]; add(item: CartItem): void }>((set) => ({
  items: [],
  add: (item) => set((s) => ({ items: [...s.items, item] })),
}))
```

## Performance Optimization

1. Server Components: zero client JS for static parts
2. Streaming via Suspense boundaries — fast TTFB, progressive rendering
3. Automatic route-level code splitting
4. Image: next/image — WebP/AVIF, lazy loading, responsive sizes
5. Font: next/font — self-hosted, no layout shift
6. Route prefetching: links in viewport prefetch automatically
7. Middleware runs at edge, blocks response — keep lean
8. Partial Prerendering (PPR) — static shell + dynamic holes

## Build & Bundle Considerations

### next.config

```typescript
import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  images: { formats: ['image/avif', 'image/webp'] },
  experimental: { ppr: true }, // Partial Prerendering
  logging: { fetches: { fullUrl: true } },
  serverExternalPackages: ['bcrypt'],
}
export default nextConfig
```

### Bundle Analysis

```bash
ANALYZE=true npm run build  # generates bundle report
next build --debug          # verbose build output
```

## Testing Strategies

### Unit Test Server Action

```typescript
import { describe, it, expect } from 'vitest'
import { createUser } from '../app/users/actions'

describe('createUser', () => {
  it('validates input', async () => {
    const formData = new FormData()
    formData.set('name', 'A')
    formData.set('email', 'invalid')
    const result = await createUser(null, formData)
    expect(result).toHaveProperty('issues')
    expect(result.issues.name).toBeDefined()
  })
})
```

### Component Test

```typescript
import { render, screen } from '@testing-library/react'
import { UserCard } from '../app/users/UserCard'

it('renders user name', () => {
  render(<UserCard user={{ id: '1', name: 'Alice' }} />)
  expect(screen.getByText('Alice')).toBeDefined()
})
```

### E2E Test

```typescript
import { test, expect } from '@playwright/test'

test('creates user', async ({ page }) => {
  await page.goto('/users/new')
  await page.fill('[name="name"]', 'Alice')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/users')
  await expect(page.getByText('Alice')).toBeVisible()
})
```

## Migration Patterns

### Pages Router to App Router

```
// Before: Pages Router
pages/users/[id].tsx
  getServerSideProps -> props
  component receives props

// After: App Router
app/users/[id]/page.tsx
  async function page({ params })
  data fetching inline with await

// Layout migration:
pages/_app.tsx + pages/_document.tsx -> app/layout.tsx (single file)
```

### getServerSideProps to Server Component

```typescript
// Before
export const getServerSideProps = async () => {
  const data = await fetchData()
  return { props: { data } }
}

// After
async function Page() {
  const data = await fetchData()
  return <div>{data}</div>
}
```

### getStaticProps to Static Fetch

```typescript
// Before
export const getStaticProps = async () => {
  const data = await fetchData()
  return { props: { data }, revalidate: 60 }
}

// After
async function Page() {
  const data = await fetch('https://api.com/data', { next: { revalidate: 60 } }).then(r => r.json())
  return <div>{data}</div>
}
```

## Anti-Patterns

### Full Page as Client Component

```typescript
// Anti-pattern
'use client'
function Page() { /* entire page client-rendered */ }

// Correct: only the interactive widget
function Page() { return <div><ClientWidget /></div> }
```

### Fetching in useEffect

```typescript
// Anti-pattern
useEffect(() => { fetch('/api/data').then(setData) }, [])

// Correct: Server Component
async function Page() { const data = await fetchData(); return <div>{data}</div> }
```

### Nested Client Layout

If a layout.tsx has 'use client', all children become client components. Keep layouts as Server Components.

### Passing Non-serializable Props

Functions, Date objects, and undefined values crash between Server and Client Components.

## Common Pitfalls

1. **Entire page as client component**: Only interactive widget needs 'use client'.
2. **Missing loading.tsx**: Add to every route segment for streaming.
3. **Passing non-serializable props**: Functions, Date, undefined crash SC→CC boundary.
4. **Fetching in useEffect**: Server Components fetch with async/await.
5. **error.tsx must be client**: Error boundaries require 'use client'.
6. **Mixing Pages Router and App Router**: Don't mix in the same project.
7. **Nested client layout cascade**: If layout is client, all pages under it are client.
8. **Parallel routes missing default.tsx**: Without it, route 404s on hard navigation.

## Compared With

| Aspect | App Router | Pages Router |
|--------|-------------|--------------|
| Component model | Server + Client | All client |
| Data fetching | async component + fetch | getServerSideProps/getStaticProps |
| Layouts | Nested, persist | Manual per-page |
| Streaming | Native via Suspense | Not supported |
| Loading states | loading.tsx auto | Manual |
| Metadata | Built-in Metadata API | next/head |
| Mutations | Server Actions | API routes + client fetch |

## Ecosystem & Tooling

1. `next build --debug` — build analysis
2. `@next/bundle-analyzer` — visualize bundles
3. `next lint` — ESLint with Next.js rules
4. `next dev --turbo` — Turbopack
5. `@next/codemod` — migration upgrades
6. `next-sitemap` — sitemaps
7. `@sentry/nextjs` — error tracking

## Workflow

### Step 1: Server vs Client Decision
```
Default: Server Component. Add 'use client' only for:
  onClick/onChange/onSubmit -> Client
  useState/useEffect/useReducer -> Client
  Browser APIs -> Client
```

### Step 2: Route Structure
```
app/
  layout.tsx         -- Root (html, body, providers)
  page.tsx           -- Home
  loading.tsx        -- Suspense fallback
  error.tsx          -- Error boundary (client)
  not-found.tsx      -- 404
  users/[id]/page.tsx -- Dynamic route
  (auth)/login/page.tsx -- Route group
```

### Step 3: Data Fetching
```typescript
async function Page() {
  const data = await db.query(...)
  return <div>{data}</div>
}
```

### Step 4: Mutations
```typescript
'use server'
export async function action(formData: FormData) {
  await db.mutate(...)
  revalidatePath('/')
}
```

### Step 5: Metadata
```typescript
export const metadata: Metadata = { title: 'Page Title' }
```

## Rules
- Server Components by default. 'use client' is the exception.
- Client boundaries are minimal: wrap the widget, not the page.
- Server Components can import Client Components, never the reverse.
- Props from SC to CC must be serializable (no functions, Date, undefined).
- Use revalidatePath / revalidateTag for cache invalidation.
- All data fetching in Server Components — never useEffect for initial data.
- Metadata on every page — use generateMetadata for dynamic routes.

## References
  - references/app-router-architecture.md
  - references/app-router.md
  - references/middleware-edge.md
  - references/nextjs-data-fetching.md
  - references/nextjs-deployment.md
  - references/server-components.md
  - references/nextjs-app-router-patterns.md
  - references/nextjs-data-fetching-caching.md

## Handoff
No artifact produced.
Next skill: frontend-testing.
Carry forward: App Router structure, data fetching pattern, Server/Client boundary decisions.
