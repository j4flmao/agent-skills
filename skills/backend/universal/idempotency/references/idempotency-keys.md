# Idempotency Keys

## Idempotency Key Implementation

```typescript
interface IdempotencyRecord {
  key: string;
  status: 'pending' | 'completed' | 'failed';
  requestBody: string;
  responseStatusCode: number;
  responseBody: string;
  createdAt: Date;
  completedAt?: Date;
}
```

## Storage Backends

| Backend | Pros | Cons | Best For |
|---------|------|------|----------|
| Redis | Fast, built-in TTL, atomic operations | Volatile (with persistence risk), memory-bound | High-throughput APIs |
| PostgreSQL | ACID, durable, queryable | Slower, more complex cleanup | Systems needing strong durability |
| DynamoDB | Managed, TTL, scalable | Cost at scale, eventual consistency | Serverless architectures |
| In-memory cache | Fastest, zero dependencies | Lost on restart, single-node only | Development, testing |

## Redis Implementation

```typescript
class RedisIdempotencyStore {
  constructor(private redis: Redis, private ttlSeconds: number = 86400) {}

  async tryAcquire(key: string, requestBody: string): Promise<'acquired' | 'exists'> {
    // SET NX — only set if key doesn't exist
    const acquired = await this.redis.set(
      `idempotency:${key}`,
      JSON.stringify({ status: 'pending', requestBody }),
      'NX',
      'EX',
      this.ttlSeconds,
    );
    return acquired ? 'acquired' : 'exists';
  }

  async complete(key: string, statusCode: number, responseBody: string): Promise<void> {
    await this.redis.set(
      `idempotency:${key}`,
      JSON.stringify({ status: 'completed', statusCode, responseBody, completedAt: new Date() }),
      'KEEPTTL', // Preserve original TTL
    );
  }

  async getResponse(key: string): Promise<{ statusCode: number; body: string } | null> {
    const data = await this.redis.get(`idempotency:${key}`);
    if (!data) return null;
    const record = JSON.parse(data);
    if (record.status === 'completed') {
      return { statusCode: record.statusCode, body: record.responseBody };
    }
    return null; // Still pending
  }
}
```

## PostgreSQL Implementation

```sql
CREATE TABLE idempotency_keys (
  key           VARCHAR(255) PRIMARY KEY,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  request_hash  VARCHAR(64) NOT NULL,   -- SHA-256 of request body
  response      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at)
  WHERE status = 'pending';
```

```typescript
class PostgresIdempotencyStore {
  constructor(private pool: Pool) {}

  async tryAcquire(key: string, requestBody: string): Promise<'acquired' | 'exists'> {
    const result = await this.pool.query(`
      INSERT INTO idempotency_keys (key, status, request_hash, expires_at)
      VALUES ($1, 'pending', encode(sha256($2::bytea), 'hex'), NOW() + INTERVAL '24 hours')
      ON CONFLICT (key) DO UPDATE SET
        request_hash = EXCLUDED.request_hash
      WHERE idempotency_keys.status = 'pending'
      RETURNING status
    `, [key, requestBody]);
    return result.rows[0]?.status === 'pending' ? 'acquired' : 'exists';
  }

  async complete(key: string, response: object): Promise<void> {
    await this.pool.query(`
      UPDATE idempotency_keys
      SET status = 'completed', response = $2, completed_at = NOW()
      WHERE key = $1
    `, [key, JSON.stringify(response)]);
  }
}
```

## Middleware Integration

```typescript
function idempotencyMiddleware(store: IdempotencyStore) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only apply to mutating methods
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    const key = req.headers['idempotency-key'] as string;
    if (!key) {
      return res.status(400).json({
        error: 'Idempotency-Key header is required for mutating requests',
      });
    }

    // Check for existing response
    const existing = await store.getResponse(key);
    if (existing) {
      return res.status(existing.statusCode).json(JSON.parse(existing.body));
    }

    // Try to acquire idempotency lock
    const result = await store.tryAcquire(key, JSON.stringify(req.body));
    if (result === 'exists') {
      // Another request is processing — poll for result or return 409
      return res.status(409).json({
        error: 'Request with this idempotency key is already being processed',
      });
    }

    // Capture response for idempotency
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      store.complete(key, res.statusCode, JSON.stringify(body));
      return originalJson(body);
    };

    next();
  };
}
```

## Concurrent Request Handling

```
Request A (key: abc) ──────► tryAcquire(abc) ──► acquired
                                    │
Request B (key: abc) ──────► tryAcquire(abc) ──► exists (same key!)
                                    │
Request A processes ──────► store.complete(abc, response)
                                    │
Request B retries ────────► getResponse(abc) ──► returns cached response
```

## Client-Side Key Generation

```typescript
// Client generates idempotency key (UUID v7 for time-sortable keys)
function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

// Every mutating request includes the key
async function createOrder(orderData: OrderInput): Promise<Order> {
  const idempotencyKey = generateIdempotencyKey();
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(orderData),
  });

  if (response.status === 409) {
    // Conflict — another request with same key is in flight
    // Wait and retry with same key
    await delay(1000);
    return createOrder(orderData); // Same idempotency key
  }

  return response.json();
}
```

## Key Lifecycle

```yaml
key_lifecycle:
  creation: "Client generates UUID v7, sends in Idempotency-Key header"
  pending: "Server stores key with status=pending, processes request"
  completed: "Server updates key with status=completed, stores response"
  ttl: "Key expires after TTL window (24h-7d)"
  cleanup: "Background job deletes expired keys or relies on TTL index"
```

## Response Caching with Idempotency

```typescript
// Same key = same response (including error responses)
async function processPayment(req: Request, res: Response): Promise<void> {
  const key = req.headers['idempotency-key'] as string;

  // Check cache FIRST
  const cached = await idempotencyStore.getResponse(key);
  if (cached) {
    return res.status(cached.statusCode).json(JSON.parse(cached.body));
  }

  try {
    const result = await paymentService.charge(req.body);
    await idempotencyStore.complete(key, 200, result);
    return res.json(result);
  } catch (err) {
    // Cache error responses too — prevents retry from changing outcome
    const errorResponse = { error: err.message, code: 'PAYMENT_FAILED' };
    await idempotencyStore.complete(key, 422, errorResponse);
    return res.status(422).json(errorResponse);
  }
}
```

## Idempotency Key Rules

| Rule | Rationale |
|------|-----------|
| Keys are unique per request body | Same body with same key = same result |
| Keys expire (24h-7d) | Prevents unbounded storage growth |
| Return cached response for same key | Allows retries to succeed safely |
| Include key in ALL mutating methods | GET is inherently idempotent |
| Error responses are also cached | Prevents retry from changing error to success |
| Keys are client-generated UUIDs | Avoids server-side key management |
| Log idempotency key hits | Monitor dedup rate, detect replay attacks |
