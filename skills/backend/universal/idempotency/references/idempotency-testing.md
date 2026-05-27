# Idempotency Testing

## Overview
Test idempotency guarantees: duplicate request handling, concurrent requests, TTL expiry, response caching, and race condition verification.

## Duplicate Request Tests

```typescript
describe('Idempotency — Duplicate Requests', () => {
  let app: Express;
  let idempotencyStore: IdempotencyStore;

  beforeEach(async () => {
    idempotencyStore = new RedisIdempotencyStore(redis);
    app = createApp(idempotencyStore);
  });

  afterEach(async () => {
    await redis.flushdb();
  });

  it('returns same response for duplicate request', async () => {
    const key = uuidv4();
    const payload = { amount: 100, currency: 'USD' };

    const firstResponse = await request(app)
      .post('/api/payments')
      .set('Idempotency-Key', key)
      .send(payload);

    const secondResponse = await request(app)
      .post('/api/payments')
      .set('Idempotency-Key', key)
      .send(payload);

    expect(secondResponse.status).toBe(firstResponse.status);
    expect(secondResponse.body).toEqual(firstResponse.body);
  });

  it('processes unique keys independently', async () => {
    const results = await Promise.all([
      request(app)
        .post('/api/payments')
        .set('Idempotency-Key', uuidv4())
        .send({ amount: 50 }),
      request(app)
        .post('/api/payments')
        .set('Idempotency-Key', uuidv4())
        .send({ amount: 100 }),
    ]);

    const bodies = results.map(r => r.body);
    expect(bodies[0].id).not.toBe(bodies[1].id);
  });

  it('caches error responses too', async () => {
    const key = uuidv4();

    // First request fails validation
    const firstResponse = await request(app)
      .post('/api/payments')
      .set('Idempotency-Key', key)
      .send({}); // Missing required fields

    // Retry with valid data — should still get the error
    const secondResponse = await request(app)
      .post('/api/payments')
      .set('Idempotency-Key', key)
      .send({ amount: 100 });

    expect(secondResponse.status).toBe(firstResponse.status);
    expect(secondResponse.body).toEqual(firstResponse.body);
  });
});
```

## Concurrent Request Tests

```typescript
describe('Idempotency — Concurrent Requests', () => {
  it('first request wins, subsequent requests get cached response', async () => {
    const key = 'concurrent-key';
    const payload = { amount: 200 };

    // Fire 5 concurrent requests with same key
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/payments')
          .set('Idempotency-Key', key)
          .send(payload)
      )
    );

    // All responses should be identical
    const statuses = results.map(r => r.status);
    const bodies = results.map(r => JSON.stringify(r.body));

    expect(new Set(statuses).size).toBe(1); // All same status
    expect(new Set(bodies).size).toBe(1);    // All same body
  });

  it('prevents duplicate side effects with concurrent requests', async () => {
    const key = 'no-side-effects-key';
    const beforeCount = await getPaymentCount();

    await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/payments')
          .set('Idempotency-Key', key)
          .send({ amount: 50 })
      )
    );

    const afterCount = await getPaymentCount();
    expect(afterCount - beforeCount).toBe(1); // Only one payment created
  });
});
```

## TTL and Expiry Tests

```typescript
describe('Idempotency — TTL and Expiry', () => {
  it('returns cached response within TTL window', async () => {
    const key = 'ttl-test';
    const payload = { amount: 100 };

    // Store uses 1 hour TTL
    await request(app)
      .post('/api/payments')
      .set('Idempotency-Key', key)
      .send(payload);

    // 30 minutes later (simulated)
    await advanceTimers(30 * 60 * 1000);

    const response = await request(app)
      .post('/api/payments')
      .set('Idempotency-Key', key)
      .send(payload);

    expect(response.status).toBe(200); // Still cached
  });

  it('allows new request after TTL expires', async () => {
    const key = 'expired-key';

    await request(app)
      .post('/api/payments')
      .set('Idempotency-Key', key)
      .send({ amount: 100 });

    // Past TTL (1 hour)
    await advanceTimers(61 * 60 * 1000);

    const response = await request(app)
      .post('/api/payments')
      .set('Idempotency-Key', key)
      .send({ amount: 200 });

    // Should process as new (old cache expired)
    expect(response.body.amount).toBe(200);
  });
});
```

## Race Condition Tests

```typescript
describe('Idempotency — Race Conditions', () => {
  it('atomic key insertion prevents double processing', async () => {
    const key = 'race-key';

    // Simulate near-simultaneous arrivals
    const results = await Promise.allSettled([
      insertIdempotencyKey(key), // First wins
      insertIdempotencyKey(key), // Second gets conflict
    ]);

    const settled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    expect(settled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  it('handles concurrent writes with ON CONFLICT', async () => {
    // PostgreSQL-level test
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        db.query(
          `INSERT INTO idempotency_keys (key, status)
           VALUES ($1, 'pending')
           ON CONFLICT (key) DO NOTHING
           RETURNING *`,
          ['conflict-key']
        )
      )
    );

    const inserted = results.filter(r => r.rows.length > 0);
    expect(inserted).toHaveLength(1); // Only one succeeded
  });
});
```

## Integration Tests

```typescript
describe('Idempotency — End-to-End', () => {
  let paymentService: PaymentService;
  let idempotencyMiddleware: IdempotencyMiddleware;

  beforeEach(() => {
    idempotencyMiddleware = new IdempotencyMiddleware(new InMemoryIdempotencyStore());
    paymentService = new PaymentService(idempotencyMiddleware);
  });

  it('processes idempotent payment correctly end-to-end', async () => {
    const key = 'e2e-key';
    const payment = { amount: 150, currency: 'USD', source: 'tok_visa' };

    // First call
    const result1 = await paymentService.processPayment(payment, key);
    expect(result1.status).toBe('succeeded');
    expect(result1.idempotent).toBe(false); // First time

    // Retry call
    const result2 = await paymentService.processPayment(payment, key);
    expect(result2.status).toBe('succeeded');
    expect(result2.idempotent).toBe(true); // Cached

    // Verify only one charge was made
    const charges = await paymentService.getChargesForIdempotencyKey(key);
    expect(charges).toHaveLength(1);
  });

  it('cleans up expired keys', async () => {
    const key = 'cleanup-key';
    await paymentService.processPayment({ amount: 50 }, key, { ttlMs: 100 });

    // Wait for TTL to expire
    await new Promise(r => setTimeout(r, 200));

    const cleaned = await paymentService.cleanupExpiredKeys();
    expect(cleaned).toContain(key);
  });
});
```

## Key Points
- Test duplicate requests return identical response (status + body)
- Verify error responses are also cached and returned identically
- Test concurrent requests: first wins, all get same response
- Verify no duplicate side effects with concurrent requests
- Test cached response within TTL window and new request after expiry
- Validate atomic key insertion prevents race condition double-processing
- Test end-to-end: process, retry, verify single execution
- Clean up expired idempotency keys and verify removal
