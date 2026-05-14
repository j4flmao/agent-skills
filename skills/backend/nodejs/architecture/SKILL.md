---
name: nodejs-architecture
description: Node.js backend architecture — Express, Fastify, Hono. Project structure, middleware pipeline, routing, error handling, validation.
---

# Node.js Architecture

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

## Project Structure

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

## Framework Selection

| Framework | Performance | Ecosystem | TypeScript | When |
|---|---|---|---|---|
| **Express** | Moderate | Largest | Manual setup | Large ecosystem, legacy, most devs know it |
| **Fastify** | High | Large | Native | Performance-critical, JSON schema validation |
| **Hono** | Very High | Growing | Native | Edge, Bun, minimal footprint |

## Middleware Pipeline (Express)

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

## Error Handling

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

## References

### Reference Files
- `references/express-setup.md` — Express configuration, middleware patterns, security
- `references/fastify-setup.md` — Fastify configuration, plugins, hooks

### Related Skills
- `backend/nodejs/patterns/SKILL.md` — Node.js-specific patterns
- `backend/universal/api-response/SKILL.md` — API response envelope
- `backend/universal/oop-principles/SKILL.md` — SOLID for Node.js

## Handoff

Hand off to `backend/nodejs/patterns/SKILL.md` for Node.js-specific patterns.
