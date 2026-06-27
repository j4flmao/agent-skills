---
name: backend-idempotency
description: >
  Use this skill when the user says 'idempotency', 'idempotent', 'idempotency key', 'exactly-once', 'retry safety', 'deduplication', 'duplicate detection', 'idempotent endpoint', 'safe retry'. This skill implements idempotency keys and exactly-once semantics so retries never result in duplicate side effects. Applies to any backend stack. Do NOT use for: read-only endpoints (they are naturally idempotent), optimistic concurrency, or database-level unique constraints alone.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, idempotency, exactly-once, retry-safety, deduplication]
---

# Backend Idempotency

## Purpose
Guarantee exactly-once execution for mutating operations using idempotency keys, enabling safe retries without duplicate side effects. Idempotency is the foundation of reliable distributed systems — without it, network retries cause duplicate orders, double charges, and inconsistent state.

## Agent Protocol

### Trigger
Exact user phrases: "idempotency", "idempotent", "idempotency key", "exactly-once", "retry safety", "deduplication", "duplicate detection", "idempotent endpoint", "safe retry".

### Input Context
- Which endpoints need idempotency guarantees.
- Existing data store (Redis, PostgreSQL, DynamoDB).
- Current retry configuration.

### Output Artifact
Idempotency key handling design. No file unless requested.

### Response Format
```
Endpoint: {method} {path}
Key Source: {client-provided|server-generated}
Storage: {store type}
TTL: {duration}
```

### Completion Criteria
- [ ] Idempotency key storage implemented with TTL.
- [ ] Key uniqueness enforced at database level.
- [ ] Response caching: same key returns same response.
- [ ] Expired keys handled gracefully.
- [ ] Concurrent requests with same key resolved (first wins or lock).

### Max Response Length
4 lines per endpoint. 15 lines for full solution.

## Architecture Decision Tree

### Which Idempotency Strategy?

```
Is the operation naturally idempotent? (PUT, DELETE, same result every time)
  ├── Yes → No key needed, just use the resource identifier
  └── No → Is the operation a creation (POST, different result each time)?
            ├── Yes → Client-provided idempotency key required
            │         ├── Does the client always retry on network errors?
            │         │   ├── Yes → Always require key on mutating endpoints
            │         │   └── No → Still require it — clients are unreliable
            │         └── Is the key collision possible?
            │             ├── Yes → Use UUID v4 or v7 for key generation
            │             └── No → Use business key (invoice ID, order number)
            └── No → Server-generated idempotency based on request hash
                      ├── Same request body within TTL → deduplicate
                      └── Different body → new operation
```

### Key Source Decision

```
Who controls the idempotency key?
  ├── Client-provided (Idempotency-Key header)
  │   ├── PRO: Client controls retries, predictable semantics
  │   ├── CON: Badly-behaved clients can exhaust keys
  │   └── Use when: External API, third-party integrations
  └── Server-generated (request hash or business key)
      ├── PRO: No client cooperation needed
      ├── CON: Same body always returns same result (may not be desired)
      └── Use when: Internal services, idempotent by design
```

### Storage Backend Decision

```
What are your latency and consistency requirements?
  ├── Redis → Fast (~1ms), TTL-based expiry, atomic operations
  │   ├── PRO: Low latency, built-in TTL
  │   ├── CON: Data loss on node fail (if not persisted)
  │   └── Use when: High-throughput, short TTL (< 24h)
  ├── PostgreSQL → Durable, transactional, complex queries
  │   ├── PRO: ACID compliant, survives crashes
  │   ├── CON: Slower (~5-10ms), requires cleanup job
  │   └── Use when: Financial operations, long TTL (> 24h)
  └── DynamoDB → Serverless, auto-scaling, TTL built-in
      ├── PRO: No ops, pay-per-use
      ├── CON: Eventually consistent by default
      └── Use when: AWS ecosystem, variable throughput
```

## Workflow

### Step 1: Client Sends Idempotency Key
Clients include `Idempotency-Key` header (UUID v4 or v7) on POST/PUT/PATCH requests. The key is a client-generated unique identifier for the operation.

### Step 2: Server Checks Storage
```javascript
async function handleRequest(req, res) {
  const key = req.headers['idempotency-key'];
  if (!key) return res.status(400).json({ error: 'Idempotency-Key header required' });

  const existing = await idempotencyStore.get(key);
  if (existing) {
    // Return cached response — including error responses
    return res.status(existing.status).json(existing.body);
  }
  // Process the request
  const result = await processPayment(req.body);
  await idempotencyStore.set(key, { status: 200, body: result }, { ttl: 3600 });
  return res.json(result);
}
```

### Step 3: Handle Concurrent Requests
When two requests with the same key arrive simultaneously, only one should succeed. Use database-level locking:

```sql
-- PostgreSQL: INSERT ... ON CONFLICT
INSERT INTO idempotency_keys (key, status, body, created_at)
VALUES ($1, 'pending', null, NOW())
ON CONFLICT (key) DO NOTHING
RETURNING *;
-- If no row returned, another request holds the key — return 409 Conflict
```

```typescript
// Redis: SET NX with TTL
const acquired = await redis.set(`idempotency:${key}`, 'pending', {
  NX: true,
  EX: 3600, // TTL in seconds
});
if (!acquired) {
  // Key exists — wait for completion or return 409
  const existing = await redis.get(`idempotency:${key}:result`);
  if (existing) return JSON.parse(existing);
  return res.status(409).json({ error: 'Request already in progress' });
}
```

### Step 4: Process and Update
After processing, update the idempotency row with the result:

```sql
UPDATE idempotency_keys SET status = 'completed', body = $2, updated_at = NOW() WHERE key = $1;
```

```typescript
// Store result in Redis
await redis.set(`idempotency:${key}:result`, JSON.stringify(result), { EX: 3600 });
```

### Step 5: Handle idempotency for Error Responses
Critical: error responses must also be cached. If the first attempt returns a 503 and the client retries, the second attempt should return the same 503 — not process the request again:

```javascript
async function handleWithIdempotency(req, res) {
  const key = req.headers['idempotency-key'];
  const cached = await store.get(key);
  if (cached) return res.status(cached.status).json(cached.body);

  try {
    const result = await processRequest(req);
    await store.set(key, { status: 200, body: result }, TTL);
    res.json(result);
  } catch (error) {
    // ALSO cache error responses for idempotency
    const errorResponse = { status: 502, body: { error: 'Upstream failed' } };
    await store.set(key, errorResponse, TTL);
    res.status(502).json(errorResponse.body);
  }
}
```

### Step 6: Clean Up Expired Keys
Use a TTL index (Redis) or a background job (PostgreSQL) to delete keys after the TTL window:

```sql
-- PostgreSQL: background cleanup
DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '24 hours';
```

## Implementation Patterns

### Express Middleware Pattern
```typescript
function idempotencyMiddleware(store: IdempotencyStore, ttl: number = 86400) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    const key = req.headers['idempotency-key'] as string;
    if (!key) return res.status(400).json({ error: 'Idempotency-Key header required' });

    const existing = await store.get(key);
    if (existing) {
      if (existing.status === 'pending') return res.status(409).json({ error: 'In-flight' });
      return res.status(existing.status).json(existing.body);
    }

    await store.set(key, { status: 'pending' }, ttl);
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      store.set(key, { status: res.statusCode, body }, ttl);
      return originalJson(body);
    };
    next();
  };
}
```

### Decorator Pattern (NestJS)
```typescript
@Post()
@Idempotent({ ttl: 3600 })
async createOrder(@Body() dto: CreateOrderDto): Promise<Order> {
  return this.orderService.create(dto);
}

// Decorator implementation
function Idempotent(options: { ttl?: number } = {}) {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const req = args.find(a => a?.headers?.raw);
      const idempotencyKey = req?.headers['idempotency-key'];
      if (!idempotencyKey) throw new BadRequestException('Idempotency-Key required');
      const store = this.idempotencyStore;
      const existing = await store.get(idempotencyKey);
      if (existing) return existing;
      const result = await original.apply(this, args);
      await store.set(idempotencyKey, result, options.ttl ?? 86400);
      return result;
    };
  };
}
```

### Database-Backed Idempotency
```typescript
class PostgresIdempotencyStore {
  constructor(private pool: Pool) {}

  async get(key: string): Promise<IdempotencyRecord | null> {
    const result = await this.pool.query(
      'SELECT * FROM idempotency_keys WHERE key = $1 AND created_at > NOW() - INTERVAL \'24 hours\'',
      [key]
    );
    return result.rows[0] || null;
  }

  async set(key: string, value: IdempotencyValue, ttl: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO idempotency_keys (key, status, response_status, response_body, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (key) DO UPDATE
       SET status = $2, response_status = $3, response_body = $4, updated_at = NOW()`,
      [key, value.status, value.statusCode, JSON.stringify(value.body)]
    );
  }
}
```

## Production Considerations

### TTL Strategy
| Scenario | Recommended TTL | Rationale |
|----------|----------------|-----------|
| Payment processing | 24 hours | Enough for payment confirmation |
| Order creation | 7 days | Long enough for any retry window |
| Email sending | 1 hour | Short window, email is idempotent |
| File upload | 24 hours | Large uploads may retry over hours |
| Webhook delivery | 7 days | Longest possible retry window |

### Storage Comparison
| Storage | Latency | Durability | TTL | Cost | Best For |
|---------|---------|------------|-----|------|----------|
| In-memory (Map) | <1μs | None | Manual | Free | Single-node, dev |
| Redis | ~1ms | Configurable | Built-in | Low-Med | High-throughput |
| PostgreSQL | ~5ms | Full | Manual | Low | Financial, durable |
| DynamoDB | ~10ms | Full | Built-in | Per-use | Serverless, AWS |
| Memcached | ~1ms | None | Built-in | Low | Simple caching |

### Race Condition Handling
Concurrent requests with the same key must be handled:

1. **First wins**: Use DB unique constraint or Redis SET NX. First request acquires the key, subsequent requests get 409 or wait.
2. **Lock-based**: Acquire a distributed lock on the key. First holder processes, others wait.
3. **Optimistic**: Use CAS (compare-and-swap) to update the key record.

```typescript
// Wait pattern: poll for completion
async function handleConcurrent(key: string, maxWaitMs = 5000): Promise<Response> {
  const pollInterval = 100;
  let waited = 0;
  while (waited < maxWaitMs) {
    const record = await store.get(key);
    if (record && record.status !== 'pending') {
      return { status: record.responseStatus, body: record.responseBody };
    }
    if (!record) break; // No concurrent request, proceed
    await sleep(pollInterval);
    waited += pollInterval;
  }
  return null; // Timeout — proceed with processing
}
```

## Security

### Key Entropy
Idempotency keys must be unpredictable. Never use sequential integers or timestamps:
```typescript
// GOOD: UUID v4 — random, unpredictable
const key = crypto.randomUUID();

// GOOD: UUID v7 — time-ordered, random
const key = uuidv7();

// BAD: Sequential — attacker can enumerate keys
const key = `${timestamp}-${counter++}`;
```

### Key Validation
Validate idempotency keys on input — never process a malformed key:
```typescript
function validateIdempotencyKey(key: string): boolean {
  // UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(key)) return false;
  return true;
}
```

### Replay Attack Prevention
Without careful design, idempotency keys can enable replay attacks:
- Always include a timestamp in the idempotency record
- Reject keys older than the TTL window (even if they haven't expired)
- Rate-limit idempotency key submissions per client
- Log all idempotency key hits for audit

## Performance

### Key Size and Storage
- UUID v4: 36 bytes per key
- Response body: Variable — use compression for large responses
- Storage grows with request volume: `keys_created - keys_expired + keys_in_flight`
- Target: keep idempotency storage under 1GB per service instance

### Throughput Impact
| Storage | Reads/s | Writes/s | P99 Latency |
|---------|---------|----------|-------------|
| In-memory | 1M+ | 1M+ | <100μs |
| Redis | 100K | 100K | ~1ms |
| PostgreSQL | 10K | 5K | ~5ms |

### Cache Eviction
For Redis-based storage, configure eviction policy:
```yaml
maxmemory-policy: allkeys-lru  # Evict oldest keys first
maxmemory: 512mb                # Cap idempotency storage
```

## Anti-Patterns

1. **No idempotency on payment endpoints**: Most expensive mistake. A single network retry without idempotency creates duplicate charges. Every financial operation must have idempotency.
2. **Expiring keys too early**: If the TTL is shorter than the maximum retry window, retries after expiry create duplicates. Set TTL to at least `max_retry_duration × 2`.
3. **Not caching error responses**: If you only cache success responses, a retry after a timeout will re-process and potentially succeed — but if the original actually succeeded, you get a duplicate.
4. **Application-level dedup only**: Idempotency must be enforced at the database level with unique constraints, not application-level locking.
5. **Reusing keys across different requests**: Each unique operation gets its own idempotency key. Reusing keys across different request bodies causes false deduplication.
6. **Idempotency on GET/HEAD**: These are naturally idempotent. Adding idempotency key requirements to read endpoints adds complexity with no benefit.
7. **No monitoring on deduplication rate**: A high deduplication rate indicates excessive client retries or network issues. Monitor idempotency key hit rate as a signal.

## Design Pattern Comparison

| Pattern | Mechanism | Scope | Use Case |
|---------|-----------|-------|----------|
| Idempotency Key | Client-provided key, server dedup | Single operation | Mutating API endpoints |
| Optimistic Locking | Version field, CAS | Resource update | Concurrent edits |
| Pessimistic Locking | DB row lock | Resource access | Long-running operations |
| Unique Constraint | DB unique index | Row creation | Preventing duplicate entities |
| Event Idempotency | Event ID dedup | Event processing | Consumer-side deduplication |
| State Machine | Guard transitions | Stateful operations | Workflow engines |

## Rules
- Idempotency keys are required on all mutating endpoints — no exceptions.
- Keys expire after a fixed window (minimum 24 hours, maximum 7 days).
- Return the same response for the same key within the TTL window — including error responses.
- Use database-level uniqueness for the idempotency key column, not application-level locking.
- Never reuse idempotency keys across different request bodies.
- Log idempotency key hits for observability.
- GET, HEAD, OPTIONS are inherently idempotent — no key needed.
- Validate idempotency key format before processing.
- Monitor idempotency key hit rate as a signal of client reliability.
- Always include a timestamp in the idempotency record.

## References
  - references/exactly-once-strategies.md — Exactly-Once Execution Strategies
  - references/idempotency-distributed.md — Distributed Idempotency
  - references/idempotency-failure-modes.md — Idempotency Failure Modes
  - references/idempotency-keys.md — Idempotency Keys
  - references/idempotency-middleware.md — Idempotency Middleware Patterns
  - references/idempotency-patterns.md — Idempotency Key Implementation Patterns
  - references/idempotency-storage.md — Idempotency Storage Backends
  - references/idempotency-testing.md — Idempotency Testing
## Handoff
No artifact produced unless requested.
Next skill: distributed-locking — coordinate access to shared resources across services.
Carry forward: idempotency key storage, TTL configuration, endpoint list.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.