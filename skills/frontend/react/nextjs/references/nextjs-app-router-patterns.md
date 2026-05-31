# Next.js App Router Patterns

## Overview

The App Router (Next.js 13+) introduces a new paradigm built on React Server Components, nested layouts, streaming, and a file-system routing hierarchy. This reference covers every major pattern: routing, layouts, loading states, error handling, parallel routes, intercepting routes, route groups, and the metadata API.

## File Conventions

### Route Segment Files

| File | Purpose | Server/Client |
|------|---------|---------------|
| `page.tsx` | Route UI — must export default component | Server (default) |
| `layout.tsx` | Shared wrapper that persists across navigations | Server (default) |
| `loading.tsx` | Suspense fallback UI for the segment | Server (default) |
| `error.tsx` | Error Boundary UI for the segment | Client (required) |
| `not-found.tsx` | 404 UI for the segment | Server (default) |
| `global-error.tsx` | Error Boundary for the root layout (replaces html/body) | Client (required) |
| `route.ts` | API endpoint (GET, POST, PUT, PATCH, DELETE) | Server |
| `template.tsx` | Like layout but re-mounts on every navigation | Server (default) |
| `default.tsx` | Fallback for parallel route slots when hard-navigated | Server (default) |

### Metadata Exports

```typescript
// Static metadata
export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Page description',
}

// Dynamic metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.slug)
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      images: [{ url: post.ogImage }],
    },
  }
}
```

## Route Organization

### Route Groups

Route groups parenthesize folder names to organize without affecting the URL path.

```
app/
  (marketing)/
    page.tsx         -> /
    about/page.tsx   -> /about
  (shop)/
    layout.tsx       -> shared shop layout
    products/
      page.tsx       -> /products
    cart/
      page.tsx       -> /cart
```

Route groups can have their own layouts. Multiple groups can coexist under the same parent. Each group's layout is independent — navigations within a group persist its layout; crossing between groups re-renders.

### Parallel Routes

Parallel routes use `@folder` naming to render multiple independent sections in the same layout.

```
app/
  layout.tsx             -> receives children + @feed + @notifications
  page.tsx               -> default content
  @feed/
    page.tsx             -> / (feed section)
    details/page.tsx     -> /details (in feed slot)
  @notifications/
    page.tsx             -> / (notifications section)
```

```typescript
// app/layout.tsx
export default function Layout({
  children,
  feed,
  notifications,
}: {
  children: React.ReactNode
  feed: React.ReactNode
  notifications: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex' }}>
      <aside>{feed}</aside>
      <main>{children}</main>
      <aside>{notifications}</aside>
    </div>
  )
}
```

Each slot has its own loading.tsx and error.tsx. Slots navigate independently — use `active-` prefixed CSS classes for active states. Always provide a `default.tsx` in each slot for when the slot has no matching page on hard navigation.

### Intercepting Routes

Intercepting routes use `(..)` prefix to match a route from a different level, useful for modals.

```
app/
  feed/
    page.tsx                    -> /feed
    (..)photo/
      [id]/page.tsx             -> intercepts /photo/[id] from /feed
  photo/
    [id]/page.tsx               -> /photo/[id] (full page)
```

Convention: `(.)` same level, `(..)` one level up, `(..)(..)` two levels up, `(...)` from root.

Use intercepting routes for:
- Photo galleries opening in a modal while the feed stays in background
- Login modals that appear over the current page
- Quick-create forms without leaving the current view

## Layout Patterns

### Root Layout

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
```

The root layout is the only layout that contains `<html>` and `<body>`. It does not re-render on navigation. Providers (ThemeProvider, QueryClientProvider, etc.) belong here.

### Nested Layouts

```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-shell">
      <DashboardSidebar />
      <div className="dashboard-content">
        {children}
      </div>
    </div>
  )
}
```

Nested layouts receive the child route segment's page. They persist across navigations within the segment.

### Template vs Layout

Templates re-mount on every navigation. Use templates for:
- Page-view analytics that need to fire on every navigation
- Enter/exit animations (CSS transitions need DOM re-creation)
- useEffect dependencies that should reset per page

```typescript
// app/(marketing)/template.tsx
'use client'
export default function Template({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    analytics.pageView()
  }, [])
  return <div className="page-enter-animation">{children}</div>
}
```

## Data Fetching Patterns

### Direct fetch in Server Components

```typescript
async function getPost(slug: string) {
  const res = await fetch(`https://api.example.com/posts/${slug}`, {
    next: { revalidate: 60 },
    headers: { 'Authorization': `Bearer ${process.env.API_KEY}` },
  })
  if (!res.ok) throw new Error('Failed to fetch post')
  return res.json()
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  return <article><h1>{post.title}</h1><div>{post.content}</div></article>
}
```

### Database queries

```typescript
import { prisma } from '@/lib/prisma'

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { profile: true },
  })
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name} - {user.email}</li>
      ))}
    </ul>
  )
}
```

### Parallel data fetching

```typescript
export default async function DashboardPage() {
  const [revenue, users, orders] = await Promise.all([
    getRevenue(),
    getUsers(),
    getOrders(),
  ])
  return <Dashboard revenue={revenue} users={users} orders={orders} />
}
```

### Sequential data fetching (waterfall)

```typescript
export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)      // First fetch
  const author = await getAuthor(post.authorId) // Depends on post
  return (
    <article>
      <h1>{post.title}</h1>
      <p>By {author.name}</p>
      <div>{post.content}</div>
    </article>
  )
}
```

### Streaming with Suspense boundaries

```typescript
import { Suspense } from 'react'

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<Skeleton />}>
        <SlowWidget />
      </Suspense>
      <Suspense fallback={<SmallSkeleton />}>
        <AnotherSlowWidget />
      </Suspense>
    </div>
  )
}

async function SlowWidget() {
  const data = await fetchSlowData()
  return <Widget data={data} />
}
```

## Caching and Revalidation

### Static Data (Default)

```typescript
// fetch without any cache option — cached indefinitely
const data = await fetch('https://api.example.com/data')
```

### Dynamic Data

```typescript
// Opt out of caching
const data = await fetch('https://api.example.com/data', { cache: 'no-store' })

// Or use cookies/headers (automatically opts out)
export default async function Page() {
  const cookieStore = cookies()
  const data = await fetch('https://api.example.com/data') // dynamic, uses cookies
}
```

### Time-based Revalidation

```typescript
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 60 }, // Recheck every 60 seconds, serve cached in between
})
```

### On-demand Revalidation

```typescript
// app/actions.ts
'use server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function updatePost(formData: FormData) {
  await db.post.update({ where: { id: formData.get('id') }, data: {} })
  revalidatePath(`/posts/${formData.get('id')}`)
  revalidateTag('posts')
}
```

Tag-based revalidation requires tagging on the fetch call:

```typescript
const data = await fetch('https://api.example.com/posts', {
  next: { tags: ['posts'] },
})
```

## Server Actions

### Form with Server Action

```typescript
// app/posts/create/page.tsx
export default function CreatePostPage() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">Create</button>
    </form>
  )
}

// app/actions.ts
'use server'
export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  await db.post.create({ data: { title, content } })
  revalidatePath('/posts')
  redirect('/posts')
}
```

### Server Action with Validation

```typescript
'use server'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function register(prevState: any, formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }
  await db.user.create({ data: parsed.data })
  redirect('/login')
}
```

### Server Action from Client Component

```typescript
'use client'
import { createPost } from '@/app/actions'

export function CreatePostForm() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button type="submit">Create</button>
    </form>
  )
}
```

Or call imperatively:

```typescript
'use client'
export function CreateButton() {
  const handleClick = async () => {
    const result = await createPost(new FormData(...))
  }
  return <button onClick={handleClick}>Create</button>
}
```

## Route Handlers

### Basic Handlers

```typescript
// app/api/posts/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const posts = await db.post.findMany()
  return NextResponse.json(posts)
}

export async function POST(request: Request) {
  const body = await request.json()
  const post = await db.post.create({ data: body })
  return NextResponse.json(post, { status: 201 })
}
```

### Dynamic Route Handlers

```typescript
// app/api/posts/[id]/route.ts
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const post = await db.post.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(post)
}
```

### Middleware-like logic in handlers

```typescript
import { getToken } from '@/lib/auth'

export async function GET(request: Request) {
  const token = await getToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await db.sensitiveData.findMany({ where: { userId: token.sub } })
  return NextResponse.json(data)
}
```

## Middleware

### Basic middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
```

### Rewrites and headers

```typescript
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/legacy')) {
    const url = request.nextUrl.clone()
    url.pathname = url.pathname.replace('/api/legacy', '/api/v1')
    return NextResponse.rewrite(url)
  }

  const response = NextResponse.next()
  response.headers.set('x-custom-header', 'value')
  return response
}
```

## Image Optimization

```typescript
import Image from 'next/image'

export default function Page() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero image"
      width={1200}
      height={630}
      priority={true}
      sizes="(max-width: 768px) 100vw, 1200px"
    />
  )
}
```

Key attributes:
- `width` and `height` required for layout shift prevention (or `fill` for unknown dimensions)
- `priority` for above-the-fold images (preloads the image)
- `sizes` for responsive images with `fill` or percentage widths
- `placeholder="blur"` with `blurDataURL` for low-quality image preview
- Remote images need `remotePatterns` in next.config

## Font Optimization

```typescript
import { Inter, Lusitana } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap' })
const lusitana = Lusitana({ weight: '700', subsets: ['latin'] })

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <h1 className={lusitana.className}>Heading</h1>
        {children}
      </body>
    </html>
  )
}
```

## Internationalization

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'

const locales = ['en', 'es', 'fr']
const defaultLocale = 'en'

function getLocale(request: Request): string {
  const negotiator = new Negotiator({ headers: Object.fromEntries(request.headers) })
  const languages = negotiator.languages()
  return match(languages, locales, defaultLocale)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const pathnameHasLocale = locales.some(locale =>
    pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
  if (pathnameHasLocale) return

  const locale = getLocale(request)
  request.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(request.nextUrl)
}
```

## Environment Variables

### Public vs Secret

```
# .env.local (secret, server-only)
DATABASE_URL=postgres://...
API_SECRET=abc123

# .env.local (public, available to client)
NEXT_PUBLIC_API_URL=https://api.example.com
```

Access pattern:
- Server: `process.env.DATABASE_URL`
- Client: `process.env.NEXT_PUBLIC_API_URL`

### Runtime environment variables

For runtime (not build-time) env vars, use `NEXT_PUBLIC_` prefix or implement a `/api/config` endpoint that returns public config.

## Build and Analyze

```bash
# Production build
next build

# Analyze bundles (requires @next/bundle-analyzer)
ANALYZE=true next build

# Analyze bundle in CI
npx next-bundle-analyzer

# TypeScript check
tsc --noEmit

# Lint
next lint
```

## Deployment Options

### Node.js Server

```bash
next start  # Default — requires Node.js server
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Static Export

```typescript
// next.config.ts
const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
}
```

Static export disables Route Handlers, Server Actions, ISR, and rewrites/redirects in middleware.

### Edge Runtime

```typescript
// app/api/edge/route.ts
export const runtime = 'edge'

export async function GET() {
  return new Response('Edge response')
}
```

Edge runtime is available for Route Handlers, Middleware, and Server Components (limited).
