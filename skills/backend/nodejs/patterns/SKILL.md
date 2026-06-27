---
name: nodejs-patterns
description: >
  Use this skill when implementing Node.js-specific patterns — streams, event emitters, worker threads, DI containers, error handling, and async patterns. This skill enforces: backpressure handling in streams, typed event emitters, structured concurrency with worker threads, DI with awilix or inversify, and centralized error classification. Requires Node.js 18+. Do NOT use for: framework-specific (Express/Fastify) patterns, database patterns, or non-Node.js runtimes.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nodejs, patterns, phase-10]
---

# Node.js Patterns

## Purpose
Implement production-grade Node.js patterns — streams with backpressure, typed event emitters, worker threads for CPU-bound work, DI containers, error classification, and async flow control.

## Agent Protocol

### Trigger
User request includes: `Node.js stream`, `Node.js event emitter`, `Node.js worker thread`, `Node.js DI`, `Node.js error pattern`, `Node.js async`, `Node.js backpressure`, `Node.js event loop`.

### Input Context
- Node.js version (18+, 20+, 22+)
- Pattern needed (Streams, Workers, DI, Events, Errors)
- Runtime constraints (memory, CPU, concurrency)

### Output Artifact
Code examples for the requested pattern. Compress output — no preamble, no postamble.

### Completion Criteria
- Stream pipeline with backpressure handling
- Typed event emitter with TypeScript generics
- Worker thread pool with message protocol
- DI container with scoped lifetimes
- Error classification hierarchy with Zod validation

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Streams vs Buffers vs Generators

| Criterion | Streams | Buffers | Async Generators |
|-----------|---------|---------|------------------|
| Memory | Constant (chunked) | Full dataset | Constant (lazy) |
| Backpressure | Built-in | Manual | Pull-based (automatic) |
| Piping | `.pipe()` or pipeline() | Manual buffer copy | for await...of |
| Error handling | pipeline() with callback | try/catch | try/catch in loop |
| Use case | Large files, network IO | Small payloads, transforms | Lazy iteration |

Decision: Large data processing → Streams. In-memory transforms → Buffers. Pull-based iteration → Async Generators.

### Worker Threads vs Cluster vs Child Process

| Criterion | Worker Threads | Cluster | Child Process |
|-----------|---------------|---------|---------------|
| Shared memory | SharedArrayBuffer | No | No |
| IPC | Message passing | Built-in HTTP round-robin | stdio/pipe |
| Use case | CPU-bound tasks | HTTP load balancing | System commands |
| Module isolation | Same module | Same code | Separate binary |
| Overhead | Low | Medium | High |

Decision: CPU-bound parallel computation → Worker Threads. Multi-core HTTP serving → Cluster. Running external commands → Child Process.

## Workflow

### Step 1: Stream Pipeline with Backpressure

```typescript
// src/streams/transform.ts
import { pipeline, Transform, Writable, Readable } from 'node:stream';
import { promisify } from 'node:util';

const pipelineAsync = promisify(pipeline);

// Backpressure-aware transform
class JsonlParser extends Transform {
  private buffer = '';

  _transform(chunk: Buffer, _encoding: string, callback: Function) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const parsed = JSON.parse(line);
          this.push(parsed);
        } catch { /* skip invalid lines */ }
      }
    }
    callback();
  }

  _flush(callback: Function) {
    if (this.buffer.trim()) {
      try {
        this.push(JSON.parse(this.buffer));
      } catch { /* skip */ }
    }
    callback();
  }
}

// Usage with backpressure
async function processLargeFile(inputPath: string, outputPath: string) {
  await pipelineAsync(
    fs.createReadStream(inputPath, { highWaterMark: 64 * 1024 }),
    new JsonlParser(),
    new Transform({
      objectMode: true,
      transform(chunk, _encoding, callback) {
        callback(null, transformRecord(chunk));
      },
    }),
    fs.createWriteStream(outputPath),
  );
}
```

### Step 2: Typed Event Emitter

```typescript
// src/events/typed-emitter.ts
type EventMap = {
  'user:created': { id: string; email: string };
  'user:updated': { id: string; changes: string[] };
  'order:placed': { orderId: string; amount: number };
  'error': { code: string; message: string };
};

export class TypedEventEmitter {
  private emitter = new EventEmitter();

  on<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): this {
    this.emitter.on(event, listener);
    return this;
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): boolean {
    return this.emitter.emit(event, payload);
  }

  once<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): this {
    this.emitter.once(event, listener);
    return this;
  }

  off<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): this {
    this.emitter.off(event, listener);
    return this;
  }
}

// Usage
const events = new TypedEventEmitter();
events.on('user:created', ({ id, email }) => {
  sendWelcomeEmail(email);
  trackAnalytics('user_signup', id);
});
```

### Step 3: Worker Thread Pool

```typescript
// src/workers/worker.ts (worker file)
import { parentPort, workerData } from 'node:worker_threads';

// Receive work, process, send result
parentPort?.on('message', (task: { id: number; data: unknown }) => {
  try {
    const result = processTask(task.data);
    parentPort?.postMessage({ id: task.id, result, status: 'completed' });
  } catch (error) {
    parentPort?.postMessage({ id: task.id, error: error.message, status: 'failed' });
  }
});

// src/workers/pool.ts
import { Worker } from 'node:worker_threads';
import { cpus } from 'node:os';
import { EventEmitter } from 'node:events';

export class WorkerPool extends EventEmitter {
  private workers: Worker[] = [];
  private queue: Array<{ id: number; data: unknown; resolve: Function; reject: Function }> = [];
  private active = 0;
  private nextId = 0;

  constructor(private size = cpus().length, private workerPath: string) {
    super();
    for (let i = 0; i < size; i++) {
      this.addWorker();
    }
  }

  private addWorker() {
    const worker = new Worker(this.workerPath);
    worker.on('message', (msg) => {
      this.active--;
      this.processQueue();
      this.emit('completed', msg);
    });
    worker.on('error', (err) => {
      this.active--;
      this.addWorker(); // Replace failed worker
      this.processQueue();
      this.emit('error', err);
    });
    this.workers.push(worker);
  }

  exec(data: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.queue.push({ id: this.nextId++, data, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue() {
    while (this.active < this.size && this.queue.length > 0) {
      const task = this.queue.shift()!;
      const worker = this.workers[this.active % this.size];
      this.active++;
      worker.postMessage({ id: task.id, data: task.data });
    }
  }

  async terminate() {
    await Promise.all(this.workers.map(w => w.terminate()));
    this.workers = [];
  }
}

// Usage
const pool = new WorkerPool(4, './src/workers/worker.ts');
const result = await pool.exec({ imagePath: 'large.jpg' });
```

### Step 4: DI Container with awilix

```typescript
// src/di/container.ts
import { createContainer, asClass, asValue, Lifetime, InjectionMode } from 'awilix';
import { PrismaClient } from '@prisma/client';

const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
});

container.register({
  prisma: asValue(new PrismaClient()),
  userRepository: asClass(UserRepository).scoped(Lifetime.SCOPED),
  userService: asClass(UserService).scoped(Lifetime.SCOPED),
  userController: asClass(UserController).scoped(Lifetime.SCOPED),
  logger: asClass(Logger).singleton(),
  config: asValue(env),
});

// Express middleware to scope per request
app.use((req, res, next) => {
  req.container = container.createScope();
  next();
});

// Controller usage
export class UserController {
  constructor(private readonly userService: UserService) {}

  async list(req: Request, res: Response) {
    const users = await this.userService.findAll();
    res.json(users);
  }
}
```

### Step 5: Error Classification Hierarchy

```typescript
// src/errors/index.ts
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(400, 'VALIDATION_ERROR', 'Invalid request data', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

// Error classifier
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) return new ValidationError(error.errors);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': return new ConflictError('Resource already exists');
      case 'P2025': return new NotFoundError('Resource');
      default: return new AppError(500, 'DATABASE_ERROR', error.message);
    }
  }
  return new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}
```

### Step 6: Async Flow Control

```typescript
// src/async/batch-processor.ts
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency = 5,
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = processor(item).then(result => { results.push(result); });
    executing.push(p);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(0, executing.findIndex(p => p !== undefined));
    }
  }

  await Promise.all(executing);
  return results;
}

// src/async/retry.ts
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; maxDelay?: number } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 100, maxDelay = 10000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 100, maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable');
}
```

## Production Considerations

### Event Loop Monitoring
```typescript
import { monitorEventLoopDelay } from 'node:perf_hooks';

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setInterval(() => {
  const maxDelay = histogram.max / 1e6; // ms
  if (maxDelay > 50) {
    logger.warn(`Event loop blocked for ${maxDelay}ms`);
  }
  histogram.reset();
}, 10000);
```

### Memory Pressure
```typescript
import { heapStats } from 'node:v8';

setInterval(() => {
  const stats = heapStats();
  const heapUsedMB = process.memoryUsage().heapUsed / 1024 / 1024;
  if (heapUsedMB > 500) {
    global.gc?.(); // --expose-gc flag required
  }
}, 30000);
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| `process.on('uncaughtException')` without exit | Unstable state | Exit process, let manager restart |
| `JSON.parse/stringify` in hot stream path | CPU-bound, blocks event loop | Use streaming parsers (JSONStream, oboe) |
| Manual `.pipe()` without `pipeline()` | No cleanup on error | Always use `pipeline()` with callback |
| `new Worker()` per request | High overhead | Worker thread pool |
| `try/catch` around every async call | Noise, duplicates error handler | Centralized error middleware |

## Security Considerations
- Worker threads share process — sensitive data in messages can leak via memory dumps
- Streams: validate content type before processing malicious payloads
- Event emitter memory leak: `emitter.setMaxListeners()` for high-listener scenarios
- Error messages: never expose stack traces to client
- DI container: validate that injected services are properly authorized

## Testing Strategies

```typescript
test('stream pipeline handles backpressure', async () => {
  const source = Readable.from(generateLargeDataset(10000));
  const transform = new SomeTransform({ objectMode: true });
  const dest = new Writable({
    objectMode: true,
    write: vi.fn(),
  });
  await pipeline(source, transform, dest);
  expect(dest.write).toHaveBeenCalledTimes(10000);
});

test('worker pool processes tasks', async () => {
  const pool = new WorkerPool(2, './src/workers/test-worker.ts');
  const result = await pool.exec({ value: 42 });
  expect(result).toBe(84);
  await pool.terminate();
});
```

Use `node:test` (Node 20+) or `vitest` for testing. Use `testdouble` or `sinon` for mocking. Test event emitter with `once` and timeout.

## Rules
- Every stream pipeline uses `pipeline()` (from `node:stream`) not `.pipe()` directly.
- Every worker thread has a clear message protocol: `{ id, data, status, error }`.
- Event emitters are typed with a mapped type (EventMap) — never `string` event names.
- Error hierarchy: `AppError` base class with `statusCode`, `code`, `message`, `details`.
- Async concurrency limited with batch processing — never `Promise.all` on unbounded arrays.
- DI container scoped per request (scoped lifetime) for services with request-scoped state.
- All CPU-bound tasks (image processing, PDF generation, crypto) delegated to worker threads.

## References
  - references/express-patterns.md — Express-Specific Patterns
  - references/node-testing.md — Node.js Testing
  - references/nodejs-async-patterns.md — Async Control Flow
  - references/nodejs-di.md — Dependency Injection
  - references/nodejs-error-handling.md — Error Handling
  - references/nodejs-streams-patterns.md — Stream Patterns
  - references/nodejs-streams.md — Streams Reference
## Handoff
Hand off to `backend/nodejs/express/SKILL.md` for Express setup or `backend/universal/api-response/SKILL.md` for API response patterns.
## Implementation Patterns

### Factory Pattern for Module Creation
`
function createModule<T>(config: ModuleConfig): T {
  const dependencies = initializeDependencies(config);
  const module = new Module(dependencies);
  module.hooks.onInit();
  return module as T;
}
`

### Builder Pattern for Complex Configuration
`
class ConfigBuilder {
  private config: AppConfig = new AppConfig();
  withDatabase(url: string): ConfigBuilder { ... }
  withCache(ttl: number): ConfigBuilder { ... }
  withLogging(level: string): ConfigBuilder { ... }
  build(): AppConfig { return this.config; }
}
`

## Production Considerations

### Deployment Checklist
- [ ] Production build with optimizations enabled
- [ ] Environment variables configured per environment
- [ ] Health check endpoint responds correctly
- [ ] Error tracking and monitoring integrated
- [ ] Logging level configured (not debug in production)
- [ ] Resource limits configured
- [ ] Database migrations applied
- [ ] Static assets built and served from CDN or cache
- [ ] Feature flags toggled appropriately
- [ ] Rollback plan documented and tested

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% | Critical | Rollback or fix |
| p95 latency | > 500ms | Warning | Profile and optimize |
| Uptime | < 99.9% | Critical | Investigate infrastructure |
| Memory usage | > 80% | Warning | Check for leaks |
| CPU usage | > 80% | Warning | Scale up or optimize |

## Rules
- Prefer composition over inheritance
- Favor immutable data structures
- Use dependency injection for testability
- Keep functions pure when possible — no side effects
- Fail fast with clear error messages
- Don't repeat yourself (DRY) — extract shared logic
- Keep it simple (KISS) — avoid unnecessary complexity
- You aren't gonna need it (YAGNI) — build what's required
- Separate concerns — single responsibility per module
- Code to interfaces, not implementations
- Write self-documenting code — clear names over comments
- Prefer standard library over third-party dependencies
- Handle errors explicitly — no silent failures
- Validate inputs at boundaries
- Log at appropriate levels (debug, info, warn, error)