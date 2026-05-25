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
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Max Response Length
4096 tokens

## Workflow

### Step 1: Implement Async Error Wrapper
```typescript
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
// Manual DI (no framework needed)
export class OrderService {
  constructor(
    private readonly repo: OrderRepository,
    private readonly payment: PaymentService,
    private readonly logger: Logger
  ) {}

  async create(data: CreateOrderDto): Promise<Order> {
    this.logger.info('Creating order', { customerId: data.customerId });
    const order = Order.create(data);
    await this.repo.save(order);
    await this.payment.charge(order.total);
    return order;
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

  static success<T>(value: T): Result<T> { return new Result(value); }
  static failure<E>(error: E): Result<never, E> { return new Result(undefined, error); }

  isSuccess(): this is { value: T } { return this.error === undefined; }
  isFailure(): this is { error: E } { return this.error !== undefined; }

  match<U>(onSuccess: (v: T) => U, onFailure: (e: E) => U): U {
    return this.isSuccess() ? onSuccess(this.value) : onFailure(this.error);
  }
}
```

## Rules
- Every async route handler wrapped with asyncHandler — no uncaught promise rejections.
- Manual DI via constructor injection — no DI framework needed.
- Composition root at module boundary, not spread across files.
- Result pattern for expected errors — throw only for truly unexpected failures.
- Services are stateless — all state passed as parameters.
- Each service depends on abstractions (interfaces), not concretions.

## References

### Reference Files
- `references/express-patterns.md` — Express-specific patterns
- `references/node-testing.md` — Node.js testing with Vitest, Supertest
- `references/nodejs-error-handling.md` — Error hierarchy, global handler, Result pattern
- `references/nodejs-streams.md` — Stream types, piping, transform, backpressure

### Related Skills
- `backend/nodejs/architecture/SKILL.md` — Node.js project structure
- `backend/universal/design-patterns/SKILL.md` — GoF patterns in Node.js

## Handoff
Hand off to `backend/nodejs/architecture/SKILL.md` for project structure.
