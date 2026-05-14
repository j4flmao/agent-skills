---
name: elysia-patterns
description: ElysiaJS patterns — plugins, guards, decorators, macros, lifecycle hooks, Eden Treaty client.
---

# ElysiaJS Patterns

## Agent Protocol

### Trigger
User request includes: `elysia plugin`, `elysia guard`, `elysia macro`, `eden treaty`, `elysia decorator`, `elysia lifecycle`.

### Input Context
- Elysia app instance
- Plugin requirements
- Client generation need

### Output Artifact
A markdown document containing:
- Plugin pattern
- Guard/auth pattern
- Decorator pattern
- Macro pattern
- Eden Treaty client setup

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Max Response Length
4096 tokens

## Guard Pattern

```typescript
import { Elysia } from 'elysia';

const authGuard = new Elysia()
  .derive({ as: 'scoped' }, ({ headers }) => {
    const token = headers['authorization']?.split(' ')[1];
    if (!token) throw new Error('Unauthorized');
    const user = verifyToken(token);
    return { user };
  });

app.use(authGuard).get('/orders', ({ user }) => orderService.listForUser(user.id));
```

## Plugin Pattern

```typescript
export const orderPlugin = new Elysia({ prefix: '/orders' })
  .get('/', () => orderService.list())
  .get('/:id', ({ params: { id } }) => orderService.findById(id))
  .post('/', ({ body }) => orderService.create(body), {
    body: createOrderSchema
  });
```

## References

### Reference Files
- `references/eden-treaty.md` — Eden Treaty client setup and patterns
- `references/elysia-performance.md` — Elysia performance optimization

### Related Skills
- `backend/elysia/architecture/SKILL.md` — Elysia project structure
- `backend/universal/design-patterns/SKILL.md` — GoF patterns

## Handoff

Hand off to `backend/elysia/architecture/SKILL.md` for setup.
