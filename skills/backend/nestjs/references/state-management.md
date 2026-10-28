# NestJS State Management: Stateless Services, Request Context, Caches, Sessions

Server-side "state" in NestJS falls into a few buckets: per-request context, process-local caches, shared state (sessions, locks, counters) and persistent domain state. This reference covers where each belongs so services can scale horizontally.

## Principle: Stateless Instances

Default providers are singletons shared across concurrent requests. Mutable fields on a singleton are shared by all users and lost on restart.

```typescript
// Wrong: per-user data on a singleton
@Injectable()
export class CartService {
  private items: Item[] = [];          // shared by every request and replica-local
}

// Right: state lives in a store keyed by user
@Injectable()
export class CartService {
  constructor(@Inject('REDIS') private redis: RedisClientType) {}
  add(userId: string, item: Item) {
    return this.redis.hSet(`cart:${userId}`, item.sku, JSON.stringify(item));
  }
}
```

| State kind | Where | Example |
|------------|-------|---------|
| Per-request context | `AsyncLocalStorage` (nestjs-cls) | request ID, tenant, current user |
| Read-mostly config | Singleton, loaded at boot | feature defaults, lookup tables |
| Hot cache | In-memory LRU (per pod) + Redis | product catalog |
| Shared ephemeral | Redis | sessions, rate limits, locks, presence |
| Durable domain state | Database | orders, users |
| Workflow state | Queue/job store or workflow engine | multi-step processes |

## Request Context with AsyncLocalStorage

```typescript
// app.module.ts
ClsModule.forRoot({
  global: true,
  middleware: {
    mount: true,
    generateId: true,
    idGenerator: (req: Request) => (req.headers['x-request-id'] as string) ?? randomUUID(),
    setup: (cls, req: Request) => cls.set('tenantId', req.headers['x-tenant-id']),
  },
});

// any singleton
@Injectable()
export class TenantRepository {
  constructor(private cls: ClsService, private ds: DataSource) {}
  findAll() {
    const tenantId = this.cls.get<string>('tenantId');
    return this.ds.query('SELECT * FROM projects WHERE tenant_id = $1', [tenantId]);
  }
}
```

This avoids `Scope.REQUEST`, which recreates the dependency chain per request. Validate the tenant against the authenticated principal rather than trusting a raw header.

## Process-Local Caches

Use a bounded LRU with TTL for small, hot, rarely changing data:

```typescript
import { LRUCache } from 'lru-cache';

@Injectable()
export class RatesService {
  private readonly cache = new LRUCache<string, number>({ max: 5_000, ttl: 60_000 });
  async rate(pair: string) {
    const hit = this.cache.get(pair);
    if (hit !== undefined) return hit;
    const v = await this.fetchRate(pair);
    this.cache.set(pair, v);
    return v;
  }
}
```

Each replica has its own copy; tolerate staleness up to the TTL or broadcast invalidations via Redis pub/sub.

## Sessions

For server-rendered or cookie-based apps:

```typescript
import session from 'express-session';
import { RedisStore } from 'connect-redis';

app.use(session({
  store: new RedisStore({ client: redisClient, prefix: 'sess:' }),
  secret: config.getOrThrow('SESSION_SECRET'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 8 * 3600_000 },
}));
```

The default `MemoryStore` leaks memory and does not work across replicas; never use it in production. Regenerate the session ID on login to prevent fixation.

## Distributed Locks and Idempotency

```typescript
// single-instance Redis lock with token and TTL
const token = randomUUID();
const ok = await redis.set(`lock:invoice:${id}`, token, { NX: true, PX: 30_000 });
if (!ok) throw new ConflictException('Invoice is being processed');
try {
  await this.process(id);
} finally {
  // compare-and-delete via Lua so we only release our own lock
  await redis.eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    { keys: [`lock:invoice:${id}`], arguments: [token] },
  );
}
```

Locks with TTLs are advisory; for correctness also use DB constraints or fencing tokens. For retried POSTs store `Idempotency-Key -> response` atomically with the side effect.

## Durable State and Transactions

```typescript
await this.dataSource.transaction(async (em) => {
  const acct = await em.findOne(Account, { where: { id }, lock: { mode: 'pessimistic_write' } });
  if (!acct) throw new NotFoundException();
  acct.balance -= amount;
  await em.save(acct);
  await em.insert(OutboxEvent, { type: 'AccountDebited', payload: { id, amount } });
});
```

Optimistic concurrency: TypeORM `@VersionColumn()`; Prisma conditional `updateMany({ where: { id, version } })` and check `count`.

## WebSocket Gateway State

Connected sockets live on one instance. Use the Redis adapter (`@socket.io/redis-adapter`) so `server.to(room).emit()` reaches clients on other replicas, and keep presence/room membership in Redis rather than Maps on the gateway.

## Background Job State

`@nestjs/bullmq` persists job state in Redis; job processors should be idempotent because jobs can be retried. For long multi-step workflows consider a workflow engine (Temporal) instead of chaining jobs manually.

## Pitfalls

- Mutable instance fields in singletons.
- In-memory session store or rate limiter with several replicas.
- Unbounded `Map` caches growing until OOM.
- Request-scoped providers used only to carry a user ID.
- Relying on a Redis lock alone for financial correctness.

## Checklist

- [ ] No per-user mutable state on singletons
- [ ] Request context via AsyncLocalStorage
- [ ] Bounded caches with TTL; invalidation strategy documented
- [ ] Sessions, throttling and socket rooms backed by Redis
- [ ] DB constraints/versions guard concurrent writes
- [ ] Jobs and handlers idempotent
