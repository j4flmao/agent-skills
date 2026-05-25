# SSR vs CSR

## Key Differences

| Aspect | CSR | SSR | SSG | ISR |
|--------|-----|-----|-----|-----|
| Rendering | Browser | Server | Build time | Build + revalidate |
| HTML source | Minimal (root div) | Full HTML | Full HTML | Full HTML (cached) |
| First paint | After JS loads | Streamed HTML | Instant | Instant |
| JS required | Yes | Yes (hydration) | Yes (hydration) | Yes (hydration) |
| Data freshness | Per request | Per request | Build time | Revalidate interval |
| CDN cacheable | Yes (static) | No (per request) | Yes | Yes |
| Server cost | Low | High | Low | Moderate |
| SEO | Poor without SSR | Excellent | Excellent | Excellent |

## Rendering Timeline Comparison

```
CSR:
HTML ───→ JS Load ───→ React Hydrate ───→ Interactive
 │                       │                   │
 FCP (slow)              LCP (slow)           TTI (slow)

SSR:
HTML (server rendered) ───→ Hydrate ───→ Interactive
 │                          │              │
 FCP (fast)                 LCP (fast)      TTI (depends on JS)

SSG:
Pre-built HTML ───→ Hydrate ───→ Interactive
 │                    │              │
 FCP (fastest)        LCP (fast)      TTI (depends on JS)
```

## CSR Implementation

```tsx
// Entirely client-rendered
function App() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/data').then(res => res.json()).then(setData)
  }, [])

  if (!data) return <Loading />

  return <Dashboard data={data} />
}
```

## SSR Implementation (Express + React)

```typescript
import express from 'express'
import { renderToString } from 'react-dom/server'
import App from './App'

const server = express()

server.get('*', (req, res) => {
  const appHtml = renderToString(<App url={req.url} />)

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>My App</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <div id="root">${appHtml}</div>
        <script src="/app.js"></script>
      </body>
    </html>
  `)
})
```

## SSG Implementation (Static Export)

```typescript
// Next.js
export async function getStaticProps() {
  const data = await fetchCMS()
  return { props: { data } }
}

export async function getStaticPaths() {
  const posts = await fetchAllPosts()
  return {
    paths: posts.map(p => ({ params: { slug: p.slug } })),
    fallback: false,
  }
}

export default function Post({ data }: { data: Post }) {
  return <article>{data.content}</article>
}
```

## ISR Implementation

```typescript
// Next.js ISR
export async function getStaticProps() {
  const data = await fetchCMS()

  return {
    props: { data },
    revalidate: 3600, // regenerate at most once per hour
  }
}

// On-demand revalidation (Next.js 13+)
// POST /api/revalidate?secret=TOKEN
export default async function handler(req: Request) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ message: 'Invalid secret' }, { status: 401 })
  }

  await revalidateTag('cms-data')
  return Response.json({ revalidated: true })
}
```

## Streaming SSR

```tsx
// Next.js App Router — streaming by default
async function ProductPage({ params }: { params: { id: string } }) {
  // These fetch in parallel, stream as they resolve
  const product = await getProduct(params.id)
  const reviews = getReviews(params.id)
  const related = getRelated(params.id)

  return (
    <div>
      <h1>{product.name}</h1>  ← streams immediately
      <Suspense fallback={<ReviewSkeleton />}>
        <Reviews data={reviews} />
      </Suspense>
      <Suspense fallback={<RelatedSkeleton />}>
        <Related data={related} />
      </Suspense>
    </div>
  )
}
```

## Rendering Strategy Decision

```
Route characteristics?
├── Public content + SEO critical?
│   ├── Static (rarely changes) → SSG
│   ├── Periodic updates → ISR (revalidate: time-based)
│   └── Real-time data → SSR with streaming
├── Authenticated + personalized?
│   ├── SEO needed → SSR
│   └── No SEO → CSR
├── Dashboard / admin (auth-only)?
│   ├── Heavy interactivity → CSR
│   └── Mixed content → SSR with client islands
└── Hybrid app?
    └── Per-route strategy (SSG + SSR + CSR)
```

## Hydration Comparison

| Type | JS Sent | TTI | Complexity | Best For |
|------|---------|-----|------------|----------|
| Full hydration | All components | Slowest | Low | SPAs, dashboards |
| Progressive | Visible first | Fast | Medium | Content-heavy apps |
| Partial (islands) | Per island | Fastest | Medium | Mostly static content |
| Selective (React 18) | Per priority | Fast | Low | Any React 18 app |
| No hydration | None | Instant | Low | Static content |

## Performance Budgets per Strategy

| Metric | CSR | SSR | SSG | ISR |
|--------|-----|-----|-----|-----|
| TTFB | < 100ms | < 500ms | < 100ms | < 100ms |
| FCP | < 2s | < 1s | < 0.5s | < 0.5s |
| LCP | < 3s | < 2s | < 1.5s | < 1.5s |
| TTI | < 3s | < 2.5s | < 2.5s | < 2.5s |
| JS bundle | < 200KB | < 200KB | < 200KB | < 200KB |
| Server CPU | Low | High | Low | Medium |
