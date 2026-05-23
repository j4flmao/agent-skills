# Idempotency Key Implementation Patterns

## Core Concept
An idempotency key is a unique identifier for a request. The server uses it to recognize and reject duplicates. The same key always produces the same result.

## Key Lifecycle

```
Client                          Server
  │                               │
  ├─ Generate UUID ──────────────►│
  │  Idempotency-Key: uuid-123   │  Store: key -> processing
  │                               │
  │◄──── 200 OK (pending) ───────┤
  │  (timeout occurs)            │
  │                               │
  ├─ Retry with same key ───────►│
  │  Idempotency-Key: uuid-123   │  Lookup: key -> 200 OK (pending)
  │◄──── 200 OK (pending) ───────┤
  │                               │  (background processing completes)
  │                               │  Update: key -> 200 OK (completed)
  │                               │
  ├─ Poll with same key ────────►│
  │  Idempotency-Key: uuid-123   │  Lookup: key -> 200 OK (completed)
  │◄──── 200 OK (completed) ─────┤
```

## Storage Backends

### Redis (Recommended for high throughput)
```redis
SET idempotency:{key} {response_json} EX 86400 NX
```
- `NX` ensures first-write-wins for concurrent requests.
- TTL automatically expires old keys.
- Use Lua scripting for atomic check-and-set operations.

### PostgreSQL
```sql
CREATE TABLE idempotency_keys (
  key         UUID PRIMARY KEY,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
  status_code INTEGER,
  body        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atomic first-write-wins:
INSERT INTO idempotency_keys (key, status)
VALUES ($1, 'pending')
ON CONFLICT (key) DO NOTHING
RETURNING status;
```

### DynamoDB
```json
{
  "pk": "idempotency#uuid-123",
  "status": "completed",
  "response": { "statusCode": 200, "body": {} },
  "ttl": 1700000000
}
```
Use `ConditionExpression: attribute_not_exists(pk)` for atomic first-write-wins.

## Handling Concurrent Requests
When two requests arrive simultaneously with the same key:

### Option A: First-Write-Wins (Best)
Use the data store's conditional write to ensure only the first request proceeds. All subsequent requests receive the same eventual response via polling or a short wait.

### Option B: Lock + Process (Second Best)
```javascript
const lockKey = `idempotency-lock:${key}`;
const lock = await redis.set(lockKey, 'locked', 'NX', 'EX', 5);
if (lock) {
  // Process the request
  await processAndStore(key, result);
} else {
  // Another request is processing — wait and return its result
  await waitForResult(key, 5000);
}
```

### Option C: Return 409 Conflict (Worst)
Return `409 Conflict` when a key is already in-flight. The client retries after the first request completes.

## Response Caching
The key insight: idempotency is about *responses*, not just *effects*. Same key = same response.

```javascript
async function idempotentHandler(req, res) {
  const key = req.headers['idempotency-key'];
  if (!key) return res.status(400).json({ error: 'Idempotency-Key header required' });

  const cached = await idempotencyStore.get(key);
  if (cached) {
    // Return exactly the same response — including status code and headers
    return res.status(cached.statusCode).json(cached.body);
  }

  try {
    const result = await processRequest(req);
    await idempotencyStore.set(key, { statusCode: 200, body: result }, TTL);
    return res.json(result);
  } catch (err) {
    // Cache error responses too — prevents retries from succeeding on failed requests
    await idempotencyStore.set(key, { statusCode: err.status || 500, body: err.toJSON() }, TTL);
    throw err;
  }
}
```

## TTL Guidelines
| Use Case | TTL | Rationale |
|----------|-----|-----------|
| Payment processing | 24 hours | Payment retry window |
| Order creation | 7 days | Customer retry window |
| Email sending | 1 hour | Short retry window |
| File upload | 24 hours | Network retry window |
| Idempotency key storage | 24-72 hours | Balance between storage and utility |

## Key Generation (Client Side)
```javascript
function generateIdempotencyKey() {
  return crypto.randomUUID(); // UUID v4
}
```
Best practice: clients generate the key and send it with every mutating request. Server-generated keys defeat the purpose (the client cannot retry without knowing the key).

## Middleware Pattern (Server Side)
```javascript
function idempotencyMiddleware(store, options = {}) {
  const ttl = options.ttl || 86400;
  return async (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const key = req.headers['idempotency-key'];
    if (!key) return res.status(400).json({ error: 'Idempotency-Key header required' });
    try {
      const existing = await store.get(key);
      if (existing) return res.status(existing.status).json(existing.body);
      req.idempotencyKey = key;
      const originalJson = res.json.bind(res);
      res.json = async (body) => {
        await store.set(key, { status: res.statusCode, body }, ttl);
        originalJson(body);
      };
      next();
    } catch (err) { next(err); }
  };
}
```
