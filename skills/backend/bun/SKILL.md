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

## Architecture Decision Trees

### Runtime Selection: Bun vs Node.js vs Deno

| Criterion | Bun | Node.js | Deno |
|-----------|-----|---------|------|
| Startup time | ~5ms | ~50ms | ~20ms |
| npm compatibility | ~95% | 100% | ~80% |
| TypeScript native | Yes (transpiled) | No (ts-node/esbuild) | Yes (compiled) |
| Built-in APIs | SQLite, fetch, WebSocket, password hashing | None (npm) | Web APIs, KV, FFI |
| Test runner | Built-in (Jest-compatible) | Mocha/Jest/Vitest | Built-in |
| Bundler | Built-in (esbuild-level) | esbuild/webpack/rollup | Built-in |
| Package manager | Built-in (10x faster) | npm/pnpm/yarn | Custom |
| Shell scripting | Bun.shell (built-in) | execa/child_process | Deno.Command |
| Windows support | Experimental (native) | Mature | Mature |
| Docker image size | ~200MB | ~350MB | ~200MB |

Decision: Bun for new projects prioritizing DX and speed. Node.js for max ecosystem compatibility. Deno for security-first or edge computing.

### Server Framework Decision

| Criterion | Bun.serve (raw) | Elysia | Hono | Express (compat) |
|-----------|----------------|--------|------|------------------|
| Performance | ~100k req/s | ~80k req/s | ~90k req/s | ~30k req/s |
| Bundle size | 0 | Tiny | Tiny | Medium |
| TypeScript | Manual | Full (Eden) | Full (TypeBox) | Partial |
| Plugins | None | Rich | Growing | Largest |
| Learning curve | Low | Medium | Low | Low |
| Best for | APIs, microservices | Full-stack TypeScript | Edge, Workers, API | Migration from Node |

Decision: Elysia for new full-stack TypeScript apps. Bun.serve for minimal APIs. Hono for edge/Cloudflare Workers.

### Bun.sqlite vs External DB

| Criterion | Bun.sqlite | PostgreSQL | MySQL |
|-----------|-----------|------------|-------|
| Latency | <1ms (in-process) | 1-5ms (network) | 1-5ms (network) |
| Concurrent writes | WAL mode (good) | Excellent | Excellent |
| Data size | <100GB practical | Unlimited | Unlimited |
| Replication | None | Streaming + cascading | Group replication |
| Full-text search | FTS5 built-in | tsvector | Fulltext index |
| Backup | .backup command | pg_dump/WAL archiving | mysqldump |

Decision: Bun.sqlite for single-server, embedded, or dev. PostgreSQL for production multi-server.

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

## Implementation Patterns

### Pattern: WebSocket Server with Bun.serve

```typescript
import { serve, WebSocket } from 'bun';

const clients = new Set<WebSocket>();

serve({
  port: 3000,
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response('Not a WebSocket', { status: 426 });
  },
  websocket: {
    open(ws) {
      clients.add(ws);
      console.log(`Client connected. Total: ${clients.size}`);
    },
    message(ws, message) {
      const parsed = JSON.parse(message.toString());
      for (const client of clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ sender: 'broadcast', data: parsed }));
        }
      }
    },
    close(ws) {
      clients.delete(ws);
      console.log(`Client disconnected. Total: ${clients.size}`);
    },
  },
});
```

### Pattern: Bun.shell for Build Scripts

```typescript
// scripts/build.ts
import { $ } from 'bun';

async function buildAndDeploy() {
  // TypeScript check
  const tscResult = await $`bun run tsc --noEmit`.text();
  console.log('TypeScript:', tscResult);

  // Build bundle
  await $`bun build src/index.ts --outdir dist --target bun --minify`;

  // Run tests
  const testResult = await $`bun test`.text();
  console.log('Tests:', testResult);

  // Build Docker image
  await $`docker build -t my-app:latest .`;

  // Deploy
  await $`docker push my-app:latest`;

  // Chained commands
  const [gitBranch, gitHash] = await Promise.all([
    $`git rev-parse --abbrev-ref HEAD`.text(),
    $`git rev-parse --short HEAD`.text(),
  ]);

  console.log(`Deployed ${gitBranch.trim()}@${gitHash.trim()}`);
}

// Piped commands
const fileCount = await $`ls src/**/*.ts | wc -l`.text();
console.log(`Source files: ${fileCount.trim()}`);
```

### Pattern: Bun Password Hashing

```typescript
import { password } from 'bun';

export class AuthService {
  async hashPassword(plain: string): Promise<string> {
    return await password.hash(plain, {
      algorithm: 'bcrypt',
      cost: 10,
    });
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return await password.verify(plain, hash);
  }

  async hashArgon2(plain: string): Promise<string> {
    return await password.hash(plain, {
      algorithm: 'argon2id',
      timeCost: 3,
      memoryCost: 65536,
      parallelism: 1,
    });
  }
}
```

### Pattern: Binary Compilation

```typescript
// bun build --compile --outfile my-server src/index.ts
// Produces standalone binary (no Bun runtime needed)

import { Command } from 'commander';
const program = new Command();
program
  .name('my-cli')
  .version(Bun.version)
  .command('serve')
  .option('-p, --port <number>', 'Port', '3000')
  .action((opts) => {
    Bun.serve({
      port: parseInt(opts.port),
      fetch: () => new Response('Compiled Bun server'),
    });
  });

program.parse();

// Build: bun build src/cli.ts --compile --outfile dist/app
// Run: ./dist/app serve --port 8080
```

## Production Considerations

### Performance
- Use `Bun.serve` with `--smol` flag for memory-constrained environments
- Bun.sqlite with WAL mode + `synchronous = NORMAL` for write-heavy workloads
- Monitor: use `process.memoryUsage()` and `process.cpuUsage()` for metrics
- Memory: Bun uses jemalloc; set `MALLOC_CONF` env var for tuning (e.g., `MALLOC_CONF=background_thread:true`)
- Cluster: use `Bun.spawn` to fork workers; built-in cluster module not yet available

### Deployment
- Docker: `oven/bun:latest` base image; multi-stage build for production
- Binary compilation: use `--compile` flag to produce standalone binary (no runtime deps)
- CI: use `bun install --frozen-lockfile` for reproducible installs
- Environment variables: validated at startup with `.env` + Zod schema

### Common Issues
- `Bun.file()` paths are relative to working directory, not script location
- Bun's `fetch` has different timeout defaults than Node.js — set `signal: AbortSignal.timeout(5000)`
- Hot reload (`--watch`) watches files but not node_modules — restart for dep changes
- Bun's `crypto.randomUUID()` and Node.js `crypto.randomUUID()` are compatible

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Using `process.nextTick` | Bun supports it but prefers microtask queue | Use `queueMicrotask` or `Promise.resolve().then()` |
| Importing `fs`/`path` when Bun APIs exist | Bun.file/Bun.write are faster and simpler | Use `Bun.file()`, `Bun.write()`, `Bun.spawn()` |
| Using Jest/Vitest | Bun test is built-in and faster (uses same API) | `import { describe, it, expect } from 'bun:test'` |
| npm install instead of bun install | Slower by 10-30x | Always `bun install` |
| ts-node or tsx for running TypeScript | Bun runs TS natively | `bun src/index.ts` directly |
| Using Bull/BullMQ with Bun | Bun has its own queue pattern with `Bun.sleep` | Use Redis + Bun.serve or Elysia instead |
| Nested node_modules | Bun uses flat structure via bun.lock | Always `bun install` — avoids Windows path length issues |

## Security Considerations
- Bun's built-in `password.hash` uses bcrypt by default (not pbkdf2 like Node.js) — set cost >= 10
- Bun stores .bun install cache at `~/.bun/install/cache/` — clear in CI environments
- Use `--smol` option in Docker to limit memory; set `BUN_RUNTIME_TRANSPILER_CACHE_PATH` to /tmp
- Bun's `fetch` supports `credentials: 'omit'` by default (safer than Node.js undici defaults)
- Validate `req.param()` in Bun.serve — Bun returns string not string | undefined like Express
- Bun has no built-in `helmet` equivalent — add security headers manually in `fetch` handler
- Use `bun update --latest` instead of individual npm updates — checks integrity via lockfile

## Testing Strategies

```typescript
import { describe, expect, it, mock, spyOn, beforeAll, afterAll } from 'bun:test';

// Mock global
const mockFetch = mock(() => new Response(JSON.stringify({ ok: true })));
globalThis.fetch = mockFetch;

// Spy on module functions
const logger = { info: () => {}, error: () => {} };
const spy = spyOn(logger, 'info');

describe('Bun-specific tests', () => {
  it('reads file with Bun.file', async () => {
    await Bun.write('/tmp/test.txt', 'hello world');
    const file = Bun.file('/tmp/test.txt');
    expect(await file.text()).toBe('hello world');
    expect(file.size).toBe(11);
  });

  it('runs shell command', async () => {
    const result = await Bun.$`echo "hello"`.text();
    expect(result.trim()).toBe('hello');
  });

  it('hashes password', async () => {
    const hash = await Bun.password.hash('secret', { algorithm: 'bcrypt', cost: 4 });
    expect(await Bun.password.verify('secret', hash)).toBe(true);
    expect(await Bun.password.verify('wrong', hash)).toBe(false);
  });

  it('benchmarks performance', () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) crypto.randomUUID();
    const end = performance.now();
    expect(end - start).toBeLessThan(500);
  });

  it('handles SQLite transactions', () => {
    const db = new Database(':memory:');
    db.run('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');
    const insert = db.prepare('INSERT INTO test (value) VALUES (?)');
    const select = db.prepare('SELECT * FROM test');

    const tx = db.transaction(() => {
      insert.run('a');
      insert.run('b');
    });
    tx();

    expect(select.all().length).toBe(2);
  });
});
```

- Use `bun test --coverage` for coverage reports (built-in, no nyc/istanbul needed)
- Use `bun test --watch` for TDD
- For integration tests: spin up Bun.serve in beforeAll, shut down in afterAll
- Test binary compilation with `bun build --compile` in CI pipeline
- Benchmark performance with `Bun.nanoseconds()` for precise timing

## Rules
  - references/bun-advanced.md — Bun Advanced Topics
  - references/bun-deployment.md — Bun Deployment
  - references/bun-ecosystem.md — Bun Ecosystem
  - references/bun-essentials.md — Bun Essentials
  - references/bun-fundamentals.md — Bun Fundamentals
  - references/bun-tooling.md — Bun Tooling
## Handoff
Hand off to `backend/elysia/SKILL.md` for Elysia framework or `backend/universal/testing/SKILL.md` for testing patterns.
