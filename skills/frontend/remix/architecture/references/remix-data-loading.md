# Remix Data Loading Patterns

## Loader Fundamentals

```tsx
// app/routes/products.$id.tsx
export async function loader({ params, request }: LoaderFunctionArgs) {
  const product = await db.product.findUnique({ where: { id: params.id } })
  const reviews = await db.review.findMany({ where: { productId: params.id } })
  return json({ product, reviews })
}
```

## Parallel Data Loading

Remix loads data for all matched routes in parallel:

```tsx
// app/routes/products.tsx — parent
export async function loader() {
  return json({ categories: await db.category.findMany() })
}

// app/routes/products.$id.tsx — child
export async function loader({ params }: LoaderFunctionArgs) {
  return json(await getProduct(params.id))
}
```

Both loaders fire simultaneously. Nested routes don't create waterfall.

## Deferred Data

```tsx
export async function loader({ params }: LoaderFunctionArgs) {
  const product = await db.product.findUnique({ where: { id: params.id } })
  return defer({
    product,
    reviews: db.review.findMany({ where: { productId: params.id } }),  // Promise
  })
}

export default function ProductDetail() {
  const { product, reviews } = useLoaderData<typeof loader>()
  return (
    <div>
      <h1>{product.name}</h1>
      <Suspense fallback={<div>Loading reviews...</div>}>
        <Await resolve={reviews}>
          {(reviews) => <ReviewList reviews={reviews} />}
        </Await>
      </Suspense>
    </div>
  )
}
```

## Caching Headers

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const data = await getData()
  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=300',
    },
  })
}
```

| Directive | Purpose |
|-----------|---------|
| `max-age` | Browser cache time |
| `s-maxage` | CDN proxy cache time |
| `stale-while-revalidate` | Serve stale while refreshing |
| `public` | Cacheable by proxies |
| `private` | Only browser cache |

## Search & Pagination

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page')) || 1
  const q = url.searchParams.get('q') || ''
  const [products, total] = await Promise.all([
    db.product.findMany({ skip: (page - 1) * 20, take: 20, where: q ? { name: { contains: q } } : {} }),
    db.product.count(),
  ])
  return json({ products, total, page, query: q })
}
```

## Session Data

```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  const user = session.get('user')
  return json({ user })
}
```
