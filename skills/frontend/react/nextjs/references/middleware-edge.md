# Next.js Proxy (formerly Middleware) and Request Interception

Code that runs on the server before a route renders: redirects, rewrites, header and cookie changes, coarse auth gating, locale routing, A/B bucketing. Next.js 16 renamed the `middleware` file convention to `proxy`; this reference uses the current name and notes the differences for older versions.

## Version Map

| Version | Change |
|---------|--------|
| 12.2 | Middleware stable (Edge Runtime only) |
| 13.0 | Middleware can set request headers, response headers, and return responses |
| 13.1 | `skipMiddlewareUrlNormalize`, `skipTrailingSlashRedirect` flags |
| 15.0 | `request.geo` and `request.ip` removed from `NextRequest` (use hosting-provider helpers) |
| 15.2 | Node.js runtime for middleware (experimental) |
| 15.5 | Node.js runtime for middleware stable |
| 16.0 | `middleware.ts` deprecated, renamed to `proxy.ts`; proxy defaults to the Node.js runtime and rejects the `runtime` segment option |

Migrate with the official codemod:

```bash
npx @next/codemod@canary middleware-to-proxy .
```

It renames `middleware.ts` to `proxy.ts` and the exported `middleware` function to `proxy`. The `skipMiddlewareUrlNormalize` flag is now `skipProxyUrlNormalize`.

## File and Exports

`proxy.ts` sits in the project root (or `src/`), next to `app/` or `pages/`. Export exactly one function, named `proxy` or as the default export, plus an optional `config`.

```ts
// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/old-blog')) {
    const target = request.nextUrl.clone()
    target.pathname = request.nextUrl.pathname.replace('/old-blog', '/blog')
    return NextResponse.redirect(target, 308)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/old-blog/:path*', '/dashboard/:path*'],
}
```

Return values:

| Return | Effect |
|--------|--------|
| `NextResponse.next()` / `undefined` | Continue to the route |
| `NextResponse.next({ request: { headers } })` | Continue with modified *request* headers (visible to the route, not the client) |
| `NextResponse.redirect(url, status?)` | 307 by default; pass 308 for permanent |
| `NextResponse.rewrite(url)` | Serve another route while keeping the browser URL |
| `Response.json(...)` / `new NextResponse(body, init)` | Respond directly (e.g. 401 for APIs) |

## Matcher

Without a matcher, proxy runs on every request including `_next/static`, `_next/image` and `public/` assets. Always scope it.

```ts
export const config = {
  matcher: [
    // Everything except API, static assets, image optimizer and metadata files
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    {
      source: '/api/:path*',
      locale: false,
      has: [{ type: 'header', key: 'authorization' }],
      missing: [{ type: 'header', key: 'next-router-prefetch' }],
    },
  ],
}
```

Rules:
- Object matchers accept only `source`, `locale`, `has`, `missing`. There is no `methods` key; branch on `request.method` in code.
- Values must be static literals; variables are ignored at build time.
- `source` must start with `/`, uses path-to-regexp syntax (`:path*`, `:path+`, `(.*)`), and is anchored to the start of the path.
- Proxy still runs for `/_next/data/*` even if excluded, so data routes stay protected along with their pages.

Execution order: `next.config` `headers` → `redirects` → proxy → `beforeFiles` rewrites → filesystem routes → `afterFiles` rewrites → dynamic routes → `fallback` rewrites.

## Passing Data to the Route (Request Headers)

```ts
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', crypto.randomUUID())

  return NextResponse.next({
    request: { headers: requestHeaders }, // upstream only
  })
}
```

`NextResponse.next({ headers })` (without `request`) sends the headers to the client. Never put user IDs, roles or token claims on the response; they leak and can be confused with trusted input. Read the request header in a Server Component with `headers()` from `next/headers`.

## Authentication Gate

Proxy is an optimistic check (cookie present and signature valid), not the authorization layer. Verify the session again in Server Components, Route Handlers and every Server Function: a matcher change or moving a Server Function to another route silently removes proxy coverage.

```ts
// proxy.ts
import { jwtVerify } from 'jose'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const secret = process.env.JWT_SECRET
if (!secret) throw new Error('JWT_SECRET is not set')
const key = new TextEncoder().encode(secret)

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  const login = new URL('/login', request.url)
  login.searchParams.set('next', request.nextUrl.pathname)

  if (!token) return NextResponse.redirect(login)

  try {
    await jwtVerify(token, key, { algorithms: ['HS256'], issuer: 'https://auth.example.com' })
    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(login)
    res.cookies.delete('session')
    return res
  }
}

export const config = { matcher: ['/dashboard/:path*', '/settings/:path*'] }
```

Security notes:
- CVE-2025-29927: the internal `x-middleware-subrequest` header let attackers skip middleware entirely. Fixed in 12.3.5, 13.5.9, 14.2.25 and 15.2.3. Upgrade; if you cannot, strip that header at the CDN/reverse proxy.
- Pin `algorithms` in `jwtVerify`; validate `iss`/`aud`.
- Validate the `next` redirect parameter on the login page (same-origin paths only) to avoid open redirects.

## Security Headers

```ts
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return res
}
```

Static headers that do not need a per-request nonce belong in `next.config` `headers()`, which is cheaper. A nonce-based CSP forces dynamic rendering of the affected pages. `X-Powered-By` is removed with `poweredByHeader: false` in `next.config`, not in proxy.

## Locale Routing

```ts
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const locales = ['en', 'fr', 'de'] as const
const defaultLocale = 'en'

function pickLocale(request: NextRequest): string {
  const languages = new Negotiator({
    headers: { 'accept-language': request.headers.get('accept-language') ?? '' },
  }).languages()
  return match(languages, [...locales], defaultLocale)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))
  if (hasLocale) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = `/${request.cookies.get('NEXT_LOCALE')?.value ?? pickLocale(request)}${pathname}`
  return NextResponse.redirect(url)
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'] }
```

Persist an explicit user choice in a `NEXT_LOCALE` cookie so it wins over `Accept-Language`.

## Geolocation and Client IP

`request.geo` / `request.ip` no longer exist (Next.js 15+). Use the platform:

| Host | API |
|------|-----|
| Vercel | `geolocation(request)`, `ipAddress(request)` from `@vercel/functions` |
| Cloudflare | `CF-IPCountry` header, `request.cf` via the adapter |
| Self-hosted behind a proxy | Header set by *your* trusted load balancer (e.g. `X-Forwarded-For` last trusted hop) |

Never trust a client-supplied `X-Forwarded-For` value for security decisions.

## A/B Bucketing

```ts
async function bucket(experiment: string, id: string): Promise<'control' | 'treatment'> {
  const data = new TextEncoder().encode(`${experiment}:${id}`)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data))
  return digest[0] % 2 === 0 ? 'control' : 'treatment'
}

export async function proxy(request: NextRequest) {
  let id = request.cookies.get('uid')?.value
  const isNew = !id
  id ??= crypto.randomUUID()

  const variant = await bucket('landing-v2', id)
  const res =
    request.nextUrl.pathname === '/' && variant === 'treatment'
      ? NextResponse.rewrite(new URL('/landing-v2', request.url))
      : NextResponse.next()

  if (isNew) res.cookies.set('uid', id, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 90 })
  return res
}
```

Deterministic hashing keeps a user in one variant across instances. Exposure logging can run in `event.waitUntil(...)` (second argument, `NextFetchEvent`).

## Rate Limiting

An in-memory `Map` is per-instance and per-isolate: it resets on cold start and does not share counts across replicas, so it does not enforce a global limit. Use a shared store (Redis/Upstash, a KV with atomic increment) or the CDN/WAF rate limiter, and key on a trusted client IP or authenticated user ID.

## Testing

```ts
import { unstable_doesProxyMatch, isRewrite, getRewrittenUrl } from 'next/experimental/testing/server'
import { NextRequest } from 'next/server'
import { config, proxy } from './proxy'

it('skips static assets', () => {
  expect(unstable_doesProxyMatch({ config, nextConfig: {}, url: '/_next/static/chunk.js' })).toBe(false)
})

it('rewrites treatment users', async () => {
  const res = await proxy(new NextRequest('https://app.test/', { headers: { cookie: 'uid=fixed-id' } }))
  if (isRewrite(res)) expect(getRewrittenUrl(res)).toBe('https://app.test/landing-v2')
})
```

These helpers are experimental (since 15.1); pin the Next.js version in tests that use them.

## Pitfalls

- Doing data fetching or heavy work in proxy: it runs on every matched request, including prefetches. Keep it to routing decisions.
- Relying on module-level state: instances are not shared and may be deployed to the CDN edge.
- Large request headers can trigger `431 Request Header Fields Too Large` upstream.
- Custom `fetch`-based rewrites lose RSC headers; prefer `NextResponse.rewrite`.
- Redirect loops: exclude the login page and assets from the auth matcher.

## Checklist

- [ ] File is `proxy.ts` (Next.js 16+) with a scoped `matcher`
- [ ] Data for routes passed via `NextResponse.next({ request: { headers } })`
- [ ] Auth re-checked in Server Components, Route Handlers and Server Functions
- [ ] Next.js patched against CVE-2025-29927
- [ ] No `request.geo` / `request.ip`; platform helpers or trusted headers used
- [ ] Rate limiting backed by a shared store
- [ ] Matcher behaviour covered by `unstable_doesProxyMatch` tests
