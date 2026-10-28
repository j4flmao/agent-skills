# NestJS Performance Optimization

Practical levers for throughput and latency in NestJS services: HTTP adapter choice, avoiding request-scoped providers, caching, database access, compression offload and profiling. Measure before and after each change.

## Measure First

```bash
# Load test a single endpoint
npx autocannon -c 100 -d 30 http://localhost:3000/orders

# CPU profile
node --cpu-prof dist/main.js        # writes .cpuprofile, open in Chrome DevTools
# Flame graph
npx clinic flame -- node dist/main.js
# Event loop delay inside the app
```

```typescript
import { monitorEventLoopDelay } from 'node:perf_hooks';
const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();
setInterval(() => logger.log(`eventLoop p99=${(h.percentile(99) / 1e6).toFixed(1)}ms`), 10_000).unref();
```

Track p50/p95/p99 latency, RPS and event-loop delay under realistic payloads.

## HTTP Adapter

```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: false }));
await app.listen(3000, '0.0.0.0');
```

Fastify generally has lower per-request overhead than Express. Switching requires Fastify-compatible middleware/plugins (`@fastify/helmet`, `@fastify/compress`) and replacing direct `express` request/response usage.

## Avoid Request-Scoped Providers on Hot Paths

A `Scope.REQUEST` provider forces Nest to build a new instance of it and of every dependent per request. Use singletons and propagate context with `AsyncLocalStorage`:

```typescript
// nestjs-cls
ClsModule.forRoot({ global: true, middleware: { mount: true, generateId: true } });

@Injectable()
export class AuditService {
  constructor(private readonly cls: ClsService) {}
  record(action: string) { const reqId = this.cls.getId(); /* use reqId */ }
}
```

## Caching

```typescript
// app.module.ts (cache-manager v6 uses Keyv stores)
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

CacheModule.registerAsync({
  isGlobal: true,
  useFactory: () => ({ stores: [new KeyvRedis(process.env.REDIS_URL)], ttl: 60_000 }), // ms
});
```

```typescript
@Injectable()
export class ProductService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache, private repo: ProductRepository) {}

  async get(id: string) {
    const key = `product:${id}`;
    const hit = await this.cache.get<ProductDto>(key);
    if (hit) return hit;
    const fresh = await this.repo.findDto(id);
    await this.cache.set(key, fresh, 300_000);
    return fresh;
  }
}
```

`CacheInterceptor` auto-caches GET responses keyed by URL; do not use it for user-specific responses unless you override `trackBy()`. Check the cache-manager major version: TTL units and store APIs changed between v4, v5 and v6.

Also set HTTP caching headers (`Cache-Control`, `ETag`) so CDNs and clients cache public responses.

## Database Access

- Select only needed columns; map to DTOs rather than hydrating full entity graphs.
- Avoid N+1: TypeORM `relations`/`leftJoinAndSelect`, Prisma `include`/`select`, or DataLoader in GraphQL.
- Size the pool to DB capacity: total connections = pods x pool size. Put PgBouncer in front for many replicas.
- Use keyset (cursor) pagination for large tables instead of `OFFSET`.
- Index foreign keys and filter columns; check plans with `EXPLAIN (ANALYZE, BUFFERS)`.

```typescript
// keyset pagination
const rows = await this.repo.createQueryBuilder('o')
  .where('(o.createdAt, o.id) < (:ts, :id)', { ts: cursor.ts, id: cursor.id })
  .orderBy('o.createdAt', 'DESC').addOrderBy('o.id', 'DESC')
  .limit(50).getMany();
```

## Serialization Cost

`ClassSerializerInterceptor` + `class-transformer` reflection is relatively expensive for large arrays. For hot list endpoints, map to plain objects manually. Fastify can serialize faster when given a response JSON schema.

## CPU-Bound Work

The event loop is single-threaded. Move heavy work out of request handlers:
- Queue it (`@nestjs/bullmq` with BullMQ workers) and return `202 Accepted`.
- Use `worker_threads` (e.g. Piscina) for synchronous CPU work such as image processing or large JSON transforms.
- Use async crypto APIs (`crypto.scrypt` callback/promise form, not `scryptSync`).

## Compression and TLS

Terminate TLS and compress at the reverse proxy/ingress/CDN rather than in Node. If compressing in-app, use `@fastify/compress` or `compression` with a size threshold.

## Startup Time

- `nest build` with SWC builder for faster builds.
- Lazy-load rarely used modules with `LazyModuleLoader` (useful for serverless cold starts).
- Avoid heavy synchronous work in `onModuleInit`.

## Horizontal Scaling

Run one Node process per container and scale replicas; avoid the `cluster` module inside containers managed by Kubernetes. Keep instances stateless (sessions, rate limits and WebSocket adapters backed by Redis).

## Pitfalls

- Benchmarking with logging at debug level.
- `await` inside loops for independent I/O; use `Promise.all` with a concurrency limit.
- Unbounded in-memory caches causing GC pauses and OOM.
- Interceptors doing synchronous work on every request.
- Pool exhaustion masked as "slow endpoints".

## Checklist

- [ ] Baseline p99 and RPS recorded with autocannon/k6
- [ ] No request-scoped providers on hot paths
- [ ] Cache with explicit TTLs and invalidation plan
- [ ] Queries reviewed for N+1, indexes, column selection
- [ ] CPU-heavy work offloaded to queue or worker threads
- [ ] Event-loop delay monitored in production
