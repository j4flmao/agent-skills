# Bun Ecosystem

## HTTP Frameworks

| Framework | Description | When |
|-----------|-------------|------|
| **Elysia** | TypeScript-first, Eden Treaty | Full-stack type safety, plugins |
| **Hono** | Ultrafast, multi-runtime | Edge, Workers, minimal footprint |
| **Express** | Compat via `express` module | Migrating Node.js apps |
| **Astro** | Content-focused web framework | SSG, islands architecture |

```typescript
// Elysia on Bun
import { Elysia } from 'elysia';
new Elysia().get('/', () => 'Hello').listen(3000);

// Hono on Bun
import { Hono } from 'hono';
const app = new Hono();
app.get('/', (c) => c.text('Hello'));
export default { fetch: app.fetch, port: 3000 };
```

## Testing Ecosystem

```typescript
// bun:test — built-in, no deps
import { describe, expect, it, mock, spyOn } from 'bun:test';

// Mocking
const fetchMock = mock(() => new Response('{}'));
globalThis.fetch = fetchMock;

// Spies
const obj = { method: () => 42 };
const spy = spyOn(obj, 'method');
```

## Package Ecosystem Compatibility

| npm Package | Bun Status | Notes |
|-------------|-----------|-------|
| **Prisma** | ✅ Full | Works natively |
| **Drizzle** | ✅ Full | Works natively |
| **Zod** | ✅ Full | Works natively |
| **Pino** | ✅ Full | Use `pino` or `bunyan` |
| **Fastify** | ⚠️ Partial | Some native addons fail |
| **node-canvas** | ❌ No | Native addon, no N-API |
| **sharp** | ⚠️ Partial | Requires system libvips |

## Bun-native Tools

```bash
# Test coverage
bun test --coverage

# Profiling
bun run --profile src/index.ts

# Debugging
bun --inspect src/index.ts

# Heap snapshot
bun:jsc --heap-snapshot

# Environment inspection
bun --print 'process.versions'
```

## ORM / Database Libraries

```typescript
// Bun SQLite (built-in)
import { Database } from 'bun:sqlite';
const db = new Database('app.db');
db.run('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT)');

// Drizzle ORM
import { drizzle } from 'drizzle-orm/bun-sqlite';
const db = drizzle(new Database('app.db'));

// Prisma
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

## Validation & Serialization

```typescript
// Zod
import { z } from 'zod';
const schema = z.object({ name: z.string().min(1) });

// TypeBox
import { Type } from '@sinclair/typebox';
const schema = Type.Object({ name: Type.String() });

// Elysia t (built-in)
import { t } from 'elysia';
const schema = t.Object({ name: t.String() });
```

## CLI Tools

```bash
# Script runner
bun run script.ts

# Task runner (built-in)
bun x cowsay "Hello"

# Package runner
bunx create-elysia my-app

# Test runner
bun test --watch

# TypeScript checker
bun run tsc --noEmit

# Formatter
bun x prettier --write .

# Linter
bun x eslint .
```

## Key Differences from Node.js

| Feature | Node.js | Bun |
|---------|---------|-----|
| Package manager | npm/pnpm/yarn | bun (3-10x faster) |
| Test runner | Jest/Vitest | Built-in bun:test |
| Bundler | esbuild/webpack | Built-in bun build |
| SQLite | better-sqlite3 | Built-in bun:sqlite |
| TypeScript | ts-node/tsx | Native execution |
| Watch mode | nodemon/nodemon | Built-in --watch |
| Shell scripts | child_process | Built-in Bun.shell |
