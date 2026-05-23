# Exactly-Once Execution Strategies

## What Exactly-Once Means
Exactly-once delivery and execution guarantees that an operation is performed exactly one time, even if the request is sent multiple times. This is the strongest delivery guarantee in distributed systems.

## Strategy 1: Idempotent Operations
The operation is naturally idempotent — performing it multiple times has the same effect as performing it once.

### Naturally Idempotent Operations
- `SET user.status = 'active' WHERE id = 123` (SET is idempotent)
- `DELETE FROM cart WHERE id = 456` (deleting a deleted row succeeds)
- `UPDATE inventory SET quantity = 10 WHERE product_id = 789` (absolute assignment)

### Not Naturally Idempotent
- `UPDATE account SET balance = balance + 100 WHERE id = 1` (increment is not idempotent)
- `INSERT INTO events (payload) VALUES ('...')` (creates duplicate rows)
- `sendEmail(userId, template)` (sends duplicate emails)

## Strategy 2: Idempotency Keys
As documented in the idempotency patterns, the server stores and checks a unique key before processing. This is the most common approach.

## Strategy 3: Database-Level Deduplication

### Unique Constraints
```sql
CREATE TABLE payment_events (
  idempotency_key UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO payment_events (idempotency_key, order_id, amount)
VALUES ($1, $2, $3)
ON CONFLICT (idempotency_key) DO NOTHING;
```

### Business Key Deduplication
Instead of an idempotency key header, use a natural business identifier:
```sql
CREATE UNIQUE INDEX idx_unique_outbound_invoice ON invoices (order_id, type)
WHERE type = 'outbound';
```

## Strategy 4: Two-Phase Commit (2PC)
2PC coordinates multiple participants (databases, message queues) in a transaction:

```
Coordinator        Participant A      Participant B
    │                    │                  │
    ├── Prepare ────────►│                  │
    ├── Prepare ───────────────────────────►│
    │◄───── Ready ──────┤                  │
    │◄───── Ready ─────────────────────────┤
    │                    │                  │
    ├── Commit ─────────►│                  │
    ├── Commit ────────────────────────────►│
    │◄───── Ack ────────┤                  │
    │◄───── Ack ───────────────────────────┤
```

2PC is reliable but slow. Only use it when multiple heterogeneous systems need atomicity.

## Strategy 5: Outbox Pattern
The outbox pattern ensures exactly-once delivery to message queues:

```sql
-- Step 1: Write business data and outbox event in the same DB transaction
BEGIN;
  INSERT INTO orders (id, amount) VALUES (1, 49.99);
  INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, payload)
  VALUES (gen_random_uuid(), 'order', 1, 'order.created', '{"id":1,"amount":49.99}');
COMMIT;

-- Step 2: Background process reads outbox and publishes to message queue
-- Step 3: Delete or mark as published (after acknowledgment)
```

The outbox guarantees: either both the business data and the event are persisted, or neither is.

## Strategy 6: Transactional Outbox + Idempotent Consumer
Combine the outbox pattern with idempotent consumers:

```
Producer                          Message Queue                  Consumer
    │                                  │                            │
    ├─ Write to DB + outbox ──────────►│                            │
    │  (same transaction)              │                            │
    │                                  ├─ Deliver message ─────────►│
    │                                  │                            ├─ Check idempotency key
    │                                  │                            ├─ Process (exactly once)
    │                                  │◄──── Ack ─────────────────┤
    │                                  │                            │
    │                                  ├─ Redeliver (on ack fail) ─►│
    │                                  │                            ├─ Check idempotency key
    │                                  │                            ├─ Skip (already done)
    │                                  │◄──── Ack ─────────────────┤
```

## Strategy 7: Compensation (Saga)
For long-running workflows, use compensating transactions rather than exactly-once:

```
Step 1: Reserve inventory         (compensation: release reservation)
Step 2: Charge payment            (compensation: issue refund)
Step 3: Confirm shipment          (compensation: cancel shipment)
```

If Step 3 fails, the saga coordinator runs compensation for Steps 2 and 1. This achieves eventual consistency rather than exactly-once.

## Choosing a Strategy

| Requirement | Strategy |
|------------|----------|
| Single database, high throughput | Idempotent operations + unique constraint |
| Multiple services, message queue | Outbox pattern |
| Cross-database atomicity | 2PC (if slow is acceptable) |
| Long-running workflows | Saga with compensation |
| External API calls | Idempotency key header |
| Payment processing | Idempotency key + audit log |

## Anti-Patterns
- Relying on "at-most-once" for financial operations (data loss).
- Using distributed locks to enforce exactly-once (lock can fail).
- Assuming message queues provide exactly-once (most provide at-least-once).
- Retrying without idempotency keys (duplicates guaranteed).
- Only checking idempotency at the application layer without database enforcement.
