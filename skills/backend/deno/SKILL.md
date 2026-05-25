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

### Step 3: Fresh Project Setup

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

## Rules
- Always specify minimum permissions with `--allow-*` flags. Never use `-A` in production.
- Use deno.land/x or JSR imports via deno.json import map. Avoid raw URLs in source files.
- Standard library (std/) preferred over npm equivalents (std/http, std/log, std/testing).
- Fresh islands for client-side interactivity. Preact components for server-only rendering.
- Deno KV for simple state, PostgreSQL driver for complex persistence.
- deno fmt and deno lint in CI. Check before commit.
- Compile binaries with `deno compile` for Docker-less deployment.
- All env vars loaded via `std/dotenv` in dev, env vars in production.

## References

### Reference Files
- `references/deno-essentials.md` — Permissions, modules, std lib, testing
- `references/fresh-framework.md` — Routes, islands, SSR, deployment
- `references/deno-runtime.md` — Permissions model, runtime APIs, module resolution, std lib
- `references/deno-deployment.md` — Deno Deploy, Docker, compile, CI/CD, platforms

### Related Skills
- `backend/nodejs/express/SKILL.md` — Alternative Node.js approach
- `backend/bun/SKILL.md` — Alternative Bun approach

## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response formatting or backend-testing skill for test patterns.
