---
name: deno
description: >
  Use this skill when the user says 'deno', 'deno 2', 'deno.json', 'deno task', 'deno compile', 'deno test', 'Deno.serve', 'Deno KV', 'JSR', 'deno permissions', 'Fresh framework'. Builds Deno 2 backends: project config, permission flags, JSR/npm imports, Deno.serve or Hono/Oak servers, Deno KV, testing, compilation and deployment. Do NOT use for: Oak-specific architecture in depth (oak-backend), Node.js projects (nodejs-architecture), Bun projects (bun), frontend-only TypeScript.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, deno, typescript, jsr, permissions]
---

# Deno

## Purpose
Build TypeScript services on Deno 2 with least-privilege permissions, JSR-first dependencies, built-in tooling (fmt, lint, test, check, compile) and a choice of bare `Deno.serve`, Hono, Oak or Fresh.

## Agent Protocol

### Trigger
Exact user phrases: "deno", "deno 2", "deno.json", "deno task", "deno compile", "deno test", "Deno.serve", "Deno KV", "JSR", "deno permissions", "Fresh framework".

### Input Context
- Deno version (assume 2.x) and deployment target (Deno Deploy, Docker, compiled binary).
- Framework (bare `Deno.serve`, Hono, Oak, Fresh).
- Data store (Deno KV, PostgreSQL via `npm:pg`/`jsr:@db/postgres`, Redis).
- Required permissions (net, read, write, env, run, ffi).

### Output Artifact
`deno.json`, server code, tests and run/deploy commands with explicit permissions. No files unless requested.

### Response Format
```
Deno: 2.x   Framework: {bare|Hono|Oak|Fresh}
Permissions: --allow-net={hosts} --allow-env={vars} --allow-read={paths}
Deps: {jsr:/npm: specifiers in deno.json imports}
Files: {deno.json, src/main.ts, tests}
Run: deno task {dev|start|test}
```

## Decisions

### Framework

| Need | Choice |
|---|---|
| Small API, no deps | `Deno.serve` + `URLPattern` |
| Typed REST API with middleware ecosystem, multi-runtime | Hono (`jsr:@hono/hono`) |
| Koa-style middleware, existing Oak codebase | Oak (`jsr:@oak/oak`) |
| Server-rendered pages with interactive islands | Fresh 2 (`jsr:@fresh/core`, built on Vite) |

### Dependencies
- Prefer **JSR** (`jsr:@std/...`, `jsr:@hono/hono`): semver, TypeScript source, provenance.
- Use **npm** (`npm:pkg@^x`) for packages that only exist there; Deno 2 supports `package.json` and `node_modules` when needed.
- Avoid `https://deno.land/std` and `deno.land/x` URLs in new code: the standard library now lives on JSR as `@std/*`.
- Declare everything in `deno.json` `imports`; `deno.lock` is created and checked automatically.

### Permissions
Grant the narrowest scope: `--allow-net=api.example.com:443,0.0.0.0:8000`, `--allow-env=DATABASE_URL,PORT`, `--allow-read=./static`. Avoid `-A` outside local scripts. Deno 2 also offers `--deny-*` flags to carve exceptions out of broader grants.

## Workflow

### Step 1: deno.json

```json
{
  "tasks": {
    "dev": "deno run --watch --allow-net --allow-env=PORT,DATABASE_URL src/main.ts",
    "start": "deno run --allow-net --allow-env=PORT,DATABASE_URL src/main.ts",
    "test": "deno test --allow-net --allow-env",
    "check": "deno check src/main.ts && deno lint && deno fmt --check",
    "compile": "deno compile --allow-net --allow-env=PORT,DATABASE_URL --output dist/api src/main.ts"
  },
  "imports": {
    "@hono/hono": "jsr:@hono/hono@^4",
    "@std/assert": "jsr:@std/assert@^1",
    "zod": "npm:zod@^3"
  },
  "compilerOptions": { "strict": true },
  "fmt": { "lineWidth": 100, "singleQuote": true }
}
```

### Step 2: Hono API on Deno.serve

```ts
// src/app.ts
import { Hono } from '@hono/hono';
import { cors } from '@hono/hono/cors';
import { logger } from '@hono/hono/logger';
import { HTTPException } from '@hono/hono/http-exception';
import { z } from 'zod';

const kv = await Deno.openKv(Deno.env.get('KV_PATH')); // undefined -> default local store

const UserInput = z.object({ name: z.string().min(2), email: z.string().email() });
type User = z.infer<typeof UserInput> & { id: string };

export const app = new Hono();
app.use('*', logger());
app.use('/api/*', cors({ origin: Deno.env.get('CORS_ORIGIN') ?? 'http://localhost:5173' }));

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/api/v1/users', async (c) => {
  const users: User[] = [];
  for await (const entry of kv.list<User>({ prefix: ['users'] }, { limit: 100 })) {
    users.push(entry.value);
  }
  return c.json({ data: users });
});

app.post('/api/v1/users', async (c) => {
  const parsed = UserInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const user: User = { id: crypto.randomUUID(), ...parsed.data };
  // atomic check prevents overwriting an existing key
  const res = await kv.atomic()
    .check({ key: ['users', user.id], versionstamp: null })
    .set(['users', user.id], user)
    .commit();
  if (!res.ok) throw new HTTPException(409, { message: 'user exists' });
  return c.json({ data: user }, 201);
});

app.get('/api/v1/users/:id', async (c) => {
  const { value } = await kv.get<User>(['users', c.req.param('id')]);
  return value ? c.json({ data: value }) : c.json({ error: 'not found' }, 404);
});

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error('unhandled error', err);
  return c.json({ error: 'internal error' }, 500);
});
```

```ts
// src/main.ts
import { app } from './app.ts';

Deno.serve({ port: Number(Deno.env.get('PORT') ?? 8000) }, app.fetch);
```

For validation middleware, `@hono/zod-validator` (`npm:@hono/zod-validator`) provides `zValidator('json', schema)`.

### Step 3: Bare Deno.serve (no framework)

```ts
const userRoute = new URLPattern({ pathname: '/api/v1/users/:id' });

Deno.serve({ port: 8000 }, (req) => {
  const match = userRoute.exec(req.url);
  if (match && req.method === 'GET') {
    return Response.json({ id: match.pathname.groups.id });
  }
  return new Response('not found', { status: 404 });
});
```

`Deno.serve` returns an `HttpServer` with `shutdown()` and a `finished` promise for graceful shutdown.

### Step 4: Tests

```ts
// tests/app_test.ts  (run: deno test --allow-env --unstable-kv if your Deno version requires it)
import { assertEquals } from '@std/assert';
import { app } from '../src/app.ts';

Deno.test('GET /health returns ok', async () => {
  const res = await app.request('/health');   // no network listener needed
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { status: 'ok' });
});

Deno.test('POST /users rejects invalid input', async () => {
  const res = await app.request('/api/v1/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: '' }),
  });
  assertEquals(res.status, 400);
});
```

Set `KV_PATH=:memory:` for tests to use an isolated in-memory KV. Deno KV is still marked unstable in the CLI, so local runs need `--unstable-kv` (or `"unstable": ["kv"]` in `deno.json`).

### Step 5: Fresh 2 (SSR + islands)

```bash
deno run -Ar jsr:@fresh/init my-app
cd my-app && deno task dev
```

Fresh 2 renders Preact on the server and hydrates only components in `islands/`. Routes live in `routes/`; API handlers can share the same app. Use it when you need server-rendered pages; for pure APIs Hono or bare `Deno.serve` are simpler.

### Step 6: Deployment

```dockerfile
FROM denoland/deno:2.5.0
WORKDIR /app
COPY deno.json deno.lock ./
COPY src/ src/
RUN deno install --entrypoint src/main.ts   # cache deps at build time
USER deno
EXPOSE 8000
CMD ["deno", "run", "--allow-net", "--allow-env=PORT,DATABASE_URL", "--cached-only", "src/main.ts"]
```

Pin the image tag to the Deno version you test with. Alternatives: `deno compile` for a single binary (permissions are baked in at compile time), or Deno Deploy, where permissions are managed by the platform and Deno KV is available as a hosted database.

## Production Considerations
- Run with `--cached-only` (or a compiled binary) so production never fetches code at startup.
- Commit `deno.lock`; CI uses `deno install --frozen` (or `--frozen` on run/test) to fail on lockfile drift.
- Memory limits: `--v8-flags=--max-old-space-size=512`.
- Use `deno check` in CI; `deno run` type-checks only the local graph when `--check` is passed.
- Observability: Deno 2.x has built-in OpenTelemetry export (enable with `OTEL_DENO=true` on supported versions); otherwise use `npm:@opentelemetry/*`.

## Security Considerations
- Scope permissions per host/path/env var; review `--allow-run` and `--allow-ffi` carefully, they effectively bypass the sandbox.
- Restrict CORS origins; never `*` with credentials.
- Validate every request body (zod/valibot); parameterized SQL only.
- JWT: verify algorithm and expiry with a maintained library (`jsr:@zaubrik/djwt`, `npm:jose`).

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| `https://deno.land/std@0.x` imports in new code | `jsr:@std/*` via `deno.json` imports |
| `deno cache --lock-write` (Deno 1) | Deno 2 writes `deno.lock` automatically; use `--frozen` in CI |
| `-A` in production | Scoped `--allow-*` flags |
| Starting a real listener in unit tests | `app.request()` (Hono) or call the handler function directly |
| Raw `kv.set` for create-if-absent | `kv.atomic().check({ versionstamp: null })` |

## Rules
- Deno 2 conventions: `deno.json` imports, JSR first, npm when needed.
- Least-privilege permissions in every task, Dockerfile and compile command.
- `deno fmt --check`, `deno lint`, `deno check` and `deno test` in CI.
- Production runs from cached or compiled code with a committed lockfile.

## References
  - references/deno-advanced.md — Deno Advanced Topics
  - references/deno-deployment.md — Deno Deployment
  - references/deno-essentials.md — Deno Essentials
  - references/deno-fundamentals.md — Deno Fundamentals
  - references/deno-runtime.md — Deno Runtime Deep Dive
  - references/fresh-framework.md — Fresh Framework

Note: some reference files predate Deno 2 and use `deno.land/std` URLs; translate them to `jsr:@std/*`.

## Handoff
Oak applications: `skills/backend/deno/oak/SKILL.md`. API response formats: `skills/backend/universal/api-response/SKILL.md`.
