---
name: bun
description: >
  Use this skill when building with Bun runtime — Bun APIs, testing, package management, shell scripting, hot reload, SQLite, file I/O. This skill enforces: built-in APIs over npm equivalents, Bun test runner, bun install speed optimization, Bun.shell for scripts. Do NOT use for: Node.js-specific APIs (process.nextTick), Deno-specific features, browser JavaScript.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, bun, phase-10]
---

# Bun

## Purpose
Build high-performance TypeScript/JavaScript applications with Bun runtime — built-in APIs, test runner, package manager, bundler, and shell scripting.

## Agent Protocol

### Trigger
User request includes: `Bun`, `bun runtime`, `bun.sh`, `bun run`, `bun test`, `bun install`, `bun build`, `bunx`, `hot reload`, `bun --watch`, `Bun.file`, `Bun.write`, `Bun.serve`, `Bun.sqlite`, `Bun.shell`.

### Input Context
- Runtime (Bun, Bun in Docker)
- Framework (Elysia, Hono, Express compatibility)
- Database (Bun SQLite, PostgreSQL, MySQL)
- Build target (API, CLI tool, script)

### Output Artifact
Project setup with Bun APIs, test configuration, build scripts, runtime config.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Bun APIs used over Node.js equivalents where applicable
- Test suite configured with Bun test
- Package scripts optimized for Bun
- Build config with bun build

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Initialization

```bash
bun init          # Create new project (package.json + tsconfig.json)
bun init -y       # Skip prompts
bun create elysia my-app      # Elysia starter
bun create hono my-app        # Hono starter
bun create next my-app        # Next.js on Bun
```

```
my-app/
  src/
    index.ts              # Entry point
    routes/
      users.ts
      orders.ts
    db/
      schema.ts
      seed.ts
    middleware/
      auth.ts
      error-handler.ts
    utils/
      logger.ts
  tests/
    routes/
      users.test.ts
  bun.lock
  package.json
  tsconfig.json
  .env
  Dockerfile
```

### Step 2: Bun HTTP Server

```typescript
// src/index.ts
import { env } from './utils/env';

const server = Bun.serve({
  port: env.PORT || 3000,
  hostname: '0.0.0.0',

  async fetch(req: Request) {
    const url = new URL(req.url);

    // CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    try {
      return await router(req, url);
    } catch (err) {
      return errorHandler(err);
    }
  },
});

console.log(`Server running on http://${server.hostname}:${server.port}`);
```

### Step 3: Simple Router

```typescript
// src/router.ts
import { env } from './utils/env';

async function router(req: Request, url: URL): Promise<Response> {
  const { pathname } = url;

  // API routes
  if (pathname.startsWith('/api/v1')) {
    const apiPath = pathname.slice(7);

    if (apiPath === '/users' && req.method === 'GET') {
      return listUsers(req);
    }
    if (apiPath.startsWith('/users/') && req.method === 'GET') {
      return getUser(req, apiPath.slice(7));
    }
    if (apiPath === '/users' && req.method === 'POST') {
      return createUser(req);
    }
  }

  // Health
  if (pathname === '/health') {
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  });
}
```

### Step 4: File I/O with Bun APIs

```typescript
// src/utils/file-storage.ts
import { join } from 'path';

const UPLOAD_DIR = './uploads';

export async function saveFile(filename: string, data: Blob | Buffer | Uint8Array) {
  const path = join(UPLOAD_DIR, filename);
  await Bun.write(path, data);
  return path;
}

export async function readFile(filename: string): Promise<Response | null> {
  const path = join(UPLOAD_DIR, filename);
  const file = Bun.file(path);
  if (!await file.exists()) return null;
  return new Response(file);
}

export async function deleteFile(filename: string) {
  const path = join(UPLOAD_DIR, filename);
  await Bun.write(path, '');  // Truncate
  Bun.spawnSync(['rm', path]);  // Remove
}

export function fileStream(filename: string): ReadableStream | null {
  const path = join(UPLOAD_DIR, filename);
  const file = Bun.file(path);
  return file.exists() ? file.stream() : null;
}
```

### Step 5: Bun SQLite

```typescript
// src/db/sqlite.ts
import { Database } from 'bun:sqlite';

const db = new Database('./data/app.db');

// Enable WAL mode for performance
db.run('PRAGMA journal_mode = WAL;');
db.run('PRAGMA foreign_keys = ON;');

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Prepared statements
const insertUser = db.prepare(
  'INSERT INTO users (id, name, email) VALUES ($id, $name, $email)'
);
const getUser = db.prepare('SELECT * FROM users WHERE id = $id');
const listUsers = db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT $limit OFFSET $offset');

// Typed queries
interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export function createUser(name: string, email: string): User {
  const id = crypto.randomUUID();
  insertUser.run({ $id: id, $name: name, $email: email });
  return getUser.get({ $id }) as User;
}

export function findAllUsers(limit = 20, offset = 0): User[] {
  return listUsers.all({ $limit: limit, $offset: offset }) as User[];
}

export function findUserById(id: string): User | null {
  return getUser.get({ $id: id }) as User | null;
}
```

### Step 6: Testing with Bun

```typescript
// tests/routes/users.test.ts
import { describe, expect, it, beforeAll, mock } from 'bun:test';

const BASE_URL = 'http://localhost:3000/api/v1';

describe('Users API', () => {
  beforeAll(async () => {
    // Setup test data
    await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@test.com' }),
      headers: { 'content-type': 'application/json' },
    });
  });

  it('GET /users returns list', async () => {
    const res = await fetch(`${BASE_URL}/users`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('POST /users creates user', async () => {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice', email: 'alice@test.com' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Alice');
  });

  it('GET /users/:id returns user', async () => {
    const res = await fetch(`${BASE_URL}/users/abc-123`);
    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown user', async () => {
    const res = await fetch(`${BASE_URL}/users/nonexistent`);
    expect(res.status).toBe(404);
  });
});

// Mock example
import { orderService } from '../../src/services/order.service';

it('mocks external call', () => {
  const mockFetch = mock(() => Promise.resolve(new Response(JSON.stringify({ ok: true }))));
  globalThis.fetch = mockFetch;
  expect(mockFetch).toHaveBeenCalledTimes(0);
});
```

### Step 7: Scripts and Task Runner

```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "lint": "bun run tsc --noEmit",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "build:binary": "bun build src/index.ts --compile --outfile dist/app",
    "db:migrate": "bun src/db/migrate.ts",
    "db:seed": "bun src/db/seed.ts",
    "format": "bun x prettier --write src/",
    "clean": "bun x rimraf dist/",
    "typecheck": "bun run tsc --noEmit"
  }
}
```

## Rules
- Use Bun built-in APIs (Bun.file, Bun.write, Bun.serve, Bun.sqlite) over npm equivalents where available.
- Bun test runner for all tests — no Jest, Vitest, Mocha.
- bun install for package management — faster than npm, pnpm, yarn.
- TypeScript checked via `tsc --noEmit` or Bun's built-in type checking.
- Bun.sqlite for embedded databases, PostgreSQL driver for client-server DB.
- Bun.shell for build scripts and CLI tooling.
- bun build for bundling — supports target=bun, target=node, target=browser.

## References
  - references/bun-advanced.md — Bun Advanced Topics
  - references/bun-deployment.md — Bun Deployment
  - references/bun-ecosystem.md — Bun Ecosystem
  - references/bun-essentials.md — Bun Essentials
  - references/bun-fundamentals.md — Bun Fundamentals
  - references/bun-tooling.md — Bun Tooling
## Handoff
Hand off to `backend/elysia/SKILL.md` for Elysia framework or `backend/universal/testing/SKILL.md` for testing patterns.
