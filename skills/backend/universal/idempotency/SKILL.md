---
name: backend-idempotency
description: >
  Use this skill when the user says 'idempotency', 'idempotent', 'idempotency key', 'exactly-once', 'retry safety', 'deduplication', 'duplicate detection', 'idempotent endpoint', 'safe retry'. This skill implements idempotency keys and exactly-once semantics so retries never result in duplicate side effects. Applies to any backend stack. Do NOT use for: read-only endpoints (they are naturally idempotent), optimistic concurrency, or database-level unique constraints alone.
version: "1.0.0"
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
Guarantee exactly-once execution for mutating operations using idempotency keys, enabling safe retries without duplicate side effects.

## Agent Protocol

### Trigger
Exact user phrases: "idempotency", "idempotent", "idempotency key", "exactly-once", "retry safety", "deduplication", "duplicate detection", "idempotent endpoint", "safe retry".

### Input Context
- Which endpoints need idempotency guarantees.
- Existing data store (Redis, PostgreSQL, DynamoDB).
- Current retry configuration.

### Output Artifact
Code snippets for idempotency key handling. No file unless requested.

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

## Workflow

### Step 1: Client Sends Idempotency Key
Clients include `Idempotency-Key` header (UUID v4) on POST/PUT/PATCH requests.

### Step 2: Server Checks Storage
```javascript
async function handleRequest(req, res) {
  const key = req.headers['idempotency-key'];
  const existing = await idempotencyStore.get(key);
  if (existing) {
    return res.status(existing.status).json(existing.body);
  }
  // Process the request
  const result = await processPayment(req.body);
  await idempotencyStore.set(key, { status: 200, body: result }, { ttl: 3600 });
  return res.json(result);
}
```

### Step 3: Handle Concurrent Requests
```sql
-- Use INSERT ... ON CONFLICT (PostgreSQL)
INSERT INTO idempotency_keys (key, status, body, created_at)
VALUES ($1, 'pending', null, NOW())
ON CONFLICT (key) DO NOTHING
RETURNING *;
-- If no row returned, another request holds the key — wait or return 409
```

### Step 4: Process and Update
After processing, update the idempotency row:
```sql
UPDATE idempotency_keys SET status = 'completed', body = $2 WHERE key = $1;
```

### Step 5: Clean Up Expired Keys
Use a TTL index (Redis) or a background job (PostgreSQL) to delete keys after the TTL window.

## Rules
- Idempotency keys are required on all mutating endpoints.
- Keys expire after a fixed window (minimum 24 hours, maximum 7 days).
- Return the same response for the same key within the TTL window — including error responses.
- Use database-level uniqueness for the idempotency key column, not application-level locking.
- Never reuse idempotency keys across different request bodies.
- Log idempotency key hits for observability.
- GET, HEAD, OPTIONS are inherently idempotent — no key needed.

## References
- `references/idempotency-patterns.md` — Idempotency key implementation patterns
- `references/exactly-once-strategies.md` — Exactly-once semantic strategies
- `references/idempotency-keys.md` — Idempotency key store backends, middleware, concurrent handling
- `references/idempotency-distributed.md` — Distributed idempotency, message dedup, saga integration

## Handoff
No artifact produced unless requested.
Next skill: distributed-locking — coordinate access to shared resources across services.
Carry forward: idempotency key storage, TTL configuration, endpoint list.
