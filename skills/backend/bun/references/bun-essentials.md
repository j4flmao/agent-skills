# Bun Essentials

## Runtime Features

### Key Differences from Node.js

| Feature | Node.js | Bun |
|---------|---------|-----|
| Package manager | npm/pnpm/yarn | bun (built-in, 10-30x faster) |
| Test runner | Jest/Vitest | bun test (built-in, Jest-compatible) |
| Bundler | esbuild/webpack/rollup | bun build (built-in) |
| TypeScript | tsc/swc | Native transpilation (no install needed) |
| JSX/TSX | Requires config | Native support |
| SQLite | better-sqlite3 (npm) | bun:sqlite (built-in, 4-6x faster) |
| .env | dotenv (npm) | Auto-loaded |
| Watch mode | nodemon/tsx --watch | bun --watch |
| Shell scripts | shelljs/exec | Bun.shell (template literals) |
| File I/O | fs/promises | Bun.file, Bun.write (optimized) |
| Hash/Password | bcrypt/crypto | Bun.password, Bun.hash |

### Starting Bun App

```typescript
// Hot reload with --watch
bun --watch src/index.ts

// Environment variables auto-loaded from .env
console.log(process.env.DATABASE_URL);  // Works without dotenv

// TypeScript and JSX work natively
// No tsconfig.json required for basic use
```

## Bun HTTP Server

```typescript
// Basic HTTP server
Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response('Hello from Bun!');
  },
});

// With TLS
Bun.serve({
  port: 443,
  tls: {
    cert: Bun.file('./cert.pem'),
    key: Bun.file('./key.pem'),
  },
  fetch(req) {
    return new Response('Secure!');
  },
});

// Stream response
Bun.serve({
  fetch(req) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue('chunk 1');
        controller.enqueue('chunk 2');
        controller.close();
      },
    });
    return new Response(stream);
  },
});
```

## Bun.file API

```typescript
// Read file
const file = Bun.file('./data.json');
const exists = await file.exists();
const size = file.size;
const type = file.type;       // MIME type
const lastModified = file.lastModified;

// Read methods
const text = await file.text();
const json = await file.json();
const bytes = await file.arrayBuffer();
const blob = await file.blob();
const stream = file.stream();

// Write file
await Bun.write('./output.txt', 'Hello World');
await Bun.write('./output.json', JSON.stringify({ ok: true }));
await Bun.write('./output.png', await fetch('https://example.com/image.png'));

// Append to file
await Bun.write('./log.txt', 'new line\n', { append: true });

// Write from readable stream
await Bun.write('./large-file.txt', req.body);
```

## Bun.sqlite

```typescript
import { Database } from 'bun:sqlite';

const db = new Database('app.db');

// Performance pragmas
db.run('PRAGMA journal_mode = WAL;');
db.run('PRAGMA synchronous = NORMAL;');
db.run('PRAGMA cache_size = -64000;');  // 64MB cache
db.run('PRAGMA busy_timeout = 5000;');
db.run('PRAGMA foreign_keys = ON;');

// Create table
db.run(`CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  published INTEGER DEFAULT 0
)`);

// Prepared statements
const insert = db.prepare(
  'INSERT INTO posts (id, title, content) VALUES ($id, $title, $content)'
);

const findById = db.prepare('SELECT * FROM posts WHERE id = $id');

// Transaction
const insertMany = db.transaction((posts: Array<{title: string; content: string}>) => {
  for (const post of posts) {
    insert.run({
      $id: crypto.randomUUID(),
      $title: post.title,
      $content: post.content,
    });
  }
});

// Memory-only database (for testing)
const testDb = new Database(':memory:'));

// Close
db.close();
```

## Bun.password

```typescript
// Hash password
const hash = await Bun.password.hash('mypassword');
// Default: bcrypt with cost 10
// Returns: $2b$10$...

// Hash with options
const argonHash = await Bun.password.hash('mypassword', {
  algorithm: 'argon2id',
  timeCost: 3,
  memoryCost: 65536,  // 64MB
});

// Verify
const valid = await Bun.password.verify('mypassword', hash);
const validArgon = await Bun.password.verify('mypassword', argonHash);
```

## Bun.hash

```typescript
// Fast hashing (non-cryptographic)
const hash = Bun.hash('hello');         // number
const hash64 = Bun.hash('hello', 64n);  // bigint

// Crypto hashing
import { Hash } from 'bun';
const md5 = new Hash('md5');
md5.update('hello');
const digest = md5.digest('hex');

// SHA-256 via Web Crypto (preferred for crypto)
const sha256 = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hello'));
```

## Bun.shell

```typescript
// Execute shell commands
const { stdout, stderr, exitCode } = await Bun.$`ls -la`;
console.log(stdout.toString());

// With variables (auto-escaped)
const dir = 'src';
const result = await Bun.$`ls ${dir}`;

// Pipeline
const output = await Bun.$`cat package.json | grep name`;
console.log(output.stdout.toString());

// Error handling
try {
  await Bun.$`command-that-might-fail`;
} catch (error) {
  console.error('Shell command failed');
}

// Long-running
const proc = Bun.$`tail -f /var/log/nginx/access.log`;
for await (const line of proc.lines()) {
  console.log(line);
}

// Sequential commands
await Bun.$`mkdir -p dist`;
await Bun.$`cp src/*.ts dist/`;
await Bun.$`rm -rf tmp`;
```

## Bun.env

```typescript
// Environment variables
// .env files are auto-loaded
const dbUrl = Bun.env.DATABASE_URL;
const port = Bun.env.PORT || '3000';

// Typed access
interface AppEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
}

function getEnv(): AppEnv {
  return {
    NODE_ENV: (Bun.env.NODE_ENV as AppEnv['NODE_ENV']) || 'development',
    PORT: Bun.env.PORT || '3000',
    DATABASE_URL: Bun.env.DATABASE_URL!,
    JWT_SECRET: Bun.env.JWT_SECRET!,
  };
}
```

## Binary (compile)

```bash
# Compile to single binary
bun build src/index.ts --compile --outfile dist/myapp

# Cross-compile (from same machine)
bun build src/index.ts --compile --target=bun-linux-x64 --outfile dist/myapp-linux
bun build src/index.ts --compile --target=bun-linux-arm64 --outfile dist/myapp-arm64
bun build src/index.ts --compile --target=bun-windows-x64 --outfile dist/myapp.exe
bun build src/index.ts --compile --target=bun-darwin-arm64 --outfile dist/myapp-macos

# Compiled binary bundles:
# - Bun runtime
# - Source code
# - Dependencies
# - No external runtime needed
```

## Error Handling

```typescript
// With Bun.serve
Bun.serve({
  fetch(req) {
    try {
      return handleRequest(req);
    } catch (err) {
      return new Response(JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
      }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  },
});

// Custom error
class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

## WebSocket

```typescript
Bun.serve({
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response('Upgrade failed', { status: 400 });
  },
  websocket: {
    open(ws) {
      ws.subscribe('chat');   // Room subscription
      ws.send('Welcome!');
    },
    message(ws, msg) {
      ws.publish('chat', msg);  // Broadcast to room
    },
    close(ws) {
      ws.unsubscribe('chat');
    },
    drain(ws) {
      // Backpressure handling
      console.log('Draining');
    },
  },
});
```

## Bun.build

```typescript
// Bundle for browser
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'browser',
  minify: true,
  sourcemap: 'external',
  splitting: true,
});

// Bundle for Node.js
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node',
  external: ['express'],
});

// Bundle for Bun
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  external: ['bun:sqlite', 'bun:ffi'],
});
```
