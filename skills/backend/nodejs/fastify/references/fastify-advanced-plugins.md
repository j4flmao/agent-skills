# Fastify Advanced Plugin Patterns

## Plugin System Architecture

```
Application Instance
  └── register(cors)       — root-level plugin
  └── register(auth)       — root-level plugin
  └── register(orders, { prefix: '/api/orders' })
        └── Plugin Encapsulation Context
              ├── schema validator
              ├── serializer
              ├── decorators
              ├── hooks
              └── routes
```

## Decorators

```typescript
import { FastifyInstance } from 'fastify'

// Decorating the instance
export async function dbPlugin(app: FastifyInstance) {
  app.decorate('db', {
    async findUser(id: string) {
      return await queryDatabase(id)
    },
    async saveUser(user: User) {
      return await insertDatabase(user)
    },
  })
}

// Decorating the request
app.decorateRequest('user', null)
app.addHook('preHandler', async (request) => {
  request.user = await authenticate(request)
})

// Decorating the reply
app.decorateReply('success', function (data: unknown) {
  this.status(200).send({ success: true, data })
})
```

## Hooks

| Hook | Purpose | Timing |
|------|---------|--------|
| onRequest | Security headers, request ID | First |
| preParsing | Body parsing customization | Second |
| preValidation | Auth check before validation | Third |
| preHandler | Rate limiting, audit | Fourth |
| onSend | Response transformation | Before send |
| onResponse | Metrics, cleanup | After send |
| onError | Error handling | On error |
| onReady | Start checks | Before listen |
| onClose | Cleanup | On close |

### Encapsulated Hooks
```typescript
app.register(async function scopedPlugin(app) {
  // This hook only applies within this encapsulation context
  app.addHook('onRequest', async (request, reply) => {
    // Only runs for routes registered in this plugin
    console.log(`Scoped request: ${request.url}`)
  })

  app.get('/protected', async () => ({ status: 'protected' }))
})

app.get('/public', async () => ({ status: 'public' }))
// onRequest hook above does NOT run for /public
```

## Plugin Encapsulation

```typescript
import fp from 'fastify-plugin'

// Using fastify-plugin BREAKS encapsulation (shared across parents)
export const sharedPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('sharedUtil', {
    formatResponse: (data: unknown) => ({ success: true, data }),
  })
}, {
  name: 'shared-plugin',
  dependencies: ['config-plugin'],
})
```

## Plugin Dependencies

| Pattern | Declaration | Behavior |
|---------|-------------|----------|
| No dependency | Plain register | Independent |
| Soft dependency | fp with dependencies array | Verified at runtime |
| Hard dependency | Decorator check in hook | Custom error on missing |

```typescript
export const dependentPlugin = fp(async (app) => {
  if (!app.hasDecorator('db')) {
    throw new Error('db-plugin must be registered first')
  }
  // Safe to use app.db here
}, {
  name: 'dependent-plugin',
  dependencies: ['db-plugin'],
})
```
