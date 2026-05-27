# Edge Rendering

## Edge Runtime Setup

```typescript
// next.config.js for edge rendering
const nextConfig = {
  experimental: {
    runtime: 'experimental-edge',
  },
}

// Edge API route
export const config = {
  runtime: 'edge',
}

// Edge middleware
export async function middleware(request: Request) {
  const country = request.geo?.country ?? 'US'
  const response = await fetch(`https://api.example.com/data?country=${country}`)
  const data = await response.json()

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'X-Country': country,
      'Cache-Control': 's-maxage=60, stale-while-revalidate',
    },
  })
}
```

## Edge-First Data Fetching

```typescript
interface EdgeFetchOptions {
  cacheTTL?: number
  staleWhileRevalidate?: number
  tags?: string[]
  geo?: string
}

async function edgeFetch<T>(
  url: string,
  options: EdgeFetchOptions = {}
): Promise<T> {
  const { cacheTTL = 60, staleWhileRevalidate = 300, tags = [] } = options

  const response = await fetch(url, {
    headers: {
      'Cache-Control': `s-maxage=${cacheTTL}, stale-while-revalidate=${staleWhileRevalidate}`,
      ...(tags.length > 0 ? { 'Cache-Tags': tags.join(',') } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Edge fetch failed: ${response.status}`)
  }

  return response.json()
}

async function getGeoContent(countryCode: string) {
  const geoContent = await edgeFetch(
    `https://cdn.example.com/content/${countryCode}`,
    {
      cacheTTL: 300,
      staleWhileRevalidate: 3600,
      tags: ['geo-content', `country-${countryCode}`],
    }
  )
  return geoContent
}
```

## Edge-Side Rendering

```typescript
// Edge-rendered React component
export default async function EdgeRenderedPage({ params }: { params: { slug: string } }) {
  const country = (await getGeo()).country ?? 'US'
  const language = getLanguageFromCountry(country)

  const [content, translations, recommendations] = await Promise.all([
    getContent(params.slug),
    getTranslations(language),
    getRecommendations(country, params.slug),
  ])

  return (
    <html lang={language}>
      <head>
        <title>{content.title}</title>
        <meta name="description" content={content.description} />
        <link rel="alternate" hrefLang="en" href={`/en/${params.slug}`} />
        <link rel="alternate" hrefLang="es" href={`/es/${params.slug}`} />
      </head>
      <body>
        <Header translations={translations.header} />
        <main>
          <Article content={content} />
          <Recommendations items={recommendations} />
        </main>
        <Footer translations={translations.footer} />
      </body>
    </html>
  )
}
```

## Edge Cache Strategy

```typescript
interface EdgeCacheConfig {
  ttl: number
  swr: number
  group?: string
  tags?: string[]
}

class EdgeCacheManager {
  private cache: Map<string, { data: unknown; expires: number; tags: string[] }> = new Map()

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: EdgeCacheConfig
  ): Promise<{ data: T; source: 'cache' | 'origin'; revalidated?: boolean }> {
    const cached = this.cache.get(key)
    const now = Date.now()

    if (cached && now < cached.expires) {
      return { data: cached.data as T, source: 'cache' }
    }

    const data = await fetcher()
    this.cache.set(key, {
      data,
      expires: now + config.ttl * 1000,
      tags: config.tags ?? [],
    })

    return { data, source: 'origin' }
  }

  invalidateByTag(tag: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key)
      }
    }
  }

  invalidateAll(): void {
    this.cache.clear()
  }
}
```

## Edge Middleware for Personalization

```typescript
export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const country = request.geo?.country ?? 'US'
  const city = request.geo?.city
  const device = request.headers.get('sec-ch-ua-mobile')
  const isMobile = device === '?1'
  const cookiePrefs = request.cookies.get('preferences')

  // Redirect to country-specific path
  if (!url.pathname.startsWith(`/${country.toLowerCase()}`)) {
    url.pathname = `/${country.toLowerCase()}${url.pathname}`
    return NextResponse.redirect(url)
  }

  // Set device type header for downstream handlers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-device-type', isMobile ? 'mobile' : 'desktop')
  requestHeaders.set('x-country', country)
  requestHeaders.set('x-city', city ?? '')

  // Apply user preferences from cookie
  if (cookiePrefs) {
    try {
      const prefs = JSON.parse(cookiePrefs.value)
      if (prefs.theme) requestHeaders.set('x-user-theme', prefs.theme)
      if (prefs.fontSize) requestHeaders.set('x-font-size', prefs.fontSize)
    } catch {}
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  return response
}
```

## Edge Rendering with Streaming

```typescript
export const runtime = 'edge'

export async function handleEdgeStream(request: Request): Promise<Response> {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode('<html><body>'))

      // Stream shell immediately
      controller.enqueue(encoder.encode('<header><nav>...</nav></header>'))

      // Fetch and stream async content
      const contentPromise = fetchContent()
      const sidebarPromise = fetchSidebar()

      const content = await contentPromise
      controller.enqueue(encoder.encode(`<main>${content}</main>`))

      const sidebar = await sidebarPromise
      controller.enqueue(encoder.encode(`<aside>${sidebar}</aside>`))

      controller.enqueue(encoder.encode('</body></html>'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'CDN-Cache-Control': 'public, s-maxage=60',
      'Cloudflare-CDN-Cache-Control': 'public, s-maxage=60',
    },
  })
}
```

## Edge A/B Testing

```typescript
export async function middleware(request: NextRequest) {
  const experimentKey = 'checkout-v2'
  const cookieName = `exp-${experimentKey}`

  let variant = request.cookies.get(cookieName)?.value

  if (!variant) {
    const userGroup = hashUser(request.headers.get('x-forwarded-for') ?? '')
    variant = userGroup % 2 === 0 ? 'control' : 'treatment'
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-experiment', experimentKey)
  requestHeaders.set('x-variant', variant)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  response.cookies.set(cookieName, variant, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return response
}

function hashUser(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}
```

## Edge Security Headers

```typescript
export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const securityHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-XSS-Protection': '0',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  }

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.example.com",
    "frame-ancestors 'none'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)
  return response
}
```

## Key Points

- Edge rendering reduces latency by executing closest to the user
- Combine edge middleware for personalization with edge-rendered pages
- Use geo-location data for region-specific content and language
- Implement edge-side caching with stale-while-revalidate patterns
- Stream responses from edge for faster TTFB
- Run A/B experiments at the edge without client-side flicker
- Set security headers at the edge for comprehensive protection
- Cache API responses at the edge with configurable TTL and tags
- Invalidate edge cache by tags for granular purging
- Handle device detection and responsive rendering at the edge
