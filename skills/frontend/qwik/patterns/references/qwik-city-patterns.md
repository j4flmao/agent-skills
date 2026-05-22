# Qwik City Patterns

## File-Based Routing

### Route Directory
```
src/routes/
  layout.tsx                    -- Root layout (applied to all routes)
  index.tsx                     -- /
  about/
    index.tsx                   -- /about
  blog/
    layout.tsx                  -- Blog layout (applied to /blog/*)
    index.tsx                   -- /blog
    [slug]/
      index.tsx                 -- /blog/:slug
    tags/
      [tag]/
        index.tsx               -- /blog/tags/:tag
  dashboard/
    layout.tsx                  -- Authenticated layout
    index.tsx                   -- /dashboard
    settings/
      index.tsx                 -- /dashboard/settings
  [...path]/
    index.tsx                   -- 404 catch-all /:path+
  api/
    users/
      index.ts                  -- Resource route /api/users
```

### Layout Composition
```tsx
// src/routes/layout.tsx — root layout
import { component$, Slot } from '@builder.io/qwik'
import { PrefetchServiceWorker } from '@builder.io/qwik/prefetch-service-worker'

export default component$(() => {
  return (
    <html>
      <head><PrefetchServiceWorker /></head>
      <body>
        <header><Slot name="header" /></header>
        <main><Slot /></main>
      </body>
    </html>
  )
})

// src/routes/dashboard/layout.tsx — nested layout
import { component$, Slot } from '@builder.io/qwik'
import { useAuth } from './auth-provider'

export default component$(() => {
  // Layout runs in parent route context — useAuth inherited
  return (
    <div class="dashboard-layout">
      <nav>
        <a href="/dashboard">Overview</a>
        <a href="/dashboard/settings">Settings</a>
      </nav>
      <main><Slot /></main>
    </div>
  )
})
```

## Route Loaders

### Data Loading
```tsx
// src/routes/dashboard/index.tsx
import { component$ } from '@builder.io/qwik'
import { routeLoader$, routeAction$, Form } from '@builder.io/qwik-city'

export const useUserData = routeLoader$(async (requestEvent) => {
  const { cookie, params, query, url, redirect, platform } = requestEvent
  const token = cookie.get('token')?.value
  if (!token) throw redirect(302, '/login')
  const user = await db.user.findUnique({ where: { token } })
  return user as User
})

export default component$(() => {
  const user = useUserData()
  return <h1>Welcome, {user.value.name}</h1>
})
```

### Request Event API
```typescript
routeLoader$(async ({
  request,       // Request object
  url,           // URL object
  params,        // Route params { id, slug }
  query,         // URL search params
  cookie,        // Cookie parsing/setting
  headers,       // Response headers
  redirect,      // Redirect helper
  fail,          // Fail response
  platform,      // Platform-specific (Cloudflare, Node, etc.)
  env,           // Environment variables
  sharedMap,     // Shared data between loaders
}) => {
  // ...
})
```

## Route Actions

### Form Mutations
```tsx
export const useCreatePost = routeAction$(async (form, { fail, redirect }) => {
  const title = form.get('title')
  const body = form.get('body')
  if (!title || title.length < 3) {
    return fail(400, { fieldErrors: { title: 'Min 3 characters' } })
  }
  const post = await db.post.create({ data: { title, body } })
  throw redirect(302, `/blog/${post.slug}`)
})

export default component$(() => {
  const createPost = useCreatePost()

  return (
    <Form action={createPost}>
      <label>Title <input name="title" /></label>
      {createPost.value?.fieldErrors?.title && (
        <p>{createPost.value.fieldErrors.title}</p>
      )}
      <label>Body <textarea name="body" /></label>
      <button type="submit">Create</button>
    </Form>
  )
})
```

### Action Status
```typescript
const action = useUpdateProfile()

if (action.isRunning) /* submitting */
if (action.value?.failed) /* validation error */
if (action.value?.status === 200) /* success */
```

## Server Functions
```typescript
// src/components/email.ts
import { server$ } from '@builder.io/qwik-city'

export const sendEmail = server$(async (to: string, subject: string, body: string) => {
  const config = await loadEmailConfig()
  await emailClient.send({ to, subject, body, from: config.from })
  return { sent: true }
})

// Usage in component — called like a local async function
import { sendEmail } from './email'
await sendEmail('user@test.com', 'Welcome', 'Thanks for joining!')
```

## Middleware
```typescript
// src/middleware/index.ts
import { RequestHandler } from '@builder.io/qwik-city/middleware/request-handler'

export const onRequest: RequestHandler = async ({ request, url, redirect, sharedMap }) => {
  const start = Date.now()
  sharedMap.set('startTime', start)
  // Rate limiting, auth checks, logging
  const token = request.headers.get('authorization')
  if (url.pathname.startsWith('/api/') && !token) {
    throw new Response('Unauthorized', { status: 401 })
  }
}

export const onResponse: RequestHandler = async ({ sharedMap }) => {
  const duration = Date.now() - sharedMap.get('startTime')
  console.log(`Response time: ${duration}ms`)
}
```

## Prefetch Strategy

### Service Worker Setup
```tsx
// src/root.tsx
import { PrefetchServiceWorker } from '@builder.io/qwik/prefetch-service-worker'

export default component$(() => (
  <html>
    <head>
      <PrefetchServiceWorker />
      <script dangerouslySetInnerHTML={`
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/service-worker.js')
        }
      `} />
    </head>
    <body><Slot /></body>
  </html>
))
```

### Prefetch Behavior
- Links in viewport are prefetched automatically.
- Service worker caches QRL chunks for near-instant navigation.
- HTML fragments for linked pages are prefetched on hover.
- Prefetch can be disabled per link with `prefetch={false}`.

## Qwik City Anti-Patterns
- ❌ **Data fetching in component$()**: Always use `routeLoader$` for page-level data.
- ❌ **Mutations outside routeAction$**: Use `<Form action={action}>` for progressive enhancement.
- ❌ **No middleware**: Auth checks, redirects, and logging belong in middleware, not components.
- ❌ **Missing PrefetchServiceWorker**: Without it, lazy loading becomes a waterfall.
