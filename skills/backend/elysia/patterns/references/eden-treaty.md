# Eden Treaty Client

```typescript
import { treaty } from '@elysiajs/eden';
import type { App } from './server';

const client = treaty<App>('http://localhost:3000');
const { data, error } = await client.orders.index.get({ query: { page: 1 } });
// Fully typed response
```

# Elysia Performance

- Use `scoped` plugins to avoid polluting global scope.
- Prefer `derive` over `state` for request-scoped data.
- Use `aot: true` in production for AOT compilation.
- Bun runtime provides 3-5x throughput over Node.js for Elysia.
