# Remix Sessions and Authentication

## Introduction

Remix provides built-in session storage abstractions that handle cookie-based sessions across different runtimes (Node.js, Cloudflare Workers, Deno). Unlike traditional frameworks where sessions are managed entirely on the server, Remix sessions work within the Web Request/Response model — sessions are serialized to cookies or external storage and sent to the client.

## Session Storage Types

### createCookieSessionStorage

Stores all session data in a cookie. Best for simple data (user ID, flash messages).

```ts
// app/sessions.server.ts
import { createCookieSessionStorage } from '@remix-run/node'

type SessionData = {
  userId: string
  role: 'admin' | 'user'
}

type SessionFlashData = {
  error: string
  success: string
}

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: '__session',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
      sameSite: 'lax',
      secrets: ['s3cret-key-here'],
      secure: process.env.NODE_ENV === 'production',
    },
  })

export { getSession, commitSession, destroySession }
```

### createFileSessionStorage

Stores session data on the filesystem (server-side). Good for development but not production.

```ts
import { createFileSessionStorage } from '@remix-run/node'

export const { getSession, commitSession, destroySession } =
  createFileSessionStorage({
    dir: '/app/sessions',
    cookie: {
      name: '__session',
      secrets: ['s3cret'],
    },
  })
```

### createMemorySessionStorage

Stores session data in memory. Not suitable for production (doesn't scale across workers).

```ts
import { createMemorySessionStorage } from '@remix-run/node'

export const { getSession, commitSession, destroySession } =
  createMemorySessionStorage({
    cookie: {
      name: '__session',
      secrets: ['s3cret'],
    },
  })
```

### Cloudflare KV Session Storage

```ts
// app/sessions.server.ts
import { createCookieSessionStorage } from '@remix-run/cloudflare'

export const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      name: '__session',
      secrets: [env.SESSION_SECRET],
      sameSite: 'lax',
      httpOnly: true,
      secure: true,
    },
  })
```

## Authentication Patterns

### Pattern 1: Password-Based Auth

```ts
// app/services/auth.server.ts
import { createCookieSessionStorage, redirect } from '@remix-run/node'
import { compare, hash } from 'bcryptjs'
import { db } from '~/db.server'

const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    name: '__session',
    secrets: [process.env.SESSION_SECRET!],
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  },
})

export async function register({ email, password, name }: {
  email: string
  password: string
  name: string
}) {
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return { error: 'Email already registered' }
  }

  const passwordHash = await hash(password, 12)
  const user = await db.user.create({
    data: { email, passwordHash, name },
  })

  return { user }
}

export async function login({ email, password }: {
  email: string
  password: string
}) {
  const user = await db.user.findUnique({ where: { email } })
  if (!user) return { error: 'Invalid email or password' }

  const valid = await compare(password, user.passwordHash)
  if (!valid) return { error: 'Invalid email or password' }

  return { user }
}

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await getSession()
  session.set('userId', userId)
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  })
}

export async function getUserId(request: Request) {
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')
  if (!userId || typeof userId !== 'string') return null
  return userId
}

export async function requireUserId(request: Request) {
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')
  if (!userId || typeof userId !== 'string') {
    throw redirect('/login')
  }
  return userId
}

export async function getUser(request: Request) {
  const userId = await getUserId(request)
  if (!userId) return null
  return db.user.findUnique({ where: { id: userId } })
}

export async function logout(request: Request) {
  const session = await getSession(request.headers.get('Cookie'))
  return redirect('/login', {
    headers: {
      'Set-Cookie': await destroySession(session),
    },
  })
}
```

### Pattern 2: OAuth (GitHub)

```ts
// app/services/github-auth.server.ts
import { redirect } from '@remix-run/node'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

export function getGitHubAuthUrl() {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.APP_URL}/auth/github/callback`,
    scope: 'read:user user:email',
  })
  return `https://github.com/login/oauth/authorize?${params}`
}

export async function exchangeGitHubCode(code: string) {
  const tokenResponse = await fetch(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    }
  )

  const { access_token } = await tokenResponse.json()

  const userResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  const user = await userResponse.json()
  return user
}
```

### Pattern 3: Magic Link Auth

```ts
// app/services/magic-link.server.ts
import { createCookieSessionStorage, redirect } from '@remix-run/node'
import { db } from '~/db.server'
import { sendEmail } from '~/services/email.server'

export async function sendMagicLink(email: string) {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min

  await db.magicLink.create({
    data: { email, token, expiresAt },
  })

  const link = `${process.env.APP_URL}/auth/verify?token=${token}`
  await sendEmail({
    to: email,
    subject: 'Your login link',
    text: `Click here to log in: ${link}`,
  })

  return { success: true }
}

export async function verifyMagicLink(token: string) {
  const record = await db.magicLink.findUnique({ where: { token } })

  if (!record || record.expiresAt < new Date()) {
    return { error: 'Invalid or expired link' }
  }

  // Delete used token
  await db.magicLink.delete({ where: { id: record.id } })

  // Find or create user
  let user = await db.user.findUnique({ where: { email: record.email } })
  if (!user) {
    user = await db.user.create({
      data: { email: record.email, name: record.email.split('@')[0] },
    })
  }

  return { userId: user.id }
}
```

## Auth Middleware (Root Loader)

```tsx
// app/root.tsx
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { getUser } from './services/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request)

  return json({
    user,
    ENV: {
      APP_URL: process.env.APP_URL,
    },
  })
}

export default function App() {
  const { user } = useLoaderData<typeof loader>()

  return (
    <html>
      <body>
        <header>
          {user ? (
            <Form action="/logout" method="post">
              <span>{user.name}</span>
              <button type="submit">Logout</button>
            </Form>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </header>
        <Outlet />
      </body>
    </html>
  )
}
```

## Route Protection

### Auth Guard in Loader

```tsx
// app/routes/dashboard.tsx
import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { requireUserId } from '~/services/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)

  const userData = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, preferences: true },
  })

  return json({ userData })
}
```

### Role-Based Access

```tsx
// app/routes/admin.tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (user?.role !== 'admin') {
    throw redirect('/dashboard', {
      headers: {
        'Set-Cookie': await createFlashCookie(request, {
          error: 'Admin access required',
        }),
      },
    })
  }

  return json({})
}
```

### Layout-Level Auth

```tsx
// app/routes/dashboard.layout.tsx — protects ALL /dashboard routes
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request)
  if (!user) throw redirect('/login')

  return json({ user })
}

export default function DashboardLayout() {
  const { user } = useLoaderData<typeof loader>()
  return (
    <div>
      <nav>Dashboard nav for {user.name}</nav>
      <Outlet />
    </div>
  )
}
```

## Flash Messages

```tsx
// app/services/flash.server.ts
import { createCookieSessionStorage } from '@remix-run/node'

const { getSession, commitSession } = createCookieSessionStorage({
  cookie: {
    name: '__flash',
    secrets: [process.env.SESSION_SECRET!],
    httpOnly: true,
    maxAge: 60, // 1 minute max
  },
})

export async function createFlashCookie(
  request: Request,
  flashData: { error?: string; success?: string }
) {
  const session = await getSession(request.headers.get('Cookie'))
  if (flashData.error) session.flash('error', flashData.error)
  if (flashData.success) session.flash('success', flashData.success)
  return await commitSession(session)
}

export async function getFlashData(request: Request) {
  const session = await getSession(request.headers.get('Cookie'))
  return {
    error: session.get('error') as string | undefined,
    success: session.get('success') as string | undefined,
  }
}
```

```tsx
// In root loader
export async function loader({ request }: LoaderFunctionArgs) {
  const flashData = await getFlashData(request)
  return json({ flashData })
}

// In root component
export default function App() {
  const { flashData } = useLoaderData<typeof loader>()

  return (
    <div>
      {flashData.error && <div className="error">{flashData.error}</div>}
      {flashData.success && <div className="success">{flashData.success}</div>}
      <Outlet />
    </div>
  )
}
```

## Session Security

### Cookie Configuration

```ts
const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,      // Not accessible via JS
    secure: true,        // HTTPS only
    sameSite: 'lax',     // CSRF protection
    secrets: [           // Rotate secrets
      process.env.SESSION_SECRET!,
      process.env.OLDER_SESSION_SECRET!,
    ],
    maxAge: 60 * 60 * 24 * 7,  // 1 week
    path: '/',
    domain: 'example.com',      // Scope to domain
  },
})
```

### Secret Rotation

```ts
// Old secret still valid for reading, new secret used for writing
secrets: [
  process.env.NEW_SESSION_SECRET!,
  process.env.OLD_SESSION_SECRET!,
]
```

### Session Regeneration

```ts
// Regenerate session on login to prevent session fixation
export async function regenerateSession(request: Request) {
  const oldSession = await getSession(request.headers.get('Cookie'))
  const newSession = await getSession()

  // Copy data from old session
  for (const key of oldSession.keys()) {
    newSession.set(key, oldSession.get(key))
  }

  return newSession
}
```

### CSRF Protection

```tsx
// app/services/csrf.server.ts
import { createCookie } from '@remix-run/node'

export const csrfCookie = createCookie('csrf-token', {
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
})

export function generateCsrfToken(): string {
  return crypto.randomUUID()
}

export async function validateCsrf(formData: FormData, cookieHeader: string | null) {
  const tokenFromForm = formData.get('csrf')
  const cookieValue = await csrfCookie.parse(cookieHeader)

  return tokenFromForm === cookieValue &&
    typeof tokenFromForm === 'string' &&
    typeof cookieValue === 'string'
}
```

## Session Store Comparison

| Store Type | Where Data Lives | Max Size | Best For |
|------------|-----------------|----------|----------|
| CookieSessionStorage | Cookie | ~4KB | Simple auth, flash messages |
| FileSessionStorage | Disk | Unlimited | Development |
| MemorySessionStorage | RAM | Unlimited | Dev, single-process |
| Cloudflare KV | Edge KV | 25MB per key | Workers |
| Database Session | Your DB | Unlimited | Large sessions |

## Testing Auth

```ts
import { createSessionStorageSession } from '@remix-run/node'
import { createRequest, createResponse } from 'node-mocks-http'

describe('auth', () => {
  it('requires authentication', async () => {
    const request = new Request('http://localhost:3000/dashboard')
    const response = await loader({ request, params: {}, context: {} })

    // Should redirect to login
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/login')
  })

  it('allows authenticated users', async () => {
    const session = await getSession()
    session.set('userId', 'test-user-id')
    const cookie = await commitSession(session)

    const request = new Request('http://localhost:3000/dashboard', {
      headers: { Cookie: cookie },
    })

    const response = await loader({ request, params: {}, context: {} })
    expect(response.status).toBe(200)
  })
})
```

## Summary

| Pattern | Implemented Via | When to Use |
|---------|----------------|-------------|
| Password auth | Bcrypt + session | Standard web apps |
| OAuth | Provider API + session | Social login |
| Magic link | Token + email | Password-less |
| JWT | Sign + verify | API auth, stateless |
| Session cookie | CookieSessionStorage | Most Remix apps |
| Flash messages | Session.flash() | One-time notifications |
| CSRF | Double-submit cookie | Form security |
| Role guard | Loader check | Admin routes |
