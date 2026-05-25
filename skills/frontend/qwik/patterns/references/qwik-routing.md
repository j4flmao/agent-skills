# Qwik Routing Patterns

## Qwik City Routing Structure

```
src/routes/
  layout.tsx                    ->  Root layout (all pages)
  index.tsx                     ->  /
  about.tsx                     ->  /about
  blog/
    layout.tsx                  ->  Blog layout
    index.tsx                   ->  /blog
    [slug]/index.tsx            ->  /blog/:slug
    [slug]/comments/index.tsx   ->  /blog/:slug/comments
    tags/
      [tag]/index.tsx           ->  /blog/tags/:tag
  dashboard/
    layout.tsx                  ->  Auth-protected layout
    index.tsx                   ->  /dashboard
    settings/
      index.tsx                 ->  /dashboard/settings
  api/
    users/
      index.ts                  ->  /api/users (resource route)
```

## Route Loaders

```tsx
// src/routes/blog/[slug]/index.tsx
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city'

export const useBlogPost = routeLoader$(async ({ params, request }) => {
  const slug = params.slug
  const post = await db.post.findUnique({ where: { slug } })
  if (!post) throw new Error('Not found')
  return post as BlogPost
})

export default component$(() => {
  const post = useBlogPost()
  return <article><h1>{post.value.title}</h1></article>
})

export const head: DocumentHead = ({ resolveValue }) => {
  const post = resolveValue(useBlogPost)
  return { title: post.title }
}
```

## Route Actions

```tsx
import { routeAction$, Form, zod$ } from '@builder.io/qwik-city'

export const useCreatePost = routeAction$(async (data, { fail }) => {
  if (data.title.length < 3) {
    return fail(400, { message: 'Title too short' })
  }
  await db.post.create({ data })
  return { success: true }
}, zod$({
  title: z.string().min(3),
  body: z.string().min(10),
}))

export default component$(() => {
  const action = useCreatePost()
  return (
    <Form action={action}>
      <input name="title" />
      {action.value?.failed && <p>{action.value.message}</p>}
      <button type="submit">Create</button>
    </Form>
  )
})
```

## Layout Routes

```tsx
// src/routes/dashboard/layout.tsx
import { Slot, component$ } from '@builder.io/qwik'
import { routeLoader$ } from '@builder.io/qwik-city'

export const useAuth = routeLoader$(async ({ cookie, redirect }) => {
  const token = cookie.get('token')
  if (!token) throw redirect(302, '/login')
  return { user: await verifyToken(token.value) }
})

export default component$(() => {
  return (
    <div class="dashboard-layout">
      <nav>Sidebar navigation</nav>
      <main><Slot /></main>
    </div>
  )
})
```

## Resource Routes

```ts
// src/routes/api/users/index.ts
import type { RequestHandler } from '@builder.io/qwik-city'

export const onGet: RequestHandler = async ({ json }) => {
  const users = await db.user.findMany()
  json(200, users)
}

export const onPost: RequestHandler = async ({ request, json }) => {
  const data = await request.json()
  const user = await db.user.create({ data })
  json(201, user)
}
```

## Navigation

```tsx
import { Link, useNavigate } from '@builder.io/qwik-city'

export default component$(() => {
  const nav = useNavigate()

  return (
    <div>
      <Link href="/blog">Blog</Link>
      <Link href="/blog/my-post" prefetch="hover">Read Post</Link>
      <button onClick$={async () => await nav('/dashboard')}>Dashboard</button>
    </div>
  )
})
```

| Prefetch | When |
|----------|------|
| `hover` | On mouse hover (default) |
| `viewport` | When link enters viewport |
| `load` | Immediately |
| `never` | Never prefetch |
