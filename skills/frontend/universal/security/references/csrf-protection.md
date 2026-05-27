# CSRF Protection

## Token Generation

```typescript
import crypto from 'node:crypto'

function generateCSRFToken(secret: string, sessionId: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16)
  const payload = `${sessionId}:${timestamp}`
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const token = Buffer.from(`${payload}:${hmac}`).toString('base64')
  return token
}

function validateCSRFToken(
  token: string,
  secret: string,
  sessionId: string,
  maxAgeSeconds = 3600
): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const [sid, timestamp, hmac] = decoded.split(':')
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 16)

    if (age > maxAgeSeconds) return false
    if (sid !== sessionId) return false

    const payload = `${sid}:${timestamp}`
    const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))
  } catch {
    return false
  }
}
```

## Double Submit Cookie Pattern

```typescript
import { Request, Response, NextFunction } from 'express'

function doubleSubmitCookieMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = crypto.randomBytes(32).toString('hex')

  if (!req.cookies['csrf-token']) {
    res.cookie('csrf-token', token, {
      httpOnly: false,
      sameSite: 'strict',
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    })
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const cookieToken = req.cookies['csrf-token']
    const headerToken = req.headers['x-csrf-token'] as string

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'CSRF token mismatch' })
    }
  }

  next()
}
```

## SameSite Cookie Configuration

```typescript
interface SameSiteConfig {
  csrfCookie: {
    name: string
    value: string
    options: {
      httpOnly: boolean
      sameSite: 'strict' | 'lax' | 'none'
      secure: boolean
      path: string
      maxAge: number
    }
  }
  sessionCookie: {
    name: string
    value: string
    options: {
      httpOnly: boolean
      sameSite: 'strict' | 'lax' | 'none'
      secure: boolean
      maxAge: number
    }
  }
}

const sameSiteConfig: SameSiteConfig = {
  csrfCookie: {
    name: 'csrf-token',
    value: crypto.randomUUID(),
    options: {
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 86400,
    },
  },
  sessionCookie: {
    name: 'session',
    value: crypto.randomUUID(),
    options: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400 * 7,
    },
  },
}

function setSecureCookies(res: Response, config: SameSiteConfig): void {
  res.cookie(config.csrfCookie.name, config.csrfCookie.value, config.csrfCookie.options)
  res.cookie(config.sessionCookie.name, config.sessionCookie.value, config.sessionCookie.options)
}
```

## Origin and Referer Header Validation

```typescript
function validateOrigin(
  req: Request,
  allowedOrigins: string[]
): { valid: boolean; reason?: string } {
  const origin = req.headers['origin'] as string | undefined
  const referer = req.headers['referer'] as string | undefined

  if (req.method === 'GET') return { valid: true }

  const source = origin ?? referer

  if (!source) {
    return {
      valid: false,
      reason: 'No origin or referer header present',
    }
  }

  try {
    const url = new URL(source)
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === url.origin) return true
      if (allowed.endsWith('*')) {
        const base = allowed.slice(0, -1)
        return url.origin.startsWith(base)
      }
      return false
    })

    if (!isAllowed) {
      return {
        valid: false,
        reason: `Origin ${url.origin} not in allowed list`,
      }
    }

    return { valid: true }
  } catch {
    return {
      valid: false,
      reason: `Invalid origin URL: ${source}`,
    }
  }
}

const allowedOrigins = [
  'https://example.com',
  'https://*.example.com',
  'https://app.example.com',
]
```

## CSRF Protection for API Endpoints

```typescript
import { createMiddleware } from 'hono/framework'

const csrfProtection = createMiddleware(async (c, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
    const csrfCookie = c.req.cookie('csrf-token')
    const csrfHeader = c.req.header('x-csrf-token')

    if (!csrfCookie || !csrfHeader) {
      return c.json({ error: 'Missing CSRF token' }, 403)
    }

    if (csrfCookie !== csrfHeader) {
      return c.json({ error: 'CSRF token mismatch' }, 403)
    }

    const origin = c.req.header('origin')
    if (origin && !origin.startsWith(process.env.APP_URL!)) {
      return c.json({ error: 'Invalid origin' }, 403)
    }
  }

  await next()
})
```

## Form Integration

```typescript
function CSRFFormField() {
  const [token, setToken] = useState('')

  useEffect(() => {
    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf-token='))
      ?.split('=')[1]

    setToken(cookieToken ?? '')
  }, [])

  return (
    <input type="hidden" name="_csrf" value={token} />
  )
}

async function submitWithCSRF(url: string, data: Record<string, unknown>) {
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1]

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken ?? '',
    },
    body: JSON.stringify(data),
    credentials: 'include',
  })

  return response
}
```

## CSRF Token Rotation

```typescript
function rotateCsrfToken(req: Request, res: Response): void {
  const newToken = crypto.randomBytes(32).toString('hex')

  res.cookie('csrf-token', newToken, {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 86400,
  })

  res.setHeader('X-CSRF-Token', newToken)
}

async function csrfRotationMiddleware(req: Request, res: Response, next: NextFunction) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const validated = await validateCsrfToken(req)

    if (!validated) {
      return res.status(403).json({ error: 'Invalid CSRF token' })
    }

    rotateCsrfToken(req, res)
  }

  next()
}
```

## Key Points

- Always validate CSRF tokens on state-changing requests
- Use SameSite=Strict cookies as the first line of defense
- Implement double-submit cookie pattern for stateless CSRF protection
- Validate Origin and Referer headers as additional checks
- Generate cryptographically random tokens per session
- Rotate CSRF tokens after successful validation
- Set CSRF cookies as HTTP-only where possible
- Use custom request headers for token transmission
- Include CSRF tokens in forms as hidden fields
- Never accept GET requests for state-changing operations
- Set short expiration times on CSRF tokens (1 hour)
- Log and monitor CSRF validation failures
