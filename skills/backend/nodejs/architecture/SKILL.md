---
name: nodejs-architecture
description: >
  Use this skill when designing Node.js backend architecture — Express, Fastify, Hono. Project structure, middleware pipeline, routing, error handling, validation. This skill enforces: separation of concerns, correct middleware ordering, global error handling, Zod/Joi validation integration. Do NOT use for: frontend architecture, database schema design, DevOps configuration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nodejs, phase-4]
---

# Node.js Architecture

## Purpose
Define and enforce Node.js backend architecture, framework selection, and middleware pipeline conventions.

## Agent Protocol

### Trigger
User request includes: `node.js`, `nodejs`, `express`, `fastify`, `hono`, `node backend`, `node project structure`, `middleware`, `node.js routing`.

### Input Context
- Framework (Express, Fastify, Hono)
- Runtime (Node.js v18+, Bun, Deno)
- Language (JavaScript, TypeScript)
- Project type (REST API, GraphQL, BFF)

### Output Artifact
A markdown document containing:
- Project structure
- Middleware pipeline ordering
- Routing conventions
- Error handling strategy
- Validation setup (Zod, Joi)
- Dependency injection pattern
- Testing setup

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Project structure follows separation of concerns
- Middleware pipeline ordered by responsibility
- Error handler catches all exceptions
- Validation integrated with schema library

### Max Response Length
4096 tokens

## Workflow

### Step 1: Select Framework

| Framework | Performance | Ecosystem | TypeScript | When |
|---|---|---|---|---|
| **Express** | Moderate | Largest | Manual setup | Large ecosystem, legacy, most devs know it |
| **Fastify** | High | Large | Native | Performance-critical, JSON schema validation |
| **Hono** | Very High | Growing | Native | Edge, Bun, minimal footprint |

### Step 2: Set Up Project Structure
```
src/
├── modules/
│   ├── orders/
│   │   ├── order.controller.ts
│   │   ├── order.service.ts
│   │   ├── order.repository.ts
│   │   ├── order.schema.ts        # Zod validation
│   │   ├── order.routes.ts
│   │   └── order.test.ts
│   ├── products/
│   │   └── ...
│   └── users/
│       └── ...
├── common/
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── error-handler.ts
│   │   ├── request-logger.ts
│   │   └── rate-limiter.ts
│   ├── errors/
│   │   ├── app-error.ts
│   │   └── not-found.ts
│   └── types/
│       └── index.ts
├── config/
│   ├── database.ts
│   ├── env.ts
│   └── redis.ts
├── app.ts              # Express/Fastify app setup
└── server.ts           # Entry point
```

### Step 3: Order Middleware Pipeline (Express)
```typescript
// app.ts
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);
app.use(rateLimiter);
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);
```

### Step 4: Implement Error Handling
```typescript
// common/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

// common/middleware/error-handler.ts
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details }
    });
  }
  console.error('Unhandled:', err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
  });
}
```

## Rules
- Framework selected by performance needs and ecosystem requirements.
- Modules grouped by domain feature, not by technical layer.
- Middleware ordered: security → parsing → logging → rate-limit → routes → 404 → error.
- All errors handled by central error handler — no try/catch in controllers.
- Validation via Zod/Fastify schema — never manual checks.
- TypeScript strict mode for all new projects.

## References

### Reference Files
- `references/express-setup.md` — Express configuration, middleware patterns, security
- `references/fastify-setup.md` — Fastify configuration, plugins, hooks
- `references/nodejs-event-loop.md` — Event loop phases, microtasks, blocking, worker threads
- `references/nodejs-clustering.md` — Cluster module, PM2, IPC, zero-downtime restart

### Related Skills
- `backend/nodejs/patterns/SKILL.md` — Node.js-specific patterns
- `backend/universal/api-response/SKILL.md` — API response envelope
- `backend/universal/oop-principles/SKILL.md` — SOLID for Node.js

## Handoff
Hand off to `backend/nodejs/patterns/SKILL.md` for Node.js-specific patterns.
