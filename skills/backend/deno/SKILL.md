---
name: deno
description: >
  Use this skill when building with Deno — TypeScript runtime, Deno Deploy, Fresh framework, Deno std library. This skill enforces: permission-based security, URL import system, std lib usage over npm, Fresh island architecture. Do NOT use for: Node.js projects, Bun projects, browser-only TypeScript.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, deno, phase-10]
---

# Deno

## Purpose
Build secure-by-default TypeScript applications with Deno runtime — permissions model, module system, standard library, Fresh framework, and deployment.

## Agent Protocol

### Trigger
User request includes: `Deno`, `deno deploy`, `deno fresh`, `deno std`, `deno run`, `deno compile`, `deno test`, `deno fmt`, `deno lint`, `deno task`, `deno.json`, `import_map.json`, `TypeScript runtime`, `Fresh framework`, `deno.land`.

### Input Context
- Runtime (Deno, Deno Deploy, self-hosted)
- Framework (Fresh, Oak, Hono, bare)
- Permissions required (net, read, write, env, ff, run)
- Module strategy (deno.land/x, npm, JSR)

### Output Artifact
Project setup, permission flags, module imports, Fresh route structure, deployment config.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Deno.json config with tasks, lint, fmt, permissions
- Import map or deno.json imports configured
- Fresh project structure with routes and islands
- Deno Deploy or Docker deployment config

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Framework Selection: Fresh vs Oak vs Hono vs Bare

| Criterion | Fresh | Oak | Hono | Bare (std/http) |
|-----------|-------|-----|------|-----------------|
| SSR + Islands | Yes (Preact) | No | No | No |
| REST API | Heavy (file-based) | Best | Best | Minimal |
| Edge deployment | Deno Deploy native | Compatible | Compatible | Compatible |
| Middleware model | Route-level | Context pipeline | Express-like | Manual |
| Type safety | Partial | Generic params | Full (TypeBox/Zod) | Manual |
| npm compat | Via JSR | Via JSR | Built-in | Via JSR |

Decision: `routes/` file-based routing → Fresh. REST API w/ middleware → Oak. TypeScript-first w/ validation → Hono. Minimal/single-purpose → std/http.

### Module Import Strategy: deno.land/x vs JSR vs npm

| Source | Pros | Cons | Best For |
|--------|------|------|----------|
| deno.land/x | Native Deno, no conversion | Slower resolution, no semver enforcement | Std lib, Oak, Djwt |
| JSR | Fast resolution, semver, TypeScript native | Smaller registry | Published modules with TS types |
| npm | Largest ecosystem | CJS/ESM conversion overhead, perf cost | Browser compat packages (React, Preact) |

Decision: Std lib → deno.land/x. New TS-first modules → JSR. Only use npm for packages unavailable on JSR/deno.land/x.

### Permission Model Strategy

Minimal permissions per deployment target:
- Deno Deploy: `--allow-net`, `--allow-env` (no fs by default)
- Self-hosted API: `--allow-net --allow-read --allow-env`
- Fresh app: `--allow-net --allow-read --allow-env --allow-write` (dev only)
- Background worker: `--allow-net --allow-read --allow-env`

Never use `-A` in production. Group permissions in deno.json tasks. Use `--deny-*` to explicitly block capabilities.

## Workflow

### Step 1: Project Configuration

```json
// deno.json
{
  "name": "@myapp/api",
  "version": "1.0.0",
  "tasks": {
    "dev": "deno run --watch --allow-net --allow-read --allow-env src/main.ts",
    "start": "deno run --allow-net --allow-read --allow-env src/main.ts",
    "test": "deno test --allow-net --allow-read --allow-env",
    "lint": "deno lint",
    "fmt": "deno fmt",
    "check": "deno check src/main.ts",
    "compile": "deno compile --allow-net --allow-read --allow-env --output dist/api src/main.ts"
  },
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "imports": {
    "std/": "https://deno.land/std@0.220.0/",
    "oak/": "https://deno.land/x/oak@v12.6.2/",
    "hono/": "https://deno.land/x/hono@v4.0.0/",
    "zod/": "https://deno.land/x/zod@v3.22.0/",
    "djwt/": "https://deno.land/x/djwt@v3.0.1/"
  },
  "lint": {
    "rules": {
      "tags": ["recommended"],
      "exclude": ["no-explicit-any"]
    }
  },
  "fmt": {
    "indentWidth": 2,
    "lineWidth": 100,
    "semiColons": true,
    "singleQuote": false
  }
}
```

### Step 2: Oak REST API Setup

```typescript
// src/main.ts
import { Application, Router } from 'oak/mod.ts';
import { oakCors } from 'https://deno.land/x/cors@v1.2.2/mod.ts';
import { logger } from 'std/log/mod.ts';
import { load } from 'std/dotenv/mod.ts';
import { router as userRouter } from './routes/users.ts';
import { errorHandler } from './middleware/error-handler.ts';

const env = await load({ export: true });

const app = new Application();

// Middleware
app.use(oakCors({ origin: env.CORS_ORIGIN || '*' }));
app.use(errorHandler);
app.use(loggerMiddleware);

// Routes
const api = new Router({ prefix: '/api/v1' });
api.use('/users', userRouter.routes(), userRouter.allowedMethods());
app.use(api.routes());
app.use(api.allowedMethods());

// Start
const port = parseInt(env.PORT || '8000');
logger.info(`Server running on http://localhost:${port}`);
await app.listen({ port });
```

```typescript
// src/routes/users.ts
import { Router } from 'oak/mod.ts';
import { userController } from '../controllers/user.controller.ts';

const router = new Router();

router.get('/', userController.list);
router.get('/:id', userController.getById);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.delete('/:id', userController.remove);

export { router };
```

```typescript
// src/middleware/error-handler.ts
import { Context, isHttpError, Status } from 'oak/mod.ts';
import { logger } from 'std/log/mod.ts';

export async function errorHandler(ctx: Context, next: () => Promise<unknown>) {
  try {
    await next();
  } catch (err) {
    if (isHttpError(err)) {
      ctx.response.status = err.status;
      ctx.response.body = {
        success: false,
        error: { code: err.name, message: err.message },
      };
    } else {
      logger.error(`Unhandled error: ${err}`);
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      };
    }
  }
}
```

### Step 3: Hono REST API Pattern (Alternative)

```typescript
// src/main.ts
import { Hono } from 'hono/mod.ts';
import { cors } from 'hono/cors.ts';
import { logger } from 'hono/logger.ts';
import { z } from 'zod/mod.ts';
import { zValidator } from 'hono/zod-validator.ts';

const app = new Hono();

app.use('/*', cors());
app.use('/*', logger());

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

const routes = app
  .get('/users', async (c) => {
    const users = await db.list({ prefix: ['users'] });
    return c.json({ data: users });
  })
  .post('/users', zValidator('json', userSchema), async (c) => {
    const body = await c.req.valid('json');
    const id = crypto.randomUUID();
    await db.set(['users', id], body);
    return c.json({ data: { id, ...body } }, 201);
  })
  .get('/users/:id', async (c) => {
    const id = c.req.param('id');
    const user = await db.get(['users', id]);
    if (!user) return c.json({ error: 'Not found' }, 404);
    return c.json({ data: user });
  });

export default app;

// main entry
Deno.serve(app.fetch);
```

### Step 4: Fresh Project Setup

```bash
deno run -A -r https://fresh.deno.dev my-app
cd my-app
deno task start
```

```
my-app/
  main.ts                       # Entry point
  deno.json                     # Config, tasks, imports
  fresh.config.ts               # Fresh configuration
  fresh.gen.ts                  # Auto-generated routes manifest
  static/
    favicon.ico
  routes/
    _app.tsx                    # App wrapper (layout)
    _layout.tsx                 # Route group layout
    index.tsx                   # GET /
    [slug].tsx                  # Dynamic route
    api/
      users.ts                  # API handler
      users/
        [id].ts                 # /api/users/:id
  islands/
    Counter.tsx                 # Interactive island
    SearchBar.tsx               # Client-side interactivity
  components/
    Button.tsx                  # Shared components
    Layout.tsx
  dev.ts                        # Dev server entry
```

```typescript
// routes/api/users.ts
import { Handlers } from '$fresh/server.ts';
import { db } from '../../db/kv.ts';

export const handler: Handlers = {
  async GET(req, ctx) {
    const users = await db.list({ prefix: ['users'] });
    return new Response(JSON.stringify({ data: users }), {
      headers: { 'content-type': 'application/json' },
    });
  },

  async POST(req, ctx) {
    const body = await req.json();
    const id = crypto.randomUUID();
    await db.set(['users', id], body);
    return new Response(JSON.stringify({ data: { id, ...body } }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  },
};
```

```typescript
// islands/SearchBar.tsx
import { IS_BROWSER } from '$fresh/runtime.ts';
import { useState } from 'preact/hooks';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);

  const search = async () => {
    const res = await fetch(`/api/search?q=${query}`);
    const data = await res.json();
    setResults(data.results);
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' && search()}
        placeholder='Search...'
      />
      <ul>
        {results.map((r) => <li key={r}>{r}</li>)}
      </ul>
    </div>
  );
}
```

### Step 5: Deno KV for State

```typescript
// db/kv.ts
const kv = await Deno.openKv();

export async function saveUser(user: User) {
  const key = ['users', user.id];
  const res = await kv.set(key, user);
  return res.ok;
}

export async function getUser(id: string) {
  const res = await kv.get(['users', id]);
  return res.value as User | null;
}

export async function listUsers() {
  const iter = kv.list({ prefix: ['users'] });
  const users: User[] = [];
  for await (const entry of iter) {
    users.push(entry.value as User);
  }
  return users;
}
```

### Step 6: Testing Patterns

```typescript
// tests/app_test.ts
import { assertEquals, assertExists } from 'std/testing/asserts.ts';
import { createApp } from '../src/app.ts';

Deno.test('GET /health returns 200', async () => {
  const app = createApp();
  const listener = app.listen({ port: 0 });
  const { port } = await listener;
  const res = await fetch(`http://localhost:${port}/health`);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.status, 'ok');
  listener.close();
});

Deno.test('POST /users validates input', async () => {
  const app = createApp();
  const listener = app.listen({ port: 0 });
  const { port } = await listener;
  const res = await fetch(`http://localhost:${port}/api/v1/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '' }),
  });
  assertEquals(res.status, 400);
  listener.close();
});
```

### Step 7: Deployment Configuration

```yaml
# Dockerfile — self-hosted
FROM denoland/deno:alpine-2.0.2
WORKDIR /app
COPY deno.json .
COPY src/ src/
RUN deno cache src/main.ts
EXPOSE 8000
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "src/main.ts"]
```

```yaml
# deno Deploy — project config
# Set in deno deploy dashboard or via deployctl
name: my-api
entrypoint: src/main.ts
include: src/
env:
  - name: PORT
    value: "8080"
  - name: LOG_LEVEL
    value: "info"
```

## Implementation Patterns

### Pattern: Typed State with Oak Context

```typescript
interface AppState {
  userId: string;
  role: string;
  requestId: string;
}

const app = new Application<AppState>();

// Set state via middleware
app.use(async (ctx, next) => {
  ctx.state.userId = '...';
  ctx.state.role = 'admin';
  ctx.state.requestId = crypto.randomUUID();
  await next();
});

// Access in controller
async function listOrders(ctx: RouterContext<'/', AppState>) {
  const userId = ctx.state.userId;
  const orders = await orderService.findByUser(userId);
  ctx.response.body = orders;
}
```

### Pattern: Composable Middleware

```typescript
// src/middleware/compose.ts
type Middleware = (ctx: Context, next: () => Promise<unknown>) => Promise<unknown>;

export function compose(...middleware: Middleware[]): Middleware {
  return async (ctx, next) => {
    let index = -1;
    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;
      const fn = middleware[i] || next;
      if (fn) await fn(ctx, () => dispatch(i + 1));
    };
    await dispatch(0);
  };
}
```

### Pattern: Structured Logger

```typescript
// src/shared/logger.ts
import { getLogger, setup } from 'std/log/mod.ts';

await setup({
  handlers: {
    console: new ConsoleHandler('DEBUG', {
      formatter: (r) => JSON.stringify({
        level: r.levelName,
        msg: r.msg,
        time: r.datetime.toISOString(),
        logger: r.loggerName,
        ...r.args[0],
      }),
    }),
  },
  loggers: {
    default: { level: 'DEBUG', handlers: ['console'] },
  },
});

export const logger = getLogger();
```

## Production Considerations

### Permission Hardening
- Audit permissions with `deno info --json` to list all used URLs and files
- Use `--deny-env=AWS_SECRET_KEY` to block specific dangerous env access
- In Docker, run as non-root user: `USER deno` after copy
- For Fresh, only require `--allow-net --allow-read --allow-env`

### Module Pinning and Integrity
- Pin versions in deno.json imports: use `@v1.2.3` not `@latest`
- Add integrity checks via `--check=all` in CI
- Run `deno cache --lock=lock.json --lock-write` to generate lockfile
- Commit lock.json and verify in CI with `deno cache --lock=lock.json`

### Performance Tuning
- Use `std/http` for max throughput (no framework overhead)
- Oak adds ~5-10% overhead vs bare std/http
- Hono benchmarks near std/http for simple routes
- Enable `--v8-flags=--max-old-space-size=512` for memory limits
- Use `Deno.serve` (Deno 2) instead of `std/http` server

### Cold Start Optimization (Deno Deploy)
- Minimize top-level await — use lazy imports
- Keep bundle under 1MB
- Use static file serving from `static/` not computed
- Avoid dynamic imports in hot paths

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| `-A` in production | Grants all permissions | List exact `--allow-*` flags |
| Raw URLs in source | Version drift, no caching | Use import map in deno.json |
| npm-only packages | Performance penalty | Prefer deno.land/x or JSR |
| `std/node` polyfill | Slows startup, compatibility bugs | Use Deno-native APIs |
| `init()` pattern | No lifecycle guarantee | Use explicit setup in main.ts |
| Dynamic import for routes (non-Fresh) | Hurts tree-shaking, cold start | Static import with barrel file |
| Relying on `self` global | Not in strict mode | Use `globalThis` |

## Security Considerations

- Deno's permission system is the primary security boundary — never bypass with `--allow-all`
- Validate Origin headers in CORS middleware: `oakCors({ origin: /^https:\/\/myapp\.com$/ })` over `'*'`
- Use `djwt` for JWT — verify algorithm is `HS256` or `RS256`, never `none`
- Rate limiting via `oak-rate-limit` or manual IP tracking in Deno KV
- Input validation with Zod at the boundary — never trust raw `ctx.request.body`
- SQL injection prevention: use parameterized queries via `deno_postgres` or `deno_mongo`
- Content-Type sniffing protection: set `X-Content-Type-Options: nosniff`
- Secrets via environment variables only, never hardcoded

## Testing Strategies

### Unit Tests
```typescript
Deno.test('user validation - rejects short names', () => {
  const result = validateUser({ name: 'A' });
  assertEquals(result.success, false);
  assertExists(result.error);
});
```

### Integration Tests with KV
```typescript
Deno.test('CRUD operations against KV', async () => {
  const kv = await Deno.openKv(':memory:');
  try {
    await kv.set(['users', '1'], { name: 'Test' });
    const res = await kv.get(['users', '1']);
    assertEquals(res.value, { name: 'Test' });
  } finally {
    kv.close();
  }
});
```

Load test with `autocannon` or `wrk` against the compiled binary. Use `deno bench` for microbenchmarks.

## Rules
- Always specify minimum permissions with `--allow-*` flags. Never use `-A` in production.
- Use deno.land/x or JSR imports via deno.json import map. Avoid raw URLs in source files.
- Standard library (std/) preferred over npm equivalents (std/http, std/log, std/testing).
- Fresh islands for client-side interactivity. Preact components for server-only rendering.
- Deno KV for simple state, PostgreSQL driver for complex persistence.
- deno fmt and deno lint in CI. Check before commit.
- Compile binaries with `deno compile` for Docker-less deployment.
- All env vars loaded via `std/dotenv` in dev, env vars in production.
- Generate lockfile: `deno cache --lock=lock.json --lock-write`.
- Type `AppState` in Application constructor for type-safe context.

## References
  - references/deno-advanced.md — Deno Advanced Topics
  - references/deno-deployment.md — Deno Deployment
  - references/deno-essentials.md — Deno Essentials
  - references/deno-fundamentals.md — Deno Fundamentals
  - references/deno-runtime.md — Deno Runtime Deep Dive
  - references/fresh-framework.md — Fresh Framework
## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response formatting or backend-testing skill for test patterns.
