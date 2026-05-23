# Zero-Downtime Migrations

## Expand-Contract Pattern

### Phase 1: Expand (Deploy 1)
Add new schema elements without breaking existing code. Application begins dual-write.
```sql
ALTER TABLE orders ADD COLUMN status_v2 VARCHAR(20);
CREATE TABLE order_items_v2 (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id),
    sku VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);
CREATE INDEX CONCURRENTLY idx_orders_status_v2 ON orders(status_v2);
```
```python
class OrderService:
    def create_order(self, data):
        order = Order.create(**data)
        order_v2 = OrderV2.create(**data)
        return order
```

### Phase 2: Migrate (Deploy 2)
Backfill existing data, verify consistency, switch reads to new schema.
```sql
DO $$
DECLARE
    batch_size INT := 1000;
    processed INT;
BEGIN
    LOOP
        UPDATE orders SET status_v2 = status
        WHERE status_v2 IS NULL LIMIT batch_size;
        GET DIAGNOSTICS processed = ROW_COUNT;
        EXIT WHEN processed = 0;
        COMMIT;
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;

SELECT COUNT(*) FROM orders WHERE status_v2 IS NULL;
```
```python
class OrderService:
    def get_order(self, order_id):
        result = OrderV2.get_by_id(order_id)
        if not result:
            result = Order.get_by_id(order_id)
        return result
```
Verify consistency: compare row counts, checksums, or run reconciliation query. Rollback plan: keep dual-write, revert reads to old schema.

### Phase 3: Contract (Deploy 3)
Remove old schema elements after confirming all reads use new schema.
```sql
ALTER TABLE orders DROP COLUMN status;
DROP TABLE IF EXISTS order_items CASCADE;
```
```python
class OrderService:
    def create_order(self, data):
        order = OrderV2.create(**data)
        return order
```
Rollback plan: add old column back, restore dual-write, redeploy. Phase 3 requires confidence in Phase 2 completeness.

## Backward-Compatible Change Rules

| Change | Safe? | Notes |
|--------|-------|-------|
| Add NULLABLE column | Yes | New column must have no NOT NULL |
| Add column with DEFAULT | Yes | Only for nullable or NOT NULL with default |
| Add table | Yes | No existing code references it |
| Add index | Yes | Use CONCURRENTLY to avoid table lock |
| Add FK with NOCHECK | Yes | Validate offline |
| DROP column | No | Use expand-contract |
| RENAME column | No | Add new, dual-write, drop old |
| Change column type | No | Add new column with new type, migrate data |
| Add NOT NULL | No | Add nullable, backfill, add NOT NULL constraint |
| DROP table | No | Use expand-contract or deprecate first |

## Rollback Strategies

### In-Place Rollback (Safe for additive changes)
```sql
ALTER TABLE orders DROP COLUMN IF EXISTS status_v2;
DROP TABLE IF EXISTS order_items_v2;
```
```bash
liquibase rollbackCount 1
alembic downgrade -1
```

### Forward Fix (For destructive changes)
```sql
-- V4__fix_user_email_length.sql
ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(512);
```
Never rollback destructive (DROP, RENAME, type change) — you will lose data or break downstream consumers.

## CI/CD Integration
```yaml
jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: production
    steps:
    - uses: actions/checkout@v4
    - name: Validate migrations
      run: flyway -configFiles=flyway.conf -url=jdbc:postgresql://staging-db:5432/myapp validate
    - name: Apply migrations
      run: flyway -configFiles=flyway.conf -url=jdbc:postgresql://${{ secrets.DB_URL }} -user=${{ secrets.DB_USER }} -password=${{ secrets.DB_PASSWORD }} migrate
    - name: Smoke test
      run: curl -f http://myapp/health/database
    - name: Rollback on failure
      if: failure()
      run: flyway -configFiles=flyway.conf -url=jdbc:postgresql://${{ secrets.DB_URL }} -user=${{ secrets.DB_USER }} -password=${{ secrets.DB_PASSWORD }} undo
```

## Migration Linting
```bash
migration-lint check V4__drop_users.sql
# OUTPUT: ERROR: DROP TABLE detected — breaking change!
# OUTPUT: WARNING: ALTER COLUMN TYPE detected — potential data loss
```
Recommended tools: sqllint (generic SQL linting), sqlcheck (anti-patterns), schemahero (declarative schema management). Integrate linting in CI pre-merge gate to catch breaking changes before they reach production.

## Schema Drift Detection
Run `flyway validate` or `liquibase status` in CI. Compare expected schema (from migration files) with actual schema (from information_schema). Alert on: missing columns, extra columns, type mismatches, missing indexes. Drift remediation: create migration to align schema or repair baseline.

## Key Points
- Expand-contract is the only safe pattern for zero-downtime schema changes
- Three phases, three deployments — no shortcuts
- Backward-compatible changes only in Phase 1 — test compatibility with CI linting
- Backfill in batches to avoid long-running locks
- Forward-fix over in-place rollback for destructive changes
- Migration linting catches breaking changes before production
- Schema drift detection runs in CI, alerts on unexpected schema state
- Rollback automation in CI: if smoke test fails, trigger down migration
