# Remix Error Handling

## Error Boundaries

```typescript
// app/root.tsx
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import {
  Links, Meta, Outlet, Scripts, ScrollRestoration,
  useRouteError, isRouteErrorResponse, Link,
} from '@remix-run/react'

export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <html>
        <head><title>{error.status} Error</title></head>
        <body className="error-page">
          <h1>{error.status} {error.statusText}</h1>
          <p>{error.data}</p>
          <Link to="/">Go home</Link>
        </body>
      </html>
    )
  }

  const errMsg = error instanceof Error ? error.message : 'Unknown error'
  return (
    <html>
      <head><title>Unexpected Error</title></head>
      <body className="error-page">
        <h1>Something went wrong</h1>
        <p>{errMsg}</p>
        <Link to="/">Go home</Link>
      </body>
    </html>
  )
}
```

## Resource Routes

```typescript
// app/routes/api.users.$userId.ts
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { db } from '~/db.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const user = await db.user.findUnique({
    where: { id: params.userId },
  })

  if (!user) {
    return json({ error: 'User not found' }, { status: 404 })
  }

  return json(user)
}

export async function action({ params, request }: LoaderFunctionArgs) {
  if (request.method === 'DELETE') {
    await db.user.delete({ where: { id: params.userId } })
    return json({ success: true })
  }

  return json({ error: 'Method not allowed' }, { status: 405 })
}
```

## Cookie Sessions

```typescript
// app/session.server.ts
import { createCookieSessionStorage } from '@remix-run/node'

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '_session',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    secrets: [process.env.SESSION_SECRET || 'default'],
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
  },
})

export async function getSession(request: Request) {
  const cookie = request.headers.get('Cookie')
  return sessionStorage.getSession(cookie)
}

export async function commitSession(session: Session) {
  return sessionStorage.commitSession(session)
}

export async function destroySession(session: Session) {
  return sessionStorage.destroySession(session)
}
```

## Key Points

- Implement error boundaries at root and route levels
- Handle route errors with isRouteErrorResponse checks
- Use resource routes for API endpoints and file downloads
- Manage sessions with cookie-based session storage
- Set proper HTTP-only, Secure, and SameSite cookie attributes
- Use catch boundaries for expected error states
- Provide user-friendly error pages with navigation options
- Log server errors for debugging with proper context
- Handle form validation errors with field-level messages
- Use response status codes for API consistency
- Implement rate limiting for API resource routes
- Use environment variables for secrets and configuration
