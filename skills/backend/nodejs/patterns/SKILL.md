---
name: nodejs-patterns
description: >
  Use this skill when implementing Node.js-specific patterns — middleware chain, async error handling, DI, module structure, testing, streaming, clustering. This skill enforces: async error wrapper pattern, manual DI (no framework), Result pattern for error handling. Do NOT use for: framework-specific routing, database patterns, frontend patterns.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nodejs, patterns, phase-4]
---

# Node.js Patterns

## Purpose
Implement and document Node.js-specific patterns for error handling, DI, and service layer design.

## Agent Protocol

### Trigger
User request includes: `node.js pattern`, `express pattern`, `async handler`, `node.js middleware`, `node di`, `node testing`, `node stream`, `cluster`.

### Input Context
- Node.js framework (Express, Fastify, Hono, bare)
- Current pain points (callback hell, error handling, DI)
- Language (TypeScript preferred)

### Output Artifact
A markdown document containing:
- Pattern implementation with code examples
- Selection rationale
- Testing strategy

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output.

### Max Response Length
4096 tokens

## Architecture / Decision Trees

### Error Handling Decision Tree

```
Is the error expected (business logic) or unexpected (bug/infra)?
├── Expected → Return Result type with error value
│   ├── Recoverable? → Handle with fallback logic
│   └── Not recoverable? → Return error to caller
├── Unexpected → Throw exception; let centralized handler catch it
│   ├── Validation error → 400 Bad Request
│   ├── Authentication error → 401 Unauthorized
│   ├── Authorization error → 403 Forbidden
│   ├── Not found → 404 Not Found
│   └── Internal error → 500 Internal Server Error
```

### Dependency Injection Decision Tree

```
Is the project a monolith or microservice?
├── Monolith → Manual DI via constructor injection
│   ├── < 10 services → Simple instantiation in composition root
│   └── > 10 services → DI container (tsyringe, inversify)
└── Microservice → Manual DI (keep it simple, per-service scope)
```

### Module Structure Decision Tree

```
How large is the project codebase?
├── < 10k lines → Feature-based modules (controllers + services + routes)
├── 10k-50k lines → Clean Architecture / Hexagonal layers
└── > 50k lines → Modular monolith with package boundaries
```

## Workflow

### Step 1: Implement Async Error Wrapper
```typescript
import { Request, Response, NextFunction } from 'express';

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage
router.get('/orders/:id', asyncHandler(async (req, res) => {
  const order = await orderService.findById(req.params.id);
  res.json(ok(order));
}));
```

### Step 2: Implement Service Layer with Manual DI
```typescript
export class OrderService {
  constructor(
    private readonly repo: OrderRepository,
    private readonly payment: PaymentService,
    private readonly logger: Logger
  ) {}

  async create(data: CreateOrderDto): Promise<Result<Order>> {
    this.logger.info('Creating order', { customerId: data.customerId });
    const order = Order.create(data);

    const saved = await this.repo.save(order);
    if (saved.isFailure()) return Result.failure(saved.error);

    const charged = await this.payment.charge(order.total);
    if (charged.isFailure()) {
      await this.repo.rollback(order.id);
      return Result.failure(charged.error);
    }

    return Result.success(order);
  }
}

// Composition root
const orderRepo = new OrderRepository(db);
const paymentService = new PaymentService(config);
const logger = new Logger();
export const orderService = new OrderService(orderRepo, paymentService, logger);
```

### Step 3: Implement Result Pattern
```typescript
export class Result<T, E = AppError> {
  private constructor(
    public readonly value?: T,
    public readonly error?: E
  ) {}

  static success<T>(value: T): Result<T> {
    return new Result(value, undefined);
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
    return this.isSuccess() ? onSuccess(this.value) : onFailure(this.error);
  }

  map<U>(fn: (v: T) => U): Result<U, E> {
    return this.isSuccess()
      ? Result.success(fn(this.value))
      : Result.failure(this.error);
  }

  flatMap<U>(fn: (v: T) => Result<U, E>): Result<U, E> {
    return this.isSuccess()
      ? fn(this.value)
      : Result.failure(this.error);
  }
}
```

### Step 4: Implement Middleware Chain
```typescript
type Middleware<T> = (ctx: T, next: () => Promise<void>) => Promise<void>;

export function compose<T>(middleware: Middleware<T>[]) {
  return (ctx: T): Promise<void> => {
    let index = -1;

    const dispatch = (i: number): Promise<void> => {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'));
      index = i;

      const fn = middleware[i];
      if (!fn) return Promise.resolve();

      try {
        return fn(ctx, () => dispatch(i + 1));
      } catch (err) {
        return Promise.reject(err);
      }
    };

    return dispatch(0);
  };
}
```

### Step 5: Implement Stream Processing
```typescript
import { Transform, pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

async function processLargeFile(inputPath: string, outputPath: string) {
  const readStream = createReadStream(inputPath);
  const writeStream = createWriteStream(outputPath);

  const transformStream = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      const processed = this.processChunk(chunk.toString());
      callback(null, processed);
    }
  });

  await pipelineAsync(readStream, transformStream, writeStream);
}
```

### Step 6: Implement Cluster Mode
```typescript
import cluster from 'cluster';
import os from 'os';

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  startServer(); // Workers share the TCP connection
}
```

## Common Pitfalls

### Pitfall 1: Unhandled Promise Rejections
Every async route handler must be wrapped. A single unhandled rejection can crash the process in Node.js 15+.

### Pitfall 2: Overusing DI Containers
DI containers add complexity and hide dependencies. Use manual constructor injection for small-to-medium projects. Only reach for tsyringe or inversify when you have 10+ services with complex lifetimes.

### Pitfall 3: Throwing for Expected Errors
Using throw for validation failures duplicates stack traces and makes error handling paths unclear. Use Result pattern for expected business logic failures.

### Pitfall 4: Blocking the Event Loop
Synchronous CPU-intensive operations in request handlers block all other requests. Use worker threads, child processes, or break work into async chunks.

### Pitfall 5: Memory Leaks from Streams
Not handling backpressure in streams causes memory exhaustion. Always use pipeline() instead of .pipe() for proper backpressure and error handling.

### Pitfall 6: Service Layer Anemia
Thin services that just delegate to repositories. Business logic belongs in services, not in controllers or repositories.

### Pitfall 7: No Graceful Shutdown
Process termination (SIGTERM, SIGINT) without closing database connections and HTTP servers causes data loss. Implement graceful shutdown in all production applications.

## Best Practices

- Use TypeScript strict mode. No implicit any, no unchecked indexed access.
- Separate error types: domain errors (expected) from system errors (unexpected).
- Use Result pattern for service layer returns, throw only for infrastructure errors.
- Compose middleware with a functional pipeline, not nested callbacks.
- Prefer streams for large data processing over loading everything into memory.
- Use worker threads for CPU-bound work (crypto, compression, image processing).
- Structure by feature, not by technical layer (controllers/ → orders/, users/).
- Implement health check endpoints separate from business routes.
- Log structured JSON, not formatted strings. Include correlation IDs.
- Use environment-based configuration, not hardcoded values.

## Compared With

### Manual DI vs DI Container
Manual DI is explicit, testable, and has zero runtime dependencies. DI containers provide auto-resolution and lifecycle management. Choose manual DI for simplicity, containers for large codebases with complex dependency graphs.

### Result Pattern vs Throwing
Result pattern makes error paths explicit in the type system. Throwing is the traditional Node.js approach. Result pattern is better for domain logic where callers must handle errors. Throwing is acceptable for system-level errors that callers cannot handle.

### Async/Await vs Callbacks vs Promises
Async/await is the modern standard — readable, debuggable, and composable. Promises are better for parallel operations (Promise.all). Callbacks are legacy — use only when required by older APIs.

### Composition vs Inheritance
Composition is more flexible and testable. Use inheritance only for true is-a relationships (custom Error classes, framework base classes).

## Performance Considerations

- Async handler overhead is negligible — a single wrapped Promise.resolve() per request.
- Manual DI has zero overhead compared to container-based DI with reflection.
- Result pattern creates two objects per operation. In hot paths (10k+ req/s), consider using a pooled Result type.
- Stream pipeline handles backpressure natively, preventing OOM on large files.
- Cluster mode scales across CPU cores but requires stateless services or shared session store.
- Worker threads share memory but have overhead for serialization. Use only for CPU-bound tasks >100ms.
- Avoid creating closures inside hot loop paths (request handlers with middleware).
- Use `util.promisify` sparingly — native promises are faster than promisified callback APIs.
- Object pooling for frequently created/destroyed objects (Result instances) in GC-sensitive applications.

## Rules
- Every async route handler wrapped with asyncHandler. No uncaught promise rejections.
- Manual DI via constructor injection. No DI framework unless codebase exceeds 10 services.
- Composition root at module boundary, not spread across files.
- Result pattern for expected errors. Throw only for truly unexpected failures.
- Services are stateless. All state passed as parameters.
- Each service depends on abstractions (interfaces), not concretions.
- Use pipeline() for streams, never .pipe() alone.
- Cluster mode for multi-core CPU utilization in production.
- Graceful shutdown on SIGTERM/SIGINT with configurable drain timeout.
- Structured logging with correlation IDs across all services.
- Health check endpoints (readiness + liveness) for container orchestration.

## References
- `references/express-patterns.md` — Express-specific middleware and routing patterns
- `references/node-testing.md` — Testing patterns for Node.js (unit, integration, e2e)
- `references/nodejs-async-patterns.md` — Async patterns: callbacks, promises, async/await, event emitters
- `references/nodejs-di.md` — Dependency injection patterns: manual, container-based, module-level
- `references/nodejs-error-handling.md` — Error handling patterns: try/catch, Result, error middleware
- `references/nodejs-streams.md` — Stream patterns: readable, writable, transform, pipeline
- `references/nodejs-streams-patterns.md` — Advanced stream patterns: backpressure, object mode, async iteration
- `references/nodejs-error-handling.md` — Comprehensive error handling: domain errors, operational errors, crash recovery

## Handoff
Hand off to `backend/nodejs/architecture/SKILL.md` for project structure.
