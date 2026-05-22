---
name: elysia-architecture
description: >
  Use this skill when designing ElysiaJS on Bun backend architecture — plugins, lifecycle, validation with TypeScript-first design. This skill enforces: modular project structure, t validation schemas, lifecycle hook ordering, and Bun-native testing. Do NOT use for: frontend or mobile architecture, non-Elysia Bun scripts.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, elysia, phase-4]
---

# ElysiaJS Architecture

## Purpose
Define and enforce ElysiaJS project structure, plugin setup, validation, and lifecycle patterns.

## Agent Protocol

### Trigger
User request includes: `elysia`, `elysiajs`, `bun`, `elysia architecture`, `bun framework`, `elysia plugin`, `elysia lifecycle`.

### Input Context
- Bun version (latest stable)
- Project scope
- TypeScript configuration

### Output Artifact
A markdown document containing:
- Project structure
- Elysia app setup with plugins
- Route design with schema validation
- Lifecycle hooks (beforeHandle, afterHandle, transform)
- Error handling
- Testing with Bun test runner

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Max Response Length
4096 tokens

## Workflow

### Step 1: Set Up Project Structure
```
src/
├── modules/
│   ├── orders/
│   │   ├── order.controller.ts
│   │   ├── order.service.ts
│   │   ├── order.schema.ts     # Elysia t (type)
│   │   └── order.routes.ts
│   └── ...
├── plugins/
│   ├── auth.ts
│   ├── cors.ts
│   └── logger.ts
├── common/
│   ├── errors.ts
│   └── types.ts
├── index.ts
└── app.ts
```

### Step 2: Configure App with Plugins
```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { orderRoutes } from './modules/orders/order.routes';

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .use(orderRoutes)
  .onError(({ code, error, set }) => {
    if (code === 'NOT_FOUND') return { success: false, error: 'Not found' };
    return { success: false, error: error.message };
  })
  .listen(3000);
```

### Step 3: Add Validation with Elysia t
```typescript
import { t } from 'elysia';

export const createOrderSchema = t.Object({
  customerId: t.String({ format: 'uuid' }),
  items: t.Array(t.Object({
    productId: t.String({ format: 'uuid' }),
    quantity: t.Integer({ minimum: 1 })
  }), { minItems: 1 })
});

app.post('/orders', ({ body }) => orderService.create(body), {
  body: createOrderSchema,
  detail: { tags: ['Orders'] }
});
```

## Rules
- Modules grouped by domain feature, not by technical layer.
- All input validation uses Elysia `t` schemas — no manual validation.
- Error handler catches all codes, returns structured JSON.
- Plugins are scoped and reusable across projects.
- TypeScript strict mode enabled.
- Lifecycle hooks ordered: transform → beforeHandle → handler → afterHandle.

## References

### Reference Files
- `references/elysia-plugins.md` — Official and custom plugin development
- `references/elysia-lifecycle.md` — Lifecycle hooks, guards, transforms

### Related Skills
- `backend/elysia/patterns/SKILL.md` — Elysia-specific patterns
- `backend/universal/api-response/SKILL.md` — API response design

## Handoff
Hand off to `backend/elysia/patterns/SKILL.md` for Elysia patterns.
