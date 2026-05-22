# Deno Essentials

## Permissions Model

Deno is secure by default. No file, network, or env access without explicit permission.

```bash
# Common permission sets
deno run src/main.ts                                    # No permissions
deno run --allow-net src/main.ts                        # Network access
deno run --allow-net --allow-read --allow-env src/main  # Web API
deno run --allow-all src/main.ts                        # All (alias: -A)

# Granular permissions
deno run --allow-net=api.example.com,deno.land src/main.ts  # Specific hosts
deno run --allow-read=/etc/config,/data src/main.ts           # Specific dirs
deno run --allow-env=DB_URL,PORT src/main.ts                  # Specific env vars

# Permission flags
--allow-net          # Network access
--allow-read         # File system read
--allow-write        # File system write
--allow-env          # Environment variables
--allow-run          # Subprocess execution
--allow-ffi          # Foreign function interface
--allow-sys          # System info
--deny-net           # Explicit denial (override inherited)
```

### Permission in Production

```bash
# Deno Deploy — permissions auto-granted based on usage
# Self-hosted — use --allow-* flags matching your app

# Docker
FROM denoland/deno:alpine-2.0.0
EXPOSE 8000
WORKDIR /app
COPY . .
RUN deno cache src/main.ts
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "src/main.ts"]
```

## Module System

### URL Imports

```typescript
// Direct URL import
import { serve } from 'https://deno.land/std@0.220.0/http/server.ts';

// Version pinning — always pin version
import { join } from 'https://deno.land/std@0.220.0/path/mod.ts';  // OK
import { join } from 'https://deno.land/std/path/mod.ts';           // Bad — no version

// npm specifiers (Deno 1.33+)
import express from 'npm:express@4.18';
import { z } from 'npm:zod@3.22';

// JSR specifiers
import { assert } from 'jsr:@std/assert@1.0';
```

### Import Maps (deno.json)

```json
{
  "imports": {
    "std/": "https://deno.land/std@0.220.0/",
    "oak/": "https://deno.land/x/oak@v12.6.2/",
    "oak-middleware/": "https://deno.land/x/oak_middleware@v1.0.0/",
    "db/": "./src/db/"
  }
}
```

```typescript
// Usage — clean imports
import { Application, Router } from 'oak/mod.ts';
import { serve } from 'std/http/server.ts';
import { pool } from 'db/pool.ts';
```

### npm Compatibility

```typescript
// Deno can import npm packages directly
import express from 'npm:express@4';
import mongoose from 'npm:mongoose@8';
import { v4 } from 'npm:uuid@9';

// With types
import { z } from 'npm:zod@3.22';
```

## Standard Library

```typescript
// HTTP server
import { serve } from 'std/http/server.ts';
serve((req) => new Response('Hello'));

// File system
import { ensureDir, copy, move, walk, exists } from 'std/fs/mod.ts';
import { join, dirname, basename, extname } from 'std/path/mod.ts';

// Logging
import { Logger } from 'std/log/mod.ts';
const logger = new Logger();
logger.info('Server started');
logger.error('Failed to connect');

// Testing
import { assertEquals, assertStrictEquals, assertRejects } from 'std/assert/mod.ts';
import { assertSpyCalls, stub } from 'std/testing/mock.ts';

// Serialization
import { parse, stringify } from 'std/jsonc/mod.ts';
import { parse as parseYaml, stringify as stringifyYaml } from 'std/yaml/mod.ts';
import { encode as encodeHex, decode as decodeHex } from 'std/encoding/hex.ts';

// Async utilities
import { delay, DeadlineError } from 'std/async/mod.ts';
import { pooledMap } from 'std/async/pool.ts';

// Collections
import { deepMerge } from 'std/collections/deep_merge.ts';
import { groupBy, pick, omit } from 'std/collections/mod.ts';

// Cryptography
import { crypto } from 'std/crypto/mod.ts';
const hash = await crypto.subtle.digest('SHA-256', data);

// UUID
import { v4, validate } from 'std/uuid/mod.ts';

// Dotenv
const env = await load({ export: true, allowEmptyValues: true });
```

## Testing

```typescript
// Basic test
import { assertEquals } from 'std/assert/mod.ts';

Deno.test('adds 1 + 2', () => {
  assertEquals(1 + 2, 3);
});

// Async test
Deno.test('fetches user', async () => {
  const res = await fetch('https://api.example.com/user/1');
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.id, 1);
});

// Step tests (Deno 2.0+)
Deno.test('user CRUD', async (t) => {
  await t.step('create user', () => { /* ... */ });
  await t.step('read user', () => { /* ... */ });
  await t.step('update user', () => { /* ... */ });
  await t.step('delete user', () => { /* ... */ });
});

// Mocking
import { stub } from 'std/testing/mock.ts';

Deno.test('mocks fetch', async () => {
  const fetchStub = stub(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify({ ok: true })))
  );
  try {
    const res = await fetch('/api/test');
    assertEquals(await res.json(), { ok: true });
  } finally {
    fetchStub.restore();
  }
});

// Test configuration in deno.json
{
  "tasks": {
    "test": "deno test --allow-net --allow-env --coverage=coverage",
    "test:watch": "deno test --watch --allow-net --allow-env",
    "coverage": "deno coverage coverage/"
  }
}
```

## Environment Variables

```typescript
// Development (with dotenv)
import { load } from 'std/dotenv/mod.ts';
const env = await load({ export: true });  // loads .env and exports to Deno.env

// Production (Deno Deploy sets env vars automatically)
const port = Deno.env.get('PORT') ?? '8000';
const dbUrl = Deno.env.get('DATABASE_URL');

// Type-safe env
export function requireEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}
```

## CLI Commands

```bash
deno init                     # Initialize new project
deno run src/main.ts          # Run script
deno run --watch src/main.ts  # Run with file watching
deno compile src/main.ts      # Compile to single binary
deno test                     # Run tests
deno fmt                      # Format code
deno lint                     # Lint code
deno check src/main.ts        # Type-check without running
deno bench                    # Run benchmarks
deno doc                      # Generate documentation
deno info                     # Show module cache info
deno task dev                 # Run task from deno.json
deno cache src/deps.ts        # Cache dependencies
deno upgrade                  # Upgrade Deno version
```

## Error Handling

```typescript
// Custom error class
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Result pattern
export class Result<T, E = AppError> {
  private constructor(
    public readonly value?: T,
    public readonly error?: E
  ) {}

  static success<T>(value: T): Result<T> {
    return new Result(value);
  }

  static failure<E>(error: E): Result<never, E> {
    return new Result(undefined, error);
  }

  isSuccess(): this is { value: T } {
    return this.error === undefined;
  }

  isFailure(): this is { error: E } {
    return this.error !== undefined;
  }

  match<U>(onSuccess: (v: T) => U, onFailure: (e: E) => U): U {
    return this.isSuccess() ? onSuccess(this.value!) : onFailure(this.error!);
  }
}
```

## Deno KV

```typescript
// Simple key-value store (built-in)
const kv = await Deno.openKv();

// CRUD
await kv.set(['users', 'abc123'], { name: 'Alice', email: 'alice@test.com' });
const result = await kv.get(['users', 'abc123']);
await kv.delete(['users', 'abc123']);

// Atomic operations
const res = await kv.atomic()
  .set(['counter'], 0)
  .sum(['counter'], 1n)
  .commit();

// List with prefix
const iter = kv.list({ prefix: ['users'] });
for await (const entry of iter) {
  console.log(entry.key, entry.value);
}

// Watch for changes
const watcher = kv.watch([['config']]);
for await (const entries of watcher) {
  console.log('Config changed:', entries);
}
```
