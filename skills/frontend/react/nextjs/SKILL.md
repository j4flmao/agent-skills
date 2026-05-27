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

## Rules
- Server Components by default. 'use client' is the exception, not the rule.
- Client boundaries are minimal: wrap the interactive widget, not the entire page.
- Server Components can import Client Components, but Client Components cannot import Server Components.
- Props passed from Server to Client Components must be serializable (no functions, no Date, no undefined).
- Use revalidatePath / revalidateTag for cache invalidation. Not full page reloads.
- generateStaticParams + ISR for hybrid static/dynamic pages.

## References
  - references/app-router-architecture.md — Next.js App Router Architecture
  - references/app-router.md — Next.js App Router
  - references/middleware-edge.md — Next.js Middleware and Edge Runtime
  - references/nextjs-data-fetching.md — Next.js Data Fetching
  - references/nextjs-deployment.md — Next.js Deployment
  - references/server-components.md — Server Components
## Handoff
No artifact produced.
Next skill: frontend-testing — test Next.js components.
Carry forward: App Router structure, data fetching pattern, Server/Client boundary decisions.
