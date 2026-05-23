# Data Sync & Migration — Expand-Contract, Dual-Write, Backfill, Verify

## The Universal Migration Pipeline

```
┌─────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐   ┌──────────┐
│ EXPAND  │──▶│DUAL-WRITE│──▶│ BACKFILL │──▶│ CUTOVER │──▶│ CONTRACT │
└─────────┘   └──────────┘   └──────────┘   └─────────┘   └──────────┘
   safe         safe           throttled       gated         safe
   add new      writes go      historical      flip read      drop old
   shape        to both        rows            source         shape
   release N    release N      release N      release N+1   release N+2
```

Never collapse phases. Each phase is independently reversible.

## Phase 1 — EXPAND (safe DDL)

Add the new shape without removing the old. Must be online (no exclusive lock).

```sql
-- PostgreSQL — safe operations (no rewrite, no long lock)
ALTER TABLE orders ADD COLUMN customer_uuid uuid NULL;
ALTER TABLE orders ADD COLUMN status_v2 text NULL;
CREATE INDEX CONCURRENTLY idx_orders_uuid ON orders(customer_uuid);
CREATE TABLE orders_new (...);

-- UNSAFE on busy table — DO NOT DO
ALTER TABLE orders ADD COLUMN x int NOT NULL DEFAULT 0;  -- full rewrite (pre PG11)
ALTER TABLE orders ALTER COLUMN id TYPE bigint;          -- full rewrite + lock
ALTER TABLE orders DROP COLUMN status;                   -- breaks running app
CREATE INDEX idx_x ON orders(x);                         -- blocks writes
```

```sql
-- MySQL — prefer ALGORITHM=INSTANT or pt-online-schema-change / gh-ost
ALTER TABLE orders ADD COLUMN customer_uuid CHAR(36) NULL, ALGORITHM=INSTANT;
ALTER TABLE orders ADD INDEX idx_uuid (customer_uuid), ALGORITHM=INPLACE, LOCK=NONE;
-- or use gh-ost for any change that would block
gh-ost --alter="ADD COLUMN status_v2 VARCHAR(32) NULL" --execute
```

## Phase 2 — DUAL-WRITE (transactional or outbox)

App writes both old and new shapes in the same transaction. Reads still use old.

```ts
// Same-DB dual write
await db.tx(async tx => {
  await tx.query('UPDATE orders SET customer_id=$1, customer_uuid=$2 WHERE id=$3',
                 [legacyId, uuid, orderId])
})
```

Cross-store dual write — use **outbox pattern** to avoid the dual-write problem:

```sql
-- Same transaction guarantees consistency
BEGIN;
  INSERT INTO orders (...) VALUES (...);
  INSERT INTO outbox (event_id, aggregate_id, event_type, payload, created_at)
    VALUES (gen_random_uuid(), $1, 'OrderCreated', $2::jsonb, now());
COMMIT;
```

```
                   ┌──────────────────┐
                   │   App (writes)   │
                   └────────┬─────────┘
                            │ same tx
                  ┌─────────┴──────────┐
                  ▼                    ▼
              ┌────────┐         ┌─────────┐
              │ orders │         │ outbox  │
              └────────┘         └────┬────┘
                                      │ Debezium / poll
                                      ▼
                                  ┌─────────┐
                                  │  Kafka  │
                                  └────┬────┘
                                       ▼
                              ┌──────────────────┐
                              │  Consumer (idem) │──▶ NEW store
                              └──────────────────┘
```

Consumer **must** be idempotent (dedupe by `event_id`, upsert by primary key).

## Phase 3 — BACKFILL (historical data)

Backfill must be: idempotent, batched, throttled, resumable, observable.

```sql
-- PostgreSQL — throttled batch, restartable
DO $$
DECLARE
  v_batch int := 5000;
  v_rows  int;
  v_last  bigint := 0;
BEGIN
  LOOP
    WITH batch AS (
      SELECT id FROM orders
      WHERE customer_uuid IS NULL AND id > v_last
      ORDER BY id
      LIMIT v_batch
      FOR UPDATE SKIP LOCKED
    )
    UPDATE orders o
       SET customer_uuid = c.uuid
      FROM batch b
      JOIN customers c ON c.id = o.customer_id
     WHERE o.id = b.id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXIT WHEN v_rows = 0;
    v_last := v_last + v_batch;
    PERFORM pg_sleep(0.05);                 -- throttle: ~100k rows/sec
  END LOOP;
END $$;
```

For very large tables (≥ 1B rows) use a job framework with checkpointing:

```ts
// Worker pattern — checkpoint per chunk
async function backfillChunk(from: bigint, to: bigint) {
  const rows = await db.query(
    'UPDATE orders SET customer_uuid = ... WHERE id BETWEEN $1 AND $2 AND customer_uuid IS NULL',
    [from, to])
  await checkpoints.set('backfill.orders.uuid', to)
  metrics.inc('backfill.rows', rows.rowCount)
}
```

Throttling targets:
- ≤ 10% extra DB CPU
- ≤ 25% extra IOPS
- Replication lag MUST stay below alert threshold (back off if exceeded)
- Pause during peak hours (cron-gated worker)

## Phase 4 — CUTOVER (gated flip)

Flip the read source under a feature flag. Old shape is still being written.

```ts
const readSource = flags.get('orders.read.source', 'old')   // 'old' | 'new'

async function getOrder(id: string) {
  if (readSource === 'new') {
    const r = await db.query('SELECT ..., customer_uuid FROM orders WHERE id=$1', [id])
    if (!r.rows[0]?.customer_uuid) {
      metrics.inc('orders.cutover.fallback')
      // safety net: fall back to old shape during transition
      return readLegacy(id)
    }
    return r.rows[0]
  }
  return readLegacy(id)
}
```

Cutover steps:
1. Pre-flight verification (Phase 5) — must pass
2. Enable flag for 1% of traffic (canary-style)
3. Monitor: error rate, fallback rate, latency delta
4. Ramp 1 → 10 → 50 → 100% over hours
5. Bake at 100% for ≥ 1 day
6. Remove fallback path in next release

## Phase 5 — VERIFY (mandatory gate)

Never cut over without these checks:

```sql
-- 1. Row count parity
SELECT count(*) FROM orders WHERE customer_uuid IS NULL;          -- must = 0
SELECT count(*) FROM orders_legacy;
SELECT count(*) FROM orders_new;

-- 2. Checksum parity (sample)
SELECT md5(string_agg(id::text || ':' || customer_uuid::text, ',' ORDER BY id))
  FROM orders WHERE id BETWEEN 1 AND 1000000;

-- 3. Recent-window deep equality
SELECT o.id
  FROM orders_legacy o
  LEFT JOIN orders_new n ON o.id = n.id
 WHERE o.created_at > now() - interval '1 day'
   AND (n.id IS NULL OR n.customer_uuid::text != o.customer_uuid_computed);
```

Acceptance:
- Total parity must be 100% (zero drift)
- Sampled hash parity over rolling 24h must be 100%
- Reconciliation job runs every 5 min; alerts if drift > 0
- Manual sign-off by data + on-call engineer for tier ≥ 99.99%

## Phase 6 — CONTRACT (drop old shape)

Only after full bake period (≥ 1 release, typically 1–4 weeks).

```sql
-- Verify no app writes old column for ≥ 7 days first (audit via trigger)
ALTER TABLE orders DROP COLUMN customer_id;     -- only after grep -r "customer_id" returns nothing
DROP TABLE orders_legacy;
```

Retention rule: keep old shape backed up for ≥ 1 release after contract for emergency rollback.

## Reconciliation Job (continuous safety net)

```python
# Run every 5 min during dual-write + cutover phases
def reconcile(window='5m'):
    rows = db.query("""
        SELECT id, old.x, new.x
          FROM orders old
          JOIN orders_new new USING (id)
         WHERE old.updated_at > now() - interval %s
           AND old.x IS DISTINCT FROM new.x
    """, [window])
    if rows:
        metrics.gauge('reconcile.drift', len(rows))
        if len(rows) > THRESHOLD:
            alert.page('Data drift detected', rows[:10])
        for row in rows:
            repair(row)             # idempotent fix
```

## Online Migration Tools (battle-tested)

| Tool                   | DB         | Approach                                   |
|------------------------|------------|--------------------------------------------|
| gh-ost                 | MySQL      | Triggerless, binlog-based shadow + cutover |
| pt-online-schema-change| MySQL      | Trigger-based shadow table                 |
| pg_repack              | PostgreSQL | Rewrites table without long lock           |
| Liquibase / Flyway     | Multi-DB   | Versioned, idempotent migrations           |
| Sqitch                 | Multi-DB   | Dependency-graph migrations                |
| Skeema                 | MySQL      | Declarative schema, diff + plan            |

## Zero-Downtime Renames (the trickiest)

You **cannot** rename a column without downtime in one release. Do this:
```
Release N    add new column `email_address`; dual-write
Release N    backfill `email_address` from `email`
Release N+1  app reads from `email_address`, writes both
Release N+2  app stops writing `email`
Release N+3  drop column `email`
```

Use a database view to ease the transition:
```sql
CREATE VIEW orders_v AS SELECT id, email_address AS email, ... FROM orders;
-- Old app reads from view, sees the new column under the old name.
```

## Sync Strategies for Cross-System Migrations

| Pattern                | RPO     | Complexity | Use case                         |
|------------------------|---------|------------|----------------------------------|
| Bulk export + import   | hours   | low        | One-shot migration, downtime ok  |
| Snapshot + CDC tail    | seconds | medium     | Zero-downtime DB engine swap     |
| Dual-write + backfill  | 0       | high       | Live migration with rollback     |
| Strangler-fig (route)  | varies  | medium     | Monolith → microservices         |
| Event replay           | 0       | high       | Rebuild new store from event log |

## Anti-Patterns (causes outages)

- Dropping a column before all app instances stop reading it
- Renaming in place without an intermediate dual-name period
- Unbounded backfill — saturates DB IO, blows replication lag, pages on-call
- Migration script wrapped in a single transaction that locks for hours
- Skipping verification because "data looks right"
- Running migrations as part of app startup (race conditions, repeated runs)
- Forgetting to make consumers idempotent → duplicate side effects
