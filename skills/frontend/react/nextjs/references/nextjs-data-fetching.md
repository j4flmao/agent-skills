# Next.js Data Fetching

## Server Component Data Fetching

```typescript
// app/users/page.tsx — Server Component
async function UsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
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

## Data Fetching Patterns

| Pattern | Location | Caching | Use Case |
|---------|----------|---------|----------|
| Direct DB access | Server Component | Automatic (fetch cache) | Internal data |
| fetch() | Server Component | Built-in dedup + cache | External APIs |
| Route handler | route.ts | Per-request | Client needs endpoint |
| Server Action | 'use server' | Revalidate on demand | Mutations |
| Client fetch | useEffect | Manual | Real-time data |

### Revalidation Strategies

```typescript
// Time-based revalidation
async function getData() {
  const res = await fetch('https://api.example.com/data', {
    next: { revalidate: 60 }, // Every 60 seconds
  })
  return res.json()
}

// On-demand revalidation
import { revalidatePath, revalidateTag } from 'next/cache'

export async function updateUser(formData: FormData) {
  'use server'
  await db.user.update({ ... })
  revalidatePath('/users')           // Revalidate page
  revalidateTag('users')             // Revalidate tagged fetches
}
```

## Loading States

```typescript
// app/users/loading.tsx
export default function Loading() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 animate-pulse rounded" />
      ))}
    </div>
  )
}
```

## Parallel Data Fetching

```typescript
async function DashboardPage() {
  // Parallel fetch — both start simultaneously
  const [users, posts, analytics] = await Promise.all([
    db.user.findMany(),
    db.post.findMany(),
    db.analytics.findFirst({ orderBy: { date: 'desc' } }),
  ])

  return (
    <div>
      <UserSummary users={users} />
      <PostList posts={posts} />
      <AnalyticsChart data={analytics} />
    </div>
  )
}
```

## ISR (Incremental Static Regeneration)

```typescript
// app/products/[id]/page.tsx
export async function generateStaticParams() {
  const products = await db.product.findMany({ select: { id: true } })
  return products.map(p => ({ id: p.id }))
}

async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({
    where: { id: params.id },
  })

  return <ProductDetail product={product} />
}

export const revalidate = 3600 // Revalidate every hour
```

## Streaming with Suspense

```typescript
import { Suspense } from 'react'

async function ProductPage() {
  return (
    <div>
      <h1>Product Details</h1>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetails id={params.id} />
      </Suspense>
      <Suspense fallback={<ReviewsSkeleton />}>
        <ProductReviews id={params.id} />
      </Suspense>
    </div>
  )
}
```
