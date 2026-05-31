# Next.js Data Fetching and Caching

## Overview

Next.js App Router provides a unified data fetching model built on the fetch API, React Server Components, and a hierarchical caching system. Data can be fetched at build time (static), at request time (dynamic), or on a revalidation schedule (ISR). Understanding the caching layers and how they interact is critical for building performant applications.

## Data Fetching Methods

### Server Component Direct Fetch

The primary pattern. Server Components can use `async/await` directly in the component body.

```typescript
export default async function Page() {
  const data = await fetch('https://api.example.com/data')
  const json = await data.json()
  return <div>{json.map(item => <Item key={item.id} {...item} />)}</div>
}
```

### Route Handler (API Route)

```typescript
// app/api/posts/route.ts
export async function GET(request: Request) {
  const posts = await db.post.findMany()
  return Response.json(posts)
}
```

### Server Action

```typescript
'use server'
export async function createItem(formData: FormData) {
  const item = await db.item.create({ data: { name: formData.get('name') } })
  revalidatePath('/items')
  return item
}
```

## Caching Layers

Next.js caches at four levels, from outermost to innermost:

### 1. Full Route Cache (Static)

The rendered HTML of static routes is cached on the server. This is the default for pages that do not use dynamic functions (cookies, headers, searchParams).

```typescript
// This page is automatically static — cached HTML
export default async function AboutPage() {
  return <div>About us</div>
}
```

### 2. Data Cache (fetch)

fetch responses are cached in the data cache. This is separate from the route cache.

```typescript
// Cached in data cache, revalidated every 60 seconds
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 60 },
})
```

### 3. Full Route Cache (Dynamic)

Pages using `cookies()`, `headers()`, `searchParams`, or `dynamic = 'force-dynamic'` are never cached in the route cache. They render on every request.

```typescript
import { cookies } from 'next/headers'

// Dynamic — no route cache
export default async function ProfilePage() {
  const token = cookies().get('token')
  const profile = await fetch(`https://api/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return <Profile data={await profile.json()} />
}
```

### 4. Router Cache (Client-side)

The client-side cache stores rendered RSC payloads for 30 seconds (static) or 5 minutes (dynamic). It powers instant back/forward navigation.

```typescript
// This mutates the client cache automatically
revalidatePath('/posts') // Also tells client router to refetch
```

## Fetch Options Reference

```typescript
// Static — cached forever (default)
fetch(url)

// Static with revalidation
fetch(url, { next: { revalidate: 3600 } })

// Dynamic — never cache
fetch(url, { cache: 'no-store' })
fetch(url, { cache: 'no-cache' })

// Dynamic — force refetch but still cache after
fetch(url, { cache: 'reload' })

// Cache but don't use stale data
fetch(url, { cache: 'force-cache' })

// Tag for on-demand revalidation
fetch(url, { next: { tags: ['posts', 'user-1'] } })
```

## Segment Config Options

```typescript
// app/page.tsx

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Force static rendering
export const dynamic = 'force-static'

// Revalidate segment every N seconds
export const revalidate = 60

// Prevent any caching
export const revalidate = 0

// Generate static params at build time
export async function generateStaticParams() {
  const posts = await db.post.findMany({ select: { slug: true } })
  return posts.map(post => ({ slug: post.slug }))
}
```

## ISR (Incremental Static Regeneration)

### Time-based ISR

```typescript
export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await fetch(`https://api.example.com/posts/${params.slug}`, {
    next: { revalidate: 300 }, // Regenerate every 5 minutes
  })
  return <Post post={await post.json()} />
}
```

### On-demand ISR

```typescript
// API route to trigger revalidation
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const { type, path, tag } = await request.json()

  if (type === 'path') revalidatePath(path)
  if (type === 'tag') revalidateTag(tag)

  return NextResponse.json({ revalidated: true })
}
```

### Webhook-triggered ISR

```typescript
// Triggered by CMS webhook
export async function POST(request: NextRequest) {
  const { slug } = await request.json()
  revalidatePath(`/posts/${slug}`)
  revalidateTag('posts')
  return NextResponse.json({ revalidated: true })
}
```

## Data Revalidation Strategies

### Manual revalidation after mutation

```typescript
'use server'
export async function createPost(data: FormData) {
  await db.post.create({ data: { title: data.get('title') } })
  revalidateTag('posts')
  revalidatePath('/blog')
}
```

### Revalidation with stale-while-revalidate

```typescript
const data = await fetch(url, {
  next: { revalidate: 60 }, // Serve stale for 60s while refetching in background
})
```

### Conditional revalidation

```typescript
export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get('since')
  const version = await getCacheVersion()

  if (since && version && since === version) {
    return new Response(null, { status: 304 }) // Not modified
  }

  const data = await getLatestData()
  return Response.json({ data, version })
}
```

## Data Fetching Patterns

### Initial page data

```typescript
// app/posts/[slug]/page.tsx
export default async function PostPage({ params: { slug } }: Props) {
  const post = await getPost(slug) // Fetched on server, zero client JS
  return (
    <article>
      <h1>{post.title}</h1>
      <PostContent content={post.content} />
    </article>
  )
}
```

### Client-side data for interactivity

```typescript
'use client'
import { useQuery } from '@tanstack/react-query'

export function LiveComments({ postId }: { postId: string }) {
  const { data, isPending, error } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => fetch(`/api/posts/${postId}/comments`).then(r => r.json()),
    refetchInterval: 10000, // Poll every 10s for live updates
  })

  if (isPending) return <div>Loading comments...</div>
  if (error) return <div>Failed to load comments</div>
  return data.map(comment => <Comment key={comment.id} {...comment} />)
}
```

### Mixed server + client data

```typescript
// app/dashboard/page.tsx — Server Component
export default async function DashboardPage() {
  const user = await db.user.findUnique(...) // Server data
  return (
    <div>
      <UserProfile user={user} />
      <LiveMetrics /> {/* Client component handles live updates */}
    </div>
  )
}

// LiveMetrics.tsx — Client Component
'use client'
export function LiveMetrics() {
  const { data } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => fetch('/api/metrics').then(r => r.json()),
    refetchInterval: 5000,
  })
  return <MetricsChart data={data} />
}
```

### Parallel fetch pattern

```typescript
export default async function DashboardPage() {
  const [user, posts, analytics] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.post.findMany({ take: 10 }),
    db.analytics.findMany({ take: 30 }),
  ])
  return <DashboardShell user={user} posts={posts} analytics={analytics} />
}
```

### Sequential fetch pattern (waterfall)

```typescript
export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  const author = await getAuthor(post.authorId)          // depends on post
  const similarPosts = await getSimilarPosts(post.tags)  // depends on post
  return <FullPost post={post} author={author} related={similarPosts} />
}
```

### Streaming with individual Suspense boundaries

```typescript
import { Suspense } from 'react'

export default function Page() {
  return (
    <div>
      <Header />
      <Suspense fallback={<PostSkeleton />}>
        <Post />
      </Suspense>
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments />
      </Suspense>
    </div>
  )
}

async function Post() {
  const post = await db.post.findFirst()
  return <article>{post.title}</article>
}

async function Comments() {
  const comments = await db.comment.findMany()
  return comments.map(c => <p key={c.id}>{c.text}</p>)
}
```

## Database Queries

### Direct database access (Server Component)

```typescript
import { prisma } from '@/lib/prisma'

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    where: { active: true },
    include: { profile: true, posts: { take: 3 } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}
```

### Database in Route Handler

```typescript
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const [data, total] = await Promise.all([
    prisma.post.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.post.count(),
  ])

  return NextResponse.json({ data, total, page, limit })
}
```

## Authentication and Data Fetching

### Server-side auth check

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const data = await db.dashboardData.findMany({
    where: { userId: session.user.id },
  })

  return <Dashboard data={data} user={session.user} />
}
```

### Auth in route handlers

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await db.user.findUnique({ where: { id: session.user.id } }))
}
```

## Error Handling

### Error boundary (error.tsx)

```typescript
'use client'
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### Global error boundary (global-error.tsx)

```typescript
'use client'
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <h2>Critical error</h2>
        <button onClick={reset}>Reload</button>
      </body>
    </html>
  )
}
```

### Not found page

```typescript
export default function NotFound() {
  return (
    <div>
      <h2>Page not found</h2>
      <p>The page you requested does not exist.</p>
    </div>
  )
}
```

## Loading States

### Route-level loading

```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-32 bg-gray-200 rounded mb-2" />
      <div className="h-32 bg-gray-200 rounded" />
    </div>
  )
}
```

### Component-level loading (Suspense)

```typescript
<Suspense fallback={<Skeleton />}>
  <SlowComponent />
</Suspense>
```

## Performance Optimization

### Prefetching

```typescript
import Link from 'next/link'

// Links in viewport are prefetched by default
// Disable with prefetch={false}
<Link href="/dashboard" prefetch={false}>Dashboard</Link>
```

### Manual prefetch in route handlers

```typescript
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path')
  const data = await fetchDataForPath(path)
  return Response.json(data, {
    headers: {
      'X-Next-Prefetch': '1',
    },
  })
}
```

### Optimistic updates with Server Actions

```typescript
'use server'
export async function toggleLike(postId: string) {
  const post = await db.post.update({
    where: { id: postId },
    data: { likes: { increment: 1 } },
  })
  revalidatePath(`/posts/${postId}`)
  return { likes: post.likes }
}
```

## Choosing a Strategy

| Situation | Strategy | Cache Config |
|-----------|----------|--------------|
| Blog post, rarely changes | Static + ISR | `next: { revalidate: 3600 }` |
| User dashboard, per-user | Dynamic | `cache: 'no-store'` |
| Product page, updates via CMS | On-demand ISR | `next: { tags: ['products'] }` |
| Search results, real-time | Dynamic + client fetch | `cache: 'no-store'` |
| Marketing page, content from CMS | Static + webhook revalidation | `next: { tags: ['pages'] }` |
| Admin analytics, heavy query | Dynamic with SWR | `cache: 'no-store'` + client SWR |
| Public API listing | Static with revalidation | `next: { revalidate: 300 }` |

## Common Pitfalls

1. **Over-fetching**: Requesting more data than the component needs leads to large serialized payloads.
2. **Missing error boundaries**: Without error.tsx, unhandled fetch errors crash the entire page.
3. **Waterfall fetches**: Sequential await calls when data could be fetched in parallel with Promise.all.
4. **Stale data**: Forgetting on-demand revalidation after mutations, users see outdated content.
5. **Cache invalidation blindness**: Using revalidatePath without understanding which routes it affects.
6. **Mixing fetch options**: Using both cache and next.revalidate may produce unexpected behavior.
7. **Not handling loading states**: Pages without loading.tsx show nothing during data fetching.
8. **Overusing force-dynamic**: Static rendering is faster; only opt out when you need request-time data.
