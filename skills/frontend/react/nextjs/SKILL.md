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

# React Next.js

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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Server Components used by default. 'use client' only when interactivity is needed.
- [ ] Data fetching in Server Components with async/await (no useEffect for data).
- [ ] Route groups, parallel routes, or intercepting routes used appropriately.
- [ ] loading.tsx, error.tsx, not-found.tsx present for each route segment.
- [ ] Metadata API used for SEO on every page.
- [ ] Client boundaries are as small as possible (wrap interactive widgets, not pages).

### Max Response Length
File structure: unlimited. Code: 15 lines per example.

## Workflow

### Step 1: Server vs Client Decision
```
Does the component need:
  Event listeners (onClick, onChange, onSubmit)? -> Client Component
  Browser APIs (localStorage, window, document)? -> Client Component
  Hooks (useState, useEffect, useReducer)? -> Client Component
  Custom hooks using any of the above? -> Client Component
  Data fetching from DB or external API? -> Server Component (default)
  Reading from file system? -> Server Component (default)
  Static content without interactivity? -> Server Component (default)

Default: Server Component. Add 'use client' only when necessary.
```

### Step 2: Data Fetching in Server Components
```typescript
// app/users/page.tsx — Server Component
async function UsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <div>
      <h1>Users</h1>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}
```

### Step 3: Route and Layout Conventions
```
app/
  layout.tsx                 -- Root layout (html, body, providers)
  page.tsx                   -- Home page
  loading.tsx                -- Loading UI (Suspense boundary)
  error.tsx                  -- Error UI (Error Boundary, must be Client Component)
  not-found.tsx              -- 404 page
  (auth)/                    -- Route group (no path segment)
    login/page.tsx
    register/page.tsx
  users/
    page.tsx                 -- /users
    [id]/
      page.tsx               -- /users/:id
      settings/page.tsx      -- /users/:id/settings
    layout.tsx               -- Users layout (nested under root layout)
  parallel/
    @feed/page.tsx           -- Parallel route slot
    @notifications/page.tsx
```

### Step 4: Layout Composition
```typescript
// app/layout.tsx — Root layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}

// app/users/layout.tsx — Nested layout
export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1">{children}</div>
    </div>
  )
}
```

### Step 5: Metadata API
```typescript
import type { Metadata } from 'next'

// Root metadata (app/layout.tsx)
export const metadata: Metadata = {
  title: {
    default: 'My App',
    template: '%s | My App',
  },
  description: 'Full-stack application',
  openGraph: { title: 'My App', description: 'Full-stack application' },
}

// Per-page metadata
export const metadata: Metadata = {
  title: 'Users',  // -> "Users | My App"
}
```

### Step 6: Route Handlers vs Server Actions
| Pattern | Use When |
|---------|----------|
| route.ts | External API endpoints, webhooks |
| Server Action ('use server') | Form submissions, mutations from Client Components |

```typescript
// app/api/users/route.ts
export async function GET(request: Request) {
  const users = await db.user.findMany()
  return Response.json({ data: users })
}

// Server Action (app/actions.ts)
'use server'
export async function createUser(formData: FormData) {
  const user = await db.user.create({
    data: { email: formData.get('email') as string },
  })
  revalidatePath('/users')
  return user
}
```

### Step 7: Client Component Boundaries
```typescript
// app/counter.tsx — Client Component (minimal boundary)
'use client'
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}

// app/page.tsx — Server Component wrapping client widget
import { Counter } from './counter'

export default function Home() {
  return (
    <div>
      <h1>Welcome</h1>
      <Counter /> {/* Only this widget is a client boundary */}
    </div>
  )
}
```

### Step 8: Streaming and Suspense
```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react'
import { SlowComponent, FastComponent } from './components'

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <FastComponent />
      <Suspense fallback={<div>Loading slow content...</div>}>
        <SlowComponent />
      </Suspense>
    </div>
  )
}
```

### Step 9: Caching and Revalidation
```typescript
// Fetch with revalidation
async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 60 }, // ISR: revalidate every 60s
  })
  return res.json()
}

// On-demand revalidation
// app/actions.ts
'use server'
export async function refreshPosts() {
  revalidateTag('posts')
  revalidatePath('/blog')
}
```

## Component Architecture

### Component Tree Decision
```
Page (Server Component)
  ├── Layout (Server Component)
  │   ├── Navbar (Server Component — no interactivity)
  │   ├── Sidebar (Server Component)
  │   └── ClientWidget (Client Component — minimal boundary)
  │       ├── InteractiveButton (Client, inherits)
  │       └── DropdownMenu (Client, inherits)
  └── ContentArea (Server Component)
      ├── StaticContent (Server)
      └── DataList (Server, fetches data)
```

### When to split into nested layouts
```
Complex dashboard with tabs:
  app/
    dashboard/
      layout.tsx           -- Dashboard shell (sidebar + header)
      page.tsx             -- Default dashboard view
      settings/
        layout.tsx         -- Settings sub-nav
        page.tsx           -- General settings
        profile/page.tsx   -- Profile settings
```

## Common Pitfalls

1. **Entire page as client component**: Only the interactive widget needs 'use client'. The page wrapper stays a Server Component.
2. **Missing loading.tsx**: Without it, users see nothing while the page streams. Add loading.tsx to every route segment.
3. **Passing non-serializable props**: Functions, Date objects, and undefined values crash between Server and Client Components.
4. **Fetching in useEffect**: Server Components fetch directly with async/await. No useEffect boilerplate needed.
5. **Forgetting error.tsx must be client**: Error boundaries require 'use client' — error.tsx is always a Client Component.
6. **Mixing Pages Router and App Router**: These are separate paradigms. Don't mix conventions in the same project.
7. **Overusing generateStaticParams**: Only needed for static export or ISR with pre-generated paths. Dynamic params work without it.
8. **Nested client layouts cascade**: If a layout.tsx is a Client Component, all pages under it become client-rendered.

## Best Practices

1. colocate data fetching in the component that needs the data — don't lift it to a parent.
2. Use route groups `(marketing)` to organize without affecting URL paths.
3. Parallel routes `@slot` for complex layouts like dashboards with independent sections.
4. Intercepting routes `(..)photo` for modal-like navigation preserving the underlying page.
5. Prefer `fetch` with `next: { revalidate }` over manual caching for most use cases.
6. Use `generateMetadata` for dynamic metadata derived from params or searchParams.
7. Keep middleware lean — it runs on every request and blocks the response.
8. Use `next/image` for automatic optimization, lazy loading, and responsive images.

## Compared With

| Aspect | Pages Router | App Router |
|--------|-------------|------------|
| Component model | All client-rendered (React) | Server + Client Components |
| Data fetching | getServerSideProps / getStaticProps | async component + fetch API |
| Layouts | Manual per-page | Nested layout.tsx persists across navigations |
| Streaming | Not supported | Native via Suspense boundaries |
| Loading states | Manual | loading.tsx auto-generates Suspense boundary |
| Metadata | next/head or third-party | Built-in Metadata API |
| Caching | getStaticProps + revalidate | fetch-based with next.revalidate |
| Mutations | API routes + client fetch | Server Actions with revalidatePath |

## Performance Considerations

1. Server Components reduce client JS bundle — zero JavaScript for static parts.
2. Streaming enables progressive rendering — fast TTFB, content appears as it loads.
3. Automatic code splitting at the route level — each page loads only its dependencies.
4. Image optimization via next/image: WebP/AVIF, lazy loading, responsive sizes.
5. Font optimization via next/font: self-hosted, no layout shift, subset loading.
6. Script optimization via next/script: strategy (beforeInteractive, afterInteractive, lazyOnload).
7. Bundle analyzer: `ANALYZE=true npm run build` to inspect bundle composition.
8. Route prefetching: links in viewport prefetch `<link rel="prefetch">` automatically.

## Tooling

1. `next build` with `--profile` and `--debug` for build analysis.
2. `@next/bundle-analyzer` for visualizing bundle sizes.
3. `next lint` with built-in ESLint config for Next.js rules.
4. `next dev --turbo` for faster local development with Turbopack.
5. `@next/codemod` for automated migration between versions.
6. `next-sitemap` for generating sitemaps from the route structure.
7. `next-mdx-remote` for MDX content in Server Components.
8. `@sentry/nextjs` for error tracking across server and client.

## Rules
- Server Components by default. 'use client' is the exception, not the rule.
- Client boundaries are minimal: wrap the interactive widget, not the entire page.
- Server Components can import Client Components, but Client Components cannot import Server Components.
- Props passed from Server to Client Components must be serializable (no functions, no Date, no undefined).
- Use revalidatePath / revalidateTag for cache invalidation. Not full page reloads.
- generateStaticParams + ISR for hybrid static/dynamic pages.
- Layouts persist across navigations — do not put page-specific data fetching in layouts.
- All data fetching in Server Components — never useEffect for initial data.
- Metadata must be present on every page — use generateMetadata for dynamic routes.
- Parallel routes must have a default.tsx fallback or the route will 404.

## References
  - references/app-router-architecture.md — Next.js App Router Architecture
  - references/app-router.md — Next.js App Router
  - references/middleware-edge.md — Next.js Middleware and Edge Runtime
  - references/nextjs-data-fetching.md — Next.js Data Fetching
  - references/nextjs-deployment.md — Next.js Deployment
  - references/server-components.md — Server Components
  - references/nextjs-app-router-patterns.md — App Router Patterns Reference
  - references/nextjs-data-fetching-caching.md — Data Fetching & Caching Reference

## Handoff
No artifact produced.
Next skill: frontend-testing — test Next.js components.
Carry forward: App Router structure, data fetching pattern, Server/Client boundary decisions.
