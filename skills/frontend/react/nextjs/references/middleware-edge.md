# Next.js Middleware and Edge Runtime

## Overview
Next.js Middleware runs code before a request completes, enabling redirects, rewrites, authentication, geolocation, and A/B testing at the Edge. The Edge Runtime provides a lightweight, fast execution environment based on Web APIs.

## Middleware Basics

### Basic Middleware
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('Middleware running for:', request.url);
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

## Request Modification

### Redirects and Rewrites
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect old paths
  if (pathname.startsWith('/old-blog')) {
    const newPath = pathname.replace('/old-blog', '/blog');
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  // Redirect to trailing slash
  if (!pathname.endsWith('/') && !pathname.includes('.')) {
    return NextResponse.redirect(
      new URL(`${pathname}/`, request.url)
    );
  }

  // Rewrite internal paths
  if (pathname.startsWith('/docs')) {
    request.nextUrl.pathname = '/documentation';
    return NextResponse.rewrite(request.nextUrl);
  }

  return NextResponse.next();
}
```

### Header Modification
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Custom headers
  response.headers.set('X-Custom-Header', 'value');

  // Remove headers
  response.headers.delete('X-Powered-By');

  return response;
}
```

## Authentication

### Session Check
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session-token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const session = await verifySession(token);
    const response = NextResponse.next();

    // Attach user info to request headers
    response.headers.set('x-user-id', session.userId);
    response.headers.set('x-user-role', session.role);

    return response;
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

### JWT Validation
```typescript
import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const response = NextResponse.next();
    response.headers.set('x-user', JSON.stringify(payload));
    response.headers.set('x-user-id', payload.sub as string);

    return response;
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}
```

## Geolocation and Locale

### Geo-Based Routing
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { geo } = request;
  const country = geo?.country || 'US';
  const city = geo?.city || 'unknown';

  // Redirect to region-specific content
  if (country === 'GB' && request.nextUrl.pathname === '/pricing') {
    return NextResponse.redirect(new URL('/pricing/uk', request.url));
  }

  // Set geolocation headers
  const response = NextResponse.next();
  response.headers.set('x-country', country);
  response.headers.set('x-city', city);

  return response;
}
```

### Locale Detection
```typescript
// middleware.ts
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'fr', 'de', 'es', 'ja'];
const defaultLocale = 'en';

function getLocale(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    negotiatorHeaders[key] = value;
  });

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  return match(languages, locales, defaultLocale);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}
```

## A/B Testing

### Experiment Assignment
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const experiments = {
  'landing-redesign': {
    threshold: 0.5,
    variants: ['control', 'treatment'],
  },
};

function getVariant(experiment: string, userId: string): string {
  const hash = hashCode(`${experiment}:${userId}`);
  return hash % 2 === 0 ? 'control' : 'treatment';
}

export function middleware(request: NextRequest) {
  const userId = request.cookies.get('user-id')?.value || 'anonymous';

  // Assign experiment variants
  const landingVariant = getVariant('landing-redesign', userId);

  // Set experiment cookies
  const response = NextResponse.next();
  response.cookies.set('exp-landing', landingVariant, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  // Route to variant
  if (request.nextUrl.pathname === '/' && landingVariant === 'treatment') {
    request.nextUrl.pathname = '/experimental-landing';
    return NextResponse.rewrite(request.nextUrl);
  }

  return response;
}
```

## Rate Limiting

### Edge Rate Limiter
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 100;
const WINDOW_MS = 60 * 1000; // 1 minute

export function middleware(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();

  const current = rateLimitMap.get(ip);

  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (current.count >= RATE_LIMIT) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  current.count++;
  return NextResponse.next();
}
```

## Matcher Configuration

### Advanced Matchers
```typescript
// middleware.ts
export const config = {
  matcher: [
    // Match specific paths
    '/dashboard/:path*',
    '/api/:path*',

    // Match all except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|public).*)',

    // Match only GET requests for API
    {
      source: '/api/:path*',
      methods: ['GET', 'POST'],
      has: [
        { type: 'header', key: 'Authorization', value: 'Bearer.*' },
      ],
      missing: [
        { type: 'header', key: 'X-Internal', value: 'true' },
      ],
    },
  ],
};
```

## Key Points
- Middleware runs at the Edge before every matching request
- Use matcher config to limit middleware execution paths
- NextResponse.next() continues, redirect()/rewrite() change the request
- Modify headers on both request and response
- Geolocation data (country, city, region) available in Edge
- Locale detection enables internationalized routing
- A/B testing with cookie-based variant assignment
- Rate limiting at the edge prevents abuse
- JWT verification with jose library for authentication
- Middleware cannot use Node.js APIs (Edge Runtime only)
- Response cookies persist across the session
- Create custom request ID for tracing
- Rewrites mask internal paths while showing original URL to user
- Edge Runtime has limited APIs compared to Node.js
- Cleanup resources between requests (no global state leakage)
