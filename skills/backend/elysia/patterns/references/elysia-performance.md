# Elysia Performance Optimization

## AOT Compilation
```typescript
const app = new Elysia({ aot: true });
```

## Scoped Plugins
```typescript
// Use scoped plugins to avoid global pollution
const auth = new Elysia({ name: 'auth' })
  .derive({ as: 'scoped' }, ({ headers }) => ({ user: parseUser(headers) }));
```

## Benchmark
- Elysia on Bun: ~200k req/s (vs Express ~30k req/s)
- Cold start: <10ms (Bun) vs ~100ms (Node.js)
