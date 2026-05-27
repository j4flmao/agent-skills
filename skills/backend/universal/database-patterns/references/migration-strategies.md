# Migration Strategies

## Purpose

Database migrations evolve the schema of a production database over time without downtime, data loss, or breaking existing application code. This reference covers migration patterns including expand-migrate-contract, backward-compatible schema changes, rollback strategies, data backfill, migration testing, and CI/CD integration.

## Migration Patterns

### Expand-Migrate-Contract (Parallel Change)

The safest pattern for zero-downtime schema changes. Four phases executed across multiple deployments:

```
Phase 1: Expand   — Add new schema elements (tables, columns, indexes)
Phase 2: Migrate  — Backfill data and dual-write to old and new
Phase 3: Contract — Switch reads to new schema
Phase 4: Remove   — Drop old schema elements
```

#### Phase 1: Expand

Add the new schema element without removing the old one. Old code continues to work unchanged.

```sql
-- Step 1: Add new column with default (nullable)
ALTER TABLE orders ADD COLUMN total_cents BIGINT;
-- NULL initially, old code still writes to total_amount

-- Step 1b: Add new table (no impact on old code)
CREATE TABLE order_items_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents BIGINT NOT NULL
);

-- Step 1c: Add index (CONCURRENTLY to avoid table locks)
CREATE INDEX CONCURRENTLY idx_orders_customer_new
  ON orders(customer_id) WHERE deleted_at IS NULL;
```

#### Phase 2: Migrate

Backfill historical data and begin dual-writing to both old and new schemas.

```sql
-- Backfill existing data
UPDATE orders SET total_cents = ROUND(total_amount * 100)
WHERE total_cents IS NULL;

-- Verify backfill
SELECT count(*) FROM orders WHERE total_cents IS NULL;
```

```typescript
// Application code: dual-write
class OrderService {
  async placeOrder(command: PlaceOrderCommand): Promise<void> {
    const order = Order.create(command)

    // Write to old schema
    await this.oldOrderRepo.save(order)

    // Write to new schema
    await this.newOrderRepo.save({
      id: order.id,
      customerId: order.customerId,
      totalCents: Math.round(order.totalAmount * 100),
      items: order.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPriceCents: Math.round(i.unitPrice * 100),
      })),
    })
  }
}
```

#### Phase 3: Contract

Switch reads to the new schema. Old schema is no longer read but still written.

```typescript
class OrderReadService {
  async getOrder(orderId: string): Promise<OrderDTO> {
    // Read from new schema
    const newOrder = await this.newOrderRepo.findById(orderId)
    if (newOrder) return this.toDTO(newOrder)

    // Fallback to old schema during transition
    const oldOrder = await this.oldOrderRepo.findById(orderId)
    return oldOrder ? this.migrateToNew(oldOrder) : null
  }
}
```

#### Phase 4: Remove

Drop old schema elements after a monitoring period confirms no issues.

```sql
-- First, stop writing to old columns
ALTER TABLE orders ALTER COLUMN total_amount DROP DEFAULT;

-- Remove application code references
-- Then drop column (may require lock on large tables)
ALTER TABLE orders DROP COLUMN total_amount;

-- Or: mark as unused first
ALTER TABLE orders SET COLUMN total_amount SET NOT USED;
-- Drop later: ALTER TABLE orders DROP COLUMN total_amount;
```

### Safe Column Changes

```sql
-- SAFE: Adding a nullable column
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- SAFE: Adding a column with default (PostgreSQL 11+ — no table rewrite)
ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';

-- UNSAFE: Adding a NOT NULL column without default
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NOT NULL;  -- FAILS if rows exist

-- SAFE alternative: Add nullable, backfill, add NOT NULL
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
UPDATE users SET phone = '' WHERE phone IS NULL;
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

### Table Rename Strategy

```sql
-- Phase 1: Create new table
CREATE TABLE customers_new (LIKE customers INCLUDING ALL);

-- Phase 2: Dual-write (insert trigger or app logic)
CREATE FUNCTION sync_customers() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO customers_new SELECT (NEW).*;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_customers_trigger
  AFTER INSERT OR UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION sync_customers();

-- Phase 3: Switch reads to new table
-- (rename or update application config)

-- Phase 4: Drop old table
DROP TRIGGER sync_customers_trigger ON customers;
DROP TABLE customers;
ALTER TABLE customers_new RENAME TO customers;
```

## Backward-Compatible Migrations

### Rules for Backward Compatibility

1. **Old code must work with new schema**. Never change a column in a way that old code doesn't understand.
2. **Add before remove**. Add new tables/columns before removing old ones.
3. **No column rename**. Renaming a column breaks old code. Add a new column instead.
4. **No column type change**. Changing types breaks existing code. Add a new column with the new type.
5. **No NOT NULL on existing columns**. Add as nullable, backfill, then add constraint.
6. **No constraint changes**. Adding a FK or unique constraint on a large table requires careful locking.

### Checking Compatibility

```typescript
async function validateMigrationCompatibility(): Promise<void> {
  const issues: string[] = []

  // Check for DROP COLUMN — always breaking
  const dropColumns = await findPatterns(/DROP COLUMN/i)
  if (dropColumns.length > 0) {
    issues.push(`Drop column detected: ${dropColumns.join(', ')}. Must use expand-contract pattern.`)
  }

  // Check for RENAME COLUMN — always breaking
  const renameColumns = await findPatterns(/RENAME COLUMN/i)
  if (renameColumns.length > 0) {
    issues.push(`Rename column detected: ${renameColumns.join(', ')}. Add new column instead.`)
  }

  // Check for ALTER COLUMN SET NOT NULL without backfill
  const setNotNull = await findPatterns(/ALTER COLUMN.*SET NOT NULL/i)
  for (const stmt of setNotNull) {
    const hasBackfill = await hasPriorBackfill(stmt)
    if (!hasBackfill) {
      issues.push(`SET NOT NULL without backfill: ${stmt}`)
    }
  }

  if (issues.length > 0) {
    throw new Error(`Compatibility issues:\n${issues.join('\n')}`)
  }
}
```

## Rollback Strategies

### Immediate Rollback

For simple, non-destructive migrations, the rollback is the down migration.

```sql
-- UP
ALTER TABLE orders ADD COLUMN discount_cents BIGINT DEFAULT 0;

-- DOWN
ALTER TABLE orders DROP COLUMN discount_cents;
```

### Phased Rollback

For destructive changes (column drops, table deletes), rollback requires data restoration.

```sql
-- UP: Create new table
CREATE TABLE orders_v2 (LIKE orders INCLUDING ALL);

-- DOWN: No need to do anything — old table still exists
-- Just switch application code back to orders table
```

### Point-in-Time Recovery

If a migration cannot be rolled back (data transformation, irreversible change), recovery requires restoring from backup:

```yaml
rollback:
  strategy: pitr
  steps:
    - 1: "Stop application to prevent new writes"
    - 2: "Restore database from backup taken before migration"
    - 3: "Verify data integrity"
    - 4: "Redeploy previous application version"
    - 5: "Verify application health"
  estimated_downtime: "30 minutes"
```

### Rollback Testing Checklist

- [ ] Down migration reverses every change in up migration
- [ ] Rollback has been tested on a copy of production data
- [ ] Rollback does not lose data (for destructive changes)
- [ ] Rollback time is within acceptable window
- [ ] Application code from before migration works after rollback
- [ ] Monitoring and alerting confirm rollback success

## Data Backfill

### Batch Backfill

```typescript
async function backfillTotalCents(batchSize: number = 1000): Promise<void> {
  let processed = 0
  let hasMore = true

  while (hasMore) {
    const result = await pool.query(`
      WITH batch AS (
        SELECT id FROM orders
        WHERE total_cents IS NULL
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE orders SET total_cents = ROUND(total_amount * 100)
      FROM batch WHERE orders.id = batch.id
      RETURNING orders.id
    `, [batchSize])

    processed += result.rowCount
    console.log(`Backfilled ${processed} orders...`)
    hasMore = result.rowCount > 0
  }

  console.log(`Backfill complete: ${processed} rows`)
}
```

### Online Backfill with Minimal Lock Impact

```sql
-- Step 1: Add column (instant metadata change)
ALTER TABLE orders ADD COLUMN total_cents BIGINT;

-- Step 2: Create a function that backfills in batches
CREATE OR REPLACE FUNCTION backfill_total_cents(batch_size INTEGER DEFAULT 1000)
RETURNS TABLE(processed INTEGER, remaining BIGINT) AS $$
DECLARE
  affected INTEGER;
  total BIGINT;
BEGIN
  UPDATE orders SET total_cents = ROUND(total_amount * 100)
  WHERE id IN (
    SELECT id FROM orders
    WHERE total_cents IS NULL
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  );
  GET DIAGNOSTICS affected = ROW_COUNT;

  SELECT count(*) INTO total FROM orders WHERE total_cents IS NULL;
  RETURN QUERY SELECT affected, total;
END;
$$ LANGUAGE plpgsql;

-- Run repeatedly until remaining = 0
SELECT * FROM backfill_total_cents(1000);
```

### Backfill Validation

```sql
-- Verify no NULLs remain
SELECT count(*) FROM orders WHERE total_cents IS NULL;

-- Verify consistency between old and new
SELECT count(*) FROM orders
WHERE total_cents IS NOT NULL
  AND total_cents != ROUND(total_amount * 100);

-- Verify edge cases (null amounts, zero amounts, negative amounts)
SELECT id, total_amount, total_cents FROM orders
WHERE total_amount IS NULL OR total_amount = 0 OR total_amount < 0;
```

## Migration Orchestration in CI

### Migration CI Pipeline

```yaml
# .github/workflows/migrations.yml
name: Database Migrations

on:
  pull_request:
    paths:
      - 'migrations/**'

jobs:
  validate-migrations:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v4

      - name: Create a copy of production schema
        run: |
          # Restore production schema dump (sanitized, no PII)
          pg_restore --no-data -d postgres://postgres:testpass@localhost:5432/postgres \
            ./test-fixtures/prod-schema.dump

      - name: Run migrations against production schema copy
        run: |
          npm run migrate:up
          echo "Migration up succeeded"

      - name: Verify backward compatibility
        run: |
          # Run existing test suite against migrated schema
          npm run test:integration

      - name: Test rollback
        run: |
          npm run migrate:down
          echo "Migration rollback succeeded"

      - name: Verify schema after rollback matches original
        run: |
          pg_dump --schema-only postgres://postgres:testpass@localhost:5432/postgres > after-rollback.sql
          diff ./test-fixtures/prod-schema.sql after-rollback.sql
          echo "Schema after rollback matches original"
```

### Automated Compatibility Tests

```typescript
describe('Migration backward compatibility', () => {
  let db: Pool

  beforeAll(async () => {
    // Create database, run all migrations
    db = new Pool({ /* test config */ })
    await runMigrations(db)
  })

  it('supports all existing queries', async () => {
    // Load queries from existing repository code
    const queries = extractQueriesFromCodebase()

    for (const query of queries) {
      const result = await db.query('EXPLAIN ' + query)
      expect(result.rows[0]).toBeDefined()
    }
  })

  it('preserves existing indexes', async () => {
    const expectedIndexes = await loadExpectedIndexes()
    const { rows: actualIndexes } = await db.query(`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE tablename IN (${expectedIndexes.map(t => `'${t}'`).join(',')})
    `)
    expect(actualIndexes.length).toBeGreaterThanOrEqual(expectedIndexes.length)
  })

  it('maintains referential integrity', async () => {
    const { rows: foreignKeys } = await db.query(`
      SELECT conname, conrelid::regclass AS table_name
      FROM pg_constraint WHERE contype = 'f'
    `)
    // Verify all expected FKs exist
    expect(foreignKeys.length).toBeGreaterThan(0)
  })
})
```

### Migration Ordering and Dependencies

```yaml
# migration.yaml — migration manifest
migrations:
  - version: "2026-05-01-001-add-orders-table"
    dependencies: []
    type: schema
    estimated_duration: "10s"
  - version: "2026-05-05-002-add-total-cents"
    dependencies: ["2026-05-01-001-add-orders-table"]
    type: schema
    estimated_duration: "5s"
  - version: "2026-05-05-003-backfill-total-cents"
    dependencies: ["2026-05-05-002-add-total-cents"]
    type: data
    estimated_duration: "5m"  # Depends on data volume
    requires_maintenance_window: true
  - version: "2026-05-10-004-drop-total-amount"
    dependencies: ["2026-05-05-003-backfill-total-cents"]
    type: schema
    destructive: true
    estimated_duration: "30s"
    rollback: ptir
```

## Migration Types Comparison

| Migration Type | Risk | Downtime | Rollback | Example |
|---------------|------|----------|----------|---------|
| Add column (nullable) | Very Low | None | Drop column | `ADD COLUMN phone VARCHAR` |
| Add column (with default) | Low | None | Drop column | `ADD COLUMN count INT DEFAULT 0` |
| Add index (CONCURRENTLY) | Low | None | Drop index | `CREATE INDEX CONCURRENTLY` |
| Create table | Very Low | None | Drop table | `CREATE TABLE logs` |
| Add FK (NOT VALID + VALIDATE) | Low | None | Drop FK | `ADD CONSTRAINT ... NOT VALID` |
| Add NOT NULL (with backfill) | Medium | None | Drop constraint | `ALTER COLUMN SET NOT NULL` |
| Drop column | High | Needs window | PITR | `DROP COLUMN old_col` |
| Rename column | High | Needs window | PITR | `RENAME COLUMN` |
| Drop table | High | Needs window | PITR | `DROP TABLE` |
| Data transformation | Medium | None (batch) | Reverse transform | `UPDATE ... SET` |

## Key Points

- Use expand-migrate-contract for all destructive changes: add, backfill, switch, remove.
- Every migration must have both up and down scripts tested against a copy of production.
- Backward compatibility means old application code works with the new schema.
- Add columns as nullable, backfill data, then add NOT NULL — never in one step.
- Use `CREATE INDEX CONCURRENTLY` to avoid table locks on large tables.
- Use `ADD CONSTRAINT ... NOT VALID` then `VALIDATE` for zero-downtime FK addition.
- Data backfill uses batched updates with `SKIP LOCKED` for minimal contention.
- Test migrations in CI against a copy of the production schema.
- Verify rollback by diffing the schema dump before and after rollback.
- Document estimated duration, risk level, and rollback strategy for every migration.
