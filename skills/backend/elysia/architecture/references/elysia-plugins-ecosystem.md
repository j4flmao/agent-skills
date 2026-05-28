# Elysia Plugin Ecosystem

## Overview

ElysiaJS provides a rich plugin system that enables modular application composition. Unlike Express middleware or Fastify plugins, Elysia plugins are first-class Elysia instances that can encapsulate routes, state, hooks, and schemas. This reference covers the full plugin ecosystem including official plugins, community plugins, custom plugin development patterns, and advanced composition strategies.

## Plugin Architecture Fundamentals

### What Is an Elysia Plugin

An Elysia plugin is simply an instance of the Elysia class with configured routes, hooks, state, or decorators. When applied with `.use()`, the plugin's configuration merges into the parent application. This differs from Express middleware which operates on individual requests, and Fastify plugins which operate in encapsulated contexts.

```typescript
import { Elysia } from 'elysia';

// A plugin is just an Elysia instance
export const authPlugin = new Elysia({ name: 'auth' })
  .state('currentUser', null as User | null)
  .derive(({ headers }) => {
    const token = headers.authorization?.split(' ')[1];
    return { token };
  })
  .macro(({ onBeforeHandle }) => ({
    isAuthenticated(): void {
      onBeforeHandle(({ store: { currentUser }, error }) => {
        if (!currentUser) return error(401, 'Unauthorized');
      });
    }
  }));
```

### Plugin Name and Deduplication

Each plugin should have a unique `name` property. Elysia uses names to prevent duplicate plugin registration. If a plugin with the same name is registered twice, the second registration is ignored.

```typescript
const logger = new Elysia({ name: 'logger' }).onRequest(({ request }) => {
  console.log(`${request.method} ${request.url}`);
});

app.use(logger); // registered
app.use(logger); // skipped — duplicate name
```

### Plugin Scoping

Plugins can be scoped to specific route groups using `.guard()` or by applying `.use()` on a child group rather than the root app.

```typescript
// Global plugin
app.use(cors());

// Admin-only plugin
app.group('/admin', (group) =>
  group.use(adminGuard).get('/users', () => adminService.listUsers())
);
```

## Official Plugins

### @elysiajs/cors

Configures Cross-Origin Resource Sharing headers. Supports origin whitelist, credentials, exposed headers, and preflight handling.

```typescript
import { cors } from '@elysiajs/cors';

app.use(cors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-Response-Time'],
  credentials: true,
  maxAge: 86400
}));
```

Configuration options:
- `origin`: string, RegExp, Array<string | RegExp>, or boolean. Set `true` to reflect request origin.
- `methods`: Array of allowed HTTP methods. Defaults to all methods.
- `allowedHeaders`: Array of allowed request headers.
- `exposedHeaders`: Array of headers exposed to the browser.
- `credentials`: boolean for Access-Control-Allow-Credentials.
- `maxAge`: seconds for Access-Control-Max-Age.
- `preflight`: boolean to enable/disable OPTIONS preflight handling.

### @elysiajs/swagger

Generates OpenAPI 3.0 documentation from route definitions and validation schemas. Uses Elysia t types to infer request and response schemas.

```typescript
import { swagger } from '@elysiajs/swagger';

app.use(swagger({
  path: '/docs',
  excludeStaticFile: false,
  documentation: {
    info: {
      title: 'Order Management API',
      version: '1.0.0',
      description: 'API for managing customer orders'
    },
    tags: [
      { name: 'Orders', description: 'Order management endpoints' },
      { name: 'Users', description: 'User management endpoints' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  }
}));
```

Schema generation features:
- Automatically extracts request body, params, query, and response schemas from `t.Object` definitions.
- Supports `detail` option on routes for tags, summary, description, deprecated, externalDocs.
- Generates JSON and YAML output at `/docs/json` and `/docs/yaml`.
- Provides Swagger UI at the configured path.

### @elysiajs/static

Serves static files from a directory. Supports caching, directory listing, and prefix paths.

```typescript
import { staticPlugin } from '@elysiajs/static';

app.use(staticPlugin({
  assets: 'public',
  prefix: '/static',
  maxAge: 86400,
  indexHTML: true
}));
```

Configuration:
- `assets`: directory path relative to project root.
- `prefix`: URL path prefix for static files.
- `maxAge`: Cache-Control max-age in seconds.
- `indexHTML`: serve index.html for directory requests (SPA support).
- `alwaysStatic`: serve file content regardless of request method.
- `noCache`: disable caching headers.

### @elysiajs/websocket

Adds WebSocket support to Elysia. Uses `ws` package internally. Supports room-based broadcasting and message validation.

```typescript
import { websocket } from '@elysiajs/websocket';

app.use(websocket());

app.ws('/ws/chat', {
  message(ws, message) {
    const room = ws.data.room || 'general';
    ws.send({ type: 'echo', data: message });
    ws.publish(room, { type: 'broadcast', data: message, from: ws.data.userId });
  },
  open(ws) {
    ws.subscribe('general');
    ws.data.room = 'general';
  },
  close(ws) {
    ws.unsubscribe('general');
  }
});
```

Message validation with Elysia t:

```typescript
app.ws('/ws/chat', {
  body: t.Object({
    type: t.String(),
    content: t.String({ maxLength: 1000 }),
    room: t.Optional(t.String())
  }),
  message(ws, { body }) {
    ws.publish(body.room || 'general', body);
  }
});
```

### @elysiajs/eden

Provides full-stack type safety by generating a client from the Elysia app type. The Eden client mirrors the server routes with complete TypeScript inference.

```typescript
// Server
const app = new Elysia()
  .post('/orders', ({ body }: { body: CreateOrder }) => orderService.create(body), {
    body: t.Object({
      customerId: t.String(),
      items: t.Array(t.Object({ productId: t.String(), quantity: t.Number() }))
    })
  });

export type App = typeof app;

// Client
import { edenTreaty } from '@elysiajs/eden';
import type { App } from './server';

const client = edenTreaty<App>('http://localhost:3000');

const { data, error } = await client.orders.post({
  customerId: '123',
  items: [{ productId: '456', quantity: 2 }]
});
// data is fully typed based on server response schema
// error is typed based on server error responses
```

Eden Treaty features:
- Full type inference for request body, params, query, and response.
- Error types inferred from server's error responses.
- Supports all HTTP methods.
- Path parameters are inferred from route patterns.
- Query parameters inferred from schema definitions.
- Works in both Node.js and browser environments.

### @elysiajs/trpc

Integrates tRPC routers into Elysia applications. Allows sharing tRPC procedures alongside traditional REST routes.

```typescript
import { trpc } from '@elysiajs/trpc';
import { initTRPC } from '@trpc/server';

const t = initTRPC.create();
const router = t.router({
  greeting: t.procedure.input(t.string()).query(({ input }) => `Hello ${input}`)
});

app.use(trpc(router));
```

### @elysiajs/server-timing

Adds Server-Timing headers for performance monitoring. Useful for measuring request processing time across lifecycle hooks.

```typescript
import { serverTiming } from '@elysiajs/server-timing';

app.use(serverTiming());

app.get('/slow', ({ serverTiming }) => {
  serverTiming.start('db-query');
  // ... database operation
  serverTiming.end('db-query');
  return { done: true };
});
```

## Community Plugins

### elysia-jwt

JWT authentication and verification. Supports HS256, RS256, ES256 algorithms.

```typescript
import { jwt } from '@elysiajs/jwt';

app.use(jwt({
  name: 'jwt',
  secret: process.env.JWT_SECRET!,
  algorithm: 'HS256',
  exp: '7d'
}));

app.post('/login', async ({ body, jwt }) => {
  const token = await jwt.sign({ userId: body.userId, role: body.role });
  return { token };
});

app.get('/profile', async ({ jwt, headers, error }) => {
  const token = headers.authorization?.split(' ')[1];
  if (!token) return error(401);
  const payload = await jwt.verify(token);
  if (!payload) return error(401);
  return payload;
});
```

JWT plugin configuration:
- `name`: property name to inject (default: `jwt`).
- `secret`: signing key or JWKS URI.
- `algorithm`: HS256 | HS384 | HS512 | RS256 | RS384 | RS512 | ES256 | ES384 | ES512.
- `exp`: token expiration string (e.g., `15m`, `7d`, `1y`).
- `iss`: issuer claim.
- `aud`: audience claim.
- `sub`: subject claim.

### elysia-rate-limit

Request rate limiting with in-memory or Redis backends.

```typescript
import { rateLimit } from 'elysia-rate-limit';

app.use(rateLimit({
  duration: 60000,
  max: 100,
  errorResponse: { success: false, error: 'Rate limit exceeded' },
  headers: true,
  generator: (req) => req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
}));

// Scoped rate limit for auth endpoints
app.group('/auth', (group) =>
  group.use(rateLimit({
    duration: 60000,
    max: 5,
    generator: (req) => req.headers.get('x-forwarded-for') || 'unknown'
  }))
);
```

Rate limit strategies:
- Fixed window: resets counter at window boundary. Simple but can allow bursts at boundary.
- Sliding window: more accurate, prevents boundary bursts. Higher memory usage.
- Token bucket: allows bursts up to bucket size, then refills at rate. Best for API gateways.
- Redis backend: shared state across multiple instances for distributed rate limiting.

### elysia-compression

Response compression using Brotli, Gzip, or Deflate.

```typescript
import { compression } from 'elysia-compression';

app.use(compression({
  threshold: 1024,
  brotli: true,
  gzip: true,
  deflate: false,
  encodingPriority: ['br', 'gzip', 'deflate']
}));
```

Configuration:
- `threshold`: minimum response size in bytes before compression is applied.
- `brotli`: enable Brotli compression.
- `gzip`: enable Gzip compression.
- `deflate`: enable Deflate compression.
- `encodingPriority`: order of preference for content encoding negotiation.

### elysia-helmet

Security headers middleware. Sets various HTTP headers for security hardening.

```typescript
import { helmet } from 'elysia-helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));
```

Security headers set by default:
- Content-Security-Policy
- X-Frame-Options (DENY)
- X-Content-Type-Options (nosniff)
- Strict-Transport-Security
- X-XSS-Protection (0)
- Referrer-Policy
- Permissions-Policy
- Cross-Origin-Embedder-Policy
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy

### elysia-cookie

Cookie parsing and serialization. Supports signed cookies and cookie options.

```typescript
import { cookie } from '@elysiajs/cookie';

app.use(cookie());

app.get('/set-cookie', ({ cookie }) => {
  cookie.session.value = 'abc123';
  cookie.session.httpOnly = true;
  cookie.session.secure = true;
  cookie.session.sameSite = 'lax';
  cookie.session.maxAge = 3600;
  cookie.session.path = '/';
  return { success: true };
});

app.get('/get-cookie', ({ cookie }) => {
  return { sessionId: cookie.session.value };
});
```

### elysia-autoload

Automatic route registration by scanning the filesystem. Follows file-based routing conventions.

```typescript
import { autoload } from 'elysia-autoload';

const app = new Elysia();
await app.use(autoload({ directory: './src/routes' }));
app.listen(3000);
```

File-based routing conventions:
- `src/routes/users/index.ts` -> GET /users
- `src/routes/users/[id].ts` -> GET /users/:id
- `src/routes/users/[id]/orders.ts` -> GET /users/:id/orders
- `src/routes/login.post.ts` -> POST /login
- Export named functions for HTTP methods: `get`, `post`, `put`, `delete`, `patch`.

## Custom Plugin Development

### Plugin Structure Conventions

A well-structured Elysia plugin follows naming conventions and provides clear documentation.

```typescript
import { Elysia } from 'elysia';

export interface PluginOptions {
  prefix?: string;
  secret: string;
  expiresIn?: string;
  customClaims?: Record<string, unknown>;
}

// Plugin default configuration
const defaultOptions: Partial<PluginOptions> = {
  expiresIn: '1h',
  prefix: '/auth'
};

export const authPlugin = (options: PluginOptions) => {
  const config = { ...defaultOptions, ...options };

  return new Elysia({ name: 'auth-plugin' })
    .state('authConfig', config)
    .decorate('auth', {
      sign(payload: Record<string, unknown>): string {
        return signJWT(payload, config.secret, config.expiresIn!);
      },
      verify(token: string): Record<string, unknown> | null {
        return verifyJWT(token, config.secret);
      }
    })
    .macro(({ onBeforeHandle }) => ({
      auth(role?: string): void {
        onBeforeHandle(async ({ decorate: { auth }, headers, error }) => {
          const token = headers.authorization?.split(' ')[1];
          if (!token) return error(401, 'Missing token');
          const payload = auth.verify(token);
          if (!payload) return error(401, 'Invalid token');
          if (role && payload.role !== role) return error(403, 'Insufficient permissions');
        });
      }
    }));
};
```

### Plugin with Configuration Validation

Validate plugin options at registration time, not at request time.

```typescript
import { Elysia, t } from 'elysia';

const pluginConfigSchema = t.Object({
  secret: t.String({ minLength: 32 }),
  expiresIn: t.Optional(t.String({ pattern: '^[0-9]+(s|m|h|d|y)$' })),
  refreshEnabled: t.Optional(t.Boolean()),
  maxTokens: t.Optional(t.Number({ minimum: 1, maximum: 10 }))
});

export const secureAuthPlugin = (options: Partial<typeof pluginConfigSchema.static>) => {
  const { data: config, errors } = pluginConfigSchema.validate(options);
  if (errors) {
    throw new Error(`Invalid plugin configuration: ${errors.map(e => e.message).join(', ')}`);
  }
  // ... plugin implementation with validated config
};
```

### Plugin with Lifecycle Hooks

Custom lifecycle hooks allow plugins to hook into every request phase.

```typescript
export const requestLoggerPlugin = (options?: { slowThreshold?: number }) => {
  const threshold = options?.slowThreshold ?? 1000;

  return new Elysia({ name: 'request-logger' })
    .state('requestCount', 0)
    .onRequest(({ request, store }) => {
      store.requestCount++;
      (request as any).__startTime = performance.now();
    })
    .onResponse(({ request, set }) => {
      const startTime = (request as any).__startTime;
      const duration = performance.now() - startTime;
      const level = duration > threshold ? 'WARN' : 'INFO';
      console.log(`[${level}] ${request.method} ${request.url} ${set.status} ${duration.toFixed(2)}ms`);
    })
    .onError(({ request, error }) => {
      const startTime = (request as any).__startTime;
      const duration = startTime ? performance.now() - startTime : 0;
      console.error(`[ERROR] ${request.method} ${request.url} ${error} ${duration.toFixed(2)}ms`);
    });
};
```

### Plugin with Macro System

Macros provide a DSL for route definitions. They run at route registration time and transform route configuration.

```typescript
export const permissionPlugin = new Elysia({ name: 'permissions' })
  .macro(({ onBeforeHandle }) => ({
    /**
     * Macro: `.permission('admin')` on a route
     * Injects beforeHandle check for user permissions
     */
    permission(requiredPerm: string): void {
      onBeforeHandle(({ headers, error }) => {
        const userPerms = JSON.parse(headers['x-permissions'] || '[]');
        if (!userPerms.includes(requiredPerm)) {
          return error(403, `Permission '${requiredPerm}' required`);
        }
      });
    }
  }));

// Usage
app.group('/admin', (group) =>
  group.use(permissionPlugin).get('/users', () => User.list(), {
    permission: 'users:read'
  })
);
```

### Testing Plugins

Test plugins in isolation by creating a minimal app instance and verifying behavior.

```typescript
import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { authPlugin } from './auth-plugin';

describe('auth-plugin', () => {
  it('rejects unauthenticated requests', async () => {
    const app = new Elysia()
      .use(authPlugin({ secret: 'test-secret-32-chars-minimum!!' }))
      .get('/protected', () => 'ok', { auth: true });

    const res = await app.handle(new Request('http://localhost/protected'));
    expect(res.status).toBe(401);
  });

  it('accepts valid tokens', async () => {
    const secret = 'test-secret-32-chars-minimum!!';
    const app = new Elysia()
      .use(authPlugin({ secret }))
      .get('/protected', () => 'ok', { auth: true });

    const token = await createTestJWT({ userId: 'test', role: 'user' }, secret);
    const res = await app.handle(
      new Request('http://localhost/protected', {
        headers: { Authorization: `Bearer ${token}` }
      })
    );
    expect(res.status).toBe(200);
  });
});
```

### Publishing Plugins to npm

Package naming convention: `elysia-<feature>` or `@<scope>/elysia-<feature>`.

```json
{
  "name": "elysia-rate-limit",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "prepublish": "bun run build"
  },
  "peerDependencies": {
    "elysia": ">=1.0.0"
  },
  "keywords": ["elysia", "plugin", "rate-limit"],
  "license": "MIT"
}
```

Publishing checklist:
- Set `type: "module"` in package.json.
- Build to `dist/` with TypeScript declarations.
- Declare `elysia` as a peer dependency, not a direct dependency.
- Add `files: ["dist"]` to publish only compiled output.
- Use `name: "elysia-<feature>"` for discoverability.
- Add comprehensive `keywords` for npm search.
- Include README with installation, usage, and API documentation.
- Add `repository`, `homepage`, and `bugs` URLs.

## Advanced Plugin Patterns

### Plugin Composition (Plugin-of-Plugins)

Combine multiple related plugins into a single meta-plugin.

```typescript
export const securityPlugin = (options: SecurityOptions) => {
  return new Elysia({ name: 'security' })
    .use(cors(options.cors))
    .use(helmet(options.helmet))
    .use(rateLimit(options.rateLimit))
    .use(jwt(options.jwt));
};

// Single registration
app.use(securityPlugin({
  cors: { origin: ['https://app.example.com'] },
  helmet: {},
  rateLimit: { max: 100, duration: 60000 },
  jwt: { secret: process.env.JWT_SECRET! }
}));
```

### Conditional Plugin Loading

Load plugins based on environment or configuration.

```typescript
function loadPlugins(app: Elysia, env: string): Elysia {
  if (env === 'development') {
    app.use(swagger({ path: '/docs' }));
    app.use(serverTiming());
  }

  if (env === 'production') {
    app.use(compression({ threshold: 1024 }));
    app.use(helmet());
  }

  app.use(cors({ origin: env === 'production' ? ['https://app.com'] : ['*'] }));
  app.use(rateLimit({ max: env === 'production' ? 100 : 1000 }));

  return app;
}
```

### Plugin Dependency Resolution

When plugins depend on each other, manage the dependency chain explicitly.

```typescript
// Core plugin provides shared config
const configPlugin = new Elysia({ name: 'config' })
  .state('config', loadConfig())
  .decorate('getConfig', () => loadConfig());

// Auth plugin depends on config
const authPlugin = new Elysia({ name: 'auth' })
  .use(configPlugin)   // declaration: auth requires config
  .derive(({ store: { config } }) => ({ auth: createAuth(config) }));

// Routes depend on auth
const app = new Elysia()
  .use(authPlugin)
  .get('/protected', () => 'ok', { auth: true });
```

Elysia resolves dependencies automatically by checking plugin names. A plugin that references another plugin's state or decorator will throw at registration time if the dependency is missing.

### Plugin Hot Reload Support

For development environments, support hot reload by providing a cleanup mechanism.

```typescript
export const hotReloadPlugin = (module: () => Promise<Elysia>) => {
  let currentApp: Elysia | null = null;

  return new Elysia({ name: 'hot-reload' })
    .onStart(async () => {
      currentApp = await module();
      currentApp?.listen(3000);
    })
    .onStop(() => {
      currentApp?.stop();
      currentApp = null;
    });
};
```

## Plugin Performance Considerations

- Each `.use()` call adds minimal overhead at registration time, not at request time.
- Plugin name deduplication prevents re-registration overhead.
- Macro evaluation happens at route registration, not per request, making macros essentially free at runtime.
- State and decorator injection happens once per request, but state merge operations are O(n) where n is the number of plugins.
- For high-traffic routes, prefer direct property access over derive functions.
- Plugin encapsulation depth affects memory usage. Deeply nested plugin trees increase object graph size.
- Dynamic plugin loading with `app.use()` after app has started may cause race conditions. Load all plugins before `.listen()`.

## Debugging Plugin Issues

Common plugin debugging techniques:

- Enable verbose logging: `Elysia({ name: 'app', verbose: true })`.
- Check plugin registration order: plugins registered later override properties from earlier plugins.
- Verify plugin names to detect naming conflicts.
- Use TypeScript strict mode to catch type inference issues across plugin boundaries.
- Test plugins in isolation with `bun:test` before integrating into the main app.
- Check `.state` and `.decorate` namespaces for conflicts between plugins.

## Plugin Ecosystem Decision Matrix

| Plugin | Category | Official | npm Popularity | Bundle Size |
|--------|----------|----------|----------------|-------------|
| @elysiajs/cors | Security | Yes | High | 2KB |
| @elysiajs/swagger | Documentation | Yes | High | 15KB |
| @elysiajs/static | Static Files | Yes | Medium | 3KB |
| @elysiajs/websocket | Real-time | Yes | Medium | 10KB |
| @elysiajs/eden | Client SDK | Yes | High | 5KB |
| @elysiajs/jwt | Auth | Yes | High | 8KB |
| @elysiajs/cookie | Session | Yes | Medium | 2KB |
| @elysiajs/server-timing | Monitoring | Yes | Low | 1KB |
| @elysiajs/trpc | Integration | Yes | Low | 4KB |
| elysia-rate-limit | Security | No | Medium | 6KB |
| elysia-compression | Performance | No | Low | 3KB |
| elysia-helmet | Security | No | Low | 8KB |
| elysia-autoload | DX | No | Low | 2KB |

## Plugin Migration Guide (Express to Elysia)

| Express Concept | Elysia Equivalent |
|-----------------|-------------------|
| `app.use(middleware)` | `app.onRequest(handler)` |
| `router.get('/path', handler)` | `app.get('/path', handler)` |
| `app.use('/prefix', router)` | `app.group('/prefix', (g) => g.use(plugin))` |
| `req.user` (property injection) | `app.derive(({ ... }) => ({ user }))` |
| `next(err)` | Return error from hook or throw |
| `res.json(data)` | Return value from handler |
| `app.set('view engine', ...)` | Not supported (API-first) |
| `helmet()` middleware | `elysia-helmet` plugin |
| `cors()` middleware | `@elysiajs/cors` plugin |

## Version Compatibility

| Elysia Version | Plugin API Changes |
|----------------|-------------------|
| 0.1.x - 0.3.x | Initial plugin system, `.use()` for global only |
| 0.4.x - 0.6.x | Added `.group()` with scoped plugins |
| 0.7.x - 0.8.x | Plugin macros introduced |
| 1.0.x - 1.1.x | Stable API, `.name` deduplication, Eden Treaty |
| 1.2.x | Decorator resolution, improved type inference |
| 1.3.x+ | Enhanced macro system, plugin dependencies |
