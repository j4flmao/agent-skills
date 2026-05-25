# SvelteKit Auth & Security Patterns

## Authentication

### Session Setup

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

const authHandle: Handle = async ({ event, resolve }) => {
  const session = event.cookies.get('session')
  event.locals.user = session
    ? await db.user.findUnique({ where: { session }, select: { id: true, name: true, role: true } })
    : null
  return resolve(event)
}

export const handle = sequence(authHandle)
```

### Login Action

```typescript
// src/routes/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit'
import bcrypt from 'bcrypt'

export const actions = {
  default: async ({ cookies, request }) => {
    const data = await request.formData()
    const email = data.get('email') as string
    const password = data.get('password') as string

    const user = await db.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return fail(401, { error: 'Invalid credentials' })
    }

    const session = crypto.randomUUID()
    await db.user.update({ where: { id: user.id }, data: { session } })
    cookies.set('session', session, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 })

    redirect(303, '/dashboard')
  },
}
```

## Protected Routes

```typescript
// src/routes/(authenticated)/+layout.server.ts
import { redirect } from '@sveltejs/kit'

export const load = async ({ locals }) => {
  if (!locals.user) redirect(302, '/login')
  return { user: locals.user }
}
```

## API Endpoints (+server.ts)

```typescript
// src/routes/api/orders/+server.ts
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 })

  const page = Number(url.searchParams.get('page')) || 1
  const orders = await db.order.findMany({ where: { userId: locals.user.id }, skip: (page - 1) * 20, take: 20 })

  return json(orders)
}

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const order = await db.order.create({ data: { ...body, userId: locals.user.id } })

  return json(order, { status: 201 })
}
```

## CSRF Protection

```svelte
<script>
  import { enhance } from '$app/forms'
  let { form } = $props()
</script>

<form method="post" use:enhance>
  <input name="name" required />
  <button>Submit</button>
</form>
```

## CSP Headers

```typescript
// src/hooks.server.ts
export const handle = async ({ event, resolve }) => {
  const response = await resolve(event)
  response.headers.set('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  )
  return response
}
```

## Rate Limiting

```typescript
// src/lib/server/rate-limit.ts
const requests = new Map<string, number[]>()

export function checkRateLimit(ip: string, max = 10, window = 60000) {
  const now = Date.now()
  const timestamps = (requests.get(ip) || []).filter(t => now - t < window)
  timestamps.push(now)
  requests.set(ip, timestamps)
  return timestamps.length <= max
}
```
