---
name: bun
description: >
  Use this skill when the user says 'bun', 'bun runtime', 'bun install', 'bun test', 'bun build', 'Bun.serve', 'bun:sqlite', 'Bun.file', 'Bun shell', 'bun --compile'. Builds TypeScript/JavaScript backends and tools on the Bun runtime: Bun.serve HTTP/WebSocket servers, bun:sqlite, file I/O, Bun Shell scripts, the built-in test runner, bundler and single-file executables. Do NOT use for: Elysia-specific architecture (elysia-architecture), Hono apps (nodejs-hono), Deno (deno), Node.js-only deployments (nodejs-architecture), browser JavaScript.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, bun, typescript, runtime, sqlite]
---

# Bun

## Purpose
Build TypeScript/JavaScript services and tooling on Bun, using its built-in server, SQLite driver, file APIs, shell, test runner and bundler where they simplify the stack, while staying aware of where Node.js compatibility still matters.

## Agent Protocol

### Trigger
Exact user phrases: "bun", "bun runtime", "bun install", "bun test", "bun build", "Bun.serve", "bun:sqlite", "Bun.file", "Bun shell", "bun --compile".

### Input Context
- Target: API server, CLI tool, scripts, or library.
- Framework on top of Bun (none, Elysia, Hono, Express via Node compatibility).
- Database (bun:sqlite, PostgreSQL via `Bun.sql` or `postgres`/`pg`, Redis).
- Deployment target (Docker, single binary, serverless).

### Output Artifact
Project layout, server/test/build code and `package.json` scripts. No files unless requested.

### Response Format
```
Runtime: Bun {version}   Framework: {none|Elysia|Hono|Express}
Server: Bun.serve {routes|fetch}   DB: {bun:sqlite|Bun.sql|other}
Scripts: dev/test/build/compile
Code: {files}
Node-compat risks: {native addons, unsupported node: APIs}
```

## Runtime Choice

| Criterion | Bun | Node.js | Deno |
|---|---|---|---|
| TypeScript | Runs `.ts` directly (transpile only, no type-check) | Type stripping built in since Node 22.18/23.6 for erasable syntax; otherwise tsx/build step | Runs `.ts` directly; `deno check` type-checks |
| npm packages | High compatibility; native addons and some `node:` APIs can still differ | Reference implementation | npm via `npm:` specifiers |
| Built-ins | HTTP server, WebSocket, SQLite, Postgres client, S3 client, password hashing, shell, test runner, bundler | Test runner, `node:sqlite` (newer versions) | HTTP, KV, test runner, formatter, linter |
| Maturity | Youngest; verify critical dependencies | Most mature, widest hosting support | Mature, strong permissions model |

Decision: choose Bun when its built-ins remove dependencies and your dependency set is verified to work; keep Node.js when you rely on native addons, APM agents or hosting that only supports Node. Always type-check separately (`tsc --noEmit`) because Bun does not.

Startup-time and requests-per-second comparisons vary by benchmark and version; measure on your own workload rather than quoting published numbers.

## Workflow

### Step 1: Project Initialization

```bash
bun init -y                 # package.json, tsconfig.json, index.ts
bun add zod                 # dependencies (writes text lockfile bun.lock)
bun add -d @types/bun typescript
```

```
my-app/
  src/
    index.ts          # Bun.serve entry
    routes/users.ts
    db/sqlite.ts
  tests/users.test.ts
  bun.lock
  package.json
  tsconfig.json
```

### Step 2: HTTP Server with Bun.serve

Bun 1.2.3+ supports a `routes` table with path parameters; `fetch` handles everything else.

```ts
// src/index.ts
import { createUser, findUserById, findAllUsers } from './db/sqlite';

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  routes: {
    '/health': () => Response.json({ status: 'ok' }),
    '/api/v1/users': {
      GET: () => Response.json({ data: findAllUsers() }),
      POST: async (req) => {
        const body = (await req.json()) as { name?: string; email?: string };
        if (!body.name || !body.email) {
          return Response.json({ error: 'name and email required' }, { status: 400 });
        }
        return Response.json({ data: createUser(body.name, body.email) }, { status: 201 });
      },
    },
    '/api/v1/users/:id': (req) => {
      const user = findUserById(req.params.id);
      return user ? Response.json({ data: user }) : Response.json({ error: 'not found' }, { status: 404 });
    },
  },
  fetch() {
    return Response.json({ error: 'not found' }, { status: 404 });
  },
  error(err) {
    console.error('unhandled request error', err);
    return Response.json({ error: 'internal error' }, { status: 500 });
  },
});

console.log(`listening on ${server.url}`);
```

### Step 3: bun:sqlite

```ts
// src/db/sqlite.ts
import { Database } from 'bun:sqlite';

export interface User { id: string; name: string; email: string; created_at: string }

const db = new Database(process.env.DB_PATH ?? './data/app.db', { create: true, strict: true });
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

// strict: true lets you bind { id } instead of { $id }
const insertUser = db.query('INSERT INTO users (id, name, email) VALUES ($id, $name, $email)');
const getUser = db.query<User, { id: string }>('SELECT * FROM users WHERE id = $id');
const listUsers = db.query<User, { limit: number; offset: number }>(
  'SELECT * FROM users ORDER BY created_at DESC LIMIT $limit OFFSET $offset',
);

export function createUser(name: string, email: string): User {
  const id = crypto.randomUUID();
  insertUser.run({ id, name, email });
  return getUser.get({ id })!;
}

export function findUserById(id: string): User | null {
  return getUser.get({ id });
}

export function findAllUsers(limit = 20, offset = 0): User[] {
  return listUsers.all({ limit, offset });
}
```

`db.query()` caches the prepared statement; `db.prepare()` does not. SQLite allows one writer at a time even in WAL mode; it suits single-node services, not multi-instance deployments.

### Step 4: File I/O

```ts
import { join, basename } from 'node:path';
import { unlink } from 'node:fs/promises';

const UPLOAD_DIR = './uploads';
const safePath = (name: string) => join(UPLOAD_DIR, basename(name)); // block ../ traversal

export async function saveFile(name: string, data: Blob | ArrayBuffer | Uint8Array | string) {
  await Bun.write(safePath(name), data);
}

export async function serveFile(name: string): Promise<Response> {
  const file = Bun.file(safePath(name));
  if (!(await file.exists())) return new Response('not found', { status: 404 });
  return new Response(file); // streams, sets Content-Type from extension
}

export async function deleteFile(name: string) {
  await unlink(safePath(name));
}
```

`Bun.file()` paths resolve against the current working directory; use `import.meta.dir` for script-relative paths.

### Step 5: Tests with bun:test

```ts
// tests/users.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { Server } from 'bun';

let server: Server;
let base: string;

beforeAll(async () => {
  process.env.DB_PATH = ':memory:';
  process.env.PORT = '0';                     // random free port
  server = (await import('../src/index')).default; // index.ts: export default server
  base = `http://localhost:${server.port}/api/v1`;
});

afterAll(() => server.stop(true));

describe('users API', () => {
  it('creates then fetches a user', async () => {
    const created = await fetch(`${base}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }),
    });
    expect(created.status).toBe(201);
    const { data } = await created.json();
    const fetched = await fetch(`${base}/users/${data.id}`);
    expect(fetched.status).toBe(200);
  });

  it('returns 404 for unknown user', async () => {
    const res = await fetch(`${base}/users/does-not-exist`);
    expect(res.status).toBe(404);
  });
});
```

For this to work, export the server from `src/index.ts` (`export default server;`). Use `mock()`, `spyOn()` and `mock.module()` from `bun:test` for doubles; `bun test --coverage` for coverage.

### Step 6: Scripts, Build and Single Binary

```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "build": "bun build src/index.ts --outdir dist --target bun --minify",
    "compile": "bun build src/index.ts --compile --outfile dist/app"
  }
}
```

`--compile` embeds the Bun runtime into a standalone executable; cross-compile with `--target=bun-linux-x64` etc.

## Implementation Patterns

### WebSocket Broadcast with Built-in Pub/Sub

```ts
type WsData = { room: string };

const server = Bun.serve({
  port: 3000,
  fetch(req, server) {
    const room = new URL(req.url).searchParams.get('room') ?? 'lobby';
    if (server.upgrade(req, { data: { room } })) return;
    return new Response('Expected WebSocket', { status: 426 });
  },
  websocket: {
    open(ws) { ws.subscribe((ws.data as WsData).room); },
    message(ws, message) {
      // publish to every subscriber except the sender
      ws.publish((ws.data as WsData).room, message);
    },
    close(ws) { ws.unsubscribe((ws.data as WsData).room); },
  },
});
```

Pub/sub is per process; use Redis or NATS to fan out across instances.

### Bun Shell Scripts

```ts
import { $ } from 'bun';

$.throws(true); // non-zero exit codes throw ShellError
const branch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim();
await $`bun test`;
await $`docker build -t my-app:${branch} .`;
```

Interpolated values are escaped, so `${userInput}` cannot inject shell syntax. Bun Shell is cross-platform for its built-in commands (`ls`, `cd`, `rm`, `echo`, ...); external programs must exist on the host.

### Password Hashing

```ts
// Default algorithm is argon2id; bcrypt is also supported.
const hash = await Bun.password.hash(plain);                 // argon2id
const ok = await Bun.password.verify(plain, hash);           // detects algorithm from hash
const legacy = await Bun.password.hash(plain, { algorithm: 'bcrypt', cost: 12 });
```

## Production Considerations
- Docker: use the official `oven/bun` image pinned to a version (not `latest`), multi-stage build, `bun install --frozen-lockfile --production`.
- Multiple cores: run several processes with `Bun.serve({ reusePort: true })` (Linux load-balances them) or use `node:cluster`; one Bun process uses one JS thread.
- Memory-constrained environments: run with `bun --smol` to trade throughput for lower memory.
- Outbound calls: set timeouts explicitly with `AbortSignal.timeout(ms)` on `fetch`.
- Graceful shutdown: handle `SIGTERM` and call `server.stop()` to finish in-flight requests.
- Observability: confirm your APM/OpenTelemetry instrumentation supports Bun before committing; many auto-instrumentations target Node.js.

## Security Considerations
- Sanitize file names before using them in paths (see `basename` above).
- Add security headers yourself (no helmet equivalent built into Bun.serve), or use a framework middleware.
- Validate request bodies with a schema library (zod, valibot, TypeBox); `req.json()` returns untyped data.
- Pin the Bun version in CI and Docker; review lifecycle scripts, which Bun only runs for packages listed in `trustedDependencies`.

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| Relying on Bun to catch type errors | Run `tsc --noEmit` in CI |
| `file.exists()` without `await` | It returns a Promise; always await |
| Assuming every Node native addon works | Test critical deps; keep a Node fallback path if needed |
| Using bun:sqlite for multi-instance shared state | PostgreSQL/MySQL |
| Unpinned `oven/bun:latest` images | Pin the version |
| One process on a multi-core box expecting full CPU use | `reusePort` workers or cluster |

## Checklist
- [ ] Bun version pinned (`packageManager`/`.bun-version`, Docker tag, CI).
- [ ] Type-check step in CI alongside `bun test`.
- [ ] Dependencies verified on Bun (especially native addons, APM agents).
- [ ] Timeouts on outbound fetches; graceful shutdown on SIGTERM.
- [ ] Input validation and safe path handling.

## Handoff
Elysia apps: `skills/backend/elysia/architecture/SKILL.md`. Hono apps: `skills/backend/nodejs/hono/SKILL.md`.

## References
- [bun advanced](references/bun-advanced.md)
- [bun deployment](references/bun-deployment.md)
- [bun ecosystem](references/bun-ecosystem.md)
- [bun essentials](references/bun-essentials.md)
- [bun fundamentals](references/bun-fundamentals.md)
- [bun tooling](references/bun-tooling.md)
