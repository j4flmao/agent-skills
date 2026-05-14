# Elysia Plugins Reference

## Official Plugins
- `@elysiajs/cors` — CORS headers
- `@elysiajs/swagger` — OpenAPI documentation
- `@elysiajs/jwt` — JWT authentication
- `@elysiajs/static` — Static file serving
- `@elysiajs/opentelemetry` — OpenTelemetry tracing

## Custom Plugin Pattern

```typescript
import { Elysia } from 'elysia';

export const loggingPlugin = new Elysia({ name: 'logging' })
  .onRequest(({ request }) => console.log(`→ ${request.method} ${request.url}`))
  .onResponse(({ request }) => console.log(`← ${request.method} ${request.url}`));
```
