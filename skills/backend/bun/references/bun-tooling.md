# Bun Tooling

## Package Manager

### bun install

```bash
# Install dependencies (10-30x faster than npm)
bun install

# Install specific package
bun add express
bun add -d typescript    # dev dependency
bun add -g eslint        # global

# Remove package
bun remove express

# Update all dependencies
bun update

# Install with exact version
bun add zod@3.22.4

# Install from git
bun add github:user/repo

# Install local package
bun add ./packages/shared

# Install and save to specific dependency group
bun add --optional sharp
bun add --peer react
```

### bun.lock vs package-lock.json

- Bun uses `bun.lock` (binary format) — faster to parse
- Compatible with `package.json`
- Lockfile regeneration is deterministic
- Can coexist with other lockfiles during migration

### Workspaces

```json
{
  "name": "my-monorepo",
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run --filter=* build"
  }
}
```

```bash
# Install all workspace dependencies
bun install

# Run script in all workspaces
bun run --filter=@myapp/* build

# Add dependency to specific workspace
bun add lodash --cwd packages/shared
```

## Test Runner

### Running Tests

```bash
bun test                    # Run all tests
bun test tests/routes/      # Test specific directory
bun test users.test.ts      # Test specific file
bun test --watch            # Watch mode
bun test --coverage         # Generate coverage
bun test --bail             # Stop on first failure
bun test --timeout 10000   # Set timeout (ms)
bun test --rerun-each 3     # Retry flaky tests
```

### Test Structure

```typescript
import { describe, it, expect, test } from 'bun:test';

describe('Math operations', () => {
  it('adds two numbers', () => {
    expect(1 + 2).toBe(3);
  });

  it('subtracts numbers', () => {
    expect(5 - 3).toBe(2);
  });

  // Alternative: test() is alias for it()
  test('multiplies numbers', () => {
    expect(2 * 3).toBe(6);
  });
});
```

### Assertions

```typescript
expect(value).toBe(42);                    // ===
expect(value).toEqual({ a: 1 });           // deep equal
expect(value).toStrictEqual({ a: 1 });     // deep equal + type check
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeGreaterThan(10);
expect(value).toBeGreaterThanOrEqual(10);
expect(value).toBeLessThan(20);
expect(value).toBeLessThanOrEqual(20);
expect(value).toContain('hello');
expect(value).toHaveLength(5);
expect(value).toMatch(/regex/);
expect(value).toMatchObject({ name: 'Alice' });
expect(value).toHaveProperty('address.city');
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('specific error');
expect(async () => await fn()).toThrow();
```

### Lifecycle Hooks

```typescript
import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';

let db: Database;

beforeAll(async () => {
  db = new Database(':memory:');
  await db.migrate();
});

afterAll(() => {
  db.close();
});

beforeEach(() => {
  db.reset();
});

afterEach(() => {
  db.clearLogs();
});

describe('User CRUD', () => {
  it('creates user', () => {
    // ...
  });
});
```

### Mocks and Spies

```typescript
import { mock, spyOn } from 'bun:test';

// Create mock function
const fn = mock(() => 42);
fn(); // returns 42
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(1);

// Mock with implementation
const fetchMock = mock((url: string) => {
  if (url.includes('users')) return [{ id: 1 }];
  return [];
});

// Spy on object method
const obj = { method: () => 'original' };
const spy = spyOn(obj, 'method');
obj.method();
expect(spy).toHaveBeenCalled();

// Mock module
mock.module('fs', () => ({
  readFileSync: () => 'mocked content',
  existsSync: () => true,
}));
```

### Snapshot Testing

```typescript
it('matches snapshot', () => {
  const user = createUser({ name: 'Alice', email: 'alice@test.com' });
  expect(user).toMatchSnapshot();
});

// Update snapshots: bun test --update-snapshots
```

### Integration Testing

```typescript
import { describe, it, expect, beforeAll } from 'bun:test';

const BASE = 'http://localhost:3001';

describe('API Integration', () => {
  beforeAll(async () => {
    // Start server in test mode
    const mod = await import('../src/index.ts');
  });

  it('GET /health returns 200', async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('POST /users creates user', async () => {
    const res = await fetch(`${BASE}/api/v1/users`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@test.com' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(201);
  });
});
```

## Bun Build

```bash
# Bundle for browser
bun build src/index.ts --outdir dist --target browser
bun build src/index.ts --outdir dist --target browser --minify --sourcemap=external

# Bundle for Node.js
bun build src/index.ts --outdir dist --target node --external express

# Bundle for Bun
bun build src/index.ts --outdir dist --target bun

# Create standalone binary
bun build src/index.ts --compile --outfile myapp

# Watch mode
bun build src/index.ts --outdir dist --watch
```

### Build Configuration

```typescript
// bunfig.toml
[install]
registry = "https://registry.npmjs.org"

[build]
target = "bun"
minify = true
sourcemap = "external"
splitting = true

[bundle]
packages = ["buffer"]
```

## Scripts and Tasks

### package.json Scripts

```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "dev:debug": "bun --inspect src/index.ts",
    "start": "NODE_ENV=production bun src/index.ts",
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "test:watch": "bun test --watch",
    "lint": "bun x eslint src/",
    "lint:fix": "bun x eslint src/ --fix",
    "format": "bun x prettier --write src/",
    "format:check": "bun x prettier --check src/",
    "typecheck": "bun run tsc --noEmit",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "build:binary": "bun build src/index.ts --compile --outfile dist/app",
    "build:all": "bun run build && bun run build:binary",
    "db:migrate": "bun src/db/migrate.ts",
    "db:seed": "bun src/db/seed.ts",
    "db:reset": "bun src/db/migrate.ts && bun src/db/seed.ts",
    "clean": "bun x rimraf dist/",
    "preinstall": "bun x check-engine",
    "postinstall": "bun run db:migrate",
    "precommit": "bun run lint && bun run format:check && bun run typecheck",
    "ci": "bun install --frozen-lockfile && bun run lint && bun run typecheck && bun test"
  }
}
```

### Bun Tasks

```bash
bun run dev              # Run dev script
bun run test             # Run tests
bun run ci               # Run CI pipeline

# Execute TypeScript directly (no build step)
bun src/scripts/seed.ts

# Run package binary without installing
bunx prisma generate
bunx eslint src/
bunx prettier --write src/
```

## Docker

```dockerfile
# Multi-stage build
FROM oven/bun:latest AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build src/index.ts --compile --outfile /app/dist/server

FROM debian:stable-slim
RUN apt update && apt install -y ca-certificates
COPY --from=build /app/dist/server /usr/local/bin/server
EXPOSE 3000
CMD ["server"]
```

```dockerfile
# Development
FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
CMD ["bun", "--watch", "src/index.ts"]
```

## Migration from npm

```bash
# Remove node_modules and lockfile
rm -rf node_modules package-lock.json

# Install with bun
bun install

# Check for compatibility issues
bun run tsc --noEmit

# Run tests with bun test
bun test
```

### Known Compatibility Notes

- `process.nextTick()` — exists but slower on Bun. Use `setTimeout(fn, 0)` or `queueMicrotask`.
- Native Node.js addons (`.node` files) — limited support. Prefer WASM or pure JS alternatives.
- `node:cluster` — not supported. Bun multi-process uses `Bun.spawn`.
- `node:child_process` — supported. Prefer `Bun.shell` or `Bun.spawn` for better performance.
- `node:fs` — fully supported. `Bun.file`/`Bun.write` faster for common operations.
