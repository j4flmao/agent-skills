# SolidJS SSR & Streaming Reference

## SSR Architecture Overview

SolidJS provides three server-side rendering primitives: `renderToString`, `renderToStringAsync`, and `renderToStream`. The synchronous path is fastest but blocks, async handles data dependencies, and streaming sends HTML progressively as Suspense boundaries resolve.

```tsx
import { renderToString, renderToStringAsync, renderToStream } from 'solid-js/web'

// Synchronous — no async data
const html = renderToString(() => <App />)

// Async — awaits Suspense boundaries
const html = await renderToStringAsync(() => <App />)

// Streaming — sends HTML as chunks
const stream = renderToStream(() => <App />)
```

## renderToString — Synchronous SSR

Renders the component tree synchronously. Suspense boundaries render their fallback content. Best for static pages or content where all data is available synchronously.

```tsx
import { renderToString, Suspense } from 'solid-js/web'

function App() {
  return (
    <div>
      <h1>Hello World</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <SlowComponent />
      </Suspense>
    </div>
  )
}

// The fallback is rendered into the HTML
const html = renderToString(() => <App />)
// <div><h1>Hello World</h1><p>Loading...</p></div>
```

```
renderToString pros: fast TTFB, simple, no streaming infrastructure needed
renderToString cons: Suspense content shows fallback until client hydration
```

## renderToStringAsync — Async SSR

Waits for all Suspense boundaries to resolve before producing the final HTML. Each resource inside Suspense must complete. The function returns a Promise resolving to the full HTML string.

```tsx
import { renderToStringAsync } from 'solid-js/web'
import { createResource, Suspense } from 'solid-js'

function Profile() {
  const [user] = createResource(() => fetch('/api/user').then(r => r.json()))

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <h1>{user()?.name}</h1>
    </Suspense>
  )
}

// renderToStringAsync waits for user resource to resolve
const html = await renderToStringAsync(() => <Profile />)
// <h1>John Doe</h1>  — fully resolved
```

```tsx
// Timeout handling — resources that take too long
const html = await Promise.race([
  renderToStringAsync(() => <App />),
  new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error('SSR timeout')), 10000)
  ),
])
```

## renderToStream — Streaming SSR

Sends HTML in chunks as Suspense boundaries resolve. The initial shell (non-Suspense content + fallbacks for unresolved boundaries) is sent immediately. As each Suspense boundary resolves, its HTML is streamed and injected via client-side scripts.

```tsx
import { renderToStream } from 'solid-js/web'
import { Suspense, createResource } from 'solid-js'

function SlowProfile() {
  const [data] = createResource(() =>
    new Promise<User>(resolve =>
      setTimeout(() => resolve({ name: 'Jane', bio: 'Engineer' }), 3000)
    )
  )

  return (
    <div>
      <h2>{data()?.name}</h2>
      <p>{data()?.bio}</p>
    </div>
  )
}

function App() {
  return (
    <div>
      <header>App Shell</header>
      <Suspense fallback={<p>Profile loading...</p>}>
        <SlowProfile />
      </Suspense>
    </div>
  )
}

const stream = renderToStream(() => <App />)
// Initial: <div><header>App Shell</header><p>Profile loading...</p><!--$-->
// After 3s: <div><h2>Jane</h2><p>Engineer</p></div><!--/$-->
```

### PipeableStream

Node.js stream API for piping directly to HTTP response.

```tsx
import { renderToStream } from 'solid-js/web'
import { createServer } from 'http'

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.write('<div id="root">')

  const stream = renderToStream(() => <App />)

  // Pipe the stream into the response
  if (stream.pipe) {
    stream.pipe(res)
  } else {
    // Web Streams fallback
    const reader = stream.getReader()
    const pump = () => {
      reader.read().then(({ done, value }) => {
        if (done) return
        res.write(value)
        pump()
      })
    }
    pump()
  }
})
```

### Web Streams API

Modern browsers and serverless runtimes support the Web Streams API. SolidJS streams into a `ReadableStream`.

```tsx
import { renderToStream } from 'solid-js/web'

// Fastify with Web Streams
app.get('/', async (req, reply) => {
  const stream = renderToStream(() => <App />)

  return reply.send(stream)
})

// Cloudflare Workers
export default {
  async fetch(request: Request) {
    const stream = renderToStream(() => <App />)
    return new Response(stream, {
      headers: { 'Content-Type': 'text/html' },
    })
  },
}
```

## Streaming HTML Chunks

The streaming mechanism works via `<!--$-->` and `<!--/$-->` comment markers. The initial HTML contains the shell with placeholder content. As resources resolve, the server pushes replacement HTML wrapped in `<script>` tags that the client-side runtime applies.

```tsx
// Server sends this initially:
// <div id="root">
//   <header>App</header>
//   <!--$-->
//   <p>Profile loading...</p>
//   <!--/$-->
// </div>
//
// After Suspense resolves, the server pushes:
// <script>
//   document.querySelector('...').outerHTML = '<div><h2>Jane</h2><p>Engineer</p></div>'
// </script>
```

```tsx
// Chunked transfer encoding for Node.js
import { createServer } from 'http'

createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Transfer-Encoding': 'chunked',
  })

  res.write('<html><body><div id="root">')
  const stream = renderToStream(() => <App />)

  stream.pipe(res, { end: false })
  stream.on('end', () => {
    res.write('</div></body></html>')
    res.end()
  })
}).listen(3000)
```

## Suspense Boundaries for Streaming

Each `<Suspense>` boundary becomes a streaming unit. Nested Suspense boundaries are streamed independently.

```tsx
function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* These three boundaries stream independently */}
      <Suspense fallback={<Skeleton width={300} height={200} />}>
        <RevenueChart />
      </Suspense>

      <Suspense fallback={<Skeleton width={300} height={200} />}>
        <UserActivity />
      </Suspense>

      <Suspense fallback={<Skeleton width={300} height={200} />}>
        <RecentOrders />
      </Suspense>
    </div>
  )
}
// Each chart streams as soon as its data is ready, regardless of others
// TTFB is fast: the layout shell is sent immediately
```

### Out-of-Order Streaming

Suspense boundaries resolve and stream in whatever order their data arrives. This means HTML for a later-in-markup boundary can arrive before an earlier one.

```tsx
function Page() {
  return (
    <div>
      <Suspense fallback={<p>Loading sidebar...</p>}>
        <Sidebar />  {/* Might resolve after main content */}
      </Suspense>

      <Suspense fallback={<p>Loading main...</p>}>
        <MainContent />  {/* Might resolve first */}
      </Suspense>
    </div>
  )
}
// MainContent can stream before Sidebar even though it appears later in the DOM
```

## Progressive Hydration

The client-side runtime hydrates incrementally. Hydration scripts are injected alongside each streaming chunk.

```tsx
import { hydrate } from 'solid-js/web'
import { Suspense, createResource } from 'solid-js'

// Client entry point
hydrate(() => <App />, document.getElementById('root')!)

// With streaming, hydrate works automatically:
// 1. Initial HTML is rendered in the browser immediately
// 2. As chunks arrive, they're inserted into the DOM
// 3. The hydrator reconciles the existing DOM with the component tree
// 4. Only Suspense boundaries that resolved on the server are hydrated
// 5. Remaining boundaries hydrate as their chunks arrive
```

### Hydration Mismatch Prevention

```tsx
// Avoid random values between server and client
function BadDateTime() {
  return <p>{new Date().toISOString()}</p>  // Server and client timestamps differ
}

function GoodDateTime() {
  const [now] = createResource(() =>
    fetch('/api/server-time').then(r => r.text())
  )
  return <Suspense fallback={<p>Loading time...</p>}>
    <p>{now()}</p>
  </Suspense>
}
```

## Hydration Strategies

### Full Hydration

Entire component tree is hydrated on the client. Simplest approach but heaviest JS payload.

```tsx
// entry-client.tsx
import { hydrate } from 'solid-js/web'
import App from './App'

hydrate(() => <App />, document.getElementById('root')!)
```

### Partial Hydration (Islands)

Only interactive components are hydrated. Static content remains inert. SolidJS supports this via manual decomposition.

```tsx
// Static shell — no hydration needed
// This component is pure HTML from the server
function StaticHeader() {
  return (
    <header>
      <h1>My Site</h1>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
    </header>
  )
}

// Interactive island — hydrated on the client
function Counter() {
  const [count, setCount] = createSignal(0)
  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  )
}

// Non-interactive content — no client JS
function StaticContent() {
  return (
    <article>
      <h2>Content</h2>
      <p>This text is server-rendered and never hydrated.</p>
    </article>
  )
}

function Page() {
  return (
    <div>
      <StaticHeader />
      <StaticContent />
      <Counter />  {/* Only this gets hydrated */}
    </div>
  )
}
```

### Progressive Hydration with Priority

```tsx
function App() {
  return (
    <div>
      {/* Hydrate immediately — above-the-fold */}
      <HeroSection />

      {/* Defer hydration — below-the-fold */}
      <div>
        <Footer />
      </div>
    </div>
  )
}
```

## Server Functions (SolidStart)

Server functions run exclusively on the server. They're called from the client via RPC. In SolidStart, these are defined with `server$` or in `.server.ts` files.

```tsx
// actions/server.ts
import { server$ } from 'solid-js/server'

// This function runs on the server only
export const getUser = server$(async (id: string) => {
  const db = await connectDB()
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id])
  return user
})

// Form action
export const createUser = server$(async (formData: FormData) => {
  const name = formData.get('name')
  const email = formData.get('email')

  const db = await connectDB()
  await db.query('INSERT INTO users (name, email) VALUES ($1, $2)', [name, email])

  return { success: true }
})
```

```tsx
// Component calling a server function
import { createResource, Suspense } from 'solid-js'
import { getUser, createUser } from './actions/server'

function Profile(props: { id: string }) {
  const [user] = createResource(() => props.id, getUser)

  async function handleSubmit(e: Event) {
    e.preventDefault()
    const form = new FormData(e.target as HTMLFormElement)
    await createUser(form)
  }

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <h1>{user()?.name}</h1>

      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Name" />
        <input name="email" placeholder="Email" />
        <button type="submit">Create</button>
      </form>
    </Suspense>
  )
}
```

## Data Fetching on Server

### createResource on Server

Resources behave the same on server and client. During SSR, resources within Suspense boundaries are awaited.

```tsx
function UserPage(props: { id: string }) {
  // fetcher runs on the server during SSR
  const [user] = createResource(
    () => props.id,
    async (id) => {
      // This runs on the server during renderToStringAsync
      // On the client, it also runs and may use cached data
      const res = await fetch(`https://api.example.com/users/${id}`, {
        headers: { Authorization: `Bearer ${process.env.API_KEY}` },
      })
      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json()
    }
  )

  return (
    <Suspense fallback={<UserSkeleton />}>
      <UserProfile user={user()!} />
    </Suspense>
  )
}
```

### Pre-fetching Data

```tsx
// Outside component — fetch during route load
export function routeData() {
  return createResource(() =>
    fetch('/api/dashboard').then(r => r.json())
  )
}

function Dashboard() {
  const [data] = useRouteData()
  return <DashboardView data={data()} />
}
```

### Deduplicating Server Fetches

```tsx
const fetchCache = new Map<string, Promise<any>>()

function dedupedFetch<T>(url: string): Promise<T> {
  if (!fetchCache.has(url)) {
    fetchCache.set(url, fetch(url).then(r => r.json()))
  }
  return fetchCache.get(url)!
}

function Sidebar() {
  const [stats] = createResource(() => dedupedFetch('/api/stats'))
  // ...
}

function MainContent() {
  // Same URL — fetch is deduplicated
  const [stats] = createResource(() => dedupedFetch('/api/stats'))
  // ...
}
```

## Streaming Data with Suspense

The render-as-you-fetch pattern streams data through Suspense boundaries.

```tsx
// Start fetching before rendering
const userPromise = fetchUser(id)
const postsPromise = fetchPosts(id)

function ProfilePage() {
  return (
    <div>
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfile fetcher={userPromise} />
      </Suspense>

      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts fetcher={postsPromise} />
      </Suspense>
    </div>
  )
}

function UserProfile(props: { fetcher: Promise<User> }) {
  const [user] = createResource(() => props.fetcher)
  return <div>...</div>
}
```

## Asset Management

### Style Injection

In SolidStart, styles are collected during SSR and injected into the HTML head.

```tsx
// Vite processes CSS imports and SolidJS collects them during SSR
import './styles.css'

function App() {
  return (
    <html>
      <head>
        {/* SolidJS automatically injects collected styles here during SSR */}
      </head>
      <body>
        <Content />
      </body>
    </html>
  )
}
```

```tsx
// Manual CSS injection for custom SSR setups
import { renderToString } from 'solid-js/web'
import { insertCss } from './css-collector'

const html = renderToString(() => <App />)
const styles = collectStyles()  // Collect CSS from components

const fullHtml = `
<!DOCTYPE html>
<html>
  <head>
    <style id="__css">${styles}</style>
  </head>
  <body>${html}</body>
</html>
`
```

### Critical CSS Inlining

```tsx
// Inline critical above-the-fold CSS, defer the rest
import critcial from 'critical'

async function generatePage() {
  const html = await renderToStringAsync(() => <App />)

  const { html: inlined, css: criticalCss } = await critical.generate({
    html,
    width: 1300,
    height: 900,
    inline: true,
  })

  return `
<!DOCTYPE html>
<html>
  <head>
    <style>${criticalCss}</style>
    <link rel="preload" href="/styles/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  </head>
  <body>${inlined}</body>
</html>
  `
}
```

### Script Loading

```tsx
// SolidJS injects hydration scripts during SSR
// Client bundle is loaded after the HTML

function HtmlShell() {
  return (
    <html>
      <head>
        <script type="module" src="/js/client.js" />
      </head>
      <body>
        <App />
      </body>
    </html>
  )
}
```

```tsx
// Deferred non-critical scripts
function DeferredScript() {
  return (
    <script
      type="module"
      src="/js/analytics.js"
      defer  {/* Wait until document parsed */}
      async  {/* Or load async, execute whenever ready */}
    />
  )
}
```

## Caching Strategies

### Full-Page Caching

```tsx
import { renderToString } from 'solid-js/web'

const cache = new Map<string, { html: string; timestamp: number }>()
const TTL = 60_000  // 1 minute

async function renderPage(path: string) {
  const cached = cache.get(path)
  if (cached && Date.now() - cached.timestamp < TTL) {
    return cached.html
  }

  const html = await renderToStringAsync(() => <App />)
  cache.set(path, { html, timestamp: Date.now() })
  return html
}
```

### Fragment Caching

Cache individual component outputs by their data dependencies.

```tsx
const fragmentCache = new Map<string, {
  html: string
  timestamp: number
}>()

async function cachedResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  renderFn: (data: T) => string
) {
  const cached = fragmentCache.get(key)
  if (cached && Date.now() - cached.timestamp < 30_000) {
    return cached.html
  }

  const data = await fetcher()
  const html = renderFn(data)
  fragmentCache.set(key, { html, timestamp: Date.now() })
  return html
}

// Usage
async function sidebarHtml() {
  return cachedResource(
    'sidebar-data',
    () => fetch('/api/sidebar').then(r => r.json()),
    (data) => renderToString(() => <Sidebar data={data} />)
  )
}
```

### Cache Headers

```tsx
// Set appropriate cache headers on SSR responses
import { createServer } from 'http'

createServer((req, res) => {
  const path = new URL(req.url!, 'http://localhost').pathname

  if (path === '/') {
    // Static homepage — cache aggressively
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
  } else if (path.startsWith('/user/')) {
    // User data — private cache
    res.setHeader('Cache-Control', 'private, no-cache')
  } else {
    // Default
    res.setHeader('Cache-Control', 'public, max-age=60')
  }

  // ... stream the response
})
```

### CDN Integration

```tsx
// Cache-tag based purging
res.setHeader('Cache-Tag', 'homepage, layout')
res.setHeader('CDN-Cache-Control', 'public, max-age=600')

// Surrogate key for CDN purging
res.setHeader('Surrogate-Key', 'page:home user:all')
```

## Performance Optimization

### TTFB Improvement

```tsx
// Use streaming — send HTML shell immediately
function App() {
  return (
    <html>
      <head>
        <title>My App</title>
        <link rel="stylesheet" href="/styles/main.css" />
      </head>
      <body>
        <header>Shell content sent immediately</header>

        {/* Heavy content streams later */}
        <Suspense fallback={<p>Loading...</p>}>
          <SlowComponent />
        </Suspense>
      </body>
    </html>
  )
}
// TTFB: headers + <html><head><title>... + header
// Without streaming: wait for SlowComponent too
```

```tsx
// Preconnect to external APIs
function HtmlHead() {
  return (
    <head>
      <link rel="preconnect" href="https://api.example.com" />
      <link rel="dns-prefetch" href="https://api.example.com" />
    </head>
  )
}
```

### Chunk Splitting

```tsx
import { lazy } from 'solid-js'

// Each lazy import becomes a separate JS chunk
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Reports = lazy(() => import('./pages/Reports'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))

function App() {
  return <Router>
    <Route path="/dashboard" component={Dashboard} />
    <Route path="/settings" component={Settings} />
    <Route path="/analytics" component={Analytics} />
    <Route path="/reports" component={Reports} />
    <Route path="/admin" component={AdminPanel} />
  </Router>
}
```

### LCP Optimization

```tsx
// Prioritize above-the-fold content in the initial render
function ProductPage() {
  return (
    <div>
      {/* Above the fold — send immediately */}
      <Suspense fallback={<HeroSkeleton />}>
        <HeroImage />
      </Suspense>

      {/* Below the fold — can be deferred */}
      <div style="content-visibility: auto">
        <RelatedProducts />
        <Reviews />
        <Footer />
      </div>
    </div>
  )
}
```

## SEO Considerations

### Meta Tags

```tsx
import { Meta, Title, Link } from '@solidjs/meta'

function Head() {
  return (
    <>
      <Title>My App | Home</Title>
      <Meta name="description" content="SolidJS SSR application" />
      <Meta property="og:title" content="My App" />
      <Meta property="og:description" content="SolidJS SSR application" />
      <Meta property="og:image" content="https://example.com/og-image.png" />
      <Meta property="og:url" content="https://example.com" />
      <Meta name="twitter:card" content="summary_large_image" />
      <Link rel="canonical" href="https://example.com" />
    </>
  )
}
```

### Structured Data (JSON-LD)

```tsx
function JsonLd() {
  return (
    <script type="application/ld+json">
      {JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'My App',
        description: 'A SolidJS SSR application',
        url: 'https://example.com',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All',
      })}
    </script>
  )
}

function App() {
  return (
    <html>
      <head>
        <JsonLd />
      </head>
      <body>
        <Content />
      </body>
    </html>
  )
}
```

### Sitemaps

```tsx
// pages/sitemap.xml.ts
export async function GET() {
  const pages = [
    '/',
    '/about',
    '/contact',
    '/products',
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map(page => `
  <url>
    <loc>https://example.com${page}</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`

  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
```

### Canonical URLs

```tsx
import { Meta } from '@solidjs/meta'

function ProductPage(props: { product: Product }) {
  return (
    <>
      <Meta property="og:url" content={`https://example.com/product/${props.product.id}`} />
      <link rel="canonical" href={`https://example.com/product/${props.product.slug}`} />

      {/* Language alternates */}
      <link rel="alternate" hreflang="en" href={`https://example.com/en/product/${props.product.id}`} />
      <link rel="alternate" hreflang="es" href={`https://example.com/es/product/${props.product.id}`} />
    </>
  )
}
```

## Error Handling

### Error Boundaries on Server

```tsx
import { ErrorBoundary } from 'solid-js'

function App() {
  return (
    <ErrorBoundary
      fallback={(err, reset) => (
        <div role="alert">
          <h2>Something went wrong</h2>
          <p>{err.message}</p>
          <button onClick={reset}>Try again</button>
        </div>
      )}
    >
      <Content />
    </ErrorBoundary>
  )
}
```

### Graceful Degradation

```tsx
// Fall back to static content if SSR fails
async function safeRender() {
  try {
    return await renderToStringAsync(() => <App />)
  } catch (err) {
    console.error('SSR failed:', err)
    // Fallback: render minimal HTML
    return `
<!DOCTYPE html>
<html>
  <head><title>Site Temporarily Unavailable</title></head>
  <body>
    <h1>We're experiencing issues</h1>
    <p>Please try again later.</p>
    <script type="module" src="/js/client.js"></script>
  </body>
</html>
    `
  }
}
```

### Fallback Content in Streaming

```tsx
function ProfileSection() {
  const [user] = createResource(() => fetchUser())

  return (
    <Suspense fallback={<UserSkeleton />}>
      <Show when={user()} fallback={<p>User not found</p>}>
        <UserProfile user={user()!} />
      </Show>
    </Suspense>
  )
}
```

## Render-as-You-Fetch

Start data fetching early, pass promises through the tree, and let Suspense resolve streaming.

```tsx
// App.jsx
export default function App() {
  return (
    <Suspense fallback={<GlobalLoader />}>
      <Main />
    </Suspense>
  )
}

// main.jsx — start fetching immediately
import { fetchUser, fetchPosts } from './api'

const userPromise = fetchUser()
const postsPromise = fetchPosts()

function Main() {
  return (
    <div>
      <Suspense fallback={<UserSkeleton />}>
        <User userPromise={userPromise} />
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <Posts postsPromise={postsPromise} />
      </Suspense>
    </div>
  )
}

// User.jsx
function User(props: { userPromise: Promise<User> }) {
  const [user] = createResource(() => props.userPromise)
  return <div>{user()?.name}</div>
}
```

## Code Splitting

### Route-Based Splitting

```tsx
import { lazy } from 'solid-js'
import { Router, Route } from '@solidjs/router'

const Home = lazy(() => import('./routes/Home'))
const About = lazy(() => import('./routes/About'))
const Contact = lazy(() => import('./routes/Contact'))
const Blog = lazy(() => import('./routes/Blog'))
const BlogPost = lazy(() => import('./routes/BlogPost'))

// Vite automatically creates separate chunks for each route
<Router>
  <Route path="/" component={Home} />
  <Route path="/about" component={About} />
  <Route path="/contact" component={Contact} />
  <Route path="/blog" component={Blog} />
  <Route path="/blog/:slug" component={BlogPost} />
</Router>
```

### Component-Level Splitting

```tsx
const HeavyChart = lazy(() => import('./charts/RevenueChart'))
const DataTable = lazy(() => import('./tables/DataTable'))
const PDFViewer = lazy(() => import('./viewers/PDFViewer'))

function Dashboard() {
  const [showChart, setShowChart] = createSignal(false)
  const [showTable, setShowTable] = createSignal(false)

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      <button onClick={() => setShowTable(true)}>Show Table</button>

      {/* Charts load only when clicked */}
      <Suspense fallback={<p>Loading chart...</p>}>
        <Show when={showChart()}>
          <HeavyChart />
        </Show>
      </Suspense>

      <Suspense fallback={<p>Loading table...</p>}>
        <Show when={showTable()}>
          <DataTable />
        </Show>
      </Suspense>
    </div>
  )
}
```

## SSE Integration with SSR

Server-Sent Events for live updates in SSR-rendered pages.

```tsx
// Server: stream updates via SSE
import { createServer } from 'http'

createServer((req, res) => {
  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const interval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ time: Date.now() })}\n\n`)
    }, 1000)

    req.on('close', () => clearInterval(interval))
    return
  }

  // ... SSR handler
})
```

```tsx
// Client: consume SSE events in a SolidJS component
function LiveClock() {
  const [time, setTime] = createSignal(Date.now())

  onMount(() => {
    const evtSource = new EventSource('/events')
    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setTime(data.time)
    }
    onCleanup(() => evtSource.close())
  })

  return <p>Server time: {new Date(time()).toLocaleTimeString()}</p>
}
```

## Security Considerations

### XSS Prevention

```tsx
// SolidJS auto-escapes text content
function UserInput(props: { input: string }) {
  return <p>{props.input}</p>  // Safe — auto-escaped
}

// Dangerous — avoid innerHTML unless sanitized
function Dangerous({ html }: { html: string }) {
  return <div innerHTML={html} />  // XSS risk
}

// Safe with DOMPurify
import DOMPurify from 'dompurify'

function SafeHTML({ html }: { html: string }) {
  return <div innerHTML={DOMPurify.sanitize(html)} />
}
```

### CSRF Protection

```tsx
// Middleware to set and validate CSRF tokens
import { createServer } from 'http'
import crypto from 'crypto'

const CSRF_SECRET = process.env.CSRF_SECRET!

function generateToken(sessionId: string) {
  return crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(sessionId)
    .digest('hex')
}

function csrfMiddleware(req, res, next) {
  if (req.method === 'POST') {
    const token = req.headers['x-csrf-token']
    const sessionId = req.headers['cookie']?.match(/session=([^;]+)/)?.[1]

    if (!token || !sessionId || token !== generateToken(sessionId)) {
      res.writeHead(403)
      res.end('CSRF validation failed')
      return
    }
  }
  next()
}
```

### CSP Headers

```tsx
// Set Content-Security-Policy on SSR responses
res.setHeader(
  'Content-Security-Policy',
  [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",  // unsafe-inline may be needed for streaming scripts
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data:",
    "connect-src 'self' https://api.example.com",
    "font-src 'self' https://fonts.gstatic.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join('; ')
)
```

### Input Sanitization

```tsx
// Server-side input validation
import { server$ } from 'solid-js/server'

export const submitFeedback = server$(async (formData: FormData) => {
  const message = formData.get('message')

  if (typeof message !== 'string' || message.length > 1000) {
    return { error: 'Invalid message' }
  }

  // Sanitize for storage
  const sanitized = message
    .replace(/[<>]/g, '')
    .trim()

  await saveToDB(sanitized)
  return { success: true }
})
```

## Vite Configuration

```tsx
// vite.config.ts
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid({ ssr: true })],

  build: {
    target: 'esnext',

    // Server build
    ssr: {
      format: 'esm',
      noExternal: ['solid-js', '@solidjs/router'],
    },

    // Client build
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['solid-js'],
          router: ['@solidjs/router'],
        },
      },
    },
  },

  ssr: {
    noExternal: ['solid-js', '@solidjs/router'],
  },
})
```

### Environment Variables

```tsx
// Vite exposes env vars via import.meta.env
// Server-side env vars need explicit handling

// .env
API_URL=https://api.example.com
DB_CONNECTION_STRING=postgres://...

// .env.development
API_URL=http://localhost:4000

// Usage in server code
const apiUrl = process.env.API_URL || import.meta.env.VITE_API_URL

// Public env vars (available to client)
// Prefix with VITE_
const analyticsId = import.meta.env.VITE_ANALYTICS_ID
```

### Build Targets

```tsx
// Node.js
// vite.config.ts
export default defineConfig({
  ssr: {
    target: 'node',
    format: 'esm',
  },
})

// Serverless (Cloudflare Workers)
export default defineConfig({
  ssr: {
    target: 'webworker',
    format: 'esm',
  },
})
```

## Testing SSR

### Snapshot Testing

```tsx
import { renderToString } from 'solid-js/web'
import { describe, it, expect } from 'vitest'

it('renders static HTML', () => {
  const html = renderToString(() => <h1>Hello</h1>)
  expect(html).toBe('<h1>Hello</h1>')
})

it('renders fallback content for Suspense', () => {
  const html = renderToString(() => (
    <Suspense fallback={<p>Loading...</p>}>
      <AsyncComponent />
    </Suspense>
  ))
  expect(html).toContain('<p>Loading...</p>')
})
```

### Integration Testing

```tsx
import { renderToStringAsync } from 'solid-js/web'

it('resolves Suspense boundaries', async () => {
  function AsyncData() {
    const [data] = createResource(() =>
      Promise.resolve({ name: 'Test' })
    )

    return (
      <Suspense fallback={<p>Loading...</p>}>
        <p>{data()?.name}</p>
      </Suspense>
    )
  }

  const html = await renderToStringAsync(() => <AsyncData />)
  expect(html).toContain('Test')
  expect(html).not.toContain('Loading')
})
```

### Streaming-Specific Testing

```tsx
import { renderToStream } from 'solid-js/web'

it('streams chunks', async () => {
  const stream = renderToStream(() => <App />)
  const reader = stream.getReader!()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const fullHtml = chunks.map(c => new TextDecoder().decode(c)).join('')
  expect(fullHtml).toContain('<div id="root">')
})
```

## Deployment

### Node.js Server

```tsx
// server.js
import { createServer } from 'http'
import { renderToStream } from 'solid-js/web'
import App from './dist/App.js'

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.write('<div id="root">')
  renderToStream(() => <App />).pipe(res)
})

server.listen(3000, () => {
  console.log('SSR server running on http://localhost:3000')
})
```

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json .
RUN npm ci --production
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Serverless (Vercel)

```tsx
// api/render.js — Vercel serverless function
import { renderToStringAsync } from 'solid-js/web'
import App from '../src/App'

export default async function handler(req, res) {
  const html = await renderToStringAsync(() => <App />)
  res.setHeader('Content-Type', 'text/html')
  res.status(200).end(html)
}
```

### Serverless (Cloudflare Workers)

```tsx
// worker.js
import { renderToStream } from 'solid-js/web'
import App from './App'

export default {
  async fetch(request: Request): Promise<Response> {
    const stream = renderToStream(() => <App />)
    return new Response(stream, {
      headers: { 'Content-Type': 'text/html' },
    })
  },
}

// wrangler.toml
// main = "dist/worker.js"
// compatibility_date = "2025-01-01"
```

### Serverless (Netlify)

```tsx
// netlify/functions/ssr.js
import { renderToStringAsync } from 'solid-js/web'
import App from '../../src/App'

exports.handler = async (event) => {
  const html = await renderToStringAsync(() => <App />)
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html,
  }
}
```

## SolidStart Integration

### File-Based Routing

```tsx
// src/routes/index.tsx — /
// src/routes/about.tsx — /about
// src/routes/blog/[slug].tsx — /blog/:slug
// src/routes/dashboard/settings.tsx — /dashboard/settings
// src/routes/(marketing)/pricing.tsx — /pricing (grouped route)
```

```tsx
// src/routes/blog/[slug].tsx
import { createResource, Suspense } from 'solid-js'
import { useParams } from '@solidjs/router'

export default function BlogPost() {
  const params = useParams()
  const [post] = createResource(() => params.slug, fetchPost)

  return (
    <Suspense fallback={<p>Loading post...</p>}>
      <article>
        <h1>{post()?.title}</h1>
        <div innerHTML={post()?.content} />
      </article>
    </Suspense>
  )
}
```

### Route Data Loading

```tsx
// src/routes/users/[id].tsx
import { createRouteData, useRouteData } from 'solid-start'

export function routeData({ params }) {
  return createRouteData(async () => {
    const res = await fetch(`https://api.example.com/users/${params.id}`)
    return res.json()
  })
}

export default function UserPage() {
  const user = useRouteData()
  return <div>{user()?.name}</div>
}
```

### Middleware

```tsx
// src/middleware.ts
import { createMiddleware } from 'solid-start'

export const middleware = createMiddleware({
  onRequest: async (event) => {
    // Add request timing
    const start = Date.now()

    // Authentication check
    const session = await getSession(event.request)
    if (!session && event.request.url.includes('/dashboard')) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/login' },
      })
    }

    event.locals.session = session

    // Log after response
    event.response.then(() => {
      console.log(`${event.request.method} ${event.request.url} — ${Date.now() - start}ms`)
    })
  },
})
```

## Comparison with Other Frameworks

```
Feature            SolidJS SSR    Next.js      Remix        SvelteKit     Qwik
────────────────────────────────────────────────────────────────────────────
Streaming          Native         App Router   WIP          Native        Native
Islands            Manual         Server       N/A          Manual        Automatic
                  opt-out        only (RSC)
Hydration          Progressive    Selective    Progressive  Progressive   Resumable
Data Loading       createResource getServer    loader       loadFunction  routeLoader
                   + Suspense     SideProps
SSR runtime        Node/Workers   Node         Node         Node/Workers  Node/Workers
Bundle size        ~8 KB          ~80 KB       ~25 KB       ~12 KB        ~10 KB
```

## Migration from Client-Only

```tsx
// Step 1: Wrap async data in Suspense
// Before (client-only)
function Profile() {
  const [user, setUser] = createSignal<User | null>(null)
  onMount(async () => {
    const res = await fetch('/api/user')
    setUser(await res.json())
  })
  return <div>{user()?.name}</div>
}

// After (SSR-ready)
function Profile() {
  const [user] = createResource(() => fetch('/api/user').then(r => r.json()))
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <div>{user()?.name}</div>
    </Suspense>
  )
}

// Step 2: Replace window access with guarded access
// Before
const width = window.innerWidth

// After
const width = typeof window !== 'undefined' ? window.innerWidth : 1024

// Step 3: Avoid document-dependent code at module level
// Before
const el = document.getElementById('app')

// After
function useAppElement() {
  const [el, setEl] = createSignal<HTMLElement | null>(null)
  onMount(() => setEl(document.getElementById('app')))
  return el
}

// Step 4: Use createResource instead of fetch + signal
// Before
const [data, setData] = createSignal(null)
onMount(async () => setData(await fetchData()))

// After
const [data] = createResource(fetchData)
```

## Best Practices

```tsx
// 1. Always use Suspense boundaries for async data
function App() {
  return (
    <Suspense fallback={<AppShell />}>
      <Routes>
        <Route path="/" component={Home} />
      </Routes>
    </Suspense>
  )
}

// 2. Avoid side effects in render
function Bad(props: { userId: string }) {
  fetchUser(props.userId)  // Wrong: side effect in render
  return <div>...</div>
}

// 3. Use createResource for data fetching
function Good(props: { userId: string }) {
  const [user] = createResource(() => props.userId, fetchUser)
  return <div>...</div>
}

// 4. Cache server-side data fetches
const serverCache = new Map<string, any>()

async function fetchWithCache<T>(url: string): Promise<T> {
  if (serverCache.has(url)) return serverCache.get(url)
  const data = await fetch(url).then(r => r.json())
  serverCache.set(url, data)
  return data
}

// 5. Don't use createEffect for data loading
function Bad() {
  const [data, setData] = createSignal()
  createEffect(async () => {
    const res = await fetch('/api/data')
    setData(await res.json())  // Wrong: no Suspense integration
  })
  return <div>{data()}</div>
}

// 6. Set proper charset and DOCTYPE
function HtmlShell() {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{props.children}</body>
    </html>
  )
}
```

## Common Pitfalls

```tsx
// 1. Accessing browser APIs during SSR
function Buggy() {
  localStorage.getItem('theme')  // ReferenceError during SSR
  document.title                  // ReferenceError during SSR
  window.location.href           // ReferenceError during SSR
}

function Fixed() {
  const [theme, setTheme] = createSignal('light')

  onMount(() => {
    setTheme(localStorage.getItem('theme') || 'light')
  })
}

// 2. Creating resources outside components
const [data] = createResource(fetchData)  // Wrong: not inside component

// 3. Missing Suspense boundaries
function Missing() {
  const [data] = createResource(fetchData)
  return <div>{data()}</div>  // Crashes if data returns null
}

function Fixed() {
  const [data] = createResource(fetchData)
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <div>{data()}</div>
    </Suspense>
  )
}

// 4. Non-serializable route data
function RouteData() {
  // Return plain objects — functions are not serialized
  return { user: createResource(fetchUser) }  // Wrong
}

// 5. Streaming and event handlers
function StreamingClick() {
  // Event handlers work after hydration
  // They don't exist during SSR — that's expected
  return <button onClick={() => alert('hi')}>Click</button>
}
```
